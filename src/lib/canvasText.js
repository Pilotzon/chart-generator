import { splitRunsIntoLines } from './richText.js';

export const runFont = (run, size, font) =>
    `${run.italic ? 'italic' : 'normal'} ${run.bold ? 'bold' : 'normal'} ${size}px ${font}`;

export function measureRunWidth(ctx, run, size, font) {
    ctx.font = runFont(run, size, font);
    return ctx.measureText(run.text).width;
}

export function measureLineWidth(ctx, lineRuns, size, font) {
    let w = 0;
    lineRuns.forEach(r => { w += measureRunWidth(ctx, r, size, font); });
    return w;
}

/**
 * Draw one rich-text line. Uses the current ctx.textBaseline to find the glyph baseline so
 * the underline lands *below* the text.
 */
export function drawRichLine(ctx, lineRuns, x, y, size, font, anchor, isRtl) {
    if (lineRuns.length === 0) return;
    const lineWidth = measureLineWidth(ctx, lineRuns, size, font);
    let startX;
    if (anchor === 'left') startX = x;
    else if (anchor === 'right') startX = x - lineWidth;
    else startX = x - lineWidth / 2;
    const ordered = isRtl ? [...lineRuns].reverse() : lineRuns;

    let baselineY;
    switch (ctx.textBaseline) {
        case 'top': baselineY = y + size * 0.82; break;
        case 'middle': baselineY = y + size * 0.32; break;
        case 'bottom': baselineY = y - size * 0.18; break;
        default: baselineY = y;
    }

    let cursorX = startX;
    ordered.forEach(run => {
        ctx.font = runFont(run, size, font);
        ctx.fillStyle = run.color || '#000000';
        ctx.textAlign = 'left';
        ctx.direction = isRtl ? 'rtl' : 'ltr';
        ctx.fillText(run.text, cursorX, y);
        const w = ctx.measureText(run.text).width;
        if (run.underline) {
            ctx.save();
            ctx.strokeStyle = run.color || '#000000';
            ctx.lineWidth = Math.max(1, size * 0.06);
            const uly = baselineY + size * 0.14;
            ctx.beginPath();
            ctx.moveTo(cursorX, uly);
            ctx.lineTo(cursorX + w, uly);
            ctx.stroke();
            ctx.restore();
        }
        cursorX += w;
    });
    ctx.direction = 'ltr';
}

/** Draw pre-split lines (array of run-arrays). Returns the number of lines. */
export function drawRichLines(ctx, lines, x, y, size, font, anchor, isRtl, lineHeight) {
    lines.forEach((line, i) => drawRichLine(ctx, line, x, y + i * lineHeight, size, font, anchor, isRtl));
    return lines.length;
}

export function drawRichText(ctx, runs, x, y, size, font, anchor, isRtl, lineHeight) {
    return drawRichLines(ctx, splitRunsIntoLines(runs), x, y, size, font, anchor, isRtl, lineHeight);
}
