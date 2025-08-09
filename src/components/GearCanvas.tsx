import React from 'react';
import {SvgExporter} from '../utils/SvgExporter';
import {View2d} from "@mkrabset/krabzcnc-view2d";
import {m3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/components/View2d";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {CubicBezier} from "../geometry/CubicBezier";

interface GearCanvasProps {
    gearData: GearData,
    onImported: (params: any) => void,
    width: number,
    height: number
}

export type GearData = {
    beziers: CubicBezier[],
    dimensions: GearDimensions,
    exportFileName: string,
    params: any
}

export type GearDimensions = {
    pitchRadius: number,
    baseRadius: number,
    outsideRadius: number,
    rootRadius: number,
    module: number,
    numberOfTeeth: number,
    shaftDiameter: number
}

export function GearCanvas(props: GearCanvasProps) {
    const centerX = 0;
    const centerY = 0;
    const scale = 1;

    const repaintGear = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, real2view: m3x3) => {
        ctx.save()
        const r2v: Matrix3x3 = new Matrix3x3(real2view);
        const beziers = props.gearData.beziers;
        beziers.forEach(bezier => {
            ctx.transform(...r2v.ctxArgs())
            ctx.lineWidth = 3;
            ctx.beginPath();
            bezier.getSegments().forEach((segment, index) => {
                const c1 = transformPoint(segment.c1, centerX, centerY, scale);
                const c2 = transformPoint(segment.c2, centerX, centerY, scale);
                const c3 = transformPoint(segment.c3, centerX, centerY, scale);
                const c4 = transformPoint(segment.c4, centerX, centerY, scale);

                if (index === 0) {
                    ctx.moveTo(c1.x, c1.y);
                }

                ctx.bezierCurveTo(c2.x, c2.y, c3.x, c3.y, c4.x, c4.y);
            });

            ctx.closePath();
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.stroke();
        })


        // Draw shaft hole
        if (props.gearData.dimensions.shaftDiameter > 0) {
            const shaftRadius = props.gearData.dimensions.shaftDiameter / 2;
            ctx.transform(...r2v.ctxArgs())
            ctx.beginPath();
            ctx.arc(centerX, centerY, shaftRadius * scale, 0, 2 * Math.PI);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.stroke();
        }

        // Draw reference circles
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Pitch circle
        ctx.strokeStyle = '#080';
        ctx.transform(...r2v.ctxArgs())
        ctx.beginPath();
        ctx.arc(centerX, centerY, props.gearData.dimensions.pitchRadius * scale, 0, 2 * Math.PI);
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.stroke();

        // Base circle
        ctx.strokeStyle = '#f00';
        ctx.transform(...r2v.ctxArgs())
        ctx.beginPath();
        ctx.arc(centerX, centerY, props.gearData.dimensions.baseRadius * scale, 0, 2 * Math.PI);
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.stroke();

        // Root circle
        ctx.strokeStyle = '#00f';
        ctx.transform(...r2v.ctxArgs())
        ctx.beginPath();
        ctx.arc(centerX, centerY, props.gearData.dimensions.rootRadius * scale, 0, 2 * Math.PI);
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.stroke();
        ctx.restore()
    }

    const transformPoint = (point: { x: number; y: number }, centerX: number, centerY: number, scale: number) => ({
        x: centerX + point.x * scale,
        y: centerY + point.y * scale
    });

    const handleExportSvg = () => {
        SvgExporter.exportGearToSvg(props.gearData.beziers, props.gearData.dimensions, props.gearData.params, props.gearData.exportFileName);
    };

    const handleImportSvg = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const importedParameters = await SvgExporter.importParametersFromSvg(file);
                // Notify parent component about imported parameters
                props.onImported(importedParameters);
            } catch (error) {
                alert('Failed to import parameters from SVG: ' + error);
            }
        };
        input.click();
    };

    return (
        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
            <div style={{marginBottom: '10px', display: 'flex', gap: '10px'}}>
                <button
                    onClick={handleExportSvg}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    Export to SVG
                </button>
                <button
                    onClick={handleImportSvg}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Import from SVG
                </button>
                <div><h4>KrabzGEAR © Marius Krabset 2025</h4></div>
            </div>


            <View2d width={props.width} height={props.height} canvasId={"view2dCanvas"} repaint={repaintGear}/>
        </div>
    );
}
