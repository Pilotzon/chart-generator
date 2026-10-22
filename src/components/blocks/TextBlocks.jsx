import { useApp } from '../../context/AppContext.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import { TITLE_POSITION_OPTIONS, LEGEND_POSITION_OPTIONS } from '../../lib/options.js';
import { runsToPlainText, textToRuns } from '../../lib/richText.js';
import { RichTextEditor } from '../richtext/RichTextEditor.jsx';
import {
    ColorRow, Divider, DropdownRow, FontRow, Reveal, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';
import { IconPlus } from '../controls/Icons.jsx';

/** Label + rich-text box bound to a text key (titleText, xLabel, …). */
export function RichField({ label, editorKey, runs, minHeight }) {
    const { actions } = useApp();
    return (
        <>
            {label && <span className="field-label">{label}</span>}
            <div className="rich-text-wrapper">
                <RichTextEditor
                    id={editorKey}
                    data-key={editorKey}
                    runs={runs}
                    minHeight={minHeight}
                    onChange={next => actions.setRuns(editorKey, next)}
                />
            </div>
        </>
    );
}

export function TitleBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <RichField label="Main Title" editorKey="titleText" runs={state.titleRuns} />
            <DropdownRow
                label="Position"
                value={state.titlePosition}
                options={TITLE_POSITION_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                onChange={v => set('titlePosition', v)}
            />
            <FontRow value={state.titleFont} onChange={v => set('titleFont', v)} />
            <StepperRow label="Size" min={10} max={40} value={state.titleFontSize} onChange={v => set('titleFontSize', v)} />
        </>
    );
}

export function SubtitleBlock() {
    const { state, set } = useSettings();
    if (!state.hasSubtitle) {
        return (
            <button
                type="button"
                className="btn btn-secondary btn-add-subtitle"
                onClick={() => {
                    set('hasSubtitle', true);
                    if (runsToPlainText(state.subtitleRuns || []) === '') {
                        set('subtitleRuns', textToRuns('Subtitle', '#666666'));
                    }
                }}
            >
                <IconPlus width={14} height={14} />
                Add Subtitle
            </button>
        );
    }
    return (
        <div className="subtitle-inline-inner">
            <RichField label="Subtitle" editorKey="subtitleText" runs={state.subtitleRuns} />
            <FontRow value={state.subtitleFont} onChange={v => set('subtitleFont', v)} />
            <StepperRow label="Size" min={10} max={30} value={state.subtitleFontSize} onChange={v => set('subtitleFontSize', v)} />
            <button type="button" className="btn btn-danger-soft btn-remove-subtitle" onClick={() => set('hasSubtitle', false)}>
                Remove Subtitle
            </button>
        </div>
    );
}

export function AxisLabelsBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <RichField label="X-Axis Label" editorKey="xLabel" runs={state.xLabelRuns} />
            <RichField label="Y-Axis Label" editorKey="yLabel" runs={state.yLabelRuns} />
            <FontRow label="Label Font" value={state.axisFont} onChange={v => set('axisFont', v)} />
            <StepperRow label="Label Size" min={8} max={36} value={state.axisFontSize} onChange={v => set('axisFontSize', v)} />
        </>
    );
}

export function TickLabelsBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <FontRow label="Tick Font" value={state.tickFont} onChange={v => set('tickFont', v)} />
            <StepperRow label="Tick Size" min={8} max={30} value={state.tickFontSize} onChange={v => set('tickFontSize', v)} />
        </>
    );
}

/** Classic "Titles & Labels" group. */
export function ClassicTextGroupBody() {
    return (
        <>
            <TitleBlock />
            <Divider />
            <AxisLabelsBlock />
            <TickLabelsBlock />
            <SubtitleBlock />
        </>
    );
}

export function LegendBlock() {
    const { state, set } = useSettings();
    return (
        <>
            <ToggleRow label="Show Legend" checked={state.showLegend} onChange={v => set('showLegend', v)} />
            <Reveal show={state.showLegend}>
                <DropdownRow
                    label="Position"
                    value={state.legendPosition}
                    options={LEGEND_POSITION_OPTIONS.map(o => ({ ...o, icon: o.value }))}
                    onChange={v => set('legendPosition', v)}
                />
                <FontRow value={state.legendFont} onChange={v => set('legendFont', v)} />
                <StepperRow label="Font Size" min={8} max={24} value={state.legendFontSize} onChange={v => set('legendFontSize', v)} />
                <ColorRow label="Background" value={state.legendBg} onChange={v => set('legendBg', v)} />
                <ToggleRow label="Border" checked={state.legendBorder} onChange={v => set('legendBorder', v)} />
            </Reveal>
        </>
    );
}
