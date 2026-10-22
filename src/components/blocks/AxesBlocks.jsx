import { useSettings } from '../../hooks/useSettings.js';
import { AXIS_ARROW_OPTIONS, GRID_STYLE_OPTIONS } from '../../lib/options.js';
import { BorderSelector } from '../controls/BorderSelector.jsx';
import {
    ColorRow, Divider, DropdownRow, NumberInput, RangeRow, Reveal, Row, SectionLabel, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';

function AxisScale({ axis }) {
    const { state, set } = useSettings();
    const k = (s) => axis + s;
    return (
        <>
            <Row label="Min / Max">
                <div className="dual-input">
                    <NumberInput step={0.1} value={state[k('Min')]} onCommit={v => set(k('Min'), v)} clampOnBlur={false} />
                    <NumberInput step={0.1} value={state[k('Max')]} onCommit={v => set(k('Max'), v)} clampOnBlur={false} />
                </div>
            </Row>
            <StepperRow label="Major Step" step={1} inputStep={0.1} min={0.1} value={state[k('Step')]} onChange={v => set(k('Step'), v)} />
            <StepperRow label="Subdivisions" min={1} max={10} value={state[k('SubDiv')]} onChange={v => set(k('SubDiv'), v)} />
        </>
    );
}

export function ScaleBlock() {
    return (
        <>
            <SectionLabel>X-Axis</SectionLabel>
            <AxisScale axis="x" />
            <SectionLabel>Y-Axis</SectionLabel>
            <AxisScale axis="y" />
        </>
    );
}

export function GridToggles() {
    const { state, set } = useSettings();
    return (
        <>
            <ToggleRow label="Vertical Grid" checked={state.showVerticalGrid} onChange={v => set('showVerticalGrid', v)} />
            <ToggleRow label="Horizontal Grid" checked={state.showHorizontalGrid} onChange={v => set('showHorizontalGrid', v)} />
            <ToggleRow label="Show Ticks" checked={state.showTicks} onChange={v => set('showTicks', v)} />
        </>
    );
}

export function GridStyleBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <ColorRow label="Grid Color" value={state.gridColor} onChange={v => set('gridColor', v)} />
            <RangeRow label="Grid Width" min={0.5} max={3} step={0.1} value={state.gridLineWidth} onChange={v => set('gridLineWidth', v)} />
            <DropdownRow
                label="Grid Style"
                value={state.gridLineStyle}
                options={GRID_STYLE_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                onChange={v => set('gridLineStyle', v)}
            />
            <Reveal show={state.showTicks}>
                <ColorRow label="Tick Color" value={state.tickColor} onChange={v => set('tickColor', v)} />
                <RangeRow label="Tick Length" min={3} max={15} step={1} value={state.tickLength} onChange={v => set('tickLength', v)} />
            </Reveal>
        </>
    );
}

export function BordersBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <SectionLabel>Border Lines</SectionLabel>
            <BorderSelector prefix="border" values={state} onToggle={set} color={state.borderColor} />
            <ColorRow label="Border Color" value={state.borderColor} onChange={v => set('borderColor', v)} />
            <RangeRow label="Border Width" min={0.5} max={4} step={0.1} value={state.borderWidth} onChange={v => set('borderWidth', v)} />
        </>
    );
}

export function AxisArrowsBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <ToggleRow label="Show Arrows" checked={state.showAxisArrows} onChange={v => set('showAxisArrows', v)} />
            <Reveal show={state.showAxisArrows}>
                <DropdownRow
                    label="Style"
                    value={state.axisArrowStyle}
                    options={AXIS_ARROW_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                    onChange={v => set('axisArrowStyle', v)}
                />
                <RangeRow label="Size" min={6} max={30} step={1} value={state.axisArrowSize} onChange={v => set('axisArrowSize', v)} />
                <SectionLabel>Apply to</SectionLabel>
                <BorderSelector prefix="arrow" values={state} onToggle={set} titleSuffix="arrow" />
            </Reveal>
        </>
    );
}

export function CanvasSizeBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <ToggleRow label="Square (1:1)" checked={state.squareMode} onChange={v => set('squareMode', v)} />
            {state.squareMode ? (
                <Reveal>
                    <StepperRow label="Size" step={50} min={300} max={2000} value={state.squareSize} onChange={v => set('squareSize', v)} />
                </Reveal>
            ) : (
                <Reveal>
                    <StepperRow label="Width" step={50} min={300} max={2000} value={state.canvasWidth} onChange={v => set('canvasWidth', v)} />
                    <StepperRow label="Height" step={50} min={300} max={2000} value={state.canvasHeight} onChange={v => set('canvasHeight', v)} />
                </Reveal>
            )}
        </>
    );
}

/** Classic "Axes & Grid" group. */
export function ClassicAxesGroupBody() {
    return (
        <>
            <GridToggles />
            <BordersBlock />
            <Divider />
            <ScaleBlock />
        </>
    );
}
