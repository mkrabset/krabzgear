import {Line} from "./Line";
import {Polygon} from "./Polygon";
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";
import {QuadTree} from "./QuadTree";
import {BoundingBox} from "./BoundingBox";

// Line segment with extra information to support this boolean operation
type LinkedSeg = {
    line: Line;
    next: LinkedSeg;
    taken: boolean;
    crossings: SegCrossing[]
}

// Representation of a intersection between two line segments
type SegCrossing = {
    segA: LinkedSeg,  // line a
    segB: LinkedSeg,  // line b
    tA: number,       // t-value at cross point for line a
    tB: number,       // t-value at cross point for line b
    p: Vector2d,      // the cross point
}

export class BooleanPolygonOperation {

    // Combines two polygons. CCW polygons are added, CW polygons are subtracted.  The largest resulting CCW polygon is returned.
    public static combine(polyA: Polygon, polyB: Polygon): Polygon {
        const aSegs = BooleanPolygonOperation.getLinkedSegs(polyA);
        const bSegs = BooleanPolygonOperation.getLinkedSegs(polyB);
        const newSegs: LinkedSeg[] = [];

        // Create a quad tree and add all segments of polygon A into it
        const qt = new QuadTree<LinkedSeg>(BoundingBox.merge([polyA.getBounds(), polyB.getBounds()])!!, 2)
        aSegs.forEach(aSeg => {
            qt.add(aSeg, aSeg.line.getBounds())
        })


        const crossings: SegCrossing[] = []
        bSegs.forEach(bSeg => {

            // Handle all matching line segments from polyA with overlapping bounds with bSeg. These are lines that may cross bSeg
            qt.forEachMatch(bSeg.line.getBounds(), (aSeg) => {
                if (aSeg.line.getBounds().overlaps(bSeg.line.getBounds())) {

                    // Check if they actually cross, and get SegCrossing if they do
                    const i = Line.line2line([aSeg.line.start, aSeg.line.end], [bSeg.line.start, bSeg.line.end])
                    if (i !== null && i.inRange) {
                        const crossing: SegCrossing = {segA: aSeg, segB: bSeg, tA: i.t1, tB: i.t2, p: i.p}
                        crossings.push(crossing)
                        aSeg.crossings.push(crossing)
                        bSeg.crossings.push(crossing)
                    }
                }
            })

        })

        // For each crossing, split the segments and swap successors
        crossings.forEach(crossing => {
            const [a1, a2] = BooleanPolygonOperation.split(crossing.segA, crossing)
            const [b1, b2] = BooleanPolygonOperation.split(crossing.segB, crossing)
            a1.next = b2
            b1.next = a2
            newSegs.push(a2, b2)
        })

        const shapes: Polygon[] = []
        var current: Line[] = []
        const allOrigSegs = [...aSegs, ...bSegs, ...newSegs]

        // Collect resulting polygons
        allOrigSegs.forEach(seg => {
            while (!seg.taken) {
                seg.taken = true
                current.push(seg.line)
                seg = seg.next
            }
            if (current.length > 0) {
                shapes.push(Polygon.fromLines(current))
                current = []
            }
        })

        // Return polygon with larges positive area
        return shapes.reduce((s1, s2) => s1.getArea() > s2.getArea() ? s1 : s2)
    }

    private static getLinkedSegs(shape: Polygon): LinkedSeg[] {
        const linkedSegs: LinkedSeg[] = shape.getLines().map(seg => ({
            line: seg,
            taken: false,
            crossings: []
        })) as unknown as LinkedSeg[]
        linkedSegs.forEach((seg, index, arr) => {
            seg.next = arr[(index + 1) % arr.length]
        })
        return linkedSegs
    }

    private static split(seg: LinkedSeg, crossing: SegCrossing) {
        const getT = (seg: LinkedSeg, crossing: SegCrossing) => seg === crossing.segA ? crossing.tA : crossing.tB

        const t: number = getT(seg, crossing)
        const leftCrossings: SegCrossing[] = seg.crossings.filter((crossing) => getT(seg, crossing) < t);
        const rightCrossings: SegCrossing[] = seg.crossings.filter((crossing) => getT(seg, crossing) > t);
        const leftLine = new Line(seg.line.start, crossing.p)
        const rightLine = new Line(crossing.p, seg.line.end)

        const rightSeg: LinkedSeg = {...seg, line: rightLine, crossings: rightCrossings}
        seg.line = leftLine;
        seg.crossings = leftCrossings;

        // Update seg reference on all crossings in right seg to point to rightseg instead of seg
        rightSeg.crossings.forEach(crossing => {
            if (crossing.segA === seg) {
                crossing.segA = rightSeg;
            } else {
                crossing.segB = rightSeg;
            }
        })
        return [seg, rightSeg];
    }

}