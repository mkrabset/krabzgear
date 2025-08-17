import {Polygon} from "./Polygon";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {BooleanPolygonOperation} from "./BooleanPolygonOperation";
import {PointPath} from "./PointPath";
import {InvoluteGear} from "./InvoluteGear";
import {CubicBezier, CubicBezierSegment} from "./CubicBezier";


export class RingGear {
    private numberOfTeeth: number;
    private pinion: InvoluteGear;
    private backlash: number;
    private pitchRadius: number;

    constructor(pinion: InvoluteGear, numberOfTeeth: number, backlash: number) {
        this.numberOfTeeth = numberOfTeeth;
        this.pinion = pinion;
        this.backlash = backlash;

        const pinionPitchRadius = this.pinion.getDimensions().pitchRadius
        const zP = this.pinion.getDimensions().numberOfTeeth
        this.pitchRadius = pinionPitchRadius / zP * this.numberOfTeeth
    }

    calculateCutPiece(): Polygon {
        const module = this.pinion.getDimensions().module
        const pinionPitchRadius = this.pinion.getDimensions().pitchRadius
        const toothProfile = this.pinion.generateToothProfile()

        const simpTolerance = module / 400
        const simplifiedToothProfile = toothProfile.simplify(simpTolerance)

        const toothShape = Polygon.closed(simplifiedToothProfile).oriented(true)
        const liftTooth = Matrix3x3.translate(new Vector2d(this.pitchRadius - pinionPitchRadius, 0))

        const limit = pinionPitchRadius * Math.PI * 2 / this.numberOfTeeth * 100 / module

        const masks = []
        for (let d = -limit; d < limit; d += 0.05 * module) {
            const rotated = toothShape.transform(Matrix3x3.rotate(d / pinionPitchRadius))
            const shifted = rotated.transform(liftTooth)
            const rolledBack = shifted.transform(Matrix3x3.rotate(-d / this.pitchRadius))
            masks.push(rolledBack)
        }

        const filteredMasks = masks.filter(mask => mask.getBounds().max.x >= this.pitchRadius - this.pinion.getDedendum())
        return filteredMasks.reduce((a, b) => BooleanPolygonOperation.combine(a, b))
    }

    calculateFlank(): PointPath {
        const module = this.pinion.getDimensions().module
        const cutPiece = this.calculateCutPiece()

        const unfilteredPoints = cutPiece.getPoints()
        const filteredPoints = unfilteredPoints.filter((_, ind) => ind % 2 === 0)
            .map((p, ind) => p.plus(unfilteredPoints[(ind * 2 + 1) % unfilteredPoints.length]).multiply(0.5))


        const pathWithoutBacklash = new PointPath(filteredPoints
            .filter(point => point.length() > this.pitchRadius - this.pinion.getDedendum())
            .filter(point => point.y >= 0)
            .filter((p, ind, arr) => ind === 0 || p.length() < arr[ind - 1].length())  // remove ripples
        ).simplify(0.005*module)

        const path = this.applyBacklash(pathWithoutBacklash)


        // Extends to center at the bottom
        const sp = path.getStart()
        const firstAngle = Math.atan(sp.y / sp.x)
        const prefix: Vector2d[] = []
        for (let a = 0; a < firstAngle; a += 0.001) {
            prefix.push(new Vector2d(Math.cos(a), Math.sin(a)).multiply(sp.length()))
        }

        // Extend to center at top (if neccessary)
        const ep = path.getEnd()
        const lastAngle = Math.atan(ep.y / ep.x)
        const suffix: Vector2d[] = []
        for (let a = lastAngle + 0.001; a < Math.PI * 2 / this.numberOfTeeth / 2; a += 0.01) {
            suffix.push(new Vector2d(Math.cos(a), Math.sin(a)).multiply(Math.max(this.pitchRadius - this.pinion.getDedendum(), ep.length())))
        }
        return new PointPath([...prefix, ...path.getPoints(), ...suffix]);
    }

    calculateTooth() {
        const flank = this.calculateFlank()
        const flip = Matrix3x3.scale(1, -1)
        const revFlank = flank.transform(flip).reverse()
        return PointPath.concat(revFlank, flank)
    }

    calculateGear(): CubicBezier {
        const tooth = this.calculateTooth()
        const toothCurve: CubicBezier = tooth.toFittedBezier()

        const result: CubicBezierSegment[] = []
        for (let i = 0; i < this.numberOfTeeth; i++) {
            const rot = Matrix3x3.rotate(Math.PI * 2 / this.numberOfTeeth * i)
            result.push(...toothCurve.transform(rot).getSegments())
        }
        return new CubicBezier(result).close()
    }

    applyBacklash(path: PointPath): PointPath {
        const d = this.pitchRadius
        const backlashAngle = (this.backlash / d / 2)
        const rot = Matrix3x3.rotate(backlashAngle)
        const backlashRotated = path.transform(rot)
        const halfTootExtraRotated = backlashRotated.transform(Matrix3x3.rotate(-Math.PI / this.numberOfTeeth))
        const trimmed = new PointPath(halfTootExtraRotated.getPoints().filter(p => p.y <= 0))
        return trimmed.transform(Matrix3x3.rotate(Math.PI / this.numberOfTeeth))
    }
}