import { useApp } from '../../context/AppContext.jsx';
import { IconReset } from '../controls/Icons.jsx';

export function SidebarHeader() {
    const { mode, requestModeChange, resetToDefault } = useApp();
    return (
        <div className="sidebar-header">
            <div className="sidebar-header-top">
                <h2>Chart Generator</h2>
                <button type="button" className="icon-btn" title="Reset" onClick={resetToDefault}>
                    <IconReset />
                </button>
            </div>
            <div className="mode-selector" data-mode={mode}>
                <button type="button" className={`mode-btn ${mode === 'classic' ? 'active' : ''}`} onClick={() => requestModeChange('classic')}>Classic</button>
                <button type="button" className={`mode-btn ${mode === 'advanced' ? 'active' : ''}`} onClick={() => requestModeChange('advanced')}>Advanced</button>
                <span className="mode-indicator" />
            </div>
        </div>
    );
}
