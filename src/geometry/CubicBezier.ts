import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";

// Cubic bezier segment
export interface CubicBezierSegment {
    c1: Vector2d;
    c2: Vector2d;
    c3: Vector2d;
    c4: Vector2d;
}

// A Path consisting of a sequence of cubic bezier segments.
// The segments are assumed to be connected so that the end of one segment is the start of the next.
export class CubicBezier {
    private segs: CubicBezierSegment[];

    constructor(segs: CubicBezierSegment[]) {
        this.segs = segs;
    }

    public transform(matrix: Matrix3x3): CubicBezier {
        return new CubicBezier(this.segs.map(seg => ({
            c1: matrix.transform(seg.c1),
            c2: matrix.transform(seg.c2),
            c3: matrix.transform(seg.c3),
            c4: matrix.transform(seg.c4),
        })))
    }

    public getSegments() {
        return [...this.segs]
    }
}