import { useLayoutEffect, useRef } from 'react';
import { applyEditorDirection, htmlToRuns, runsToHtml } from '../../lib/richText.js';

function exec(cmd) {
    try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* ignore */ }
    document.execCommand(cmd, false, null);
}

/**
 * Uncontrolled contentEditable that edits an array of text runs
 * ({ text, bold, italic, underline, color }).
 *
 * The DOM is only rewritten when `runs` changes from the outside (reset, mode switch, …);
 * values it emitted itself are recognised by identity, so the caret never jumps.
 */
export function RichTextEditor({
    runs, onChange, className = '', placeholder, id, minHeight, autoFocus = false, onKeyDown, ...rest
}) {
    const elRef = useRef(null);
    const lastEmitted = useRef(null);

    useLayoutEffect(() => {
        const el = elRef.current;
        if (!el || lastEmitted.current === runs) return;
        el.innerHTML = runsToHtml(runs);
        applyEditorDirection(el);
        lastEmitted.current = runs;
    }, [runs]);

    useLayoutEffect(() => {
        if (autoFocus && elRef.current) {
            const el = elRef.current;
            el.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [autoFocus]);

    const handleInput = () => {
        const el = elRef.current;
        const next = htmlToRuns(el);
        if (next.length === 0 && el.innerHTML !== '') el.innerHTML = ''; // keep :empty placeholder working
        applyEditorDirection(el);
        lastEmitted.current = next;
        onChange(next);
    };

    return (
        <div
            {...rest}
            id={id}
            ref={elRef}
            className={`rich-text-editor ${className}`}
            contentEditable
            suppressContentEditableWarning
            dir="rtl"
            data-placeholder={placeholder}
            style={minHeight ? { minHeight } : undefined}
            onInput={handleInput}
            onPaste={(e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
            }}
            onKeyDown={(e) => {
                if (e.metaKey || e.ctrlKey) {
                    const k = e.key.toLowerCase();
                    const cmd = { b: 'bold', i: 'italic', u: 'underline' }[k];
                    if (cmd) { e.preventDefault(); exec(cmd); }
                }
                onKeyDown?.(e);
            }}
        />
    );
}
