import "./VSplit.css"
import {ReactNode} from "react";


type VSplitProps = {
    children: [ReactNode, ReactNode],
    onChanged: (left:number, right:number)=>void,
    minLeft:number,
    minRight:number
}


export function VSplit(props: VSplitProps) {

    const initResize = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget?.firstChild?.nextSibling) {
            const vSplit = e.currentTarget
            const splitter = e.target as HTMLDivElement
            splitter.style.cursor = 'col-resize';
            const prev: HTMLDivElement = splitter.previousSibling as HTMLDivElement
            const next: HTMLDivElement = splitter.nextSibling as HTMLDivElement
            e.preventDefault()

            let prevSize = prev.offsetWidth;
            let nextSize = next.offsetWidth;
            const sumSize = prevSize + nextSize;
            let lastPos = e.pageX;

            const onMouseMove = (me: React.MouseEvent) => {
                var pos = me.pageX;
                var d = pos - lastPos;
                prevSize += d;
                nextSize -= d;
                if (prevSize < props.minLeft) {
                    prevSize=props.minLeft
                    nextSize=sumSize-prevSize
                }
                if (nextSize < props.minRight) {
                    nextSize = props.minRight;
                    prevSize=sumSize-nextSize
                }
                var prevGrowNew = prevSize/sumSize;
                var nextGrowNew = nextSize/sumSize;
                props.onChanged(prevSize, nextSize)
                prev.style.minWidth=""+prevSize+"px"
                prev.style.maxWidth=""+prevSize+"px"
                next.style.minWidth=""+nextSize+"px"
                next.style.maxWidth=""+nextSize+"px"
                lastPos = pos;
            }

            const onMouseUp = (mu: React.MouseEvent) => {
                // Change cursor to signal a state's change: stop resizing.
                const html = document.querySelector('html');
                splitter.style.cursor = 'ew-resize';

                vSplit.removeEventListener("mousemove", onMouseMove as any);
                vSplit.removeEventListener("mouseup", onMouseUp as any);
            }

            vSplit.addEventListener("mousemove", onMouseMove as any);
            vSplit.addEventListener("mouseup", onMouseUp as any);

        }
    }

    return (
        <div className={"vsplit"} onMouseDown={initResize}>
            <div className={"left"} >
                {props.children[0]}
            </div>
            <div className={"splitter"}/>
            <div className={"right"} >
                {props.children[1]}
            </div>
        </div>
    )

}