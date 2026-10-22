import { createPortal } from 'react-dom';
import { FONT_HARD_MAX, FONT_SIZE_LIMITS } from '../../lib/constants.js';
import { Modal } from '../modals/Modals.jsx';
import { SvgIcon } from './SvgIcon.jsx';
import { useEffect, useRef, useState } from 'react';
import { IconMinus, IconPlus, IconWarning } from './Icons.jsx';
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
export function NumberStepper({ value, onChange, min, max, step = 1, inputStep, decimals, commitOn, className = '' }) {
    const bump = (dir) => {
        const cur = parseFloat(value);
        const base = Number.isNaN(cur) ? 0 : cur;
        let next = clamp(base + dir * step, min, max);
        const d = decimals !== undefined ? decimals : (String(step).split('.')[1] || '').length;
        next = parseFloat(next.toFixed(d));
        onChange(next);
    };
    return (
        <div className={`number-stepper ${className}`}>
            <button type="button" className="stepper-btn" tabIndex={-1} onClick={() => bump(-1)}><IconMinus /></button>
            <NumberInput value={value} onCommit={onChange} min={min} max={max} step={inputStep ?? step} commitOn={commitOn} />
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
export const EMPTY_HINT = 'Write some text first to unlock this option';

export function Row({ label, children, className = '', disabled = false, hint }) {
    return (
        <div
            className={`control-row ${className}`}
            data-disabled={disabled ? 'true' : undefined}
            aria-disabled={disabled ? 'true' : undefined}
            inert={disabled ? true : undefined}
            title={disabled ? (hint || EMPTY_HINT) : undefined}
        >
            {label !== undefined && <label>{label}</label>}
            {children}
        </div>
    );
}

/**
 * Font size row. Up to `limitKey`'s recommended maximum it is a plain stepper; going above it first asks for
 * confirmation, because the chart's frame will then grow to make room (only the text gets bigger).
 */
export function FontSizeRow({ label = 'Size', limitKey, min = 8, value, onChange, disabled, className }) {
    const { max, expand } = FONT_SIZE_LIMITS[limitKey];
    const [pending, setPending] = useState(null);
    const [nonce, setNonce] = useState(0);
    const over = (parseFloat(value) || 0) > max;

    const request = (n) => {
        if (n > max && !over) { setPending(n); return; }   // crossing the limit: warn first
        onChange(Math.min(n, FONT_HARD_MAX));
    };
    const cancel = () => { setPending(null); setNonce(k => k + 1); };   // remount → the field shows the old value again
    const confirm = () => { const n = pending; setPending(null); onChange(Math.min(n, FONT_HARD_MAX)); };

    return (
        <Row label={label} className={className} disabled={disabled}>
            <NumberStepper
                key={nonce}
                className={over ? 'is-over-limit' : ''}
                min={min} max={FONT_HARD_MAX} value={value} onChange={request} commitOn="blur"
            />
            {pending !== null && createPortal(
                <Modal
                    icon={<IconWarning />}
                    title={`Text above ${max}px`}
                    message={expand
                        ? `Sizes above ${max}px won't be squeezed into the current frame. Instead the chart's frame will expand to make room for the bigger text: only the text grows, the plot, the line and everything else keep their size and look.`
                        : `Sizes above ${max}px are bigger than recommended. This text just grows; the chart's frame stays as it is, so check that it still fits.`}
                    confirmLabel={expand ? 'Expand frame & continue' : `Use ${pending}px`}
                    confirmClass="btn-primary"
                    onCancel={cancel}
                    onConfirm={confirm}
                />,
                document.body
            )}
        </Row>
    );
}

export function ToggleRow({ label, checked, onChange, className }) {
    return (
        <Row label={label} className={className}>
            <Toggle checked={checked} onChange={onChange} />
        </Row>
    );
}

export function StepperRow({ label, className, disabled, ...stepper }) {
    return <Row label={label} className={className} disabled={disabled}><NumberStepper {...stepper} /></Row>;
}

export function ColorRow({ label, value, onChange, className }) {
    return <Row label={label} className={className}><ColorInput value={value} onChange={onChange} /></Row>;
}

export function RangeRow({ label, className, ...range }) {
    return <Row label={label} className={className}><RangeInput {...range} /></Row>;
}

export function DropdownRow({ label, className, disabled, hint, ...dd }) {
    return <Row label={label} className={className} disabled={disabled} hint={hint}><Dropdown {...dd} /></Row>;
}

/** Segmented 3-button picker (left / center / right) drawn with the text-align glyphs. */
export function AlignButtons({ value, options, onChange }) {
    return (
        <div className="align-buttons" role="radiogroup">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={value === opt.value}
                    aria-label={opt.label}
                    title={opt.label}
                    className={`align-btn ${value === opt.value ? 'is-on' : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    <SvgIcon name={opt.icon} className="align-btn-icon" />
                </button>
            ))}
        </div>
    );
}

export function AlignRow({ label, className, disabled, ...props }) {
    return <Row label={label} className={className} disabled={disabled}><AlignButtons {...props} /></Row>;
}

export function FontRow({ label = 'Font', value, onChange, disabled }) {
    return <Row label={label} disabled={disabled}><FontDropdown value={value} onChange={onChange} /></Row>;
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
