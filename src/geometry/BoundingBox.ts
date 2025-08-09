import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";

// Represents a rectangulary boundary in x-y space.
export class BoundingBox {
    public readonly min: Vector2d;
    public readonly max: Vector2d;

    public constructor(min: Vector2d, max: Vector2d) {
        this.min = min;
        this.max = max;
        if (min.x > max.x || min.y > max.y) {
            throw 'min>max';
        }
    }

    public overlaps(bb: BoundingBox): boolean {
        return BoundingBox.rangesOverlap(this.min.x, this.max.x, bb.min.x, bb.max.x) && BoundingBox.rangesOverlap(this.min.y, this.max.y, bb.min.y, bb.max.y);
    }

    private static rangesOverlap(r1Min: number, r1Max: number, r2Min: number, r2Max: number) {
        return !(r1Max <= r2Min || r2Max <= r1Min);
    }

    public static merge(bbs: BoundingBox[]): BoundingBox | null {
        if (bbs.length === 0) {
            return null;
        }
        let [xMin, yMin, xMax, yMax]: number[] = [bbs[0].min.x, bbs[0].min.y, bbs[0].max.x, bbs[0].max.y];
        bbs.forEach((bb) => {
            xMin = Math.min(xMin, bb.min.x);
            yMin = Math.min(yMin, bb.min.y);
            xMax = Math.max(xMax, bb.max.x);
            yMax = Math.max(yMax, bb.max.y);
        });
        return new BoundingBox(new Vector2d(xMin, yMin), new Vector2d(xMax, yMax));
    }

    public static fromPoints(p1: Vector2d, p2: Vector2d): BoundingBox {
        return new BoundingBox(new Vector2d(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y)), new Vector2d(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y)));
    }

}
