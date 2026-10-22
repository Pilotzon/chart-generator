import { useApp } from '../../context/AppContext.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import { usePlaceholder, placeholderKind } from '../../lib/placeholders.js';
import { TITLE_POSITION_OPTIONS, LEGEND_POSITION_OPTIONS, X_LABEL_PLACEMENT_OPTIONS, Y_LABEL_PLACEMENT_OPTIONS } from '../../lib/options.js';
import { runsToPlainText, textToRuns } from '../../lib/richText.js';
import { RichTextEditor } from '../richtext/RichTextEditor.jsx';
import {
    AlignRow, ColorRow, Divider, DropdownRow, FontRow, Reveal, SectionLabel, StepperRow, ToggleRow
} from '../controls/Inputs.jsx';
import { PositionSketch } from '../controls/Sketches.jsx';
import { IconPlus } from '../controls/Icons.jsx';

/** Label + rich-text box bound to a text key (titleText, xLabel, …). */
export function RichField({ label, editorKey, runs, minHeight }) {
    const { actions } = useApp();
    const placeholder = usePlaceholder(placeholderKind(editorKey));
    return (
        <>
            {label && <span className="field-label">{label}</span>}
            <div className="rich-text-wrapper">
                <RichTextEditor
                    id={editorKey}
                    data-key={editorKey}
                    runs={runs}
                    minHeight={minHeight}
                    placeholder={placeholder}
                    onChange={next => actions.setRuns(editorKey, next)}
                />
            </div>
        </>
    );
}

/** True when the rich-text runs contain no visible text. */
export const isEmptyRuns = (runs) => runsToPlainText(runs || []).trim() === '';

export function TitleBlock() {
    const { state, set } = useSettings();
    const empty = isEmptyRuns(state.titleRuns);
    return (
        <>
            <RichField label="Main Title" editorKey="titleText" runs={state.titleRuns} />
            <AlignRow label="Alignment" disabled={empty} value={state.titlePosition} options={TITLE_POSITION_OPTIONS} onChange={v => set('titlePosition', v)} />
            <FontRow disabled={empty} value={state.titleFont} onChange={v => set('titleFont', v)} />
            <StepperRow label="Size" disabled={empty} min={10} max={40} value={state.titleFontSize} onChange={v => set('titleFontSize', v)} />
        </>
    );
}

export function SubtitleBlock() {
    const { state, set } = useSettings();
    const titleEmpty = isEmptyRuns(state.titleRuns);
    if (!state.hasSubtitle) {
        return (
            <button
                type="button"
                className="btn btn-secondary btn-add-subtitle"
                disabled={titleEmpty}
                title={titleEmpty ? 'Write a title first, the subtitle lives under it' : undefined}
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
    const subEmpty = isEmptyRuns(state.subtitleRuns);
    return (
        <div className="subtitle-inline-inner">
            <Divider />
            <RichField label="Subtitle" editorKey="subtitleText" runs={state.subtitleRuns} />
            <FontRow disabled={subEmpty} value={state.subtitleFont} onChange={v => set('subtitleFont', v)} />
            <StepperRow label="Size" disabled={subEmpty} min={10} max={30} value={state.subtitleFontSize} onChange={v => set('subtitleFontSize', v)} />
            <button type="button" className="btn btn-danger-soft btn-remove-subtitle" onClick={() => set('hasSubtitle', false)}>
                Remove Subtitle
            </button>
        </div>
    );
}

export function AxisLabelsBlock() {
    const { state, set } = useSettings();
    const xEmpty = isEmptyRuns(state.xLabelRuns);
    const yEmpty = isEmptyRuns(state.yLabelRuns);
    return (
        <>
            <RichField label="X-Axis Label" editorKey="xLabel" runs={state.xLabelRuns} />
            <DropdownRow label="X Label Position" disabled={xEmpty} value={state.xLabelPlacement || 'below'} options={X_LABEL_PLACEMENT_OPTIONS} onChange={v => set('xLabelPlacement', v)} />
            <RichField label="Y-Axis Label" editorKey="yLabel" runs={state.yLabelRuns} />
            <DropdownRow label="Y Label Position" disabled={yEmpty} value={state.yLabelPlacement || 'side'} options={Y_LABEL_PLACEMENT_OPTIONS} onChange={v => set('yLabelPlacement', v)} />
            <FontRow label="Label Font" disabled={xEmpty && yEmpty} value={state.axisFont} onChange={v => set('axisFont', v)} />
            <StepperRow label="Label Size" disabled={xEmpty && yEmpty} min={8} max={36} value={state.axisFontSize} onChange={v => set('axisFontSize', v)} />
        </>
    );
}

/** `allowHide` (Advanced mode) adds a switch that removes the numbers next to the axes. */
export function TickLabelsBlock({ allowHide = false }) {
    const { state, set } = useSettings();
    const visible = !allowHide || state.showTickLabels !== false;
    return (
        <>
            {allowHide && <ToggleRow label="Show Tick Numbers" checked={state.showTickLabels !== false} onChange={v => set('showTickLabels', v)} />}
            <Reveal show={visible}>
                <FontRow label="Tick Font" value={state.tickFont} onChange={v => set('tickFont', v)} />
                <StepperRow label="Tick Size" min={8} max={30} value={state.tickFontSize} onChange={v => set('tickFontSize', v)} />
            </Reveal>
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
                <SectionLabel>Position</SectionLabel>
                <PositionSketch options={LEGEND_POSITION_OPTIONS} value={state.legendPosition} onChange={v => set('legendPosition', v)} />
                <FontRow value={state.legendFont} onChange={v => set('legendFont', v)} />
                <StepperRow label="Font Size" min={8} max={24} value={state.legendFontSize} onChange={v => set('legendFontSize', v)} />
                <ColorRow label="Background" value={state.legendBg} onChange={v => set('legendBg', v)} />
                <ToggleRow label="Border" checked={state.legendBorder} onChange={v => set('legendBorder', v)} />
            </Reveal>
        </>
    );
}
