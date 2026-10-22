import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import { detectDirection } from '../../lib/richText.js';
import { usePlaceholder } from '../../lib/placeholders.js';
import { LABEL_POSITION_OPTIONS, CHART_LABEL_POSITION_OPTIONS } from '../../lib/options.js';
import { defaultMarkMeta, detectLabelOverlap, formatDec, markKeyFor } from '../../lib/points.js';
import {
    ColorRow, Divider, DropdownRow, FontRow, NumberInput, RangeRow, Reveal, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';
import { ChartLines, clamp01 } from '../controls/Sketches.jsx';
import { IconTrash } from '../controls/Icons.jsx';
import { SvgIcon } from '../controls/SvgIcon.jsx';

export function PointsTable({ showMark }) {
    const { chart, actions } = useSettings();
    const { interaction, setInteraction } = useApp();
    const bodyRef = useRef(null);
    const selectedIdx = interaction.selectedChartId === chart.id ? interaction.selectedIdx : null;
    const hoverIdx = interaction.hoverChartId === chart.id ? interaction.hoverIdx : null;

    // a point picked on the graph: bring its row into view
    useEffect(() => {
        if (selectedIdx == null) return;
        const row = bodyRef.current?.querySelector(`tr[data-index="${selectedIdx}"]`);
        row?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, [selectedIdx, chart.id]);

    return (
        <>
            <table className="points-table">
                <thead>
                    <tr>
                        <th>X</th>
                        <th>Y</th>
                        {showMark && <th className="th-advanced advanced-only">Mark</th>}
                        <th></th>
                    </tr>
                </thead>
                <tbody ref={bodyRef}>
                    {chart.points.map((pt, i) => {
                        const commit = (field) => (n) => {
                            const v = formatDec(n);
                            actions.setPointCoords(chart.id, i, field === 'x' ? v : pt.x, field === 'y' ? v : pt.y);
                        };
                        const highlight = {
                            onFocus: () => setInteraction({ highlightIdx: i, highlightChartId: chart.id }),
                            onBlur: () => {
                                setInteraction({ highlightIdx: null, highlightChartId: null });
                                actions.sortPoints(chart.id);
                            }
                        };
                        return (
                            <tr
                                key={i}
                                data-index={i}
                                className={`${selectedIdx === i ? 'is-selected' : ''} ${hoverIdx === i && selectedIdx !== i ? 'is-hovered' : ''}`}
                                aria-selected={selectedIdx === i}
                            >
                                <td><NumberInput step={0.1} commitOn="blur" clampOnBlur={false} value={pt.x.toFixed(1)} onCommit={commit('x')} {...highlight} /></td>
                                <td><NumberInput step={0.1} commitOn="blur" clampOnBlur={false} value={pt.y.toFixed(1)} onCommit={commit('y')} {...highlight} /></td>
                                {showMark && (
                                    <td className="td-mark advanced-only">
                                        <input
                                            type="checkbox"
                                            className="mark-checkbox"
                                            checked={!!pt.marked}
                                            onChange={e => actions.toggleMark(chart.id, i, e.target.checked)}
                                        />
                                    </td>
                                )}
                                <td>
                                    <button type="button" className="point-delete-btn" title="Remove" onClick={() => actions.removePoint(chart.id, i)}>
                                        <IconTrash />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <button type="button" className="btn btn-secondary btn-add-point" onClick={() => actions.addPoint(chart.id)}>
                Add Point
            </button>
        </>
    );
}

function MarkedPointCard({ chart, index, caret }) {
    const { actions } = useSettings();
    const pt = chart.points[index];
    const key = markKeyFor(chart, index);
    const meta = { ...defaultMarkMeta(chart), ...((chart.markedPointsMeta || {})[key] || {}) };
    const patch = (partial) => actions.patchMarkMeta(chart.id, key, partial);
    const overlap = detectLabelOverlap(chart, index);
    const placeholder = usePlaceholder('mark');
    const noLabel = String(meta.label || '').trim() === '';
    return (
        <div className="marked-point-card" style={caret == null ? undefined : { '--caret-x': `${caret}%` }}>
            <div className="marked-point-header">
                <span className="marker-swatch" style={{ background: meta.fillColor }} />
                <span dir="auto">{chart.name}</span>
                <span className="coords">({pt.x}, {pt.y})</span>
            </div>
            {overlap && (
                <div className="overlap-badge">
                    <SvgIcon name="warning" className="overlap-badge-icon" />
                    Overlapping with chart label
                </div>
            )}
            <input
                type="text"
                className="marked-input"
                placeholder={placeholder}
                dir={detectDirection(meta.label || '')}
                value={meta.label || ''}
                onChange={e => patch({ label: e.target.value })}
            />
            <ColorRow label="Fill color" value={meta.fillColor} onChange={v => patch({ fillColor: v })} />
            <ColorRow label="Outline color" value={meta.outlineColor} onChange={v => patch({ outlineColor: v })} />
            <RangeRow label="Outline width" min={0} max={6} step={0.5} value={meta.outlineWidth} onChange={v => patch({ outlineWidth: v })} />
            <DropdownRow
                label="Label position"
                disabled={noLabel}
                hint="Write a label first to choose where it goes"
                value={meta.labelPosition}
                options={LABEL_POSITION_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                onChange={v => patch({ labelPosition: v })}
            />
        </div>
    );
}

/** Little chart with a clickable dot per marked point; the chosen point's card opens below with a caret. */
export function MarkedPointsBlock() {
    const { state, set } = useSettings();
    const [selected, setSelected] = useState(null);
    const marks = [];
    state.charts.forEach(chart => {
        chart.points.forEach((pt, i) => {
            if (pt.marked) marks.push({ chart, index: i, id: `${chart.id}:${i}`, pt });
        });
    });
    const active = marks.find(m => m.id === selected) || marks[0] || null;
    const noLabels = marks.every(m => String(((m.chart.markedPointsMeta || {})[markKeyFor(m.chart, m.index)] || {}).label || '').trim() === '');
    const span = state.xMax - state.xMin || 1;
    const ySpan = state.yMax - state.yMin || 1;
    const posOf = (pt) => ({
        x: clamp01((pt.x - state.xMin) / span) * 100,
        y: (1 - clamp01((pt.y - state.yMin) / ySpan)) * 100
    });

    return (
        <>
            <p className="hint-text">Mark a point using the checkbox in the data table, then click its dot below to customize it.</p>
            {marks.length > 0 && (
                <div className="marked-shared-options">
                    <FontRow label="Label Font" disabled={noLabels} value={state.markedFont} onChange={v => set('markedFont', v)} />
                    <StepperRow label="Label Size" disabled={noLabels} min={8} max={30} value={state.markedFontSize} onChange={v => set('markedFontSize', v)} />
                    <Divider />
                </div>
            )}
            {marks.length > 0 && (
                <div className="sketch-frame mark-sketch">
                    <ChartLines state={state} />
                    {marks.map(m => {
                        const meta = { ...defaultMarkMeta(m.chart), ...((m.chart.markedPointsMeta || {})[markKeyFor(m.chart, m.index)] || {}) };
                        const pos = posOf(m.pt);
                        return (
                            <button
                                key={m.id}
                                type="button"
                                className={`mark-sketch-dot ${active && active.id === m.id ? 'is-on' : ''}`}
                                title={`${m.chart.name} (${m.pt.x}, ${m.pt.y})`}
                                style={{
                                    left: `${pos.x}%`,
                                    top: `calc(14px + (100% - 28px) * ${pos.y / 100})`,
                                    background: meta.fillColor,
                                    borderColor: meta.outlineColor
                                }}
                                onClick={() => setSelected(m.id)}
                            />
                        );
                    })}
                </div>
            )}
            {active
                ? <MarkedPointCard key={active.id} chart={active.chart} index={active.index} caret={posOf(active.pt).x} />
                : <p className="hint-text" style={{ marginTop: 0 }}>No marked points yet.</p>}
        </>
    );
}

export function ChartLabelBlock() {
    const { chart, setChart } = useSettings();
    const anchorOptions = [
        { value: 'last', label: 'Last point' },
        { value: 'first', label: 'First point' },
        ...chart.points.map((pt, i) => ({ value: 'idx:' + i, label: `Point ${i + 1} (${pt.x}, ${pt.y})` }))
    ];
    return (
        <>
            <ToggleRow label="Show Name on Canvas" checked={chart.showChartLabel} onChange={v => setChart('showChartLabel', v)} />
            <Reveal show={chart.showChartLabel}>
                <DropdownRow label="Anchor Point" value={chart.chartLabelAnchor} options={anchorOptions} onChange={v => setChart('chartLabelAnchor', v)} />
                <DropdownRow
                    label="Position"
                    value={chart.chartLabelPosition}
                    options={CHART_LABEL_POSITION_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                    onChange={v => setChart('chartLabelPosition', v)}
                />
                <StepperRow label="Label Size" min={8} max={30} value={chart.chartLabelFontSize} onChange={v => setChart('chartLabelFontSize', v)} />
                <ToggleRow label="Bold Label" checked={chart.chartLabelBold} onChange={v => setChart('chartLabelBold', v)} />
            </Reveal>
        </>
    );
}
