import {InvoluteParameters} from '../components/InvoluteGearParameters';
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {PointPath} from "./PointPath";
import {CubicBezier, CubicBezierSegment} from "./CubicBezier";
import {Line} from "./Line";

type pointEvaluator = (prev: Vector2d, current: Vector2d) => boolean;

// Involute gear calculation
export class InvoluteGear {
    private parameters: InvoluteParameters;
    private pitchRadius: number;
    private baseRadius: number;
    private outsideRadius: number;
    private rootRadius: number;

    constructor(parameters: InvoluteParameters) {
        this.parameters = parameters;
        this.pitchRadius = (parameters.module * parameters.numberOfTeeth) / 2;
        this.baseRadius = this.pitchRadius * Math.cos(parameters.pressureAngle * Math.PI / 180);
        this.outsideRadius = this.pitchRadius + parameters.addendumCoeff * parameters.module;
        this.rootRadius = this.pitchRadius - parameters.dedendumCoeff * parameters.module;
    }

    public getDedendum() {
        return this.parameters.module * this.parameters.dedendumCoeff;
    }

    // Creates a point path for one side of the fillet path
    private traceFillet(): PointPath {
        const toothWidth = this.parameters.module * Math.PI / 2

        const pe: Vector2d = new Vector2d(this.pitchRadius, toothWidth / 2)
        const tanPressAng = Math.tan(this.parameters.pressureAngle / 180 * Math.PI);
        const mDown = this.parameters.module * this.parameters.dedendumCoeff;

        // Point to trace, a corner of the mating rack tooth
        const te: Vector2d = pe.minus(new Vector2d(mDown, mDown * tanPressAng))

        const result: Vector2d[] = []
        const limit = toothWidth * 3
        for (let i = limit; i >= -limit; i -= toothWidth / 100) {
            const angle = i / this.pitchRadius
            const sShifted = Matrix3x3.translate(new Vector2d(0, -i)).transform(te);
            const sRotatedBack = Matrix3x3.rotate(angle).transform(sShifted)
            result.push(sRotatedBack)
        }

        const turnInd = result.findIndex((p, ind, arr) => {
            if (ind === arr.length - 1) {
                return false
            }
            const pNext = arr[ind + 1]
            return p.length() < pNext.length()
        })
        return new PointPath(result.slice(turnInd))
    }

    // Creates a point path for the involute
    private traceInvolute(): PointPath {
        const inv = (a: number) => Math.tan(a) - a
        const m = this.parameters.module
        const z = this.parameters.numberOfTeeth
        const a = this.parameters.pressureAngle / 180 * Math.PI
        const toothThicknessAtBase = m * Math.cos(a) / 2 * (Math.PI + 2 * z * inv(a))
        const baseSectorDist = this.baseRadius * Math.PI * 2 / z
        const halfGapDist = (baseSectorDist - toothThicknessAtBase) / 2
        const involuteStartAngle = halfGapDist / this.baseRadius

        const tracedPoints: Vector2d[] = []
        const maxAngle = Math.PI * this.parameters.numberOfTeeth
        for (let invA = 0; invA < 2 * Math.PI / 5; invA += 0.01 / z) {
            const angle = involuteStartAngle + inv(invA)
            if (angle > maxAngle) {
                break;
            }
            const norm = new Vector2d(Math.cos(angle), Math.sin(angle))
            const radius = this.baseRadius / Math.cos(invA)
            if (radius > this.pitchRadius + this.parameters.module * this.parameters.addendumCoeff) {
                break;
            }
            tracedPoints.push(norm.multiply(radius))
        }

        const lines = new PointPath(tracedPoints).getLines()
        const crossIdx = lines.findIndex(line => line.start.length() < this.rootRadius && line.end.length() > this.rootRadius)
        if (crossIdx !== -1) {
            // If the involute trace is crossing the root circle, it must be truncated at the cross point
            const s = lines[crossIdx].start
            const e = lines[crossIdx].end
            const s2RDiff = this.rootRadius - s.length()
            const s2EDiff = e.length() - s.length()
            const adjStart = s.plus(e.minus(s).multiply(s2RDiff / s2EDiff))
            return new PointPath([adjStart, ...lines.slice(crossIdx).map(l => l.end)])
        } else {
            return new PointPath(tracedPoints.filter(p => p.length() >= this.rootRadius))
        }
    }

