import { useEffect, useRef } from 'react';

/**
 * Small popup that comes out of an export-bar button.
 * It closes on outside click and on Escape. Clicks inside portalled dropdown menus
 * (e.g. the PNG resolution picker) count as inside.
 */
export function ExportPopover({ title, onClose, anchorRef, children }) {
    const ref = useRef(null);
    useEffect(() => {
        const onDown = (e) => {
            if (ref.current?.contains(e.target)) return;
            if (anchorRef.current?.contains(e.target)) return;
            if (e.target.closest?.('.portal-dropdown-menu')) return;
            onClose();
        };
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose, anchorRef]);

    return (
        <div className="export-popover" ref={ref} role="dialog" aria-label={title}>
            <div className="export-popover-title">{title}</div>
            {children}
        </div>
    );
}

export function CheckRow({ label, title, checked, onChange, children }) {
    return (
        <div className="export-popover-row">
            <label className="export-option" title={title}>
                <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
                <span>{label}</span>
            </label>
            {children}
        </div>
    );
}
