import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import {defaultInvoluteValues, InvoluteGearParameters, InvoluteParameters} from './components/InvoluteGearParameters';
import {GearCanvas, GearData} from './components/GearCanvas';
import {InvoluteGear} from "./geometry/InvoluteGear";
import {VSplit} from "./components/VSplit";
import {RingGear} from "./geometry/RingGear";
import {Matrix3x3} from "@mkrabset/krabzcnc-view2d/dist/cjs/2d/Matrix3x3";
import {Vector2d} from "@mkrabset/krabzcnc-view2d/dist/esm/2d/Vector2d";

function App() {
    const [involuteParameters, setInvoluteParameters] = useState<InvoluteParameters>({...defaultInvoluteValues});

    const [width, setWidth] = useState(window.innerWidth)
    const [height, setHeight] = useState(window.innerHeight)
    const [toolbarWidth, setToolbarWidth] = useState(350)


    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.addEventListener("resize", (e) => {
            if (width !== window.innerWidth || height !== window.innerHeight) {
                setWidth(window.innerWidth)
                setHeight(window.innerHeight)
            }
        })
    })

    const onSplitChanged = (left: number, right: number) => {
        setToolbarWidth(left)
    }


    const calcGearData: () => GearData = () => {
        try {
            const gear = new InvoluteGear(involuteParameters);
            const parts = gear.generateGearProfile();

            if (involuteParameters.createRing) {
                const gearWithoutBacklash = new InvoluteGear({...involuteParameters, backlash: 0});

                const ringGear = new RingGear(gearWithoutBacklash, involuteParameters.numberOfRingTeeth, involuteParameters.backlash)
                const ringGearPart = ringGear.calculateGear()
                const rp = gear.getDimensions().pitchRadius

                const ringTranslationHorizontal = Matrix3x3.translate(new Vector2d(rp * (1 - involuteParameters.numberOfRingTeeth / involuteParameters.numberOfTeeth), 0))
                parts.push(ringGearPart.transform(ringTranslationHorizontal))

                // Draw cutpiece for ring gear (for debugging)
                //const cutPiece=ringGear.calculateCutPiece()
                //parts.push(cutPiece.toSimpleBezier())
            }


            const dimensions = gear.getDimensions();
            return {
                beziers: parts,
                dimensions,
                exportFileName: `gear_T${involuteParameters.numberOfTeeth}_M${involuteParameters.module}`,
                params: involuteParameters
            }
        } catch (e) {
            console.error(e)
            return emptyGearData()
        }
    }

    const emptyGearData: () => GearData = () => {
        return {
            beziers: [],
            dimensions: {
                pitchRadius: 0,
                baseRadius: 0,
                outsideRadius: 0,
                rootRadius: 0,
                module: 0,
                numberOfTeeth: 0,
                shaftDiameter: 0
            },
            exportFileName: "",
            params: involuteParameters
        }
    }

    const setGearParams = (p: any) => {
        setInvoluteParameters(p as InvoluteParameters);
    }

    const problems = [
        {param: "numberOfTeeth", v: involuteParameters.numberOfTeeth, min: 6, max: 1000},
        {param: "module", v: involuteParameters.module, min: 0.01, max: 200},
        {param: "pressureAngle", v: involuteParameters.pressureAngle, min: 1, max: 32},
        {param: "addendumCoeff", v: involuteParameters.addendumCoeff, min: 0.5, max: 2},
        {param: "dedendumCoeff", v: involuteParameters.dedendumCoeff, min: 0.5, max: 2},
        {param: "backlash", v: involuteParameters.backlash, min: 0, max: 10},
        {param: "shaftDiameter", v: involuteParameters.shaftDiameter, min: 0.1, max: 1000},
        {param: "numberOfRingTeeth", v: involuteParameters.numberOfRingTeeth, min: 7, max: 1000}
    ]
        .filter(check => check.v < check.min || check.v > check.max)
        .map(check => check.param)

    if (involuteParameters.createRing && involuteParameters.numberOfRingTeeth <= involuteParameters.numberOfTeeth) {
        problems.push("numberOfRingTeeth")
    }

    return (
        <div className="App" ref={containerRef}>
            <VSplit onChanged={onSplitChanged} minLeft={200} minRight={200}>
                <div className="left-panel">
                    <h2>Parameters</h2>
                        <InvoluteGearParameters
                            onParametersChange={setInvoluteParameters}
                            parameters={involuteParameters}
                            invalids={problems}
                        />
                </div>

                <GearCanvas
                    gearData={problems.length === 0 ? calcGearData() : emptyGearData()}
                    onImported={(p) => setGearParams(p)}
                    width={width - toolbarWidth - 10}
                    height={height - 80}
                />
            </VSplit>
        </div>
    );
}

export default App;
