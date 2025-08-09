import React, {JSX, useEffect, useState} from "react";

type EditableInputProps = {
    onCommitted: (value: string) => void,
    initialValue: string,
    min: number,
    max:number,
    error?: boolean
}

export function EditableInput(props: EditableInputProps): JSX.Element {
    const [value, setValue] = useState(props.initialValue); // committed value
    const [tempValue, setTempValue] = useState(value);  // editable/display value

    const commitChange = () => {
        if (tempValue !== value) {
            setValue(tempValue);
            props.onCommitted(tempValue);
        }
    };

    const handleKeyDown = (e:any) => {
        if (e.key === "Enter") {
            commitChange();
            e.target.blur(); // optional: remove focus after pressing Enter
        }
    };

    useEffect(() => {
        setTempValue(props.initialValue);
    }, [props.initialValue]);

    const valid = props.min<=parseFloat(value) && props.max>=parseFloat(value) && props.error!==true

    return (
        <input className={valid ? "" : "invalid"}
            type="text"
    value={tempValue}
    onChange={(e) => setTempValue(e.target.value)}
    onBlur={commitChange}
    onKeyDown={handleKeyDown}
    />
);
}