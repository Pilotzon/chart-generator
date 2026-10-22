import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext.jsx';
import { RailAxes, RailChart, RailColumns, RailText } from '../controls/Icons.jsx';

export const RAIL_TABS = [
    { id: 'chart', label: 'Chart', Icon: RailChart },
    { id: 'text', label: 'Text', Icon: RailText },
    { id: 'axes', label: 'Axes & canvas', Icon: RailAxes },
    { id: 'columns', label: 'Columns', Icon: RailColumns }
];

function RailButton({ tab }) {
    const { panel, setPanel } = useApp();
    const [tip, setTip] = useState(null);
    const show = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTip({ left: r.right + 10, top: r.top + r.height / 2 });
    };
    return (
        <>
            <button
                type="button"
                className={`rail-btn ${panel === tab.id ? 'active' : ''}`}
                data-panel={tab.id}
                aria-label={tab.label}
                onClick={() => setPanel(tab.id)}
                onMouseEnter={show}
                onMouseLeave={() => setTip(null)}
                onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) show(e); }}
                onBlur={() => setTip(null)}
            >
                <tab.Icon />
            </button>
            {/* Tooltip is portalled to <body>, so no stacking context in the sidebar can ever paint over it */}
            {tip && createPortal(
                <div className="rail-tooltip-portal" style={{ left: tip.left, top: tip.top }}>{tab.label}</div>,
                document.body
            )}
        </>
    );
}

export function Rail() {
    return (
        <nav className="sidebar-rail" aria-label="Settings sections">
            {RAIL_TABS.map(tab => <RailButton key={tab.id} tab={tab} />)}
        </nav>
    );
}
