// Rich-text helpers: "runs" are [{ text, bold, italic, underline, color }]
export const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function detectDirection(text) {
    if (!text) return 'ltr';
    return RTL_REGEX.test(text) ? 'rtl' : 'ltr';
}

export function applyEditorDirection(editorEl) {
    if (!editorEl) return;
    const text = editorEl.innerText || editorEl.textContent || '';
    const dir = detectDirection(text);
    editorEl.setAttribute('dir', dir);
    editorEl.style.textAlign = dir === 'rtl' ? 'right' : 'left';
}

export function textToRuns(str, baseColor = '#000000') {
    if (!str) return [];
    return [{ text: str, bold: false, italic: false, underline: false, color: baseColor }];
}

export function runsToPlainText(runs) {
    if (!runs || !Array.isArray(runs)) return '';
    return runs.map(r => r.text).join('');
}

// A text box counts as "empty" when it has no visible characters (whitespace-only = empty)
export function hasText(runs) {
    return runsToPlainText(runs).trim().length > 0;
}

export function hasHebrewInRuns(runs) {
    return (runs || []).some(r => RTL_REGEX.test(r.text));
}

const plainRun = text => ({ text, bold: false, italic: false, underline: false, color: '#000000' });

// Flip a text box: every line is mirrored character-by-character ("hello" -> "olleh"),
// per-character formatting (bold / italic / underline / color) travels with its character.
export function invertRuns(runs) {
    if (!runs || !runs.length) return [];
    const lines = [[]];
    runs.forEach(run => {
        Array.from(run.text).forEach(ch => {
            if (ch === '\n') lines.push([]);
            else lines[lines.length - 1].push({ ch, bold: run.bold, italic: run.italic, underline: run.underline, color: run.color });
        });
    });
    const out = [];
    lines.forEach((line, i) => {
        if (i > 0) out.push(plainRun('\n'));
        [...line].reverse().forEach(c => {
            const last = out[out.length - 1];
            if (last && last.text !== '\n' && last.bold === c.bold && last.italic === c.italic
                && last.underline === c.underline && last.color === c.color) {
                last.text += c.ch;
            } else {
                out.push({ text: c.ch, bold: c.bold, italic: c.italic, underline: c.underline, color: c.color });
            }
        });
    });
    return out;
}

export function splitRunsIntoLines(runs) {
    const lines = [[]];
    (runs || []).forEach(run => {
        const parts = run.text.split('\n');
        parts.forEach((p, i) => {
            if (i > 0) lines.push([]);
            if (p.length > 0) {
                lines[lines.length - 1].push({
                    text: p, bold: run.bold, italic: run.italic,
                    underline: run.underline, color: run.color
                });
            }
        });
    });
    return lines;
}

/**
 * Split rich runs into display lines, additionally word-wrapping every line to `maxWidth`.
 * `measure(run)` must return the pixel width of a run.
 */
export function wrapRuns(runs, maxWidth, measure) {
    const out = [];
    splitRunsIntoLines(runs).forEach(line => {
        if (line.length === 0) { out.push([]); return; }
        // tokenise into words / spaces, keeping each token's style
        const tokens = [];
        line.forEach(run => {
            (run.text.match(/\s+|\S+/g) || []).forEach(t => tokens.push({ ...run, text: t }));
        });
        let cur = [];
        let curW = 0;
        const flush = () => {
            // trim trailing whitespace tokens
            while (cur.length && /^\s+$/.test(cur[cur.length - 1].text)) cur.pop();
            out.push(cur);
            cur = [];
            curW = 0;
        };
        tokens.forEach(tok => {
            const w = measure(tok);
            const isSpace = /^\s+$/.test(tok.text);
            if (!isSpace && curW + w > maxWidth && cur.length > 0) flush();
            if (isSpace && cur.length === 0) return; // no leading spaces on wrapped lines
            cur.push(tok);
            curW += w;
        });
        flush();
    });
    return out;
}

