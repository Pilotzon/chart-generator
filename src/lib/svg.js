import { hasText, hasHebrewInRuns, flipRunsForWord, splitRunsIntoLines } from './richText.js';
import { computeLayout, getColumns, getColumnConfig, getCanvasSize, getMeasureCtx } from './layout.js';
import { measureRunWidth, measureLineWidth, runFont } from './canvasText.js';
import { getSmoothControlPoints } from './canvasShapes.js';
import { anchorToPointIndex, markKeyFor, sortedPoints, getLegendCharts } from './points.js';

const escXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildSplinePathD(pts, tension) {
    if (pts.length < 2) return '';
    if (tension <= 0) {
        return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(2)} ${p.py.toFixed(2)} `).join('');
    }
    const controls = getSmoothControlPoints(pts);
    let d = `M ${pts[0].px.toFixed(2)} ${pts[0].py.toFixed(2)} `;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1], cp = controls[i];
        const cp1x = p0.px + (cp.cp1x - p0.px) * tension;
        const cp1y = p0.py + (cp.cp1y - p0.py) * tension;
        const cp2x = p1.px + (cp.cp2x - p1.px) * tension;
        const cp2y = p1.py + (cp.cp2y - p1.py) * tension;
        d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.px.toFixed(2)} ${p1.py.toFixed(2)} `;
    }
    return d;
}

function svgTextEl(run, x, y, size, font, baseline) {
    const weight = run.bold ? 'bold' : 'normal';
    const style = run.italic ? 'italic' : 'normal';
    const decor = run.underline ? 'underline' : 'none';
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size}" font-family="${escXml(font)}" font-weight="${weight}" font-style="${style}" text-decoration="${decor}" fill="${escXml(run.color || '#000')}" text-anchor="start" dominant-baseline="${baseline}">${escXml(run.text)}</text>\n`;
}

/** Pre-split lines of runs -> <text> elements, anchored like the canvas renderer. */
function buildSvgRichLines(mctx, lines, x, y, size, font, anchor, isRtl, lineH) {
    let out = '';
    lines.forEach((line, li) => {
        const lineY = y + li * lineH;
        const totalW = measureLineWidth(mctx, line, size, font);
        let cursor = anchor === 'middle' ? x - totalW / 2 : anchor === 'end' ? x - totalW : x;
        (isRtl ? [...line].reverse() : line).forEach(run => {
            mctx.font = runFont(run, size, font);
            out += svgTextEl(run, cursor, lineY, size, font, 'auto');
            cursor += mctx.measureText(run.text).width;
        });
    });
    return out;
}

function buildSvgArrowHead(x, y, angle, size, style, color) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rot = (px, py) => ({ x: (x + px * cos - py * sin).toFixed(2), y: (y + px * sin + py * cos).toFixed(2) });
    switch (style) {
        case 'arrow': {
            const p1 = rot(-size, -size * 0.5), p2 = rot(-size, size * 0.5);
            return `<polyline points="${p1.x},${p1.y} ${x.toFixed(2)},${y.toFixed(2)} ${p2.x},${p2.y}" fill="none" stroke="${escXml(color)}" stroke-width="${Math.max(1.5, size * 0.15).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
        }
        case 'triangle': {
            const p1 = rot(-size, -size * 0.45), p2 = rot(-size, size * 0.45);
            return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${p1.x},${p1.y} ${p2.x},${p2.y}" fill="${escXml(color)}"/>\n`;
        }
        case 'stealth': {
            const p1 = rot(-size, -size * 0.45), p2 = rot(-size * 0.55, 0), p3 = rot(-size, size * 0.45);
            return `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="${escXml(color)}"/>\n`;
        }
        case 'circle':
            return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(size * 0.35).toFixed(2)}" fill="${escXml(color)}"/>\n`;
        default:
            return '';
    }
}

/**
 * Builds the vector export.
 * opts: { mode, invertText, background: string | null }
 * The SVG is transparent unless `background` is provided.
 */
