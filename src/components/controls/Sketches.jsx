import { useSettings } from '../../hooks/useSettings.js';

export const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Mini version of the chart lines (stretched to the frame). Shared by every sketch picker. */
export function ChartLines({ state, className = '' }) {
    const span = state.xMax - state.xMin || 1;
    const ySpan = state.yMax - state.yMin || 1;
    return (
        <svg className={`sketch-lines ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {state.charts.map(chart => {
                const pts = [...chart.points].sort((a, b) => a.x - b.x).map(p => {
                    const x = clamp01((p.x - state.xMin) / span) * 100;
                    const y = (1 - clamp01((p.y - state.yMin) / ySpan)) * 100;
                    return `${x.toFixed(2)},${y.toFixed(2)}`;
                });
                return (
                    <polyline
                        key={chart.id}
                        points={pts.join(' ')}
                        fill="none"
                        stroke={chart.color}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                );
            })}
        </svg>
    );
}

/* ─────────────────────────────────────────────
   Edge picker: click the sides of a little chart frame to switch them on / off.
   Used for "Border lines" and "Axis arrows → Apply to".
   `prefix` + side name is the state key, e.g. prefix="border" → borderTop.
   ───────────────────────────────────────────── */
const SIDES = [
    { key: 'Top', label: 'Top' },
    { key: 'Right', label: 'Right' },
    { key: 'Bottom', label: 'Bottom' },
    { key: 'Left', label: 'Left' }
];

export function EdgeSketch({ prefix, values, onToggle, titleSuffix = 'border', color }) {
    const { state } = useSettings();
    return (
        <div className="sketch-frame edge-sketch" role="group" aria-label={`Apply ${titleSuffix} to`}>
            <ChartLines state={state} />
            {SIDES.map(side => {
                const on = !!values[prefix + side.key];
                return (
                    <button
                        key={side.key}
                        type="button"
                        className={`edge-sketch-edge edge-${side.key.toLowerCase()} ${on ? 'is-on' : ''}`}
                        aria-pressed={on}
                        title={`${side.label} ${titleSuffix}`}
                        onClick={() => onToggle(prefix + side.key, !on)}
                    >
                        <span className="edge-sketch-line" style={on && color ? { background: color } : undefined} />
                        <span className="edge-sketch-label">{side.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Position picker: click the corner where the legend should sit inside a little frame.
   Option values look like "top-left" or "bottom-right".
   ───────────────────────────────────────────── */
export function PositionSketch({ options, value, onChange }) {
    const { state } = useSettings();
    return (
        <div className={`sketch-frame pos-sketch pos-sketch-legend`} role="radiogroup">
            <ChartLines state={state} />
            {options.map(opt => {
                const v = opt.value.includes('bottom') ? 'bottom' : 'top';
                const h = opt.value.includes('left') ? 'left' : opt.value.includes('right') ? 'right' : 'center';
                const on = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        title={opt.label}
                        className={`pos-chip v-${v} h-${h} ${on ? 'is-on' : ''}`}
                        onClick={() => onChange(opt.value)}
                    >
                        <span className="pos-chip-swatch" />
                        <span className="pos-chip-bar" />
                    </button>
                );
            })}
        </div>
    );
}
