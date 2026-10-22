import { CHART_PALETTE } from './constants.js';
import { textToRuns } from './richText.js';

export function newChartId() {
    return 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export function defaultChart(name = 'Chart 1', colorIdx = 0) {
    return {
        id: newChartId(),
        name,
        color: CHART_PALETTE[colorIdx % CHART_PALETTE.length],
        points: [
            { x: 0, y: 90, marked: false },
            { x: 20, y: 67, marked: false },
            { x: 40, y: 40, marked: false },
            { x: 60, y: 20, marked: false }
        ],
        markedPointsMeta: {},
        showChartLabel: false,
        chartLabelAnchor: 'last',
        chartLabelPosition: 'above',
        chartLabelFontSize: 14,
        chartLabelBold: true,

        showLine: true,
        lineColor: '#1a1a1a',
        lineWidth: 2.5,
        lineTension: 0,
        markerShape: 'diamond',
        markerSize: 8,
        shadowEnabled: false,
        shadowColor1: '#4A90D9',
        shadowOpacity1: 0.4,
        shadowColor2: '#4A90D9',
        shadowOpacity2: 0,
        shadowOffset: 0,
        shadowIntensity: 0.6,

        arrowStart: 'none',
        arrowEnd: 'none',
        arrowSize: 12
    };
}

// Per-column overrides (column index -> config). Anything missing falls back to the defaults.
export function defaultColumn() {
    return {
        runs: [],
        align: null,          // null = use state.columnDefaultAlign
        placement: null,      // null = use state.columnDefaultPlacement
        bgEnabled: false,
        bgColor: '#3d87da',
        bgOpacity: 0.15
    };
}

export function defaultStateBase() {
    const serif = "'Times New Roman', Times, serif";
    return {
        activeChartId: null,
        charts: [],

        titleRuns: textToRuns('השפעת טמפרטורת הנוזלים (מעלות סלזיוס)\nעל הזמן שנעבר עד לקבלת תערובת אחידה (דקות)'),
        hasSubtitle: false,
        subtitleRuns: textToRuns('', '#666666'),
        subtitleFont: serif,

        titlePosition: 'top-center',
        xLabelRuns: textToRuns('טמפרטורת הנוזלים (מעלות סלזיוס)'),
        yLabelRuns: textToRuns('הזמן שנעבר עד לקבלת תערובת אחידה (דקות)'),
        titleFont: serif,
        axisFont: serif,
        tickFont: serif,
        titleFontSize: 20,
        subtitleFontSize: 16,
        axisFontSize: 18,
        tickFontSize: 15,
        xMin: 0, xMax: 70, xStep: 10, xSubDiv: 2,
        yMin: 0, yMax: 100, yStep: 10, ySubDiv: 2,
        showVerticalGrid: true,
        showHorizontalGrid: true,
        showTicks: true,

        borderTop: true,
        borderRight: true,
        borderBottom: true,
        borderLeft: true,
        borderColor: '#000000',
        borderWidth: 1.5,

        showAxisArrows: false,
        axisArrowStyle: 'triangle',
        axisArrowSize: 14,
        arrowTop: false,
        arrowRight: false,
        arrowBottom: true,
        arrowLeft: true,

        gridColor: '#999999',
        gridLineWidth: 1.2,
        gridLineStyle: 'solid',
        tickColor: '#000000',
        tickLength: 7,

        // Column titles / backgrounds (one column per major X step)
        columns: {},
        columnTitleFont: serif,
        columnTitleFontSize: 15,
        columnDefaultAlign: 'center',
        columnDefaultPlacement: 'above',

        canvasWidth: 850,
        canvasHeight: 680,
        squareMode: false,
        squareSize: 700,
        showLegend: false,
        legendPosition: 'top-right',
        legendFont: serif,
        legendFontSize: 13,
        legendBg: '#f7f7f5',
        legendBorder: true,

        markedFont: serif,
        markedFontSize: 13
    };
}

export function makeDefaultState() {
    const s = defaultStateBase();
    const c = defaultChart('Chart 1', 0);
    s.charts = [c];
    s.activeChartId = c.id;
    return s;
}

export function defaultExportSettings() {
    return {
        invertText: false,   // mirror text boxes (preview + SVG)
        svg: { bgEnabled: false, bgColor: '#ffffff' },
        png: { scale: 2, bgEnabled: false, bgColor: '#ffffff' }
    };
}
