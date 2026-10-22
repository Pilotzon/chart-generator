import { Group } from '../controls/Group.jsx';
import { Divider, SectionLabel } from '../controls/Inputs.jsx';
import { AdvancedLineGroupBody } from '../blocks/LineBlocks.jsx';
import { ChartLabelBlock, MarkedPointsBlock, PointsTable } from '../blocks/DataBlocks.jsx';
import {
    AxisLabelsBlock, LegendBlock, SubtitleBlock, TickLabelsBlock, TitleBlock
} from '../blocks/TextBlocks.jsx';
import {
    AxisArrowsBlock, BordersBlock, CanvasSizeBlock, GridStyleBlock, GridToggles, ScaleBlock
} from '../blocks/AxesBlocks.jsx';
import { ColumnDefaultsBlock, ColumnListBlock } from '../blocks/ColumnsBlocks.jsx';

/**
 * Advanced mode: the settings are split over four rail tabs, each with at most three groups.
 *   Chart   – data, line/markers/arrows/shadow, name label + legend
 *   Text    – title/subtitle, axis labels + tick text
 *   Axes    – scale, grid & ticks, frame & arrows, canvas size
 *   Columns – column title defaults + one card per column
 */
export function ChartPanel() {
    return (
        <>
            <Group title="Data">
                <PointsTable showMark />
                <Divider />
                <SectionLabel>Marked points</SectionLabel>
                <MarkedPointsBlock />
            </Group>
            <Group title="Line & markers"><AdvancedLineGroupBody /></Group>
            <Group title="Name label & legend" defaultOpen={false}>
                <SectionLabel>Chart name on canvas</SectionLabel>
                <ChartLabelBlock />
                <Divider />
                <SectionLabel>Legend</SectionLabel>
                <LegendBlock />
            </Group>
        </>
    );
}

export function TextPanel() {
    return (
        <>
            <Group title="Titles">
                <TitleBlock />
                <Divider />
                <SubtitleBlock />
            </Group>
            <Group title="Axis text">
                <AxisLabelsBlock />
                <Divider />
                <TickLabelsBlock />
            </Group>
        </>
    );
}

export function AxesPanel() {
    return (
        <>
            <Group title="Scale"><ScaleBlock /></Group>
            <Group title="Grid & ticks">
                <GridToggles />
                <Divider />
                <GridStyleBlock />
            </Group>
            <Group title="Frame & arrows" defaultOpen={false}>
                <BordersBlock />
                <Divider />
                <SectionLabel>Axis arrows</SectionLabel>
                <AxisArrowsBlock />
            </Group>
            <Group title="Canvas size" defaultOpen={false}><CanvasSizeBlock /></Group>
        </>
    );
}

export function ColumnsPanel() {
    return (
        <>
            <Group title="Column titles"><ColumnDefaultsBlock /></Group>
            <Group title="Columns"><ColumnListBlock /></Group>
        </>
    );
}

export const ADVANCED_PANELS = {
    chart: ChartPanel,
    text: TextPanel,
    axes: AxesPanel,
    columns: ColumnsPanel
};
