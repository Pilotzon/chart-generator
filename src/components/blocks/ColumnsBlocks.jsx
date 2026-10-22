import { useSettings } from '../../hooks/useSettings.js';
import { getColumnConfig, getColumns } from '../../lib/layout.js';
import { COLUMN_ALIGN_OPTIONS, COLUMN_PLACEMENT_OPTIONS } from '../../lib/options.js';
import { RichTextEditor } from '../richtext/RichTextEditor.jsx';
import {
    ColorRow, Divider, DropdownRow, FontRow, RangeRow, Reveal, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';

const withDefault = (options, label) => [{ value: '', label }, ...options];
const fmt = (n) => String(+Number(n).toFixed(2));

/** Shared settings for all column titles. */
export function ColumnDefaultsBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <p className="hint-text" style={{ marginTop: 0 }}>
                One column per major X step. Titles use these defaults unless a column overrides them.
            </p>
            <FontRow value={state.columnTitleFont} onChange={v => set('columnTitleFont', v)} />
            <StepperRow label="Size" min={8} max={40} value={state.columnTitleFontSize} onChange={v => set('columnTitleFontSize', v)} />
            <DropdownRow
                label="Alignment"
                value={state.columnDefaultAlign}
                options={COLUMN_ALIGN_OPTIONS}
                onChange={v => set('columnDefaultAlign', v)}
            />
            <DropdownRow
                label="Placement"
                value={state.columnDefaultPlacement}
                options={COLUMN_PLACEMENT_OPTIONS}
                onChange={v => set('columnDefaultPlacement', v)}
            />
        </>
    );
}

function ColumnCard({ column }) {
    const { state, actions } = useSettings();
    const raw = (state.columns || {})[column.index] || {};
    const cfg = getColumnConfig(state, column.index);
    const patch = (partial) => actions.patchColumn(column.index, partial);
    return (
        <div className="marked-point-card column-card">
            <div className="marked-point-header">
                <span
                    className="marker-swatch"
                    style={{ background: cfg.bgEnabled ? cfg.bgColor : 'transparent', opacity: cfg.bgEnabled ? Math.max(0.35, cfg.bgOpacity) : 1 }}
                />
                <span>Column {column.index + 1}</span>
                <span className="coords">({fmt(column.from)} – {fmt(column.to)})</span>
            </div>
            <div className="rich-text-wrapper">
                <RichTextEditor
                    runs={raw.runs || []}
                    placeholder="Column title…"
                    onChange={runs => patch({ runs })}
                />
            </div>
            <DropdownRow
                label="Alignment"
                value={raw.align || ''}
                options={withDefault(COLUMN_ALIGN_OPTIONS, 'Default')}
                onChange={v => patch({ align: v || null })}
            />
            <DropdownRow
                label="Placement"
                value={raw.placement || ''}
                options={withDefault(COLUMN_PLACEMENT_OPTIONS, 'Default')}
                onChange={v => patch({ placement: v || null })}
            />
            <ToggleRow label="Background" checked={cfg.bgEnabled} onChange={v => patch({ bgEnabled: v })} />
            <Reveal show={cfg.bgEnabled}>
                <ColorRow label="Color" value={cfg.bgColor} onChange={v => patch({ bgColor: v })} />
                <RangeRow label="Opacity" min={0} max={1} step={0.05} value={cfg.bgOpacity} onChange={v => patch({ bgOpacity: v })} />
            </Reveal>
        </div>
    );
}

export function ColumnListBlock() {
    const { state } = useSettings();
    const columns = getColumns(state);
    if (columns.length === 0) {
        return <p className="hint-text" style={{ marginTop: 0 }}>Set a valid X-axis range and step to create columns.</p>;
    }
    return <div>{columns.map(c => <ColumnCard key={c.index} column={c} />)}</div>;
}

/** Classic: defaults + per-column cards in one group. */
export function ClassicColumnsGroupBody() {
    return (
        <>
            <ColumnDefaultsBlock />
            <Divider />
            <ColumnListBlock />
        </>
    );
}
