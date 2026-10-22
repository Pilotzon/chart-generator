import { useSettings } from '../../hooks/useSettings.js';
import { ARROW_OPTIONS, MARKER_OPTIONS } from '../../lib/options.js';
import {
    ColorRow, Divider, DropdownRow, RangeRow, Reveal, SectionLabel, ToggleRow
} from '../controls/Inputs.jsx';

export function LineBlock() {
    const { chart, setChart } = useSettings();
    return (
        <>
            <ToggleRow label="Show Line" checked={chart.showLine} onChange={v => setChart('showLine', v)} />
            <ColorRow label="Line Color" value={chart.lineColor} onChange={v => setChart('lineColor', v)} />
            <RangeRow label="Line Width" min={1} max={6} step={0.5} value={chart.lineWidth} onChange={v => setChart('lineWidth', v)} />
            <RangeRow label="Smoothness" min={0} max={1} step={0.05} value={chart.lineTension} onChange={v => setChart('lineTension', v)} />
        </>
    );
}

export function ArrowsBlock() {
    const { chart, setChart } = useSettings();
    return (
        <>
            <DropdownRow label="Start Arrow" value={chart.arrowStart} options={ARROW_OPTIONS.map(o => ({ ...o, icon: o.value === 'none' ? 'none' : o.value }))} onChange={v => setChart('arrowStart', v)} />
            <DropdownRow label="End Arrow" value={chart.arrowEnd} options={ARROW_OPTIONS.map(o => ({ ...o, icon: o.value === 'none' ? 'none' : o.value }))} onChange={v => setChart('arrowEnd', v)} />
            <RangeRow label="Arrow Size" min={4} max={30} step={1} value={chart.arrowSize} onChange={v => setChart('arrowSize', v)} />
        </>
    );
}

export function MarkerBlock() {
    const { chart, setChart } = useSettings();
    return (
        <>
            <DropdownRow label="Marker Shape" value={chart.markerShape} options={MARKER_OPTIONS.map(o => ({ ...o, icon: o.value }))} onChange={v => setChart('markerShape', v)} />
            <RangeRow label="Marker Size" min={4} max={20} step={1} value={chart.markerSize} onChange={v => setChart('markerSize', v)} />
        </>
    );
}

export function ShadowBlock() {
    const { chart, setChart } = useSettings();
    return (
        <>
            <ToggleRow label="Gradient Shadow" checked={chart.shadowEnabled} onChange={v => setChart('shadowEnabled', v)} />
            <Reveal show={chart.shadowEnabled}>
                <ColorRow label="Top Color" value={chart.shadowColor1} onChange={v => setChart('shadowColor1', v)} />
                <RangeRow label="Top Opacity" value={chart.shadowOpacity1} onChange={v => setChart('shadowOpacity1', v)} />
                <ColorRow label="Bottom Color" value={chart.shadowColor2} onChange={v => setChart('shadowColor2', v)} />
                <RangeRow label="Bottom Opacity" value={chart.shadowOpacity2} onChange={v => setChart('shadowOpacity2', v)} />
                <RangeRow label="Color Offset" value={chart.shadowOffset} onChange={v => setChart('shadowOffset', v)} />
                <RangeRow label="Intensity" value={chart.shadowIntensity} onChange={v => setChart('shadowIntensity', v)} />
            </Reveal>
        </>
    );
}

/** Classic: one "Line & Markers" group (no arrows). */
export function ClassicLineGroupBody() {
    return (
        <>
            <LineBlock />
            <Divider />
            <MarkerBlock />
            <Divider />
            <ShadowBlock />
        </>
    );
}

/** Advanced: line, markers, arrows and shadow, separated by section labels. */
export function AdvancedLineGroupBody() {
    return (
        <>
            <LineBlock />
            <Divider />
            <SectionLabel>Markers</SectionLabel>
            <MarkerBlock />
            <Divider />
            <SectionLabel>Line ends</SectionLabel>
            <ArrowsBlock />
            <Divider />
            <SectionLabel>Area shadow</SectionLabel>
            <ShadowBlock />
        </>
    );
}
