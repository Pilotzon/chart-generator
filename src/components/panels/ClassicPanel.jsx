import { useApp } from '../../context/AppContext.jsx';
import { selectedPointKey } from '../../lib/points.js';
import { Group } from '../controls/Group.jsx';
import { ClassicLineGroupBody } from '../blocks/LineBlocks.jsx';
import { PointsTable } from '../blocks/DataBlocks.jsx';
import { ClassicTextGroupBody } from '../blocks/TextBlocks.jsx';
import { CanvasSizeBlock, ClassicAxesGroupBody, GridStyleBlock } from '../blocks/AxesBlocks.jsx';
import { ClassicColumnsGroupBody } from '../blocks/ColumnsBlocks.jsx';

/** Classic mode: a single scrolling list of groups. */
export function ClassicPanel() {
    const { interaction } = useApp();
    return (
        <div className="panel-group">
            <Group title="Line & Markers"><ClassicLineGroupBody /></Group>
            <Group title="Data Points" openOn={selectedPointKey(interaction)}><PointsTable showMark={false} /></Group>
            <Group title="Titles & Labels"><ClassicTextGroupBody /></Group>
            <Group title="Canvas Size"><CanvasSizeBlock /></Group>
            <Group title="Axes & Grid"><ClassicAxesGroupBody /></Group>
            <Group title="Visual Style"><GridStyleBlock /></Group>
            <Group title="Column Titles" defaultOpen={false}><ClassicColumnsGroupBody /></Group>
        </div>
    );
}