export function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function runsToHtml(runs) {
    if (!runs || runs.length === 0) return '';
    return runs.map(run => {
        const styles = [];
        if (run.color && run.color !== '#000000') styles.push(`color:${escapeHtml(run.color)}`);
        if (run.bold) styles.push('font-weight:700');
        if (run.italic) styles.push('font-style:italic');
        if (run.underline) styles.push('text-decoration:underline');
        const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
        const text = escapeHtml(run.text).replace(/\n/g, '<br>');
        return `<span${styleAttr}>${text}</span>`;
    }).join('');
}

export function colorStringToHex(str) {
    str = str.trim();
    if (str.startsWith('#')) {
        if (str.length === 4) return '#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
        return str.toLowerCase();
    }
    const rgb = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
        const toHex = n => parseInt(n).toString(16).padStart(2, '0');
        return '#' + toHex(rgb[1]) + toHex(rgb[2]) + toHex(rgb[3]);
    }
    const named = {
        black: '#000000', white: '#ffffff', red: '#ff0000',
        green: '#008000', blue: '#0000ff', yellow: '#ffff00',
        gray: '#808080', grey: '#808080'
    };
    return named[str.toLowerCase()] || null;
}

export function htmlToRuns(rootEl) {
    const runs = [];
    function push(text, style) {
        runs.push({ text, bold: style.bold, italic: style.italic, underline: style.underline, color: style.color });
    }
    function walk(node, inherited) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent) push(node.textContent, inherited);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node;
        const tag = el.tagName.toLowerCase();
        if (tag === 'br') { push('\n', inherited); return; }
        const next = { ...inherited };
        if (tag === 'b' || tag === 'strong') next.bold = true;
        if (tag === 'i' || tag === 'em') next.italic = true;
        if (tag === 'u') next.underline = true;
        if (tag === 'font') {
            const colorAttr = el.getAttribute('color');
            if (colorAttr) {
                const hex = colorStringToHex(colorAttr);
                if (hex) next.color = hex;
            }
        }
        const inline = el.getAttribute('style') || '';
        const fw = inline.match(/font-weight\s*:\s*([^;]+)/i);
        if (fw) {
            const v = fw[1].trim().toLowerCase();
            if (v === 'bold' || parseInt(v) >= 600) next.bold = true;
            if (v === 'normal' || (parseInt(v) > 0 && parseInt(v) < 600)) next.bold = false;
        }
        const fs = inline.match(/font-style\s*:\s*([^;]+)/i);
        if (fs) {
            const v = fs[1].trim().toLowerCase();
            if (v === 'italic' || v === 'oblique') next.italic = true;
            if (v === 'normal') next.italic = false;
        }
        const td = inline.match(/text-decoration(?:-line)?\s*:\s*([^;]+)/i);
        if (td) {
            const v = td[1].trim().toLowerCase();
            if (v.includes('underline')) next.underline = true;
            if (v === 'none') next.underline = false;
        }
        const cm = inline.match(/(?:^|[^-\w])color\s*:\s*([^;]+)/i);
        if (cm) {
            const hex = colorStringToHex(cm[1].trim());
            if (hex) next.color = hex;
        }
        const isBlock = tag === 'div' || tag === 'p';
        const alreadyHasContent = runs.length > 0 && runs[runs.length - 1].text.length > 0;
        if (isBlock && alreadyHasContent && !runs[runs.length - 1].text.endsWith('\n')) push('\n', next);
        for (const child of el.childNodes) walk(child, next);
    }
    for (const child of rootEl.childNodes) {
        walk(child, { bold: false, italic: false, underline: false, color: '#000000' });
    }
    const merged = [];
    for (const r of runs) {
        const last = merged[merged.length - 1];
        if (last && last.bold === r.bold && last.italic === r.italic
            && last.underline === r.underline && last.color === r.color) {
            last.text += r.text;
        } else {
            merged.push({ ...r });
        }
    }
    return merged.filter(r => r.text.length > 0);
}

export function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}
