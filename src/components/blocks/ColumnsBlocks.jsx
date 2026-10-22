import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings.js';
import { getColumnConfig, getColumns } from '../../lib/layout.js';
import { COLUMN_ALIGN_OPTIONS, COLUMN_PLACEMENT_OPTIONS } from '../../lib/options.js';
import { usePlaceholder } from '../../lib/placeholders.js';
import { runsToPlainText } from '../../lib/richText.js';
import { ChartLines, clamp01 } from '../controls/Sketches.jsx';
import { RichTextEditor } from '../richtext/RichTextEditor.jsx';
import {
    AlignRow, ColorRow, Divider, DropdownRow, FontRow, FontSizeRow, RangeRow, Reveal, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';

const fmt = (n) => String(+Number(n).toFixed(2));

/** Font + size are shared by every column title; alignment and placement are per column. */
export function ColumnDefaultsBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <p className="hint-text" style={{ marginTop: 0 }}>
                Font and size apply to all column titles. Alignment, placement and background are set per column.
            </p>
            <FontRow value={state.columnTitleFont} onChange={v => set('columnTitleFont', v)} />
            <FontSizeRow label="Size" limitKey="columnTitleFontSize" value={state.columnTitleFontSize} onChange={v => set('columnTitleFontSize', v)} />
        </>
    );
}

/** Editor menu for one column; it opens right below the sketch, with a caret under that column. */
function ColumnEditor({ column, caret, onClose }) {
    const { state, actions } = useSettings();
    const raw = (state.columns || {})[column.index] || {};
    const cfg = getColumnConfig(state, column.index);
    const patch = (partial) => actions.patchColumn(column.index, partial);
    const placeholder = usePlaceholder('column');
    const empty = runsToPlainText(raw.runs || []).trim() === '';
    return (
        <div className="col-editor" style={{ '--caret-x': `${caret}%` }}>
            <div className="col-editor-header">
                <span className="col-editor-title">Column {column.index + 1}</span>
                <span className="coords">({fmt(column.from)} – {fmt(column.to)})</span>
                <button type="button" className="icon-btn icon-btn-small col-editor-close" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <div className="rich-text-wrapper">
                <RichTextEditor
                    runs={raw.runs || []}
                    placeholder={placeholder}
                    onChange={runs => patch({ runs })}
                />
            </div>
            <AlignRow label="Alignment" disabled={empty} value={cfg.align} options={COLUMN_ALIGN_OPTIONS} onChange={v => patch({ align: v })} />
            <DropdownRow label="Placement" disabled={empty} value={cfg.placement} options={COLUMN_PLACEMENT_OPTIONS} onChange={v => patch({ placement: v })} />
            <ToggleRow label="Background" checked={cfg.bgEnabled} onChange={v => patch({ bgEnabled: v })} />
            <Reveal show={cfg.bgEnabled}>
                <ColorRow label="Color" value={cfg.bgColor} onChange={v => patch({ bgColor: v })} />
                <RangeRow label="Opacity" min={0} max={1} step={0.05} value={cfg.bgOpacity} onChange={v => patch({ bgOpacity: v })} />
            </Reveal>
        </div>
    );
}

/**
 * Little sketch of the chart split into its columns. Click a column to open its menu below it.
 */
export function ColumnSketchBlock() {
    const { state } = useSettings();
    const [selected, setSelected] = useState(null);
    const columns = getColumns(state);

    if (columns.length === 0) {
        return <p className="hint-text" style={{ marginTop: 0 }}>Set a valid X-axis range and step to create columns.</p>;
    }

    const span = state.xMax - state.xMin;
    const showNumbers = columns.length <= 16;
    const active = columns.find(c => c.index === selected) || null;
    const caret = active ? ((active.from + active.to) / 2 - state.xMin) / span * 100 : 50;

    return (
        <div className="col-sketch">
            <div className="sketch-frame col-sketch-frame">
                <ChartLines state={state} />
                {columns.map((col, i) => {
                    const cfg = getColumnConfig(state, col.index);
                    const title = runsToPlainText(cfg.runs || []).trim();
                    return (
                        <button
                            key={col.index}
                            type="button"
                            className={`col-sketch-col ${i === 0 ? 'is-first' : ''} ${i === columns.length - 1 ? 'is-last' : ''} ${selected === col.index ? 'selected' : ''}`}
                            title={`Column ${col.index + 1} (${fmt(col.from)} – ${fmt(col.to)})`}
                            style={{
                                left: `${(col.from - state.xMin) / span * 100}%`,
                                width: `${(col.to - col.from) / span * 100}%`,
                                '--col-bg': cfg.bgEnabled ? cfg.bgColor : 'transparent',
                                '--col-bg-opacity': cfg.bgEnabled ? clamp01(parseFloat(cfg.bgOpacity)) : 0
                            }}
                            onClick={() => setSelected(selected === col.index ? null : col.index)}
                        >
                            {title && (
                                <span className={`col-sketch-title ${cfg.placement} align-${cfg.align}`} dir="auto">{title}</span>
                            )}
                            {showNumbers && <span className="col-sketch-num">{col.index + 1}</span>}
                        </button>
                    );
                })}
            </div>
            {active
                ? <ColumnEditor key={active.index} column={active} caret={caret} onClose={() => setSelected(null)} />
                : <p className="hint-text col-sketch-hint">Click a column to edit its title and background.</p>}
        </div>
    );
}

/** Classic: shared settings + the sketch in one group. */
export function ClassicColumnsGroupBody() {
    return (
        <>
            <ColumnDefaultsBlock />
            <Divider />
            <ColumnSketchBlock />
        </>
    );
}
