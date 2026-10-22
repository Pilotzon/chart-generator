import { useEffect, useRef, useState } from 'react';
import { IconMinus, IconPlus } from './Icons.jsx';
import { Dropdown } from './Dropdown.jsx';
import { FontDropdown } from './FontDropdown.jsx';

const clamp = (v, min, max) => {
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
};

/**
 * Number input with a local text buffer, so the user can clear the field / type "-" / "1."
 * without the value being rewritten under the cursor.
 * commitOn="input" emits on every valid keystroke, "blur" only when leaving the field.
 */
export function NumberInput({
    value, onCommit, min, max, step, commitOn = 'input', clampOnBlur = true, className, onBlur, onFocus, ...rest
}) {
    const [text, setText] = useState(String(value ?? ''));
    const focused = useRef(false);

    useEffect(() => {
        if (!focused.current) setText(String(value ?? ''));
    }, [value]);

    const commit = (raw, final) => {
        const n = parseFloat(raw);
        if (Number.isNaN(n)) return false;
        const next = final && clampOnBlur ? clamp(n, min, max) : n;
        onCommit(next);
        if (final) setText(String(next));
        return true;
    };

    return (
        <input
            {...rest}
            type="number"
            className={className}
            value={text}
            min={min}
            max={max}
            step={step}
            onFocus={(e) => { focused.current = true; onFocus?.(e); }}
            onChange={(e) => {
                setText(e.target.value);
                if (commitOn === 'input') commit(e.target.value, false);
            }}
            onBlur={(e) => {
                focused.current = false;
                if (!commit(e.target.value, true)) setText(String(value ?? ''));
                onBlur?.(e);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
    );
}

/** −/+ stepper around a number input. */
export function NumberStepper({ value, onChange, min, max, step = 1, inputStep, decimals }) {
    const bump = (dir) => {
        const cur = parseFloat(value);
        const base = Number.isNaN(cur) ? 0 : cur;
        let next = clamp(base + dir * step, min, max);
        const d = decimals !== undefined ? decimals : (String(step).split('.')[1] || '').length;
        next = parseFloat(next.toFixed(d));
        onChange(next);
    };
    return (
        <div className="number-stepper">
            <button type="button" className="stepper-btn" tabIndex={-1} onClick={() => bump(-1)}><IconMinus /></button>
            <NumberInput value={value} onCommit={onChange} min={min} max={max} step={inputStep ?? step} />
            <button type="button" className="stepper-btn" tabIndex={-1} onClick={() => bump(1)}><IconPlus /></button>
        </div>
    );
}

export function Toggle({ checked, onChange, disabled }) {
    return (
        <label className="toggle-switch">
            <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
            <span className="toggle-slider" />
        </label>
    );
}

export function ColorInput({ value, onChange, title }) {
    return <input type="color" value={value} title={title} onChange={e => onChange(e.target.value)} />;
}

export function RangeInput({ value, onChange, min = 0, max = 1, step = 0.05 }) {
    return (
        <input
            type="range" value={value} min={min} max={max} step={step}
            onChange={e => onChange(parseFloat(e.target.value))}
        />
    );
}

/** `<label> … control` row. */
export function Row({ label, children, className = '', disabled = false }) {
    return (
        <div className={`control-row ${className}`} data-disabled={disabled ? 'true' : undefined}>
            {label !== undefined && <label>{label}</label>}
            {children}
        </div>
    );
}

export function ToggleRow({ label, checked, onChange, className }) {
    return (
        <Row label={label} className={className}>
            <Toggle checked={checked} onChange={onChange} />
        </Row>
    );
}

export function StepperRow({ label, className, ...stepper }) {
    return <Row label={label} className={className}><NumberStepper {...stepper} /></Row>;
}

export function ColorRow({ label, value, onChange, className }) {
    return <Row label={label} className={className}><ColorInput value={value} onChange={onChange} /></Row>;
}

export function RangeRow({ label, className, ...range }) {
    return <Row label={label} className={className}><RangeInput {...range} /></Row>;
}

export function DropdownRow({ label, className, ...dd }) {
    return <Row label={label} className={className}><Dropdown {...dd} /></Row>;
}

export function FontRow({ label = 'Font', value, onChange }) {
    return <Row label={label}><FontDropdown value={value} onChange={onChange} /></Row>;
}

/** Animated container for settings that only apply when a switch is on. */
export function Reveal({ show = true, children, className = '' }) {
    if (!show) return null;
    return <div className={`reveal ${className}`}>{children}</div>;
}

export function SectionLabel({ children }) {
    return <div className="section-label">{children}</div>;
}

export function Divider() {
    return <div className="subgroup-divider" />;
}
