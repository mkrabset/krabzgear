import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {BoundingBox} from "./BoundingBox";

export type LineSegIntersection = {
    inRange: boolean; // True if crossing is between endpoints of both line-segments
    t1: number; // T-value for cross point in first segment
    t2: number; // T-value for cross point in second segment
    p: Vector2d; // The cross point
};

// Representation of a line in xy space
export class Line {
    public readonly start: Vector2d;
    public readonly end: Vector2d;
    private bb: BoundingBox | null = null;

    constructor(start: Vector2d, end: Vector2d) {
        this.start = start;
        this.end = end;
    }

    public getBounds(): BoundingBox {
        if (this.bb === null) {
            this.bb = BoundingBox.fromPoints(this.start, this.end)
        }
        return this.bb
    }

    public static lineEquation(p1: Vector2d, p2: Vector2d): [number, number, number] {
        return [p1.y - p2.y, p2.x - p1.x, p1.x * p2.y - p1.y * p2.x];
    }

    // Returns the point where the normal from the point (x,y) intersects with the line given by ax+by+c=0
    public static pointToLine(p: Vector2d, a: number, b: number, c: number): Vector2d {
        const x: number = p.x;
        const y: number = p.y;
        const den: number = a * a + b * b;
        return new Vector2d((b * (b * x - a * y) - a * c) / den, (a * (-b * x + a * y) - b * c) / den);
    }

    // Returns the shortest distance between a point and a line-segment (given by two endpoints)
    // If the normal from the point down to the line ends up outside the segment
    // , the distance to the closest endpoint is returned.
    public static pointToSegmentDist(point: Vector2d, start: Vector2d, end: Vector2d) {
        if (start.equals(end)) {
            return Vector2d.dist(point, start);
        }
        const [a, b, c] = Line.lineEquation(start, end);
        const q: Vector2d = Line.pointToLine(point, a, b, c);
        const t = Math.abs(start.x - end.x) > 0.00000001 ? (q.x - start.x) / (end.x - start.x) : (q.y - start.y) / (end.y - start.y);
        if (t <= 0) {
            return Vector2d.dist(point, start);
        } else if (t >= 1) {
            return Vector2d.dist(point, end);
        } else {
            return Vector2d.dist(point, q);
        }
    }

    /**
     * Given two line segments, find the point where these cross.
     * If line segments are non-parallel, a LineSegIntersection is returned, otherwise null
     */
    public static line2line(seg1: [Vector2d, Vector2d], seg2: [Vector2d, Vector2d]): LineSegIntersection | null {
        const delta1: Vector2d = seg1[1].minus(seg1[0]);
        const delta2: Vector2d = seg2[1].minus(seg2[0]);
        const det: number = delta1.x * delta2.y - delta1.y * delta2.x;
        if (Math.abs(det) < 0.000000001) {
            return null;
        }
        const t1: number = (delta2.y * (seg2[0].x - seg1[0].x) - delta2.x * (seg2[0].y - seg1[0].y)) / det;
        const t2: number = (delta1.y * (seg2[0].x - seg1[0].x) - delta1.x * (seg2[0].y - seg1[0].y)) / det;
        return {
            inRange: t1 > 0 && t1 < 1 && t2 > 0 && t2 < 1,
            t1,
            t2,
            p: seg1[0].plus(delta1.multiply(t1))
        };
    }


}