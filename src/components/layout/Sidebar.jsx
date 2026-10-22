import { useApp } from '../../context/AppContext.jsx';
import { ADVANCED_PANELS } from '../panels/AdvancedPanels.jsx';
import { ClassicPanel } from '../panels/ClassicPanel.jsx';
import { ChartSelector } from './ChartSelector.jsx';
import { Rail } from './Rail.jsx';
import { SidebarHeader } from './SidebarHeader.jsx';

export function Sidebar() {
    const { mode, panel, resetCount } = useApp();
    const advanced = mode === 'advanced';
    const Panel = ADVANCED_PANELS[panel] || ADVANCED_PANELS.chart;
    return (
        <div id="sidebar">
            <SidebarHeader />
            <div className="sidebar-body">
                {advanced && <Rail />}
                <div className="sidebar-main">
                    {/* The chart switcher is a fixed header above the scroll area (not sticky inside it) */}
                    {advanced && panel === 'chart' && <ChartSelector />}
                    <div className="sidebar-content" key={`${mode}:${advanced ? panel : 'all'}:${resetCount}`}>
                        {advanced
                            ? <div className="panel-group"><Panel /></div>
                            : <ClassicPanel />}
                    </div>
                </div>
            </div>
        </div>
    );
}
