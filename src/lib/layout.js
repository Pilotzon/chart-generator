import { FONT_SIZE_LIMITS, MAX_COLUMNS, MAX_EXPANDED_SIDE } from './constants.js';
import { defaultColumn } from './defaults.js';
import { hasText, flipRunsForWord, runsToPlainText, splitRunsIntoLines, wrapRuns } from './richText.js';
import { measureRunWidth } from './canvasText.js';
import { LONG_TRIANGLE } from './canvasShapes.js';

/** How far an arrow head reaches back from its tip (px) — used to keep axis titles clear of it. */
export function arrowReachOf(style, size) {
    if (style === 'long-triangle') return size * LONG_TRIANGLE.length;
    if (style === 'circle') return size * 0.35;
    return size;
}

let measureCtx = null;
/** Shared off-screen 2D context used for text measuring (layout, SVG export, ...). */
export function getMeasureCtx() {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    return measureCtx;
}

/** The canvas size exactly as set in the Canvas Size controls. */
export function getBaseCanvasSize(state) {
    const clamp = v => Math.max(300, Math.min(2000, v));
    if (state.squareMode) {
        const s = clamp(parseInt(state.squareSize) || 700);
        return { width: s, height: s };
    }
    return {
        width: clamp(parseInt(state.canvasWidth) || 850),
        height: clamp(parseInt(state.canvasHeight) || 680)
    };
}

/** True when a font size that takes part in the layout is above its recommended maximum. */
export function hasOversizedText(state) {
    return Object.entries(FONT_SIZE_LIMITS).some(([key, { max, expand }]) =>
        expand && (parseFloat(state[key]) || 0) > max);
}

/** The state with every layout-relevant font size capped at its recommended maximum. */
function cappedFonts(state) {
    const capped = { ...state };
    Object.entries(FONT_SIZE_LIMITS).forEach(([key, { max, expand }]) => {
        if (expand && parseFloat(state[key]) > max) capped[key] = max;
    });
    return capped;
}

/**
 * The canvas size to draw / export.
 *
 * Normally that is the size set by the user. When a text is larger than its recommended maximum, nothing is
 * squeezed: the frame grows by exactly the extra room the bigger text needs on each side, so the plot area, the
 * grid, the line and every other element keep the size and look they have with the maximum font size.
 */
export function getCanvasSize(state) {
    const base = getBaseCanvasSize(state);
    if (!hasOversizedText(state)) return { ...base, baseWidth: base.width, baseHeight: base.height, expanded: false };

    const ref = computeLayout(cappedFonts(state), base.width, base.height);
    const refX = ref.pad.left + ref.pad.right;
    const refY = ref.pad.top + ref.pad.bottom;
    const needW = titleBlockWidth(state);
    let W = base.width, H = base.height;
    for (let i = 0; i < 6; i++) {
        const l = computeLayout(state, W, H);
        const nextW = Math.min(MAX_EXPANDED_SIDE, Math.max(base.width, Math.ceil(base.width + (l.pad.left + l.pad.right) - refX), needW));
        const nextH = Math.min(MAX_EXPANDED_SIDE, Math.max(base.height, Math.ceil(base.height + (l.pad.top + l.pad.bottom) - refY)));
        if (nextW === W && nextH === H) break;
        W = nextW; H = nextH;
    }
    if (state.squareMode) W = H = Math.max(W, H);
    return { width: W, height: H, baseWidth: base.width, baseHeight: base.height, expanded: W !== base.width || H !== base.height };
}

/** Width a (possibly huge) title / subtitle needs so it is not cut off at the canvas edge. */
function titleBlockWidth(state) {
    const mctx = getMeasureCtx();
    let widest = 0;
    const measure = (runs, px, font) => {
        if (!hasText(runs)) return;
        splitRunsIntoLines(runs).forEach(line => {
            widest = Math.max(widest, line.reduce((sum, run) => sum + measureRunWidth(mctx, run, px, font), 0));
        });
    };
    if ((parseFloat(state.titleFontSize) || 0) > FONT_SIZE_LIMITS.titleFontSize.max) {
        measure(state.titleRuns, parseInt(state.titleFontSize), state.titleFont);
    }
    if (state.hasSubtitle && (parseFloat(state.subtitleFontSize) || 0) > FONT_SIZE_LIMITS.subtitleFontSize.max) {
        measure(state.subtitleRuns, parseInt(state.subtitleFontSize), state.subtitleFont || state.titleFont);
    }
    return widest > 0 ? Math.min(MAX_EXPANDED_SIDE, Math.ceil(widest + 60)) : 0;
}

