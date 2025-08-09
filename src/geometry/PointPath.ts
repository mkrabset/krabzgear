import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {BoundingBox} from "./BoundingBox";
import {Line} from "./Line";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import fitCurve from "fit-curve";
import {CubicBezier} from "./CubicBezier";

export class PointPath {
    private points: Vector2d[];
    private lines: Line[] | null = null;
    private bounds: BoundingBox | null = null;

    constructor(points: Vector2d[]) {
        if (points.length < 2) {
            throw new Error('PointPath needs at least two points');
        }
        this.points = points;
    }

    public getPoints(): Vector2d[] {
        return [...this.points];
    }

    public getStart(): Vector2d {
        return this.points[0];
    }

    public getEnd(): Vector2d {
        return this.points[this.points.length - 1];
    }


    public getLines(): Line[] {
        if (this.lines === null) {
            this.lines = this.points.slice(1).map(((end, index) => new Line(this.points[index], end)));
        }
        return [...this.lines];
    }

    public getBounds(): BoundingBox {
        if (this.bounds === null) {
            const xs = this.points.map(p => p.x)
            const ys = this.points.map(p => p.y)
            this.bounds = new BoundingBox(new Vector2d(Math.min(...xs), Math.min(...ys)), new Vector2d(Math.max(...xs), Math.max(...ys)))
        }
        return this.bounds;
    }

    public transform(matrix: Matrix3x3) {
        return new PointPath(this.points.map(p => matrix.transform(p)))
    }

    public reverse() {
        return new PointPath([...this.points].reverse())
    }

    public toFittedBezier(tolerance: number = 0.000001): CubicBezier {
        return new CubicBezier(fitCurve(this.points.map(p => [p.x, p.y]), tolerance)
            .map(curve => curve.map(p => new Vector2d(p[0], p[1])))
            .map(p => ({
                c1: p[0],
                c2: p[1],
                c3: p[2],
                c4: p[3]
            }))
        )
    }

    static concat(a: PointPath, b: PointPath) {
        return new PointPath([...a.points, ...b.points])
    }

    public simplify(tolerance: number): PointPath {
        return new PointPath(PointPath.rdp(this.points, tolerance))
    }

    /**
     * Simple Ramer Douglas Peucker implementation to simplify a PointPath
     */
    private static rdp(points: Vector2d[], tolerance: number): Vector2d[] {
        if (points.length <= 2) {
            return points;
        } else {
            const start: Vector2d = points[0];
            const end: Vector2d = points[points.length - 1];
            let maxDist: number = -1;
            let maxIdx: number = -1;
            for (let i = 1; i < points.length - 1; i++) {
                const dist: number = Line.pointToSegmentDist(points[i], start, end);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxIdx = i;
                }
            }
            if (maxDist > tolerance) {
                let pointsBefore: Vector2d[] = points.slice(0, maxIdx + 1);
                let pointsAfter: Vector2d[] = points.slice(maxIdx, points.length);
                return [...PointPath.rdp(pointsBefore, tolerance), points[maxIdx], ...PointPath.rdp(pointsAfter, tolerance)];
            } else {
                return [start, end];
            }
        }
    }
}