export function buildVectorSVG(state, opts = {}) {
    const { mode, invertText = false, background = null } = opts;
    const advanced = mode === 'advanced';
    const { width: W, height: H } = getCanvasSize(state);
    const mctx = getMeasureCtx();
    const T = runs => (invertText ? flipRunsForWord(runs) : runs);
    const layout = computeLayout(state, W, H, { invertText });
    const { pad, pw, ph, mapX, mapY, tLen } = layout;
    const tickFontPx = parseInt(state.tickFontSize) || 15;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const gridW = parseFloat(state.gridLineWidth);

    const vb = { x: 0, y: 0, w: W, h: H };
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vb.w}" height="${vb.h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">\n`;
    if (background) svg += `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${escXml(background)}"/>\n`;

    // Column backgrounds
    getColumns(state).forEach(col => {
        const cfg = getColumnConfig(state, col.index);
        if (!cfg.bgEnabled) return;
        const x0 = mapX(col.from), x1 = mapX(col.to);
        const op = Math.max(0, Math.min(1, parseFloat(cfg.bgOpacity)));
        svg += `<rect x="${x0.toFixed(2)}" y="${pad.top.toFixed(2)}" width="${(x1 - x0).toFixed(2)}" height="${ph.toFixed(2)}" fill="${escXml(cfg.bgColor)}" fill-opacity="${op}"/>\n`;
    });

    // Title / subtitle
    {
        const titleRuns = T(state.titleRuns);
        const subtitleRuns = T(state.subtitleRuns);
        const showTitle = hasText(titleRuns);
        const showSub = state.hasSubtitle && hasText(subtitleRuns);
        let tx = W / 2, anchor = 'middle';
        if (state.titlePosition === 'top-left') { tx = pad.left; anchor = 'start'; }
        if (state.titlePosition === 'top-right') { tx = W - pad.right; anchor = 'end'; }
        let afterY = 22;
        if (showTitle) {
            const lines = splitRunsIntoLines(titleRuns);
            const lineH = titleFontPx * 1.35;
            svg += buildSvgRichLines(mctx, lines, tx, 22 + titleFontPx * 0.82, titleFontPx, state.titleFont, anchor, hasHebrewInRuns(titleRuns), lineH);
            afterY = 22 + lines.length * lineH;
        }
        if (showSub) {
            const subLineH = subtitleFontPx * 1.35;
            const subStartY = afterY + (showTitle ? 4 : 0);
            svg += buildSvgRichLines(mctx, splitRunsIntoLines(subtitleRuns), tx, subStartY + subtitleFontPx * 0.82, subtitleFontPx, state.subtitleFont || state.titleFont, anchor, hasHebrewInRuns(subtitleRuns), subLineH);
        }
    }

    const dashAttr = state.gridLineStyle === 'dashed' ? ' stroke-dasharray="6,4"' : '';
    const xSubStep = state.xStep / state.xSubDiv;
    const ySubStep = state.yStep / state.ySubDiv;
    const totalXSteps = Math.round((state.xMax - state.xMin) / xSubStep);
    const totalYSteps = Math.round((state.yMax - state.yMin) / ySubStep);

    if (state.showVerticalGrid !== false) {
        for (let i = 0; i <= totalXSteps; i++) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal);
            svg += `<line x1="${xPx}" y1="${pad.top}" x2="${xPx}" y2="${pad.top + ph}" stroke="${state.gridColor}" stroke-width="${gridW}"${dashAttr}/>\n`;
        }
    }
    if (state.showHorizontalGrid !== false) {
        for (let i = 0; i <= totalYSteps; i++) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal);
            svg += `<line x1="${pad.left}" y1="${yPx}" x2="${pad.left + pw}" y2="${yPx}" stroke="${state.gridColor}" stroke-width="${gridW}"${dashAttr}/>\n`;
        }
    }

    const bColor = state.borderColor || '#000000';
    const bWidth = parseFloat(state.borderWidth) || 1.5;
    const border = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${bColor}" stroke-width="${bWidth}"/>\n`;
    if (state.borderTop) svg += border(pad.left, pad.top, pad.left + pw, pad.top);
    if (state.borderRight) svg += border(pad.left + pw, pad.top, pad.left + pw, pad.top + ph);
    if (state.borderBottom) svg += border(pad.left, pad.top + ph, pad.left + pw, pad.top + ph);
    if (state.borderLeft) svg += border(pad.left, pad.top, pad.left, pad.top + ph);

    if (advanced && state.showAxisArrows) {
        const aSize = parseFloat(state.axisArrowSize) || 14;
        const aStyle = state.axisArrowStyle || 'triangle';
        if (state.arrowBottom && state.borderBottom) svg += buildSvgArrowHead(pad.left + pw, pad.top + ph, 0, aSize, aStyle, bColor);
        if (state.arrowLeft && state.borderLeft) svg += buildSvgArrowHead(pad.left, pad.top, -Math.PI / 2, aSize, aStyle, bColor);
        if (state.arrowTop && state.borderTop) svg += buildSvgArrowHead(pad.left + pw, pad.top, 0, aSize, aStyle, bColor);
        if (state.arrowRight && state.borderRight) svg += buildSvgArrowHead(pad.left + pw, pad.top, -Math.PI / 2, aSize, aStyle, bColor);
    }

    if (state.showTicks) {
        for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal);
            svg += `<line x1="${xPx}" y1="${pad.top + ph - tLen}" x2="${xPx}" y2="${pad.top + ph + tLen}" stroke="${state.tickColor}" stroke-width="${gridW}"/>\n`;
        }
        for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal);
            svg += `<line x1="${pad.left - tLen}" y1="${yPx}" x2="${pad.left + tLen}" y2="${yPx}" stroke="${state.tickColor}" stroke-width="${gridW}"/>\n`;
        }
    }

    const tickText = v => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1));
    const showTickLabels = state.showTickLabels !== false;
    for (let i = 0; showTickLabels && i <= totalXSteps; i += state.xSubDiv) {
        const xVal = state.xMin + i * xSubStep;
        if (xVal > state.xMax + 0.001) break;
        svg += `<text x="${mapX(xVal)}" y="${pad.top + ph + tLen + 4 + tickFontPx * 0.82}" font-family="${escXml(state.tickFont)}" font-size="${tickFontPx}" text-anchor="middle" dominant-baseline="auto" fill="#000">${tickText(xVal)}</text>\n`;
    }
    for (let i = 0; showTickLabels && i <= totalYSteps; i += state.ySubDiv) {
        const yVal = state.yMin + i * ySubStep;
        if (yVal > state.yMax + 0.001) break;
        svg += `<text x="${pad.left - tLen - 6}" y="${mapY(yVal)}" font-family="${escXml(state.tickFont)}" font-size="${tickFontPx}" text-anchor="end" dominant-baseline="central" fill="#000">${tickText(yVal)}</text>\n`;
    }

    // Column titles
    layout.columnTitles.forEach(ct => {
        const above = ct.placement !== 'below';
        const startY = above ? pad.top - 6 - ct.height : pad.top + ph + tLen + layout.tickBlockH + 10;
        let x, anchor;
        if (ct.align === 'left') { x = ct.x0 + 6; anchor = 'start'; }
        else if (ct.align === 'right') { x = ct.x1 - 6; anchor = 'end'; }
        else { x = (ct.x0 + ct.x1) / 2; anchor = 'middle'; }
        const isRtl = ct.lines.some(l => hasHebrewInRuns(l));
        svg += buildSvgRichLines(mctx, ct.lines, x, startY + layout.colFontPx * 0.82, layout.colFontPx, state.columnTitleFont, anchor, isRtl, layout.colLineH);
    });

    // Axis labels
    const xRuns = T(state.xLabelRuns);
    if (hasText(xRuns)) {
        const lineH = axisFontPx * 1.35;
        const startY = pad.top + ph + tLen + layout.tickBlockH + 14 + layout.belowBlock + axisFontPx * 0.82;
        svg += buildSvgRichLines(mctx, splitRunsIntoLines(xRuns), pad.left + pw / 2, startY, axisFontPx, state.axisFont, 'middle', hasHebrewInRuns(xRuns), lineH);
    }
    const yRuns = T(state.yLabelRuns);
    if (hasText(yRuns)) {
        const isRtl = hasHebrewInRuns(yRuns);
        const lineH = axisFontPx * 1.35;
        const lines = splitRunsIntoLines(yRuns);
        svg += `<g transform="translate(25,${pad.top + ph / 2}) rotate(-90)">\n`;
        lines.forEach((line, li) => {
            const yOff = (li - (lines.length - 1) / 2) * lineH;
            let cursor = -measureLineWidth(mctx, line, axisFontPx, state.axisFont) / 2;
            (isRtl ? [...line].reverse() : line).forEach(run => {
                const w = measureRunWidth(mctx, run, axisFontPx, state.axisFont);
                svg += '  ' + svgTextEl(run, cursor, yOff, axisFontPx, state.axisFont, 'central');
                cursor += w;
            });
        });
        svg += '</g>\n';
    }

    // Charts
    state.charts.forEach(chart => {
        if (chart.points.length === 0) return;
        const tension = parseFloat(chart.lineTension) || 0;
        const showLine = chart.showLine !== false;
        const linePts = sortedPoints(chart).map(pt => ({ px: mapX(pt.x), py: mapY(pt.y) }));
        const lineColor = chart.lineColor;
        const sz = parseFloat(chart.markerSize);

        if (showLine && linePts.length >= 2) {
            svg += `<path d="${buildSplinePathD(linePts, tension)}" fill="none" stroke="${lineColor}" stroke-width="${chart.lineWidth}" stroke-linejoin="round" stroke-linecap="round"/>\n`;
            if (advanced) {
                const aSize = parseFloat(chart.arrowSize) || 12;
                if (chart.arrowEnd && chart.arrowEnd !== 'none') {
                    const last = linePts[linePts.length - 1], prev = linePts[linePts.length - 2];
                    svg += buildSvgArrowHead(last.px, last.py, Math.atan2(last.py - prev.py, last.px - prev.px), aSize, chart.arrowEnd, lineColor);
                }
                if (chart.arrowStart && chart.arrowStart !== 'none') {
                    const first = linePts[0], second = linePts[1];
                    svg += buildSvgArrowHead(first.px, first.py, Math.atan2(first.py - second.py, first.px - second.px), aSize, chart.arrowStart, lineColor);
                }
            }
        }

        if (chart.markerShape !== 'none') {
            chart.points.forEach((pt, idx) => {
                const px = mapX(pt.x), py = mapY(pt.y);
                let fill = lineColor, outlineC = null, outlineW = 0;
                const meta = pt.marked ? chart.markedPointsMeta[markKeyFor(chart, idx)] : null;
                if (meta) {
                    fill = meta.fillColor || chart.color;
                    outlineC = meta.outlineColor;
                    outlineW = meta.outlineWidth || 0;
                }
                const strokeAttr = outlineW > 0 && outlineC ? ` stroke="${outlineC}" stroke-width="${outlineW}"` : '';
                if (chart.markerShape === 'diamond') {
                    const s = sz * 1.2;
                    svg += `<g transform="translate(${px},${py}) rotate(45)"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" fill="${fill}"${strokeAttr}/></g>\n`;
                } else if (chart.markerShape === 'circle') {
                    svg += `<circle cx="${px}" cy="${py}" r="${sz}" fill="${fill}"${strokeAttr}/>\n`;
                } else if (chart.markerShape === 'square') {
                    svg += `<rect x="${px - sz}" y="${py - sz}" width="${sz * 2}" height="${sz * 2}" fill="${fill}"${strokeAttr}/>\n`;
                } else if (chart.markerShape === 'cross') {
                    svg += `<line x1="${px - sz}" y1="${py - sz}" x2="${px + sz}" y2="${py + sz}" stroke="${fill}" stroke-width="2.5"/>\n`;
                    svg += `<line x1="${px + sz}" y1="${py - sz}" x2="${px - sz}" y2="${py + sz}" stroke="${fill}" stroke-width="2.5"/>\n`;
                }
                if (advanced && meta && meta.label) {
                    const off = sz + 8;
                    const fs = parseInt(state.markedFontSize) || 13;
                    const ff = state.markedFont || state.axisFont;
                    let lx = px, ly = py, ta = 'middle';
                    const pos = meta.labelPosition || 'above';
                    if (pos === 'above') ly = py - off;
                    else if (pos === 'below') ly = py + off + fs;
                    else if (pos === 'right') { lx = px + off; ta = 'start'; ly = py + fs * 0.35; }
                    else if (pos === 'left') { lx = px - off; ta = 'end'; ly = py + fs * 0.35; }
                    svg += `<text x="${lx}" y="${ly}" font-size="${fs}" font-family="${escXml(ff)}" font-weight="bold" text-anchor="${ta}" fill="#000">${escXml(meta.label)}</text>\n`;
                }
            });
        }

        if (advanced && chart.showChartLabel && chart.name && chart.name.trim()) {
            let idx = anchorToPointIndex(chart, chart.chartLabelAnchor || 'last');
            if (idx < 0) idx = chart.points.length - 1;
            const pt = chart.points[idx];
            const px = mapX(pt.x), py = mapY(pt.y);
            const off = sz + 10;
            const fs = chart.chartLabelFontSize || 14;
            const wt = chart.chartLabelBold ? 'bold' : 'normal';
            const y = chart.chartLabelPosition === 'below' ? py + off + fs : py - off;
            svg += `<text x="${px}" y="${y}" font-size="${fs}" font-family="${escXml(state.axisFont)}" font-weight="${wt}" text-anchor="middle" fill="#000">${escXml(chart.name)}</text>\n`;
        }
    });

    // Legend
    const legendCharts = getLegendCharts(state);
    if (advanced && state.showLegend && legendCharts.length > 0) {
        const fontSize = parseInt(state.legendFontSize) || 13;
        const legendFont = state.legendFont || state.axisFont;
        const padding = 10, rowHeight = fontSize + 8, swatchSize = fontSize, gap = 8, margin = 12;
        mctx.font = `500 ${fontSize}px ${legendFont}`;
        let maxTextW = 0;
        legendCharts.forEach(c => { maxTextW = Math.max(maxTextW, mctx.measureText(c.name).width); });
        const boxW = padding * 2 + swatchSize + gap + maxTextW;
        const boxH = padding * 2 + legendCharts.length * rowHeight - (rowHeight - fontSize - 4);
        let lx, ly;
        switch (state.legendPosition) {
            case 'bottom-right': lx = pad.left + pw - boxW - margin; ly = pad.top + ph - boxH - margin; break;
            case 'top-left': lx = pad.left + margin; ly = pad.top + margin; break;
            case 'bottom-left': lx = pad.left + margin; ly = pad.top + ph - boxH - margin; break;
            default: lx = pad.left + pw - boxW - margin; ly = pad.top + margin;
        }
        svg += `<rect x="${lx}" y="${ly}" width="${boxW}" height="${boxH}" rx="8" fill="${state.legendBg}" ${state.legendBorder ? 'stroke="rgba(0,0,0,0.12)" stroke-width="1"' : ''}/>\n`;
        legendCharts.forEach((c, i) => {
            const rowY = ly + padding + rowHeight * i + rowHeight / 2 - 2;
            svg += `<circle cx="${lx + padding + swatchSize / 2}" cy="${rowY}" r="${swatchSize / 2}" fill="${c.color}"/>\n`;
            svg += `<text x="${lx + padding + swatchSize + gap}" y="${rowY}" font-size="${fontSize}" font-family="${escXml(legendFont)}" font-weight="500" dominant-baseline="central" fill="#333">${escXml(c.name)}</text>\n`;
        });
    }

    return svg + '</svg>';
}