// ─────────────────────────────────────────────
// Columns (one per major X step)
// ─────────────────────────────────────────────
export function getColumns(state) {
    const span = state.xMax - state.xMin;
    const step = state.xStep;
    if (!(span > 0) || !(step > 0)) return [];
    const n = Math.min(MAX_COLUMNS, Math.max(0, Math.ceil(span / step - 1e-9)));
    return Array.from({ length: n }, (_, index) => ({
        index,
        from: state.xMin + index * step,
        to: Math.min(state.xMax, state.xMin + (index + 1) * step)
    }));
}

/** Column settings merged with the global defaults. */
export function getColumnConfig(state, index) {
    const col = { ...defaultColumn(), ...((state.columns || {})[index] || {}) };
    return {
        ...col,
        align: col.align || state.columnDefaultAlign || 'center',
        placement: col.placement || state.columnDefaultPlacement || 'above'
    };
}

// ─────────────────────────────────────────────
// Layout: paddings, plot rectangle, coordinate mapping, column title blocks
// ─────────────────────────────────────────────
export function computeLayout(state, W, H, opts = {}) {
    const mctx = getMeasureCtx();
    // flip *after* wrapping, so every wrapped line is converted on its own
    const flipLineRuns = runs => (opts.invertText ? flipRunsForWord(runs) : runs);

    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const tickFontPx = parseInt(state.tickFontSize) || 15;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const colFontPx = parseInt(state.columnTitleFontSize) || 15;
    const tickLabels = state.showTickLabels !== false;
    const tickBlockH = tickLabels ? tickFontPx : 0;   // space under the grid taken by the tick numbers
    const tLen = state.showTicks ? (parseFloat(state.tickLength) || 7) : 0;

    const titleText = runsToPlainText(state.titleRuns);
    const subtitleText = runsToPlainText(state.subtitleRuns);
    const xText = runsToPlainText(state.xLabelRuns);
    const yText = runsToPlainText(state.yLabelRuns);

    const hasTitle = hasText(state.titleRuns);
    const hasSub = !!state.hasSubtitle && hasText(state.subtitleRuns);
    const hasX = hasText(state.xLabelRuns);
    const hasY = hasText(state.yLabelRuns);

    const titleLines = hasTitle ? titleText.split('\n').length : 0;
    const subtitleLines = hasSub ? subtitleText.split('\n').length : 0;
    const xLines = hasX ? xText.split('\n').length : 0;
    const yLines = hasY ? yText.split('\n').length : 0;

    // Empty text boxes reserve no space at all
    let top = 30;
    if (titleLines > 0) top += titleLines * (titleFontPx * 1.4);
    if (subtitleLines > 0) top += subtitleLines * (subtitleFontPx * 1.4) + 4;
    top += 15;

    // Axis title placement: X → 'below' the axis (default) or 'end' (inside, above the right end of the axis);
    // Y → 'side' (rotated, left of the axis, default) or 'above' (horizontal, centred over the axis).
    const xPlacement = state.xLabelPlacement === 'end' ? 'end' : 'below';
    const yPlacement = state.yLabelPlacement === 'above' ? 'above' : 'side';
    const xBelow = hasX && xPlacement === 'below';
    const yBeside = hasY && yPlacement === 'side';
    const yAbove = hasY && yPlacement === 'above';

    let bottom = tLen + tickBlockH + 15 + (xBelow ? xLines * (axisFontPx * 1.4) : 0) + (xBelow ? 20 : 5);

    // Width of the widest Y tick number (measured), so the Y title can sit right next to them
    let yTickW = 0;
    if (tickLabels) {
        mctx.font = `${tickFontPx}px ${state.tickFont}`;
        const tickStr = v => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1));
        const step = Math.abs(parseFloat(state.yStep)) || 0;
        const values = [state.yMin, state.yMax];
        if (step > 0) for (let v = state.yMin, n = 0; v <= state.yMax + 0.001 && n < 200; v += step, n++) values.push(v);
        yTickW = Math.max(...values.map(v => mctx.measureText(tickStr(v)).width));
    }
    const yTickGap = tickLabels ? 6 : 0;                     // between the tick numbers and the tick marks
    const yLabelBlockW = yBeside ? yLines * (axisFontPx * 1.35) : 0;
    const yLabelGap = 6;                                     // between the Y title and the tick numbers
    const yLabelEdge = 6;                                    // between the canvas edge and the Y title
    // a horizontal Y title centred over the axis must not stick out of the canvas on the left
    let yAboveW = 0;
    if (yAbove) {
        yAboveW = Math.max(...splitRunsIntoLines(state.yLabelRuns).map(line =>
            line.reduce((sum, run) => sum + measureRunWidth(mctx, run, axisFontPx, state.axisFont), 0)));
    }
    const left = yBeside
        ? yLabelEdge + yLabelBlockW + yLabelGap + yTickW + yTickGap + tLen
        : Math.max(40, yTickW + yTickGap + tLen + 10, yAbove ? yAboveW / 2 + yLabelEdge : 0);
    const yLabelX = left - tLen - yTickGap - yTickW - yLabelGap - yLabelBlockW / 2;
    // X title at the axis end: it sits to the right of the axis (and of its arrow), so the plot gets narrower.
    // Long titles wrap to at most ~28% of the canvas width.
    const xEnd = hasX && xPlacement === 'end';
    const xEndGap = 10;
    let xEndLines = [];
    let xEndW = 0;
    if (xEnd) {
        xEndLines = wrapRuns(state.xLabelRuns, W * 0.28, run => measureRunWidth(mctx, run, axisFontPx, state.axisFont))
            .map(flipLineRuns);
        xEndW = Math.max(0, ...xEndLines.map(line => line.reduce((sum, run) => sum + measureRunWidth(mctx, run, axisFontPx, state.axisFont), 0)));
    }
    const right = xEnd ? Math.max(40, xEndGap + xEndW + 10) : 40;

    top = Math.max((hasTitle || hasSub) ? 80 : 40, top);
    bottom = Math.max(xBelow ? 80 : 50, bottom);

    // ── Column titles: wrapped to their column width; they reserve room above / below the grid
    // Margin between the frame and the data range (the axis values keep their positions relative to each other)
    const mX = Math.max(0, parseFloat(state.plotMarginX) || 0);
    const mY = Math.max(0, parseFloat(state.plotMarginY) || 0);
    const plotWidthEstimate = W - left - right;
    const innerWidthEstimate = Math.max(1, plotWidthEstimate - 2 * mX);
    const span = state.xMax - state.xMin;
    const estX = v => (v <= state.xMin ? left : v >= state.xMax ? left + plotWidthEstimate
        : left + mX + ((v - state.xMin) / span) * innerWidthEstimate);
    const colLineH = colFontPx * 1.35;
    const columnTitles = [];
    let aboveH = 0, belowH = 0;
    getColumns(state).forEach(col => {
        const cfg = getColumnConfig(state, col.index);
        if (!hasText(cfg.runs)) return;
        const x0 = estX(col.from);
        const x1 = estX(col.to);
        const lines = wrapRuns(cfg.runs, Math.max(24, x1 - x0 - 12), run =>
            measureRunWidth(mctx, run, colFontPx, state.columnTitleFont)).map(flipLineRuns);
        const h = lines.length * colLineH;
        columnTitles.push({ index: col.index, x0, x1, lines, height: h, align: cfg.align, placement: cfg.placement });
        if (cfg.placement === 'below') belowH = Math.max(belowH, h);
        else aboveH = Math.max(aboveH, h);
    });
    const aboveBlock = aboveH > 0 ? aboveH + 8 : 0;
    const belowBlock = belowH > 0 ? belowH + 8 : 0;

    // Y title above the axis: sits over the column titles (and over the axis arrow, if any)
    // (the arrow head of the Y axis lies inside the plot, its tip is at the axis top, so it needs no room here)
    const Y_ABOVE_GAP = 10;                                  // visual gap between the title text and the top of the axis
    const lineSlack = axisFontPx * 0.35;                     // empty part of a text line below the glyphs (line height 1.35)
    const yAboveH = yAbove ? yLines * (axisFontPx * 1.35) : 0;
    const yAboveBlock = yAbove ? yAboveH - lineSlack + Y_ABOVE_GAP + 3 : 0;

    const pad = {
        top: top + aboveBlock + yAboveBlock,
        right,
        bottom: bottom + belowBlock,
        left
    };

    const pw = W - pad.left - pad.right;
    const ph = H - pad.top - pad.bottom;
    const xRange = state.xMax - state.xMin;
    const yRange = state.yMax - state.yMin;
    const mXc = Math.min(mX, Math.max(0, pw / 2 - 1));
    const mYc = Math.min(mY, Math.max(0, ph / 2 - 1));
    const innerW = pw - 2 * mXc;
    const innerH = ph - 2 * mYc;

    // Where the axis titles go (top-left corner of the text block; `anchor` is the text alignment)
    const xBlockH = (xEnd ? xEndLines.length : xLines) * (axisFontPx * 1.35);
    // the LAST row is centred on the axis line (where the arrow is, or would be); earlier rows stack above it
    const xEndTop = pad.top + ph - axisFontPx * 0.5 - Math.max(0, xEndLines.length - 1) * (axisFontPx * 1.35);
    const xLabel = xEnd
        ? { placement: 'end', anchor: 'left', x: pad.left + pw + xEndGap, y: xEndTop, lines: xEndLines, width: xEndW, height: xBlockH }
        : { placement: 'below', anchor: 'center', x: pad.left + pw / 2, y: pad.top + ph + tLen + tickBlockH + 14 + belowBlock };
    const yLabel = yPlacement === 'above'
        ? { placement: 'above', anchor: 'center', x: pad.left, y: pad.top - aboveBlock - Y_ABOVE_GAP - yAboveH + lineSlack }
        : { placement: 'side', x: yLabelX, y: pad.top + ph / 2 };

    return {
        pad, pw, ph, W, H, tLen, tickBlockH, yLabelX, xLabel, yLabel,
        // clip rectangle for the data lines: the plot area, minus half of every visible border line
        clip: (() => {
            const bw = (parseFloat(state.borderWidth) || 1.5) / 2;
            const l = state.borderLeft ? bw : 0, r = state.borderRight ? bw : 0;
            const t = state.borderTop ? bw : 0, b = state.borderBottom ? bw : 0;
            return { x: pad.left + l, y: pad.top + t, w: pw - l - r, h: ph - t - b };
        })(),
        mapEdgeX: x => (x <= state.xMin ? pad.left : x >= state.xMax ? pad.left + pw : pad.left + mXc + ((x - state.xMin) / xRange) * innerW),
        aboveBlock, belowBlock, colLineH, colFontPx,
        columnTitles,
        mapX: x => pad.left + mXc + ((x - state.xMin) / xRange) * innerW,
        mapY: y => pad.top + ph - mYc - ((y - state.yMin) / yRange) * innerH,
        unmapX: px => state.xMin + ((px - pad.left - mXc) / innerW) * xRange,
        unmapY: py => state.yMin + ((pad.top + ph - mYc - py) / innerH) * yRange
    };
}


/**
 * The four frame lines as segments. Where two visible sides meet, each one is extended by half the line width
 * so the corner is a sharp square (no notch, no rounding).
 */
export function borderSegments(state, pad, pw, ph) {
    const h = (parseFloat(state.borderWidth) || 1.5) / 2;
    const l = pad.left, t = pad.top, r = pad.left + pw, b = pad.top + ph;
    const segs = [];
    if (state.borderTop) segs.push({ side: 'top', x1: l - (state.borderLeft ? h : 0), y1: t, x2: r + (state.borderRight ? h : 0), y2: t });
    if (state.borderRight) segs.push({ side: 'right', x1: r, y1: t - (state.borderTop ? h : 0), x2: r, y2: b + (state.borderBottom ? h : 0) });
    if (state.borderBottom) segs.push({ side: 'bottom', x1: l - (state.borderLeft ? h : 0), y1: b, x2: r + (state.borderRight ? h : 0), y2: b });
    if (state.borderLeft) segs.push({ side: 'left', x1: l, y1: t - (state.borderTop ? h : 0), x2: l, y2: b + (state.borderBottom ? h : 0) });
    return segs;
}
