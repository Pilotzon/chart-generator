import { MAX_COLUMNS } from './constants.js';
import { defaultColumn } from './defaults.js';
import { hasText, flipRunsForWord, runsToPlainText, wrapRuns } from './richText.js';
import { measureRunWidth } from './canvasText.js';

let measureCtx = null;
/** Shared off-screen 2D context used for text measuring (layout, SVG export, ...). */
export function getMeasureCtx() {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    return measureCtx;
}

export function getCanvasSize(state) {
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

    let bottom = tLen + tickBlockH + 15 + xLines * (axisFontPx * 1.4) + (hasX ? 20 : 5);

    const yTickCharW = tickFontPx * 0.65;
    const maxYStr = Math.max(Math.abs(state.yMin).toString().length, Math.abs(state.yMax).toString().length);
    const yTickW = tickLabels ? Math.max(25, maxYStr * yTickCharW) : 0;
    const left = Math.max(hasY ? 90 : 55, tLen + yTickW + 10 + yLines * (axisFontPx * 1.4) + (hasY ? 25 : 10));
    const right = 40;

    top = Math.max((hasTitle || hasSub) ? 80 : 40, top);
    bottom = Math.max(hasX ? 80 : 50, bottom);

    // ── Column titles: wrapped to their column width; they reserve room above / below the grid
    const plotWidthEstimate = W - left - right;
    const span = state.xMax - state.xMin;
    const colLineH = colFontPx * 1.35;
    const columnTitles = [];
    let aboveH = 0, belowH = 0;
    getColumns(state).forEach(col => {
        const cfg = getColumnConfig(state, col.index);
        if (!hasText(cfg.runs)) return;
        const x0 = left + ((col.from - state.xMin) / span) * plotWidthEstimate;
        const x1 = left + ((col.to - state.xMin) / span) * plotWidthEstimate;
        const lines = wrapRuns(cfg.runs, Math.max(24, x1 - x0 - 12), run =>
            measureRunWidth(mctx, run, colFontPx, state.columnTitleFont)).map(flipLineRuns);
        const h = lines.length * colLineH;
        columnTitles.push({ index: col.index, x0, x1, lines, height: h, align: cfg.align, placement: cfg.placement });
        if (cfg.placement === 'below') belowH = Math.max(belowH, h);
        else aboveH = Math.max(aboveH, h);
    });
    const aboveBlock = aboveH > 0 ? aboveH + 8 : 0;
    const belowBlock = belowH > 0 ? belowH + 8 : 0;

    const pad = {
        top: top + aboveBlock,
        right,
        bottom: bottom + belowBlock,
        left
    };

    const pw = W - pad.left - pad.right;
    const ph = H - pad.top - pad.bottom;
    const xRange = state.xMax - state.xMin;
    const yRange = state.yMax - state.yMin;

    return {
        pad, pw, ph, W, H, tLen, tickBlockH,
        aboveBlock, belowBlock, colLineH, colFontPx,
        columnTitles,
        mapX: x => pad.left + ((x - state.xMin) / xRange) * pw,
        mapY: y => pad.top + ph - ((y - state.yMin) / yRange) * ph,
        unmapX: px => state.xMin + ((px - pad.left) / pw) * xRange,
        unmapY: py => state.yMin + ((pad.top + ph - py) / ph) * yRange
    };
}
