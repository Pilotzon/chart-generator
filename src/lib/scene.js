import { detectDirection, hasText, hasHebrewInRuns, invertRuns, hexToRgb } from './richText.js';
import { computeLayout, getColumns, getColumnConfig } from './layout.js';
import { drawRichLine, drawRichLines, drawRichText } from './canvasText.js';
import { splitRunsIntoLines } from './richText.js';
import {
    drawArrowHead, drawCurvedLine, buildCurvedPath, drawMarker, drawHexagonWarning, roundRect
} from './canvasShapes.js';
import {
    anchorToPointIndex, markKeyFor, detectLabelOverlap, sortedPoints, getLegendCharts
} from './points.js';

/**
 * Paints the whole chart onto `ctx`.
 *
 * The background is intentionally transparent unless `opts.background` is given
 * (used by the export popovers).
 *
 * opts: { mode, width, height, view, invertText, background }
 * returns: { clickTargets, layout }
 */
export function drawScene(ctx, state, opts) {
    const { mode, width: W, height: H, view = {}, invertText = false, background = null } = opts;
    const advanced = mode === 'advanced';
    const clickTargets = [];
    const layout = computeLayout(state, W, H, { invertText });
    const { pad, pw, ph, mapX, mapY, tLen } = layout;
    const T = runs => (invertText ? invertRuns(runs) : runs);
    const registerHitbox = (key, x, y, w, h) => clickTargets.push({ key, x, y, w, h });

    ctx.clearRect(0, 0, W, H);
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, W, H);
    }

    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const tickFontPx = parseInt(state.tickFontSize) || 15;

    const xSubStep = state.xStep / state.xSubDiv;
    const ySubStep = state.yStep / state.ySubDiv;
    const totalXSteps = Math.round((state.xMax - state.xMin) / xSubStep);
    const totalYSteps = Math.round((state.yMax - state.yMin) / ySubStep);
    const gridW = parseFloat(state.gridLineWidth);

    // ── Column backgrounds (behind everything else)
    getColumns(state).forEach(col => {
        const cfg = getColumnConfig(state, col.index);
        if (!cfg.bgEnabled) return;
        const x0 = mapX(col.from), x1 = mapX(col.to);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, parseFloat(cfg.bgOpacity)));
        ctx.fillStyle = cfg.bgColor;
        ctx.fillRect(x0, pad.top, x1 - x0, ph);
        ctx.restore();
    });

    // ── Title + subtitle (each is skipped entirely when empty)
    {
        const titleRuns = T(state.titleRuns);
        const subtitleRuns = T(state.subtitleRuns);
        const showTitle = hasText(titleRuns);
        const showSub = state.hasSubtitle && hasText(subtitleRuns);
        if (showTitle || showSub) {
            let tx = W / 2;
            let anchor = 'center';
            if (state.titlePosition === 'top-left') { tx = pad.left; anchor = 'left'; }
            if (state.titlePosition === 'top-right') { tx = W - pad.right; anchor = 'right'; }
            ctx.textBaseline = 'top';
            const startY = 22;
            let afterTitleY = startY;
            if (showTitle) {
                const lineH = titleFontPx * 1.35;
                const n = drawRichText(ctx, titleRuns, tx, startY, titleFontPx, state.titleFont, anchor, hasHebrewInRuns(titleRuns), lineH);
                afterTitleY = startY + n * lineH;
                registerHitbox('titleText', tx - 250, startY - 5, 500, n * lineH + 10);
            }
            if (showSub) {
                const subLineH = subtitleFontPx * 1.35;
                const subStartY = afterTitleY + (showTitle ? 4 : 0);
                drawRichText(ctx, subtitleRuns, tx, subStartY, subtitleFontPx, state.subtitleFont || state.titleFont, anchor, hasHebrewInRuns(subtitleRuns), subLineH);
                const subLines = splitRunsIntoLines(subtitleRuns).length;
                registerHitbox('subtitleText', tx - 250, subStartY - 5, 500, subLines * subLineH + 10);
            }
        }
    }

    // ── Grid
    ctx.lineWidth = gridW;
    ctx.setLineDash(state.gridLineStyle === 'dashed' ? [6, 4] : []);
    if (state.showVerticalGrid !== false) {
        for (let i = 0; i <= totalXSteps; i++) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal);
            ctx.strokeStyle = state.gridColor;
            ctx.beginPath(); ctx.moveTo(xPx, pad.top); ctx.lineTo(xPx, pad.top + ph); ctx.stroke();
        }
    }
    if (state.showHorizontalGrid !== false) {
        for (let i = 0; i <= totalYSteps; i++) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal);
            ctx.strokeStyle = state.gridColor;
            ctx.beginPath(); ctx.moveTo(pad.left, yPx); ctx.lineTo(pad.left + pw, yPx); ctx.stroke();
        }
    }
    ctx.setLineDash([]);

    // ── Border lines
    const bColor = state.borderColor || '#000000';
    const bWidth = parseFloat(state.borderWidth) || 1.5;
    ctx.strokeStyle = bColor;
    ctx.lineWidth = bWidth;
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (state.borderTop) line(pad.left, pad.top, pad.left + pw, pad.top);
    if (state.borderRight) line(pad.left + pw, pad.top, pad.left + pw, pad.top + ph);
    if (state.borderBottom) line(pad.left, pad.top + ph, pad.left + pw, pad.top + ph);
    if (state.borderLeft) line(pad.left, pad.top, pad.left, pad.top + ph);

    // ── Axis arrows (advanced)
    if (advanced && state.showAxisArrows) {
        const aSize = parseFloat(state.axisArrowSize) || 14;
        const aStyle = state.axisArrowStyle || 'triangle';
        if (state.arrowBottom && state.borderBottom) drawArrowHead(ctx, pad.left + pw, pad.top + ph, 0, aSize, aStyle, bColor);
        if (state.arrowLeft && state.borderLeft) drawArrowHead(ctx, pad.left, pad.top, -Math.PI / 2, aSize, aStyle, bColor);
        if (state.arrowTop && state.borderTop) drawArrowHead(ctx, pad.left + pw, pad.top, 0, aSize, aStyle, bColor);
        if (state.arrowRight && state.borderRight) drawArrowHead(ctx, pad.left + pw, pad.top, -Math.PI / 2, aSize, aStyle, bColor);
    }

    // ── Ticks
    if (state.showTicks) {
        ctx.strokeStyle = state.tickColor;
        ctx.lineWidth = gridW;
        for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal);
            line(xPx, pad.top + ph - tLen, xPx, pad.top + ph + tLen);
        }
        for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal);
            line(pad.left - tLen, yPx, pad.left + tLen, yPx);
        }
    }

    // ── Tick labels
    const tickText = v => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1));
    for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
        const xVal = state.xMin + i * xSubStep;
        if (xVal > state.xMax + 0.001) break;
        ctx.fillStyle = '#000';
        ctx.font = `${tickFontPx}px ${state.tickFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.direction = 'ltr';
        ctx.fillText(tickText(xVal), mapX(xVal), pad.top + ph + tLen + 4);
    }
    for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
        const yVal = state.yMin + i * ySubStep;
        if (yVal > state.yMax + 0.001) break;
        ctx.fillStyle = '#000';
        ctx.font = `${tickFontPx}px ${state.tickFont}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.direction = 'ltr';
        ctx.fillText(tickText(yVal), pad.left - tLen - 6, mapY(yVal));
    }

    // ── Column titles (above / below the grid)
    layout.columnTitles.forEach(ct => {
        const above = ct.placement !== 'below';
        const startY = above
            ? pad.top - 6 - ct.height
            : pad.top + ph + tLen + tickFontPx + 10;
        let x, anchor;
        if (ct.align === 'left') { x = ct.x0 + 6; anchor = 'left'; }
        else if (ct.align === 'right') { x = ct.x1 - 6; anchor = 'right'; }
        else { x = (ct.x0 + ct.x1) / 2; anchor = 'center'; }
        ctx.textBaseline = 'top';
        const isRtl = ct.lines.some(l => hasHebrewInRuns(l));
        drawRichLines(ctx, ct.lines, x, startY, layout.colFontPx, state.columnTitleFont, anchor, isRtl, layout.colLineH);
        registerHitbox(`col:${ct.index}`, ct.x0, startY - 3, ct.x1 - ct.x0, ct.height + 6);
    });

    // ── Axis labels
    const xRuns = T(state.xLabelRuns);
    if (hasText(xRuns)) {
        const lineH = axisFontPx * 1.35;
        const startY = pad.top + ph + tLen + tickFontPx + 14 + layout.belowBlock;
        const cx = pad.left + pw / 2;
        ctx.textBaseline = 'top';
        const n = drawRichText(ctx, xRuns, cx, startY, axisFontPx, state.axisFont, 'center', hasHebrewInRuns(xRuns), lineH);
        registerHitbox('xLabel', cx - 200, startY - 5, 400, n * lineH + 10);
    }
    const yRuns = T(state.yLabelRuns);
    if (hasText(yRuns)) {
        const isRtl = hasHebrewInRuns(yRuns);
        const lineH = axisFontPx * 1.35;
        const linesArr = splitRunsIntoLines(yRuns);
        const totalH = linesArr.length * lineH;
        const xPos = 25;
        const cy = pad.top + ph / 2;
        ctx.save();
        ctx.translate(xPos, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = 'middle';
        linesArr.forEach((ln, i) => {
            const yOff = (i - (linesArr.length - 1) / 2) * lineH;
            drawRichLine(ctx, ln, 0, yOff, axisFontPx, state.axisFont, 'center', isRtl);
        });
        ctx.restore();
        registerHitbox('yLabel', xPos - 18, cy - totalH / 2, 36, totalH);
    }

    // ── Charts
    state.charts.forEach(chart => drawChart(chart));

    // ── Legend
    if (advanced && state.showLegend) drawLegend();

    return { clickTargets, layout };

    // ─────────────────────────────────────────────
    function drawChart(chart) {
        if (chart.points.length === 0) return;
        const tension = parseFloat(chart.lineTension) || 0;
        const showLine = chart.showLine !== false;
        const linePts = sortedPoints(chart).map(pt => ({ px: mapX(pt.x), py: mapY(pt.y) }));

        // Gradient shadow
        if (chart.shadowEnabled && linePts.length >= 2) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(pad.left, pad.top, pw, ph);
            ctx.clip();
            const fillPath = buildCurvedPath(linePts, tension, pad.top + ph);
            if (fillPath) {
                const intensity = parseFloat(chart.shadowIntensity) || 0.6;
                const offset = parseFloat(chart.shadowOffset) || 0;
                const opacity1 = parseFloat(chart.shadowOpacity1) || 0;
                const opacity2 = parseFloat(chart.shadowOpacity2) || 0;
                const c1 = hexToRgb(chart.shadowColor1 || '#4A90D9');
                const c2 = hexToRgb(chart.shadowColor2 || '#4A90D9');
                let minPy = Infinity;
                linePts.forEach(p => { if (p.py < minPy) minPy = p.py; });
                const grad = ctx.createLinearGradient(0, minPy, 0, pad.top + ph);
                const eo1 = opacity1 * intensity;
                const eo2 = opacity2 * intensity;
                const co = Math.max(0, Math.min(1, offset));
                grad.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${eo1})`);
                if (co > 0 && co < 1) {
                    grad.addColorStop(co, `rgba(${c1.r},${c1.g},${c1.b},${eo1})`);
                    grad.addColorStop(Math.min(1, co + 0.01), `rgba(${c2.r},${c2.g},${c2.b},${(eo1 + eo2) / 2})`);
                }
                grad.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${eo2})`);
                ctx.fillStyle = grad;
                ctx.fill(fillPath);
            }
            ctx.restore();
        }

        // Line
        const lineColor = chart.lineColor;
        if (showLine && linePts.length >= 2) {
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = chart.lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            drawCurvedLine(ctx, linePts, tension);

            if (advanced) {
                const aSize = parseFloat(chart.arrowSize) || 12;
                if (chart.arrowEnd && chart.arrowEnd !== 'none') {
                    const last = linePts[linePts.length - 1], prev = linePts[linePts.length - 2];
                    drawArrowHead(ctx, last.px, last.py, Math.atan2(last.py - prev.py, last.px - prev.px), aSize, chart.arrowEnd, lineColor);
                }
                if (chart.arrowStart && chart.arrowStart !== 'none') {
                    const first = linePts[0], second = linePts[1];
                    drawArrowHead(ctx, first.px, first.py, Math.atan2(first.py - second.py, first.px - second.px), aSize, chart.arrowStart, lineColor);
                }
            }
        }

        // Markers
        if (chart.markerShape !== 'none') {
            const sz = parseFloat(chart.markerSize);
            chart.points.forEach((pt, idx) => {
                const px = mapX(pt.x), py = mapY(pt.y);
                const isMarked = pt.marked === true;
                const active = (idx === view.hoverIdx && chart.id === view.hoverChartId) ||
                    (idx === view.dragIdx && chart.id === view.dragChartId) ||
                    (idx === view.selectedIdx && chart.id === view.selectedChartId) ||
                    (idx === view.highlightIdx && chart.id === view.highlightChartId);

                let fillC = lineColor, outlineC = null, outlineW = 0;
                const meta = isMarked ? chart.markedPointsMeta[markKeyFor(chart, idx)] : null;
                if (meta) {
                    fillC = meta.fillColor || chart.color;
                    outlineC = meta.outlineColor;
                    outlineW = meta.outlineWidth || 0;
                }
                if (active) fillC = '#3a3b3cff';
                ctx.fillStyle = fillC;
                ctx.strokeStyle = outlineC || fillC;
                drawMarker(ctx, px, py, sz, chart.markerShape, active, outlineW, outlineC);

                if (isMarked && advanced) {
                    if (meta && meta.label) {
                        ctx.save();
                        const fs = parseInt(state.markedFontSize) || 13;
                        ctx.font = `bold ${fs}px ${state.markedFont || state.axisFont || 'sans-serif'}`;
                        ctx.fillStyle = '#000';
                        ctx.direction = detectDirection(meta.label);
                        const off = sz + 8;
                        const pos = meta.labelPosition || 'above';
                        if (pos === 'above') { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(meta.label, px, py - off); }
                        else if (pos === 'below') { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(meta.label, px, py + off); }
                        else if (pos === 'right') { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(meta.label, px + off, py); }
                        else if (pos === 'left') { ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(meta.label, px - off, py); }
                        ctx.restore();
                    }
                    if (detectLabelOverlap(chart, idx)) {
                        const warnOff = sz + 4;
                        const pos = meta ? (meta.labelPosition || 'above') : 'above';
                        let wx = px, wy = py;
                        if (pos === 'above') { wx = px + 12; wy = py - warnOff - 14; }
                        else if (pos === 'below') { wx = px + 12; wy = py + warnOff + 14; }
                        else if (pos === 'right') { wx = px + warnOff + 20; wy = py - 10; }
                        else if (pos === 'left') { wx = px - warnOff - 20; wy = py - 10; }
                        drawHexagonWarning(ctx, wx, wy, 9);
                    }
                }
            });
        }

        if (advanced && chart.showChartLabel && chart.name && chart.name.trim()) drawChartNameLabel(chart);
    }

    function drawChartNameLabel(chart) {
        let idx = anchorToPointIndex(chart, chart.chartLabelAnchor || 'last');
        if (idx < 0) idx = chart.points.length - 1;
        const pt = chart.points[idx];
        const px = mapX(pt.x), py = mapY(pt.y);
        const off = (parseFloat(chart.markerSize) || 8) + 10;
        const fontSize = chart.chartLabelFontSize || 14;
        ctx.save();
        ctx.font = `${chart.chartLabelBold ? 'bold' : 'normal'} ${fontSize}px ${state.axisFont || 'sans-serif'}`;
        ctx.fillStyle = '#000';
        ctx.direction = detectDirection(chart.name);
        ctx.textAlign = 'center';
        if (chart.chartLabelPosition === 'below') {
            ctx.textBaseline = 'top';
            ctx.fillText(chart.name, px, py + off);
        } else {
            ctx.textBaseline = 'bottom';
            ctx.fillText(chart.name, px, py - off);
        }
        ctx.restore();
    }

    function drawLegend() {
        const legendCharts = getLegendCharts(state);
        if (legendCharts.length === 0) return;
        const fontSize = parseInt(state.legendFontSize) || 13;
        const legendFont = state.legendFont || state.axisFont || 'sans-serif';
        const padding = 10, rowHeight = fontSize + 8, swatchSize = fontSize, gap = 8, margin = 12;
        ctx.font = `500 ${fontSize}px ${legendFont}`;
        let maxTextW = 0;
        legendCharts.forEach(c => { maxTextW = Math.max(maxTextW, ctx.measureText(c.name).width); });
        const boxW = padding * 2 + swatchSize + gap + maxTextW;
        const boxH = padding * 2 + legendCharts.length * rowHeight - (rowHeight - fontSize - 4);
        let x, y;
        switch (state.legendPosition) {
            case 'bottom-right': x = pad.left + pw - boxW - margin; y = pad.top + ph - boxH - margin; break;
            case 'top-left': x = pad.left + margin; y = pad.top + margin; break;
            case 'bottom-left': x = pad.left + margin; y = pad.top + ph - boxH - margin; break;
            default: x = pad.left + pw - boxW - margin; y = pad.top + margin;
        }
        ctx.save();
        ctx.fillStyle = state.legendBg || '#f7f7f5';
        roundRect(ctx, x, y, boxW, boxH, 8);
        ctx.fill();
        if (state.legendBorder) {
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            roundRect(ctx, x, y, boxW, boxH, 8);
            ctx.stroke();
        }
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        legendCharts.forEach((c, i) => {
            const rowY = y + padding + rowHeight * i + rowHeight / 2 - 2;
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(x + padding + swatchSize / 2, rowY, swatchSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.font = `500 ${fontSize}px ${legendFont}`;
            ctx.direction = detectDirection(c.name);
            ctx.fillText(c.name, x + padding + swatchSize + gap, rowY);
        });
        ctx.direction = 'ltr';
        ctx.restore();
    }
}