    // Merges the given fillet path and involute
    mergeCurves(fillet: PointPath, involute: PointPath): PointPath {
        const filletSegs = fillet.getLines()
        const involuteSegs = involute.getLines()

        let crossPoint: Vector2d | null = null
        let crossFilletIndex: number | null = null
        let crossInvoluteIndex: number | null = null

        const hasBiggerRadius: pointEvaluator = (prev, current) => current.length() > prev.length()

        filletSegs.forEach((filletSeg, fInd) => {
            involuteSegs.forEach((involuteSeg, iInd) => {
                const cp = Line.line2line([filletSeg.start, filletSeg.end], [involuteSeg.start, involuteSeg.end])
                if (cp !== null && cp.inRange) {
                    if (crossPoint === null || hasBiggerRadius(crossPoint, cp.p)) {
                        crossPoint = cp.p
                        crossFilletIndex = fInd
                        crossInvoluteIndex = iInd
                    }
                }
            })
        })

        if (crossPoint !== null) {
            return new PointPath([
                ...filletSegs.slice(0, crossFilletIndex!! + 1).map(l => l.start),
                crossPoint!!,
                ...involuteSegs.slice(crossInvoluteIndex!!).map(l => l.end)
            ])
        } else {
            return involute
        }
    }


    // Calculates the tooth profile
    generateToothProfile(): PointPath {
        const slightCWRotation = Matrix3x3.rotate(Math.PI / 2 / this.parameters.numberOfTeeth / 1000)
        const fillet = this.traceFillet().transform(slightCWRotation);
        const involute = this.traceInvolute()

        let mergedCurves: PointPath = this.applyBacklash(this.mergeCurves(fillet, involute))

        // Extends to center at the bottom, to complete the bottom part
        const sp = mergedCurves.getStart()
        const firstAngle = Math.atan(sp.y / sp.x)
        const prefix: Vector2d[] = []
        for (let a = 0; a < firstAngle; a += 0.001) {
            prefix.push(new Vector2d(Math.cos(a), Math.sin(a)).multiply(this.rootRadius))
        }

        // Extend to center at top (if neccessary) to complet the top part of the tooth
        const ep = mergedCurves.getEnd()
        const lastAngle = Math.atan(ep.y / ep.x)
        const suffix: Vector2d[] = []
        for (let a = lastAngle + 0.001; a < Math.PI * 2 / this.parameters.numberOfTeeth / 2; a += 0.001) {
            suffix.push(new Vector2d(Math.cos(a), Math.sin(a)).multiply(this.pitchRadius + this.parameters.module * this.parameters.addendumCoeff))
        }

        const completeFlank = new PointPath([...prefix, ...mergedCurves.getPoints(), ...suffix])

        // Rotate flank town to below x-axis so it can be mirrored
        const rotHalfToothCW = Matrix3x3.rotate(-Math.PI / this.parameters.numberOfTeeth)
        const orientedFlank = new PointPath(completeFlank.transform(rotHalfToothCW).getPoints().filter(p => p.y <= 0))
        const otherSide = orientedFlank.transform(Matrix3x3.scale(1, -1))
        return PointPath.concat(orientedFlank, otherSide.reverse())
    }

    applyBacklash(curve: PointPath): PointPath {
        if (this.parameters.backlash > 0) {
            const d = this.pitchRadius
            const backlashAngle = (this.parameters.backlash / d / 2)
            const rot = Matrix3x3.rotate(backlashAngle)
            return curve.transform(rot)
        } else {
            return curve
        }
    }

    // Creates the tooth profile and duplicates it all around the circle to create the whole gear.
    generateGearProfile(): CubicBezier[] {
        const toothProfile: PointPath = this.generateToothProfile()
        const fittedTooth = toothProfile.toFittedBezier()

        const gearProfile: CubicBezierSegment[] = []
        for (let t = 0; t < this.parameters.numberOfTeeth; t++) {
            const rot: Matrix3x3 = Matrix3x3.rotate(Math.PI * 2 / this.parameters.numberOfTeeth * t)
            gearProfile.push(...fittedTooth.transform(rot).getSegments())
        }
        return [new CubicBezier(gearProfile)]
    }

    /**
     * Get gear dimensions for reference
     */
    getDimensions() {
        return {
            pitchRadius: this.pitchRadius,
            baseRadius: this.baseRadius,
            outsideRadius: this.outsideRadius,
            rootRadius: this.rootRadius,
            module: this.parameters.module,
            numberOfTeeth: this.parameters.numberOfTeeth,
            shaftDiameter: this.parameters.shaftDiameter
        };
    }
}
