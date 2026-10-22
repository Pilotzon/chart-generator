import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { applyEditorDirection } from '../../lib/richText.js';

const FORMATS = ['bold', 'underline', 'italic'];

function getSelectionEditor() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const editor = el && el.closest ? el.closest('.rich-text-editor') : null;
    if (!editor || editor.getAttribute('contenteditable') !== 'true') return null;
    if (!sel.toString().length) return null;
    return editor;
}

const readActive = () => {
    const out = {};
    FORMATS.forEach(f => {
        try { out[f] = document.queryCommandState(f); } catch (e) { out[f] = false; }
    });
    return out;
};

/**
 * Floating formatting toolbar. Shown only while text inside a rich-text editor is selected,
 * and formats exactly that selection. After formatting it dispatches an `input` event on the
 * editor, so the editor's own handler emits the new runs (works for sidebar + quick-edit editors).
 */
export function SelectionToolbar() {
    const [anchor, setAnchor] = useState(null);
    const [active, setActive] = useState({});
    const [color, setColor] = useState('#000000');
    const toolbarRef = useRef(null);
    const editorRef = useRef(null);
    const rangeRef = useRef(null);
    const pickerOpen = useRef(false);
    const colorRef = useRef(null);

    const hide = useCallback(() => {
        setAnchor(null);
        editorRef.current = null;
        rangeRef.current = null;
        pickerOpen.current = false;
    }, []);

    const update = useCallback(() => {
        if (pickerOpen.current) return;
        const editor = getSelectionEditor();
        if (!editor) { hide(); return; }
        const range = window.getSelection().getRangeAt(0);
        editorRef.current = editor;
        rangeRef.current = range.cloneRange();
        const rects = range.getClientRects();
        const r = rects.length ? rects[0] : range.getBoundingClientRect();
        setAnchor({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
        setActive(readActive());
    }, [hide]);

    useLayoutEffect(() => {
        const tb = toolbarRef.current;
        if (!anchor || !tb) return;
        const tw = tb.offsetWidth, th = tb.offsetHeight;
        let top = anchor.top - th - 8;
        if (top < 8) top = anchor.bottom + 8;
        const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - tw / 2, window.innerWidth - tw - 8));
        tb.style.left = `${left}px`;
        tb.style.top = `${top}px`;
    }, [anchor]);

    useEffect(() => {
        const onSel = () => { if (!pickerOpen.current) update(); };
        const onDown = (e) => { if (!toolbarRef.current?.contains(e.target)) pickerOpen.current = false; };
        const onScroll = () => { if (editorRef.current) update(); };
        document.addEventListener('selectionchange', onSel);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('resize', hide);
        document.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('selectionchange', onSel);
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('resize', hide);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [update, hide]);

    // native "change" fires when the colour picker is closed
    useEffect(() => {
        const el = colorRef.current;
        if (!el) return undefined;
        const onChangeNative = () => {
            pickerOpen.current = false;
            setTimeout(update, 0);
        };
        el.addEventListener('change', onChangeNative);
        return () => el.removeEventListener('change', onChangeNative);
    }, [update]);

    const apply = (cmd, value) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        const sel = window.getSelection();
        if (rangeRef.current) {
            sel.removeAllRanges();
            sel.addRange(rangeRef.current);
        }
        if (sel.isCollapsed) return;
        try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* ignore */ }
        if (cmd === 'color') document.execCommand('foreColor', false, value);
        else document.execCommand(cmd, false, null);
        applyEditorDirection(editor);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        if (sel.rangeCount) rangeRef.current = sel.getRangeAt(0).cloneRange();
        setActive(readActive());
    };

    return (
        <div
            ref={toolbarRef}
            className="sel-fmt-toolbar"
            dir="ltr"
            role="toolbar"
            aria-label="Text formatting"
            style={{ display: anchor ? 'flex' : 'none' }}
        >
            <div className="fmt-group">
                {[['bold', 'B', 'fmt-btn-bold', 'Bold'], ['underline', 'U', 'fmt-btn-underline', 'Underline'], ['italic', 'I', 'fmt-btn-italic', 'Italic']]
                    .map(([fmt, label, cls, title]) => (
                        <button
                            key={fmt}
                            type="button"
                            className={`fmt-btn ${cls} ${active[fmt] ? 'active' : ''}`}
                            data-fmt={fmt}
                            title={title}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => apply(fmt)}
                        >{label}</button>
                    ))}
            </div>
            <input
                ref={colorRef}
                type="color"
                className="fmt-color-btn"
                value={color}
                title="Text Color"
                onMouseDown={() => { pickerOpen.current = true; }}
                onChange={(e) => { setColor(e.target.value); apply('color', e.target.value); }}
                onBlur={() => {
                    pickerOpen.current = false;
                    setTimeout(update, 0);
                }}
            />
        </div>
    );
}
