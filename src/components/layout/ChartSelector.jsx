import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { usePlaceholder } from '../../lib/placeholders.js';
import { IconCopy, IconPencil, IconPlus, IconTrash } from '../controls/Icons.jsx';

function ChartTab({ chart, active, canDelete }) {
    const { actions, setPendingDeleteChartId } = useApp();
    const [editing, setEditing] = useState(false);
    const inputRef = useRef(null);
    const chartNamePlaceholder = usePlaceholder('chartName');

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    return (
        <div
            className={`chart-tab ${active ? 'active' : ''}`}
            data-chart-id={chart.id}
            onClick={() => { if (!active && !editing) actions.setActiveChart(chart.id); }}
        >
            <input
                type="color"
                className="chart-tab-color-picker"
                title="Chart color"
                value={chart.color}
                onClick={e => e.stopPropagation()}
                onChange={e => actions.setChartColor(chart.id, e.target.value)}
            />
            <div className="chart-tab-name-wrap">
                {editing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="chart-tab-name-input"
                        dir="auto"
                        spellCheck={false}
                        placeholder={chartNamePlaceholder}
                        value={chart.name}
                        onClick={e => e.stopPropagation()}
                        onChange={e => actions.patchChart(chart.id, { name: e.target.value })}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setEditing(false); }
                        }}
                        onBlur={() => setEditing(false)}
                    />
                ) : (
                    <span
                        className="chart-tab-name-display"
                        dir="auto"
                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    >{chart.name}</span>
                )}
            </div>
            <div className="chart-tab-actions">
                <button type="button" className="chart-tab-btn" title="Rename" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
                    <IconPencil />
                </button>
                <button type="button" className="chart-tab-btn" title="Duplicate" onClick={(e) => { e.stopPropagation(); actions.duplicateChart(chart.id); }}>
                    <IconCopy />
                </button>
                {canDelete && (
                    <button type="button" className="chart-tab-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setPendingDeleteChartId(chart.id); }}>
                        <IconTrash />
                    </button>
                )}
            </div>
        </div>
    );
}

/** Chart switcher. Lives outside the scrolling area, so it is always pinned to the top of the panel. */
export function ChartSelector() {
    const { state, actions } = useApp();
    return (
        <div className="chart-selector-container">
            <div className="chart-selector-header">
                <span className="chart-selector-label">Charts</span>
                <button type="button" className="btn-mini" title="Add chart" onClick={actions.addChart}>
                    <IconPlus />
                    New chart
                </button>
            </div>
            <div className="chart-tabs">
                {state.charts.map(chart => (
                    <ChartTab
                        key={chart.id}
                        chart={chart}
                        active={chart.id === state.activeChartId}
                        canDelete={state.charts.length > 1}
                    />
                ))}
            </div>
        </div>
    );
}
