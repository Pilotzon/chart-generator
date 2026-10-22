import { useState } from 'react';
import { IconChevronDown } from './Icons.jsx';

/** Collapsible settings group. */
export function Group({ title, children, defaultOpen = true, className = '' }) {
    const [open, setOpen] = useState(defaultOpen);
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
