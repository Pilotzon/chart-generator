import { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { RichTextEditor } from '../richtext/RichTextEditor.jsx';
import { IconPencil } from '../controls/Icons.jsx';

const TITLES = {
    titleText: 'Edit title',
    subtitleText: 'Edit subtitle',
    xLabel: 'Edit X-axis label',
    yLabel: 'Edit Y-axis label'
};

const RUNS_KEYS = { titleText: 'titleRuns', subtitleText: 'subtitleRuns', xLabel: 'xLabelRuns', yLabel: 'yLabelRuns' };

function currentRuns(state, key) {
    if (key.startsWith('col:')) return ((state.columns || {})[key.slice(4)] || {}).runs || [];
    return state[RUNS_KEYS[key]] || [];
}

/** Popover for editing a text straight on the canvas. Position is relative to the canvas card. */
export function QuickEdit({ target, cardRef, onClose }) {
    const { state, actions } = useApp();
    const boxRef = useRef(null);
    const [runs, setRuns] = useState(() => currentRuns(state, target.key));
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        const card = cardRef.current, box = boxRef.current;
        if (!card || !box) return;
        const cr = card.getBoundingClientRect();
        const relX = target.cx - cr.left, relY = target.cy - cr.top;
        const w = box.offsetWidth || 340, h = box.offsetHeight || 200;
        let left = relX - w / 2;
        let top = relY + 18;
        if (top + h > cr.height - 10) top = relY - h - 18;
        left = Math.max(10, Math.min(left, cr.width - w - 10));
        top = Math.max(10, Math.min(top, cr.height - h - 10));
        setPos({ left, top });
    }, [target, cardRef]);

    const title = target.key.startsWith('col:')
        ? `Edit column ${Number(target.key.slice(4)) + 1} title`
        : TITLES[target.key];

    const save = () => {
        actions.setRuns(target.key, runs);
        onClose();
    };

    return (
        <div
            id="quickEditBox"
            ref={boxRef}
            style={{
                display: 'flex',
                left: pos?.left ?? 0,
                top: pos?.top ?? 0,
                visibility: pos ? 'visible' : 'hidden'
            }}
        >
            <div className="quick-edit-header">
                <span className="quick-edit-title"><IconPencil /> {title}</span>
                <button type="button" className="icon-btn icon-btn-small" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <div className="rich-text-wrapper">
                <RichTextEditor id="quickInput" runs={runs} onChange={setRuns} autoFocus />
            </div>
            <button type="button" className="btn btn-primary btn-quick-save" onClick={save}>Save changes</button>
        </div>
    );
}
