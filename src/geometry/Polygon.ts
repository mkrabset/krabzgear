import {Line} from "./Line";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {PointPath} from "./PointPath";

// Represents a closed paths of points, e.g. a polygon
export class Polygon extends PointPath {
    private area: number | null = null;

    constructor(points: Vector2d[]) {
        super(points)
    }

    static closed(pointPath: PointPath) {
        return new Polygon(pointPath.getPoints())
    }

    public static fromLines(lines: Line[]): Polygon {
        return new Polygon(lines.map(line => line.start));
    }

    public getLines() {
        return [...super.getLines(), new Line(this.getEnd(), this.getStart())]
    }

    public getArea(): number {
        if (this.area === null) {
            this.area = this.getLines().map(seg => seg.start.cross(seg.end)).reduce((a, b) => a + b) / 2;
        }
        return this.area
    }

    public transform(matrix: Matrix3x3): Polygon {
        return Polygon.closed(super.transform(matrix))
    }

    public reverse(): Polygon {
        return Polygon.closed(super.reverse())
    }

    public oriented(ccw: boolean): Polygon {
        return ccw === (this.getArea() > 0) ? this : this.reverse()
    }


    // @Deprecated
    static linesToPoints(lines: Line[]) {
        return [lines[0].start, ...lines.map(line => line.end)]
    }


}