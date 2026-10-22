import { useApp } from '../../context/AppContext.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import { detectDirection } from '../../lib/richText.js';
import { LABEL_POSITION_OPTIONS, CHART_LABEL_POSITION_OPTIONS } from '../../lib/options.js';
import { defaultMarkMeta, detectLabelOverlap, formatDec, markKeyFor } from '../../lib/points.js';
import {
    ColorRow, Divider, DropdownRow, FontRow, NumberInput, RangeRow, Reveal, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';
import { IconTrash } from '../controls/Icons.jsx';
import { SvgIcon } from '../controls/SvgIcon.jsx';

export function PointsTable({ showMark }) {
    const { chart, actions } = useSettings();
    const { setInteraction } = useApp();
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
                <tbody>
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
                            <tr key={i}>
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

function MarkedPointCard({ chart, index }) {
    const { actions } = useSettings();
    const pt = chart.points[index];
    const key = markKeyFor(chart, index);
    const meta = { ...defaultMarkMeta(chart), ...((chart.markedPointsMeta || {})[key] || {}) };
    const patch = (partial) => actions.patchMarkMeta(chart.id, key, partial);
    const overlap = detectLabelOverlap(chart, index);
    return (
        <div className="marked-point-card">
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
                placeholder="Label text"
                dir={detectDirection(meta.label || '')}
                value={meta.label || ''}
                onChange={e => patch({ label: e.target.value })}
            />
            <ColorRow label="Fill color" value={meta.fillColor} onChange={v => patch({ fillColor: v })} />
            <ColorRow label="Outline color" value={meta.outlineColor} onChange={v => patch({ outlineColor: v })} />
            <RangeRow label="Outline width" min={0} max={6} step={0.5} value={meta.outlineWidth} onChange={v => patch({ outlineWidth: v })} />
            <DropdownRow
                label="Label position"
                value={meta.labelPosition}
                options={LABEL_POSITION_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                onChange={v => patch({ labelPosition: v })}
            />
        </div>
    );
}

export function MarkedPointsBlock() {
    const { state, set } = useSettings();
    const cards = [];
    state.charts.forEach(chart => {
        chart.points.forEach((pt, i) => {
            if (pt.marked) cards.push(<MarkedPointCard key={`${chart.id}:${i}`} chart={chart} index={i} />);
        });
    });
    return (
        <>
            <p className="hint-text">Mark a point using the checkbox in the data table, then customize it below.</p>
            {cards.length > 0 && (
                <div className="marked-shared-options">
                    <FontRow label="Label Font" value={state.markedFont} onChange={v => set('markedFont', v)} />
                    <StepperRow label="Label Size" min={8} max={30} value={state.markedFontSize} onChange={v => set('markedFontSize', v)} />
                    <Divider />
                </div>
            )}
            <div>
                {cards.length ? cards : <p className="hint-text" style={{ marginTop: 0 }}>No marked points yet.</p>}
            </div>
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
