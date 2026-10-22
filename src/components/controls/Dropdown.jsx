import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from './Icons.jsx';
import { SvgIcon } from './SvgIcon.jsx';

// 5px padding + 1px border of the portal menu
const MENU_FRAME = 6;

/**
 * Custom dropdown. The menu is rendered in a portal (position: fixed) so that it is never
 * clipped by the scrolling sidebar.
 *
 * options: [{ value, label, icon? }]
 * extraItems: [{ key, label, icon?, onSelect }] — action rows shown below the options.
 */
export function Dropdown({
    value, options, onChange, extraItems = [], className = '', disabled = false, placeholder = ''
}) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback(() => { setOpen(false); setPos(null); }, []);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current || !menuRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        const menuH = menuRef.current.offsetHeight;
        const spaceBelow = window.innerHeight - r.bottom - 8;
        const openUp = spaceBelow < Math.min(menuH, 220) && r.top > spaceBelow;
        const maxHeight = Math.max(120, (openUp ? r.top : spaceBelow) - 8);
        const h = Math.min(menuH, maxHeight);
        // Every item is exactly as big as the closed dropdown (same width and height); the menu is wider by its own
        // padding + border so that the items line up with the trigger.
        const frame = MENU_FRAME;
        const width = r.width + frame * 2;
        const left = Math.max(4, Math.min(r.left - frame, window.innerWidth - width - 4));
        setPos({
            left,
            width,
            itemW: r.width,
            itemH: r.height,
            top: openUp ? r.top - h - 4 : r.bottom + 4,
            maxHeight
        });
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
            close();
        };
        const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) close(); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, close]);

    const selected = options.find(o => String(o.value) === String(value));

    return (
        <div className={`custom-dropdown ${open ? 'open' : ''} ${className}`}>
            <button
                type="button"
                ref={triggerRef}
                className="dropdown-trigger"
                disabled={disabled}
                onClick={() => (open ? close() : setOpen(true))}
            >
                <span className="dropdown-value">
                    {selected?.icon && <SvgIcon name={selected.icon} style={{ width: 14, height: 14 }} />}
                    {selected ? selected.label : placeholder}
                </span>
                <IconChevronDown className="dropdown-chevron" width={12} height={12} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    className="portal-dropdown-menu"
                    style={{
                        left: pos?.left ?? 0,
                        top: pos?.top ?? 0,
                        width: pos?.width,
                        '--dd-item-w': pos ? `${pos.itemW}px` : undefined,
                        '--dd-item-h': pos ? `${pos.itemH}px` : undefined,
                        maxHeight: pos?.maxHeight,
                        visibility: pos ? 'visible' : 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    {options.map(o => (
                        <div
                            key={o.value}
                            className={`dropdown-item ${String(o.value) === String(value) ? 'selected' : ''}`}
                            onClick={() => { onChange(o.value); close(); }}
                        >
                            {o.icon && <SvgIcon name={o.icon} />}
                            <span className="dropdown-item-label">{o.label}</span>
                        </div>
                    ))}
                    {extraItems.map(it => (
                        <div
                            key={it.key}
                            className={`dropdown-item ${it.className || 'dropdown-item-action'}`}
                            onClick={() => { close(); it.onSelect(); }}
                        >
                            {it.icon && <SvgIcon name={it.icon} />}
                            <span className="dropdown-item-label">{it.label}</span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
