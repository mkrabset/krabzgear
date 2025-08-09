import React from 'react';
import {EditableInput} from "./EditableInput";

interface InvoluteGearParametersProps {
    onParametersChange: (parameters: InvoluteParameters) => void;
    parameters: InvoluteParameters;
    invalids: string[];
}

export interface InvoluteParameters {
    numberOfTeeth: number;
    module: number;
    pressureAngle: number;
    addendumCoeff: number;
    dedendumCoeff: number;
    backlash: number;
    shaftDiameter: number;
    createRing: boolean;
    numberOfRingTeeth: number;
}

export const defaultInvoluteValues: InvoluteParameters = {
    numberOfTeeth: 20,
    module: 2.0,
    pressureAngle: 20,
    addendumCoeff: 1.0,
    dedendumCoeff: 1.25,
    backlash: 0.0,
    shaftDiameter: 8.0,
    createRing: false,
    numberOfRingTeeth: 50
}

export function InvoluteGearParameters({onParametersChange, parameters}: InvoluteGearParametersProps) {
    // Calculated values
    const pitchDiameter = parameters.module * parameters.numberOfTeeth;
    const outsideDiameter = pitchDiameter + 2 * parameters.addendumCoeff * parameters.module;
    const rootDiameter = pitchDiameter - 2 * parameters.dedendumCoeff * parameters.module;
    const baseDiameter = pitchDiameter * Math.cos(parameters.pressureAngle * Math.PI / 180);
    const ringPitchDiameter = pitchDiameter/parameters.numberOfTeeth * parameters.numberOfRingTeeth

    // Helper function for updating individual parameters
    const updateParameter = (field: keyof InvoluteParameters, value: number) => {
        onParametersChange({
            ...parameters,
            [field]: value
        });
    };

    return (
        <>
            <h3>Basic Parameters</h3>

            <div className="parameter-group">
                <label htmlFor="teeth">Number of teeth (Z):</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('numberOfTeeth', parseInt(v))}
                    initialValue={"" + parameters.numberOfTeeth}
                    min={6}
                    max={10000}
                />
            </div>

            <div className="parameter-group">
                <label htmlFor="module">Module (m) [mm]:</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('module', parseFloat(v))}
                    initialValue={"" + parameters.module}
                    min={0.01}
                    max={200}
                />
            </div>

            <div className="parameter-group">
                <label htmlFor="pressure-angle">Pressure angle (α) [°]:</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('pressureAngle', parseFloat(v))}
                    initialValue={"" + parameters.pressureAngle}
                    min={1}
                    max={32}
                />
            </div>

            <h3>Geometric Parameters</h3>

            <div className="parameter-group">
                <label htmlFor="addendum">Addendum coefficient (ha*):</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('addendumCoeff', parseFloat(v))}
                    initialValue={"" + parameters.addendumCoeff}
                    min={0.5}
                    max={2}
                />
            </div>

            <div className="parameter-group">
                <label htmlFor="dedendum">Dedendum coefficient (hf*):</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('dedendumCoeff', parseFloat(v))}
                    initialValue={"" + parameters.dedendumCoeff}
                    min={0.5}
                    max={2}
                />
            </div>


            <div className="parameter-group">
                <label htmlFor="backlash">Backlash [mm]:</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('backlash', parseFloat(v))}
                    initialValue={"" + parameters.backlash}
                    min={0}
                    max={10}
                />
            </div>

            <div className="parameter-group">
                <label htmlFor="shaft-diameter">Shaft diameter [mm]:</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('shaftDiameter', parseFloat(v))}
                    initialValue={"" + parameters.shaftDiameter}
                    min={0.1}
                    max={1000}
                />
            </div>

            <hr/>

            <div className="parameter-group">
                <label htmlFor="ring">Generate ring gear:</label>
                <input type={"checkbox"} checked={parameters.createRing} onChange={(e)=>{
                    onParametersChange({...parameters, createRing: e.target.checked});
                }}
                />
            </div>


            {parameters.createRing && <div className="parameter-group">
                <label htmlFor="teeth">Number of ring teeth:</label>
                <EditableInput
                    onCommitted={(v: string) => updateParameter('numberOfRingTeeth', parseInt(v))}
                    initialValue={"" + parameters.numberOfRingTeeth}
                    min={7}
                    max={1000}
                    error={parameters.numberOfRingTeeth<=parameters.numberOfTeeth}
                />
            </div>
            }

            <hr/>

            <h3>Calculated Values</h3>

            <div className="calculated-values">
                <div className="calculated-item">
                    <span className={"blue"}>Root diameter (df):</span>
                    <span>{rootDiameter.toFixed(2)} mm</span>
                </div>

                <div className="calculated-item">
                    <span className={"red"}>Base diameter (db):</span>
                    <span>{baseDiameter.toFixed(2)} mm</span>
                </div>

                <div className="calculated-item">
                    <span className={"green"}>Pitch diameter (d):</span>
                    <span>{pitchDiameter.toFixed(2)} mm</span>
                </div>

                <div className="calculated-item">
                    <span>Outside diameter (da):</span>
                    <span>{outsideDiameter.toFixed(2)} mm</span>
                </div>

                {parameters.createRing && <div className="calculated-item">
                    <span className={"green"}>Ring pitch diameter:</span>
                    <span>{ringPitchDiameter.toFixed(2)} mm</span>
                </div>}
            </div>
        </>
    );
}
