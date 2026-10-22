import { useEffect, useState } from 'react';
import { IconChevronDown } from './Icons.jsx';

/** Collapsible settings group. */
export function Group({ title, children, defaultOpen = true, className = '', openOn = null }) {
    const [open, setOpen] = useState(defaultOpen);
    // a changing, non-null `openOn` value (e.g. a point picked on the canvas) expands the group
    useEffect(() => { if (openOn) setOpen(true); }, [openOn]);
    return (
        <div className={`group ${open ? '' : 'collapsed'} ${className}`}>
            <div className="group-header" onClick={() => setOpen(o => !o)}>
                <span className="group-title-text">{title}</span>
                <span className="group-chevron"><IconChevronDown width={14} height={14} strokeWidth={1.75} /></span>
            </div>
            <div className="group-body">{children}</div>
        </div>
    );
}
