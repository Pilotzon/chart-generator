const STORAGE_KEY_CLASSIC = 'GRAPH_STUDIO_PRO_V12_CLASSIC';
const STORAGE_KEY_ADVANCED = 'GRAPH_STUDIO_PRO_V12_ADVANCED';
const STORAGE_KEY_MODE = 'GRAPH_STUDIO_PRO_V12_MODE';
const STORAGE_KEY_PANEL = 'GRAPH_STUDIO_PRO_V12_PANEL';
const CUSTOM_FONTS_KEY = 'GRAPH_STUDIO_CUSTOM_FONTS_META';

const FONT_OPTIONS = [
    { name: "Times New Roman", value: "'Times New Roman', Times, serif", custom: false },
    { name: "David", value: "'David', 'Times New Roman', serif", custom: false },
    { name: "Frank Ruhl Libre", value: "'Frank Ruhl Libre', serif", custom: false },
    { name: "Arial", value: "Arial, Helvetica, sans-serif", custom: false },
    { name: "Anthropic Sans", value: "'Anthropic Sans', sans-serif", custom: false },
    { name: "Anthropic Serif", value: "'Anthropic Serif Display', serif", custom: false },
    { name: "System (SF Pro)", value: "-apple-system, BlinkMacSystemFont, sans-serif", custom: false }
];

let allFonts = [...FONT_OPTIONS];
let customFontsData = [];

const TEXT_KEYS = ['titleText', 'subtitleText', 'xLabel', 'yLabel'];

const CHART_PALETTE = [
    '#3d87da', '#C96442', '#E5A93D', '#7BAA57', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

// ─────────────────────────────────────────────
// Chart-scoped vs Global-scoped keys
// (used for the "which properties belong to a chart vs the whole workspace" split)
// ─────────────────────────────────────────────
const CHART_SCOPED_KEYS = [
    // Line & markers
    'lineColor', 'lineWidth', 'lineTension', 'markerShape', 'markerSize',
    'shadowEnabled', 'shadowColor1', 'shadowOpacity1', 'shadowColor2',
    'shadowOpacity2', 'shadowOffset', 'shadowIntensity'
];

function defaultFmt() {
    return { bold: false, underline: false, italic: false, color: '#000000' };
}

function textToRuns(str, baseColor = '#000000') {
    if (!str) return [];
    return [{ text: str, bold: false, italic: false, underline: false, color: baseColor }];
}

function runsToPlainText(runs) {
    if (!runs || !Array.isArray(runs)) return '';
    return runs.map(r => r.text).join('');
}

function defaultChart(name = 'Chart 1', colorIdx = 0) {
    return {
        id: 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: name,
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

        // Per-chart line/marker settings
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
        shadowIntensity: 0.6
    };
}

function defaultStateBase() {
    return {
        activeChartId: null,
        charts: [],

        titleRuns: textToRuns("השפעת טמפרטורת הנוזלים (מעלות סלזיוס)\nעל הזמן שנעבר עד לקבלת תערובת אחידה (דקות)"),
        hasSubtitle: false,
        subtitleRuns: textToRuns("", '#666666'),
        subtitleFont: "'Times New Roman', Times, serif",

        titlePosition: "top-center",
        xLabelRuns: textToRuns("טמפרטורת הנוזלים (מעלות סלזיוס)"),
        yLabelRuns: textToRuns("הזמן שנעבר עד לקבלת תערובת אחידה (דקות)"),
        titleFont: "'Times New Roman', Times, serif",
        axisFont: "'Times New Roman', Times, serif",
        tickFont: "'Times New Roman', Times, serif",
        titleFontSize: 20,
        subtitleFontSize: 16,
        axisFontSize: 18,
        tickFontSize: 15,
        xMin: 0, xMax: 70, xStep: 10, xSubDiv: 2,
        yMin: 0, yMax: 100, yStep: 10, ySubDiv: 2,
        showVerticalGrid: true,
        showHorizontalGrid: true,
        showTicks: true,
        showAxisLines: false,
        showOuterGrid: true,
        innerGridColor: "#e5e5e0",
        axisLineColor: "#000000",
        axisLineWidth: 1.5,
        bgColor: "#ffffff",
        gridColor: "#999999",
        gridLineWidth: 1.2,
        gridLineStyle: "solid",
        showPlotBorder: true,
        tickColor: "#000000",
        tickLength: 7,

        canvasWidth: 850,
        canvasHeight: 680,
        squareMode: false,
        squareSize: 700,
        showLegend: false,
        legendPosition: 'top-right',
        legendFont: "'Times New Roman', Times, serif",
        legendFontSize: 13,
        legendBg: '#f7f7f5',
        legendBorder: true,

        // Global (shared) marked-points font
        markedFont: "'Times New Roman', Times, serif",
        markedFontSize: 13
    };
}

function makeDefaultState() {
    const s = defaultStateBase();
    const c = defaultChart('Chart 1', 0);
    s.charts = [c];
    s.activeChartId = c.id;
    return s;
}

// ─────────────────────────────────────────────
// Two separate persistence keys — one per mode
// ─────────────────────────────────────────────
let currentMode = localStorage.getItem(STORAGE_KEY_MODE) || 'classic';
let currentPanel = localStorage.getItem(STORAGE_KEY_PANEL) || 'chart';

function loadModeState(mode) {
    const key = mode === 'advanced' ? STORAGE_KEY_ADVANCED : STORAGE_KEY_CLASSIC;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            TEXT_KEYS.forEach(k => {
                const runsKey = k + 'Runs';
                if (!parsed[runsKey]) parsed[runsKey] = textToRuns(parsed[k] || '');
            });
            const merged = { ...makeDefaultState(), ...parsed };
            if (!merged.charts || merged.charts.length === 0) {
                const c = defaultChart();
                merged.charts = [c];
                merged.activeChartId = c.id;
            }
            if (!merged.activeChartId || !merged.charts.find(c => c.id === merged.activeChartId)) {
                merged.activeChartId = merged.charts[0].id;
            }
            // Ensure per-chart properties exist on every chart (migration)
            merged.charts.forEach(ch => {
                CHART_SCOPED_KEYS.forEach(k => {
                    if (ch[k] === undefined) ch[k] = defaultChart()[k];
                });
                if (!ch.markedPointsMeta) ch.markedPointsMeta = {};
            });
            return merged;
        } catch (e) { }
    }
    return makeDefaultState();
}

function saveModeState() {
    state.charts.forEach(c => sortChartPoints(c));
    const key = currentMode === 'advanced' ? STORAGE_KEY_ADVANCED : STORAGE_KEY_CLASSIC;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY_MODE, currentMode);
    localStorage.setItem(STORAGE_KEY_PANEL, currentPanel);
}

const saveState = saveModeState;

let state = loadModeState(currentMode);

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('floatingTooltip');
const quickEditBox = document.getElementById('quickEditBox');
const quickInput = document.getElementById('quickInput');
const dropdownPortal = document.getElementById('dropdownPortal');
const toastHost = document.getElementById('toastHost');

let activeQuickEditKey = null;
let draggingPointIndex = -1;
let draggingChartId = null;
let hoveredPointIndex = -1;
let hoveredChartId = null;
let selectedPointIndex = -1;
let selectedChartId = null;
let highlightedPointIndex = -1;
let highlightedChartId = null;
let clickTargets = [];
let quickEditClickPos = null;

let activePortalMenu = null;
let activeDropdownEl = null;

let isUpdatingEditor = false;

let pendingModeChange = null;
let pendingDeleteChartId = null;
let editingChartTabId = null;

// Toast (label-collision warning) throttling
let activeToastIds = new Set();

// ─────────────────────────────────────────────
// Active chart
// ─────────────────────────────────────────────
function getActiveChart() {
    return state.charts.find(c => c.id === state.activeChartId) || state.charts[0];
}

function sortChartPoints(chart) {
    chart.points.sort((a, b) => a.x - b.x);
}

// Reads a chart-scoped value in advanced mode, or the global state value in classic
function readScoped(key) {
    if (currentMode === 'advanced' && CHART_SCOPED_KEYS.includes(key)) {
        return getActiveChart()[key];
    }
    return state[key];
}

function writeScoped(key, value) {
    if (currentMode === 'advanced' && CHART_SCOPED_KEYS.includes(key)) {
        getActiveChart()[key] = value;
    } else {
        state[key] = value;
    }
}

// ─────────────────────────────────────────────
// Mode switching with confirmation
// ─────────────────────────────────────────────
function requestModeChange(newMode) {
    if (newMode === currentMode) return;

    const modal = document.getElementById('modeChangeModal');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    pendingModeChange = newMode;

    if (newMode === 'advanced') {
        title.textContent = 'Switch to Advanced mode?';
        message.textContent = 'Your Classic settings will be copied over as a starting point. You can safely switch back later — both modes are saved separately.';
        confirmBtn.textContent = 'Switch to Advanced';
    } else {
        title.textContent = 'Switch to Classic mode?';
        message.textContent = 'You will return to your saved Classic workspace. Any changes made in Advanced mode remain saved and will be restored when you switch back.';
        confirmBtn.textContent = 'Switch to Classic';
    }
    confirmBtn.classList.remove('btn-danger');
    confirmBtn.classList.add('btn-primary');
    modal.style.display = 'flex';
}

function cancelModeChange() {
    pendingModeChange = null;
    document.getElementById('modeChangeModal').style.display = 'none';
}

function confirmModeChange() {
    const newMode = pendingModeChange;
    document.getElementById('modeChangeModal').style.display = 'none';
    pendingModeChange = null;
    if (!newMode) return;

    saveModeState();
    const previousMode = currentMode;
    currentMode = newMode;
    localStorage.setItem(STORAGE_KEY_MODE, currentMode);

    if (previousMode === 'classic' && newMode === 'advanced') {
        if (!localStorage.getItem(STORAGE_KEY_ADVANCED)) {
            const copy = JSON.parse(JSON.stringify(state));
            // Push the global line/marker fields into the first chart
            if (copy.charts && copy.charts.length > 0) {
                CHART_SCOPED_KEYS.forEach(k => {
                    if (copy[k] !== undefined) copy.charts[0][k] = copy[k];
                });
            }
            localStorage.setItem(STORAGE_KEY_ADVANCED, JSON.stringify(copy));
        }
    }

    state = loadModeState(currentMode);
    applyModeUI();
    refreshAllUI();
    render();
}

function applyModeUI() {
    document.body.classList.toggle('mode-advanced', currentMode === 'advanced');
    document.body.classList.toggle('mode-classic', currentMode === 'classic');
    document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === currentMode);
    });
    const sel = document.querySelector('.mode-selector');
    if (sel) sel.dataset.mode = currentMode;

    // In classic, always show both panels stacked (no rail)
    if (currentMode === 'classic') {
        document.querySelectorAll('.panel-group').forEach(p => p.style.display = 'flex');
    } else {
        applySidebarPanel();
    }
}

// ─────────────────────────────────────────────
// Sidebar panel switching (Advanced only)
// ─────────────────────────────────────────────
function setSidebarPanel(panel) {
    currentPanel = panel;
    localStorage.setItem(STORAGE_KEY_PANEL, panel);
    applySidebarPanel();
}

function applySidebarPanel() {
    if (currentMode !== 'advanced') return;
    document.querySelectorAll('.rail-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.panel === currentPanel);
    });
    document.querySelectorAll('.panel-group').forEach(p => {
        p.style.display = p.dataset.panel === currentPanel ? 'flex' : 'none';
    });
    // Scroll to top on panel switch
    const sc = document.getElementById('sidebarContent');
    if (sc) sc.scrollTop = 0;
}

function refreshAllUI() {
    // Global inputs
    const globalIds = [
        'titlePosition', 'titleFont', 'axisFont', 'tickFont', 'subtitleFont',
        'titleFontSize', 'subtitleFontSize', 'axisFontSize', 'tickFontSize',
        'xMin', 'xMax', 'xStep', 'xSubDiv',
        'yMin', 'yMax', 'yStep', 'ySubDiv',
        'showVerticalGrid', 'showHorizontalGrid', 'showTicks',
        'showAxisLines', 'showOuterGrid',
        'innerGridColor', 'axisLineColor', 'axisLineWidth',
        'bgColor', 'gridColor', 'gridLineWidth', 'gridLineStyle', 'tickColor', 'tickLength',
        'showPlotBorder',
        'canvasWidth', 'canvasHeight', 'squareMode', 'squareSize',
        'showLegend', 'legendPosition', 'legendFont', 'legendFontSize', 'legendBg', 'legendBorder',
        'markedFont', 'markedFontSize'
    ];
    globalIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!state[id];
        else el.value = state[id] !== undefined ? state[id] : '';
    });

    // Chart-scoped inputs (read from active chart in advanced mode)
    CHART_SCOPED_KEYS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = readScoped(id);
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val !== undefined ? val : '';
    });

    setEditorContent(document.getElementById('titleText'), state.titleRuns);
    setEditorContent(document.getElementById('subtitleText'), state.subtitleRuns);
    setEditorContent(document.getElementById('xLabel'), state.xLabelRuns);
    setEditorContent(document.getElementById('yLabel'), state.yLabelRuns);

    renderChartTabs();
    renderPointsTable();
    renderMarkedPointsList();
    updateChartLabelAnchorMenu();
    syncChartLabelControls();
    syncAllDropdowns();
    updateShadowSubgroup();
    updatePlotBorderRowVisibility();
    updateTickVisibility();
    updateCanvasSizeUI();
    updateSubtitleUI();
    updateLegendUI();
    applyCanvasSize();
}

// ─────────────────────────────────────────────
// Canvas size
// ─────────────────────────────────────────────
function applyCanvasSize() {
    let w, h;
    if (state.squareMode) {
        w = h = Math.max(300, Math.min(2000, parseInt(state.squareSize) || 700));
    } else {
        w = Math.max(300, Math.min(2000, parseInt(state.canvasWidth) || 850));
        h = Math.max(300, Math.min(2000, parseInt(state.canvasHeight) || 680));
    }
    canvas.width = w;
    canvas.height = h;
}

function updateCanvasSizeUI() {
    const sizeRows = document.getElementById('canvasSizeRows');
    const squareRow = document.getElementById('squareSizeRow');
    if (state.squareMode) {
        sizeRows.classList.add('canvas-size-hidden');
        squareRow.classList.remove('square-size-hidden');
    } else {
        sizeRows.classList.remove('canvas-size-hidden');
        squareRow.classList.add('square-size-hidden');
    }
}

// ─────────────────────────────────────────────
// Custom Fonts
// ─────────────────────────────────────────────
function loadCustomFonts() {
    const saved = localStorage.getItem(CUSTOM_FONTS_KEY);
    if (saved) {
        try { customFontsData = JSON.parse(saved); }
        catch (e) { customFontsData = []; }
    }
    customFontsData.forEach(cf => registerFontFace(cf.name, cf.dataUrl));
    rebuildAllFonts();
}

function saveCustomFonts() {
    localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(customFontsData));
}

function registerFontFace(name, dataUrl) {
    try {
        const ff = new FontFace(name, `url(${dataUrl})`);
        ff.load().then(loaded => {
            document.fonts.add(loaded);
            render();
        }).catch(err => console.warn('Failed to load font:', name, err));
    } catch (e) { console.warn('FontFace API error:', e); }
}

function rebuildAllFonts() {
    allFonts = [...FONT_OPTIONS];
    customFontsData.forEach(cf => {
        allFonts.push({ name: cf.name, value: `'${cf.name}', sans-serif`, custom: true });
    });
}

function handleFontUpload(files, dropdownTarget) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            let fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
            if (customFontsData.some(cf => cf.name === fontName)) {
                fontName = fontName + ' (' + Date.now().toString(36).slice(-3) + ')';
            }
            customFontsData.push({ name: fontName, dataUrl: dataUrl });
            saveCustomFonts();
            registerFontFace(fontName, dataUrl);
            rebuildAllFonts();
            rebuildAllFontDropdowns();

            if (dropdownTarget) {
                const fontValue = `'${fontName}', sans-serif`;
                state[dropdownTarget] = fontValue;
                const hiddenSelect = document.getElementById(dropdownTarget);
                if (hiddenSelect) hiddenSelect.value = fontValue;
                saveState();
                syncDropdownDisplay(dropdownTarget);
                render();
            }
        };
        reader.readAsDataURL(file);
    });
}

// ─────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────
const formatDec = v => Math.round(parseFloat(v) * 10) / 10;
const plotW = pad => canvas.width - pad.left - pad.right;
const plotH = pad => canvas.height - pad.top - pad.bottom;
const mapX = (x, pad) => pad.left + ((x - state.xMin) / (state.xMax - state.xMin)) * plotW(pad);
const mapY = (y, pad) => pad.top + plotH(pad) - ((y - state.yMin) / (state.yMax - state.yMin)) * plotH(pad);
const unmapX = (px, pad) => state.xMin + ((px - pad.left) / plotW(pad)) * (state.xMax - state.xMin);
const unmapY = (py, pad) => state.yMin + ((pad.top + plotH(pad) - py) / plotH(pad)) * (state.yMax - state.yMin);

function getPaddings() {
    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const tickFontPx = parseInt(state.tickFontSize) || 15;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const tLen = state.showTicks ? (parseFloat(state.tickLength) || 7) : 0;

    const titleText = runsToPlainText(state.titleRuns);
    const subtitleText = runsToPlainText(state.subtitleRuns);
    const xText = runsToPlainText(state.xLabelRuns);
    const yText = runsToPlainText(state.yLabelRuns);

    const titleLines = titleText ? titleText.split('\n').length : 0;
    const subtitleLines = (state.hasSubtitle && subtitleText) ? subtitleText.split('\n').length : 0;
    const xLines = xText ? xText.split('\n').length : 0;
    const yLines = yText ? yText.split('\n').length : 0;

    let top = 30;
    if (titleLines > 0) top += titleLines * (titleFontPx * 1.4);
    if (subtitleLines > 0) top += subtitleLines * (subtitleFontPx * 1.4) + 4;
    top += 15;

    const bottom = tLen + tickFontPx + 15 + Math.max(xLines, 1) * (axisFontPx * 1.4) + 20;

    const yTickCharW = tickFontPx * 0.65;
    const maxYStr = Math.max(
        Math.abs(state.yMin).toString().length,
        Math.abs(state.yMax).toString().length
    );
    const yTickW = Math.max(25, maxYStr * yTickCharW);
    const left = tLen + yTickW + 10 + Math.max(yLines, 1) * (axisFontPx * 1.4) + 25;

    return {
        top: Math.max(80, top),
        right: 40,
        bottom: Math.max(80, bottom),
        left: Math.max(90, left)
    };
}

// ─────────────────────────────────────────────
// Runs ⇔ HTML
// ─────────────────────────────────────────────
function runsToHtml(runs) {
    if (!runs || runs.length === 0) return '';
    return runs.map(run => {
        let styles = [];
        if (run.color && run.color !== '#000000') styles.push(`color:${escapeHtml(run.color)}`);
        if (run.bold) styles.push('font-weight:700');
        if (run.italic) styles.push('font-style:italic');
        if (run.underline) styles.push('text-decoration:underline');
        const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';
        const text = escapeHtml(run.text).replace(/\n/g, '<br>');
        return `<span${styleAttr}>${text}</span>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function htmlToRuns(rootEl) {
    const runs = [];
    function walk(node, inheritedStyle) {
        if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent;
            if (t) {
                runs.push({
                    text: t,
                    bold: inheritedStyle.bold,
                    italic: inheritedStyle.italic,
                    underline: inheritedStyle.underline,
                    color: inheritedStyle.color
                });
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br') {
            runs.push({
                text: '\n',
                bold: inheritedStyle.bold,
                italic: inheritedStyle.italic,
                underline: inheritedStyle.underline,
                color: inheritedStyle.color
            });
            return;
        }

        const nextStyle = { ...inheritedStyle };
        if (tag === 'b' || tag === 'strong') nextStyle.bold = true;
        if (tag === 'i' || tag === 'em') nextStyle.italic = true;
        if (tag === 'u') nextStyle.underline = true;

        const inlineStyle = el.getAttribute('style') || '';
        const fwMatch = inlineStyle.match(/font-weight\s*:\s*([^;]+)/i);
        if (fwMatch) {
            const v = fwMatch[1].trim().toLowerCase();
            if (v === 'bold' || parseInt(v) >= 600) nextStyle.bold = true;
            if (v === 'normal' || (parseInt(v) > 0 && parseInt(v) < 600)) nextStyle.bold = false;
        }
        const fsMatch = inlineStyle.match(/font-style\s*:\s*([^;]+)/i);
        if (fsMatch) {
            const v = fsMatch[1].trim().toLowerCase();
            if (v === 'italic' || v === 'oblique') nextStyle.italic = true;
            if (v === 'normal') nextStyle.italic = false;
        }
        const tdMatch = inlineStyle.match(/text-decoration(?:-line)?\s*:\s*([^;]+)/i);
        if (tdMatch) {
            const v = tdMatch[1].trim().toLowerCase();
            if (v.includes('underline')) nextStyle.underline = true;
            if (v === 'none') nextStyle.underline = false;
        }
        const colorMatch = inlineStyle.match(/(?:^|[^-])color\s*:\s*([^;]+)/i);
        if (colorMatch) {
            const c = colorMatch[1].trim();
            const hex = colorStringToHex(c);
            if (hex) nextStyle.color = hex;
        }

        const isBlock = (tag === 'div' || tag === 'p');
        const alreadyHasContent = runs.length > 0 && runs[runs.length - 1].text.length > 0;
        if (isBlock && alreadyHasContent && !runs[runs.length - 1].text.endsWith('\n')) {
            runs.push({
                text: '\n',
                bold: nextStyle.bold, italic: nextStyle.italic,
                underline: nextStyle.underline, color: nextStyle.color
            });
        }

        for (const child of el.childNodes) walk(child, nextStyle);
    }

    for (const child of rootEl.childNodes) walk(child, { bold: false, italic: false, underline: false, color: '#000000' });

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

function colorStringToHex(str) {
    str = str.trim();
    if (str.startsWith('#')) {
        if (str.length === 4) {
            return '#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
        }
        return str.toLowerCase();
    }
    const rgb = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
        const toHex = n => parseInt(n).toString(16).padStart(2, '0');
        return '#' + toHex(rgb[1]) + toHex(rgb[2]) + toHex(rgb[3]);
    }
    return null;
}

// ─────────────────────────────────────────────
// Editors
// ─────────────────────────────────────────────
function setEditorContent(editorEl, runs) {
    if (!editorEl) return;
    isUpdatingEditor = true;
    editorEl.innerHTML = runsToHtml(runs);
    isUpdatingEditor = false;
}

function initializeEditors() {
    const editorKeys = {
        'titleText': 'titleRuns',
        'subtitleText': 'subtitleRuns',
        'xLabel': 'xLabelRuns',
        'yLabel': 'yLabelRuns'
    };

    Object.entries(editorKeys).forEach(([editorId, runsKey]) => {
        const el = document.getElementById(editorId);
        if (!el) return;

        setEditorContent(el, state[runsKey]);

        el.addEventListener('input', () => {
            if (isUpdatingEditor) return;
            state[runsKey] = htmlToRuns(el);
            saveState();
            render();
        });

        el.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                document.execCommand('bold', false, null);
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                document.execCommand('italic', false, null);
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                document.execCommand('underline', false, null);
            }
        });

        el.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    });
}

function applyFormatCommand(editorId, cmd, value) {
    const editor = document.getElementById(editorId);
    if (!editor) return;

    if (currentMode === 'advanced') {
        editor.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.anchorNode && editor.contains(sel.anchorNode)) {
            if (cmd === 'bold') document.execCommand('bold', false, null);
            else if (cmd === 'italic') document.execCommand('italic', false, null);
            else if (cmd === 'underline') document.execCommand('underline', false, null);
            else if (cmd === 'color') document.execCommand('foreColor', false, value);
        } else {
            const range = document.createRange();
            range.selectNodeContents(editor);
            sel.removeAllRanges();
            sel.addRange(range);
            if (cmd === 'bold') document.execCommand('bold', false, null);
            else if (cmd === 'italic') document.execCommand('italic', false, null);
            else if (cmd === 'underline') document.execCommand('underline', false, null);
            else if (cmd === 'color') document.execCommand('foreColor', false, value);
            sel.removeAllRanges();
        }

        const runsKey = editorIdToRunsKey(editorId);
        state[runsKey] = htmlToRuns(editor);
        saveState();
        render();
    } else {
        const runsKey = editorIdToRunsKey(editorId);
        const runs = state[runsKey] || [];
        if (runs.length === 0) {
            state[runsKey] = [{ text: '', bold: false, italic: false, underline: false, color: '#000000' }];
        }
        if (cmd === 'bold') {
            const anyNot = runs.some(r => !r.bold);
            runs.forEach(r => r.bold = anyNot);
        } else if (cmd === 'italic') {
            const anyNot = runs.some(r => !r.italic);
            runs.forEach(r => r.italic = anyNot);
        } else if (cmd === 'underline') {
            const anyNot = runs.some(r => !r.underline);
            runs.forEach(r => r.underline = anyNot);
        } else if (cmd === 'color') {
            runs.forEach(r => r.color = value);
        }
        setEditorContent(editor, runs);
        saveState();
        render();
    }
}

function editorIdToRunsKey(editorId) {
    const map = {
        'titleText': 'titleRuns',
        'subtitleText': 'subtitleRuns',
        'xLabel': 'xLabelRuns',
        'yLabel': 'yLabelRuns'
    };
    return map[editorId] || editorId + 'Runs';
}

function setupFormatToolbars() {
    document.querySelectorAll('.fmt-btn').forEach(btn => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            const fmt = btn.dataset.fmt;
            if (key && fmt) applyFormatCommand(key, fmt);
        });
    });
    document.querySelectorAll('.fmt-color-btn').forEach(inp => {
        if (inp.dataset.bound === '1') return;
        inp.dataset.bound = '1';
        inp.addEventListener('input', () => {
            const key = inp.dataset.key;
            if (key) applyFormatCommand(key, 'color', inp.value);
        });
    });
}

function toggleGroup(id) {
    document.getElementById(id).classList.toggle('collapsed');
}

// ─────────────────────────────────────────────
// Chart tabs (proper card style, editing isolation)
// ─────────────────────────────────────────────
function renderChartTabs() {
    const container = document.getElementById('chartTabs');
    if (!container) return;
    container.innerHTML = '';

    state.charts.forEach(chart => {
        const isActive = chart.id === state.activeChartId;
        const isEditing = editingChartTabId === chart.id;

        const tab = document.createElement('div');
        tab.className = 'chart-tab' + (isActive ? ' active' : '');
        tab.dataset.chartId = chart.id;

        const nameHtml = isEditing
            ? `<input type="text" class="chart-tab-name-input" value="${escapeHtml(chart.name)}" spellcheck="false">`
            : `<span class="chart-tab-name-display">${escapeHtml(chart.name)}</span>`;

        tab.innerHTML = `
            <input type="color" class="chart-tab-color-picker" value="${chart.color}" title="Chart color">
            <div class="chart-tab-name-wrap">${nameHtml}</div>
            <div class="chart-tab-actions">
                <button class="chart-tab-btn" data-action="rename" title="Rename">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="chart-tab-btn" data-action="duplicate" title="Duplicate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
                <button class="chart-tab-btn danger" data-action="delete" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                </button>
            </div>
        `;

        const colorPicker = tab.querySelector('.chart-tab-color-picker');

        tab.addEventListener('click', (e) => {
            if (e.target.closest('.chart-tab-color-picker')) return;
            if (e.target.closest('.chart-tab-btn')) return;
            if (e.target.closest('.chart-tab-name-input')) return;
            if (isEditing) return;
            if (!isActive) setActiveChart(chart.id);
        });

        const nameDisplay = tab.querySelector('.chart-tab-name-display');
        if (nameDisplay) {
            nameDisplay.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startEditingChartName(chart.id);
            });
        }

        colorPicker.addEventListener('input', (e) => {
            chart.color = e.target.value;
            saveState();
            renderChartTabs();
            renderMarkedPointsList();
            render();
        });
        colorPicker.addEventListener('click', e => e.stopPropagation());

        const nameInput = tab.querySelector('.chart-tab-name-input');
        if (nameInput) {
            nameInput.addEventListener('click', e => e.stopPropagation());
            nameInput.addEventListener('input', (e) => {
                chart.name = e.target.value;
                saveState();
                render();
            });
            nameInput.addEventListener('keydown', e => {
                e.stopPropagation();
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    stopEditingChartName();
                }
            });
            nameInput.addEventListener('blur', () => stopEditingChartName());
            setTimeout(() => {
                nameInput.focus();
                nameInput.select();
            }, 0);
        }

        tab.querySelectorAll('.chart-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'rename') startEditingChartName(chart.id);
                else if (action === 'duplicate') duplicateChart(chart.id);
                else if (action === 'delete') requestDeleteChart(chart.id);
            });
        });

        container.appendChild(tab);
    });
}

function startEditingChartName(id) {
    editingChartTabId = id;
    renderChartTabs();
}
function stopEditingChartName() {
    editingChartTabId = null;
    renderChartTabs();
}

function setActiveChart(id) {
    // Commit any pending edits before switching
    saveState();
    state.activeChartId = id;
    saveState();
    renderChartTabs();
    renderPointsTable();
    renderMarkedPointsList();
    syncChartLabelControls();
    updateChartLabelAnchorMenu();
    // Refresh chart-scoped controls (line & marker settings)
    refreshChartScopedControls();
    render();
}

function refreshChartScopedControls() {
    CHART_SCOPED_KEYS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = readScoped(id);
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val !== undefined ? val : '';
    });
    updateShadowSubgroup();
    syncAllDropdowns();
}

function addChart() {
    // Commit anything pending first
    saveState();
    const n = state.charts.length;
    const c = defaultChart('Chart ' + (n + 1), n);
    state.charts.push(c);
    // Explicit switch - each chart is independent
    state.activeChartId = c.id;
    saveState();
    renderChartTabs();
    renderPointsTable();
    renderMarkedPointsList();
    syncChartLabelControls();
    updateChartLabelAnchorMenu();
    refreshChartScopedControls();
    render();
}

function duplicateChart(id) {
    saveState();
    const src = state.charts.find(c => c.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'chart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    copy.name = src.name + ' copy';
    copy.color = CHART_PALETTE[state.charts.length % CHART_PALETTE.length];
    state.charts.push(copy);
    state.activeChartId = copy.id;
    saveState();
    renderChartTabs();
    renderPointsTable();
    renderMarkedPointsList();
    syncChartLabelControls();
    updateChartLabelAnchorMenu();
    refreshChartScopedControls();
    render();
}

function requestDeleteChart(id) {
    if (state.charts.length <= 1) return;
    pendingDeleteChartId = id;
    const chart = state.charts.find(c => c.id === id);
    document.getElementById('deleteChartMessage').textContent =
        `"${chart ? chart.name : 'This chart'}" will be permanently deleted. This can't be undone.`;
    document.getElementById('deleteChartModal').style.display = 'flex';
}

function cancelDeleteChart() {
    pendingDeleteChartId = null;
    document.getElementById('deleteChartModal').style.display = 'none';
}

function confirmDeleteChart() {
    const id = pendingDeleteChartId;
    document.getElementById('deleteChartModal').style.display = 'none';
    pendingDeleteChartId = null;
    if (!id) return;
    const idx = state.charts.findIndex(c => c.id === id);
    if (idx === -1) return;
    state.charts.splice(idx, 1);
    if (state.activeChartId === id) {
        state.activeChartId = state.charts[Math.max(0, idx - 1)].id;
    }
    saveState();
    renderChartTabs();
    renderPointsTable();
    renderMarkedPointsList();
    syncChartLabelControls();
    updateChartLabelAnchorMenu();
    refreshChartScopedControls();
    render();
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────
const DROPDOWN_ICONS = {
    'top-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7"/><path d="M4 12h16"/><path d="M4 17h12"/></svg>',
    'top-center': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>',
    'top-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 6h7"/><path d="M4 12h16"/><path d="M8 17h12"/></svg>',
    'bottom-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12"/><path d="M4 12h16"/><path d="M13 17h7"/></svg>',
    'bottom-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12"/><path d="M4 12h16"/><path d="M4 17h7"/></svg>',
    'above': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>',
    'below': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>',
    'left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    'right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    'solid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"/></svg>',
    'dashed': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"><line x1="4" y1="12" x2="20" y2="12"/></svg>',
    'circle': '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5.5"/></svg>',
    'square': '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>',
    'diamond': '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1" transform="rotate(45 12 12)"/></svg>',
    'cross': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>',
    'none': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"><circle cx="12" cy="12" r="6"/></svg>',
    'last': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="8" r="2.5" fill="currentColor"/><path d="M4 20L18 8" opacity="0.5"/></svg>',
    'first': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="20" r="2.5" fill="currentColor"/><path d="M6 20L20 6" opacity="0.5"/></svg>',
    'point': '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>'
};

const FONT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';
const UPLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

function iconForValue(value) {
    if (DROPDOWN_ICONS[value]) return DROPDOWN_ICONS[value];
    if (typeof value === 'string' && value.startsWith('idx:')) return DROPDOWN_ICONS.point;
    return DROPDOWN_ICONS.point;
}

function buildItemHTML(iconSvg, label) {
    return `<span class="dropdown-item-icon">${iconSvg}</span><span class="dropdown-item-label">${label}</span>`;
}

// ─────────────────────────────────────────────
// Portal dropdown
// ─────────────────────────────────────────────
function closeAllDropdowns() {
    if (activePortalMenu) {
        activePortalMenu.remove();
        activePortalMenu = null;
    }
    document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
        dd.classList.remove('open');
    });
    activeDropdownEl = null;
}

function openPortalDropdown(dd) {
    closeAllDropdowns();

    const targetId = dd.dataset.target;
    const trigger = dd.querySelector('.dropdown-trigger');
    const triggerRect = trigger.getBoundingClientRect();

    dd.classList.add('open');
    activeDropdownEl = dd;

    const menu = document.createElement('div');
    menu.className = 'portal-dropdown-menu';
    activePortalMenu = menu;

    const isFontDropdown = dd.classList.contains('font-dropdown');

    if (isFontDropdown) {
        allFonts.forEach(f => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.value = f.value;
            item.innerHTML = buildItemHTML(FONT_ICON, f.name);
            menu.appendChild(item);
        });
        const sep = document.createElement('div');
        sep.className = 'dropdown-separator';
        menu.appendChild(sep);
        const uploadItem = document.createElement('div');
        uploadItem.className = 'dropdown-item dropdown-item-upload';
        uploadItem.innerHTML = buildItemHTML(UPLOAD_ICON, 'Upload font…');
        menu.appendChild(uploadItem);
    } else {
        const sourceItems = dd.querySelectorAll('.dropdown-menu > .dropdown-item');
        sourceItems.forEach(srcItem => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.value = srcItem.dataset.value;
            const icon = iconForValue(srcItem.dataset.value);
            item.innerHTML = buildItemHTML(icon, srcItem.textContent.trim());
            menu.appendChild(item);
        });
    }

    let currentVal;
    if (targetId === 'chartLabelAnchor' || targetId === 'chartLabelPosition') {
        const chart = getActiveChart();
        currentVal = String(chart[targetId] || '');
    } else if (targetId && targetId.startsWith('mkLabelPos:')) {
        const [_, chartId, key] = targetId.split(':');
        const chart = state.charts.find(c => c.id === chartId);
        if (chart && chart.markedPointsMeta[key]) {
            currentVal = chart.markedPointsMeta[key].labelPosition || 'above';
        }
    } else if (CHART_SCOPED_KEYS.includes(targetId) && currentMode === 'advanced') {
        currentVal = String(getActiveChart()[targetId]);
    } else {
        currentVal = String(state[targetId]);
    }

    menu.querySelectorAll('.dropdown-item:not(.dropdown-item-upload)').forEach(item => {
        item.classList.toggle('selected', item.dataset.value === currentVal);
    });

    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    dropdownPortal.appendChild(menu);

    const menuWidth = Math.max(triggerRect.width, 200);
    menu.style.width = `${menuWidth}px`;
    const menuHeight = menu.offsetHeight;

    let leftPos = triggerRect.right - menuWidth;
    let topPos = triggerRect.bottom + 4;

    if (topPos + menuHeight > window.innerHeight - 8) topPos = triggerRect.top - menuHeight - 4;
    if (topPos < 8) topPos = 8;
    if (leftPos < 8) leftPos = 8;
    if (leftPos + menuWidth > window.innerWidth - 8) {
        leftPos = window.innerWidth - menuWidth - 8;
    }

    menu.style.left = `${leftPos}px`;
    menu.style.top = `${topPos}px`;
    menu.style.visibility = 'visible';

    menu.querySelectorAll('.dropdown-item:not(.dropdown-item-upload)').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = item.dataset.value;

            if (targetId === 'chartLabelAnchor' || targetId === 'chartLabelPosition') {
                // Guard: chart-label-position collision with marked labels
                const chart = getActiveChart();
                if (targetId === 'chartLabelPosition') {
                    if (checkLabelCollision(chart, chart.chartLabelAnchor, value, null)) {
                        showLabelCollisionToast('chartLabel');
                        closeAllDropdowns();
                        return;
                    }
                }
                if (targetId === 'chartLabelAnchor') {
                    if (checkLabelCollision(chart, value, chart.chartLabelPosition, null)) {
                        showLabelCollisionToast('chartLabel');
                        closeAllDropdowns();
                        return;
                    }
                }
                if (targetId === 'chartLabelAnchor') chart.chartLabelAnchor = value;
                else chart.chartLabelPosition = value;
            } else if (targetId && targetId.startsWith('mkLabelPos:')) {
                const [_, chartId, key] = targetId.split(':');
                const chart = state.charts.find(c => c.id === chartId);
                if (chart && chart.markedPointsMeta[key]) {
                    // Collision check: is this marked point also the chart-label anchor?
                    if (checkMarkedCollision(chart, key, value)) {
                        showLabelCollisionToast('markedPoint');
                        closeAllDropdowns();
                        return;
                    }
                    chart.markedPointsMeta[key].labelPosition = value;
                }
            } else if (CHART_SCOPED_KEYS.includes(targetId) && currentMode === 'advanced') {
                getActiveChart()[targetId] = value;
            } else {
                state[targetId] = value;
            }

            const hiddenSelect = document.getElementById(targetId);
            if (hiddenSelect) hiddenSelect.value = value;
            syncDropdownDisplay(targetId);
            saveState();
            render();
            closeAllDropdowns();
        });
    });

    menu.querySelectorAll('.dropdown-item-upload').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            const fileInput = document.getElementById('fontFileInput');
            fileInput.dataset.dropdownTarget = targetId;
            fileInput.click();
        });
    });

    menu.addEventListener('click', (e) => e.stopPropagation());
}

function syncDropdownDisplay(targetId) {
    const dd = document.querySelector(`.custom-dropdown[data-target="${CSS.escape(targetId)}"]`);
    if (!dd) return;
    const valueSpan = dd.querySelector('.dropdown-value');

    let currentVal;
    if (targetId === 'chartLabelAnchor' || targetId === 'chartLabelPosition') {
        const chart = getActiveChart();
        currentVal = String(chart[targetId] || '');
    } else if (targetId && targetId.startsWith('mkLabelPos:')) {
        const [_, chartId, key] = targetId.split(':');
        const chart = state.charts.find(c => c.id === chartId);
        if (chart && chart.markedPointsMeta[key]) {
            currentVal = chart.markedPointsMeta[key].labelPosition || 'above';
        } else {
            currentVal = 'above';
        }
    } else if (CHART_SCOPED_KEYS.includes(targetId) && currentMode === 'advanced') {
        currentVal = String(getActiveChart()[targetId]);
    } else {
        currentVal = String(state[targetId]);
    }

    if (dd.classList.contains('font-dropdown')) {
        const font = allFonts.find(f => f.value === currentVal);
        if (font) {
            valueSpan.innerHTML = `<span class="dropdown-item-icon" style="width:14px;height:14px;">${FONT_ICON}</span>${escapeHtml(font.name)}`;
        } else {
            valueSpan.textContent = currentVal;
        }
        return;
    }

    const matchingItem = dd.querySelector(`.dropdown-menu .dropdown-item[data-value="${CSS.escape(currentVal)}"]`);
    if (matchingItem) {
        const icon = iconForValue(currentVal);
        valueSpan.innerHTML = `<span class="dropdown-item-icon" style="width:14px;height:14px;">${icon}</span>${escapeHtml(matchingItem.textContent.trim())}`;
    } else {
        if (targetId === 'chartLabelAnchor') {
            const chart = getActiveChart();
            if (currentVal === 'last') {
                valueSpan.innerHTML = `<span class="dropdown-item-icon" style="width:14px;height:14px;">${DROPDOWN_ICONS.last}</span>Last point`;
            } else if (currentVal === 'first') {
                valueSpan.innerHTML = `<span class="dropdown-item-icon" style="width:14px;height:14px;">${DROPDOWN_ICONS.first}</span>First point`;
            } else if (currentVal.startsWith('idx:')) {
                const idx = parseInt(currentVal.slice(4));
                const pt = chart.points[idx];
                if (pt) {
                    valueSpan.innerHTML = `<span class="dropdown-item-icon" style="width:14px;height:14px;">${DROPDOWN_ICONS.point}</span>Point ${idx + 1} (${pt.x}, ${pt.y})`;
                } else {
                    valueSpan.textContent = 'Point';
                }
            }
        } else {
            valueSpan.textContent = currentVal;
        }
    }
}

function updateChartLabelAnchorMenu() {
    const menu = document.getElementById('chartLabelAnchorMenu');
    const select = document.getElementById('chartLabelAnchor');
    if (!menu || !select) return;

    const chart = getActiveChart();
    menu.innerHTML = '';
    select.innerHTML = '';

    const staticOpts = [
        { value: 'last', label: 'Last point' },
        { value: 'first', label: 'First point' }
    ];
    staticOpts.forEach(o => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.value = o.value;
        item.textContent = o.label;
        menu.appendChild(item);
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        select.appendChild(opt);
    });

    chart.points.forEach((pt, i) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.value = 'idx:' + i;
        item.textContent = `Point ${i + 1} (${pt.x}, ${pt.y})`;
        menu.appendChild(item);
        const opt = document.createElement('option');
        opt.value = 'idx:' + i;
        opt.textContent = `Point ${i + 1} (${pt.x}, ${pt.y})`;
        select.appendChild(opt);
    });

    if (chart.chartLabelAnchor) select.value = chart.chartLabelAnchor;
    syncDropdownDisplay('chartLabelAnchor');
}

function setupDropdowns() {
    document.querySelectorAll('.custom-dropdown').forEach(dd => {
        const trigger = dd.querySelector('.dropdown-trigger');
        if (trigger.dataset.bound === '1') return;
        trigger.dataset.bound = '1';
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dd.classList.contains('open')) closeAllDropdowns();
            else openPortalDropdown(dd);
        });
    });

    if (!document._ddBound) {
        document._ddBound = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown') && !e.target.closest('.portal-dropdown-menu')) {
                closeAllDropdowns();
            }
        });
        document.getElementById('sidebarContent')?.addEventListener('scroll', () => {
            if (activePortalMenu) closeAllDropdowns();
        });
        document.querySelector('.viewport-scroll')?.addEventListener('scroll', () => {
            if (activePortalMenu) closeAllDropdowns();
        });
    }
}

function syncAllDropdowns() {
    document.querySelectorAll('.custom-dropdown').forEach(dd => {
        const targetId = dd.dataset.target;
        if (targetId) syncDropdownDisplay(targetId);
    });
}

function buildFontDropdownMenu(dd) {
    const menu = dd.querySelector('.dropdown-menu');
    menu.innerHTML = '';
    allFonts.forEach(f => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.value = f.value;
        item.textContent = f.name;
        menu.appendChild(item);
    });
    const sep = document.createElement('div');
    sep.className = 'dropdown-separator';
    menu.appendChild(sep);
    const uploadItem = document.createElement('div');
    uploadItem.className = 'dropdown-item dropdown-item-upload';
    uploadItem.textContent = 'Upload font…';
    menu.appendChild(uploadItem);
}

function rebuildAllFontDropdowns() {
    document.querySelectorAll('.custom-dropdown.font-dropdown').forEach(dd => {
        buildFontDropdownMenu(dd);
    });
    syncAllDropdowns();
}

// ─────────────────────────────────────────────
// Steppers
// ─────────────────────────────────────────────
function setupStepperButtons() {
    document.querySelectorAll('.stepper-btn').forEach(btn => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const action = btn.dataset.action;
            const stepOverride = btn.dataset.step ? parseFloat(btn.dataset.step) : null;
            const input = document.getElementById(targetId);
            if (!input) return;
            const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
            const max = input.max !== '' ? parseFloat(input.max) : Infinity;
            const step = stepOverride || 1;
            let val = parseFloat(input.value) || 0;
            if (action === 'increment') val += step;
            else val -= step;
            val = Math.max(min, Math.min(max, val));
            val = Math.round(val * 1000) / 1000;
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
}

function populateFontSelectors() {
    document.querySelectorAll('.font-selector').forEach(sel => {
        sel.innerHTML = '';
        allFonts.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.value;
            opt.textContent = f.name;
            sel.appendChild(opt);
        });
    });
}

function updateShadowSubgroup() {
    const sg = document.getElementById('shadowSubgroup');
    if (!sg) return;
    const enabled = readScoped('shadowEnabled');
    if (enabled) sg.classList.add('visible');
    else sg.classList.remove('visible');
}

function updatePlotBorderRowVisibility() {
    const row = document.getElementById('plotBorderRow');
    if (!row) return;
    const bothEnabled = state.showVerticalGrid && state.showHorizontalGrid;
    if (bothEnabled) row.classList.add('hidden-row');
    else row.classList.remove('hidden-row');
}

function updateTickVisibility() {
    const cr = document.getElementById('tickColorRow');
    const lr = document.getElementById('tickLengthRow');
    if (!cr || !lr) return;
    if (!state.showTicks) {
        cr.classList.add('hidden-row');
        lr.classList.add('hidden-row');
    } else {
        cr.classList.remove('hidden-row');
        lr.classList.remove('hidden-row');
    }
}

// ─────────────────────────────────────────────
// Subtitle
// ─────────────────────────────────────────────
function toggleSubtitle() {
    state.hasSubtitle = !state.hasSubtitle;
    if (state.hasSubtitle && (!state.subtitleRuns || state.subtitleRuns.length === 0)) {
        state.subtitleRuns = textToRuns('Subtitle', '#666666');
    }
    updateSubtitleUI();
    setEditorContent(document.getElementById('subtitleText'), state.subtitleRuns);
    saveState();
    render();
}

function updateSubtitleUI() {
    const sec = document.getElementById('subtitleSection');
    const addBtn = document.getElementById('addSubtitleBtn');
    const divBefore = document.getElementById('subtitleDividerBefore');
    if (!sec || !addBtn) return;
    if (state.hasSubtitle) {
        sec.style.display = 'flex';
        addBtn.style.display = 'none';
        if (divBefore) divBefore.style.display = 'block';
    } else {
        sec.style.display = 'none';
        addBtn.style.display = 'flex';
        if (divBefore) divBefore.style.display = 'none';
    }
}

// ─────────────────────────────────────────────
// Chart-label controls sync
// ─────────────────────────────────────────────
function syncChartLabelControls() {
    const chart = getActiveChart();
    const showToggle = document.getElementById('showChartLabel');
    const opts = document.getElementById('chartLabelOptions');
    const fontSize = document.getElementById('chartLabelFontSize');
    const boldToggle = document.getElementById('chartLabelBold');
    const anchorSel = document.getElementById('chartLabelAnchor');
    const posSel = document.getElementById('chartLabelPosition');

    if (showToggle) showToggle.checked = !!chart.showChartLabel;
    if (opts) opts.style.display = chart.showChartLabel ? 'flex' : 'none';
    if (fontSize) fontSize.value = chart.chartLabelFontSize || 14;
    if (boldToggle) boldToggle.checked = chart.chartLabelBold !== false;
    if (anchorSel) anchorSel.value = chart.chartLabelAnchor || 'last';
    if (posSel) posSel.value = chart.chartLabelPosition || 'above';

    syncDropdownDisplay('chartLabelAnchor');
    syncDropdownDisplay('chartLabelPosition');
}

function updateLegendUI() {
    const opts = document.getElementById('legendOptions');
    if (opts) opts.style.display = state.showLegend ? 'flex' : 'none';
}

// ─────────────────────────────────────────────
// Label collision detection & toast
// ─────────────────────────────────────────────
function anchorToPointIndex(chart, anchor) {
    if (!chart || chart.points.length === 0) return -1;
    if (anchor === 'last') return chart.points.length - 1;
    if (anchor === 'first') return 0;
    if (typeof anchor === 'string' && anchor.startsWith('idx:')) {
        const i = parseInt(anchor.slice(4));
        return (i >= 0 && i < chart.points.length) ? i : -1;
    }
    return -1;
}

// Returns true if chart-label position at `anchor+pos` would coincide with a marked point label
// on the same point at the same side. Optionally exclude one marked-point key.
function checkLabelCollision(chart, chartLabelAnchor, chartLabelPos, excludeMarkedKey) {
    if (!chart.showChartLabel) return false;
    const anchorIdx = anchorToPointIndex(chart, chartLabelAnchor);
    if (anchorIdx < 0) return false;
    const pt = chart.points[anchorIdx];
    if (!pt || !pt.marked) return false;

    const key = markKeyFor(chart, anchorIdx);
    if (excludeMarkedKey === key) return false;
    const meta = chart.markedPointsMeta[key];
    if (!meta) return false;
    const markPos = meta.labelPosition || 'above';
    return markPos === chartLabelPos;
}

// Returns true if a marked point's position (about to be changed) would coincide with chart label
function checkMarkedCollision(chart, markedKey, newPos) {
    if (!chart.showChartLabel) return false;
    const anchorIdx = anchorToPointIndex(chart, chart.chartLabelAnchor);
    if (anchorIdx < 0) return false;
    if (markKeyFor(chart, anchorIdx) !== markedKey) return false;
    return chart.chartLabelPosition === newPos;
}

function showLabelCollisionToast(source) {
    const id = 'label-collision-' + source;
    if (activeToastIds.has(id)) return;
    activeToastIds.add(id);

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.toastId = id;

    const title = source === 'chartLabel' ? 'Label conflict' : 'Label conflict';
    const msg = source === 'chartLabel'
        ? 'The chart name label and this marked point label would overlap in the same position. Move one of them to a different side, or dismiss to cancel.'
        : 'This marked point label would overlap with the chart name label at the same position. Choose a different side, or dismiss to cancel.';

    toast.innerHTML = `
        <div class="toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        </div>
        <div class="toast-body">
            <h4 class="toast-title">${title}</h4>
            <p class="toast-msg">${msg}</p>
            <div class="toast-actions">
                <button class="btn btn-secondary toast-dismiss-btn">Dismiss</button>
            </div>
        </div>
        <button class="toast-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    const dismiss = () => {
        toast.classList.add('dismissing');
        setTimeout(() => {
            toast.remove();
            activeToastIds.delete(id);
        }, 280);
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    toast.querySelector('.toast-dismiss-btn').addEventListener('click', dismiss);

    toastHost.appendChild(toast);
    setTimeout(dismiss, 7000);
}

// ─────────────────────────────────────────────
// Setup inputs
// ─────────────────────────────────────────────
function setupInputs() {
    populateFontSelectors();

    // Global-only IDs
    const globalIds = [
        'titlePosition', 'titleFont', 'axisFont', 'tickFont', 'subtitleFont',
        'titleFontSize', 'subtitleFontSize', 'axisFontSize', 'tickFontSize',
        'xMin', 'xMax', 'xStep', 'xSubDiv',
        'yMin', 'yMax', 'yStep', 'ySubDiv',
        'showVerticalGrid', 'showHorizontalGrid', 'showTicks',
        'showAxisLines', 'showOuterGrid',
        'innerGridColor', 'axisLineColor', 'axisLineWidth',
        'bgColor', 'gridColor', 'gridLineWidth', 'gridLineStyle', 'tickColor', 'tickLength',
        'showPlotBorder',
        'canvasWidth', 'canvasHeight', 'squareMode', 'squareSize',
        'showLegend', 'legendPosition', 'legendFont', 'legendFontSize', 'legendBg', 'legendBorder',
        'markedFont', 'markedFontSize'
    ];

    globalIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = !!state[id];
            el.addEventListener('change', e => {
                state[id] = e.target.checked;
                saveState();
                if (id === 'showVerticalGrid' || id === 'showHorizontalGrid') updatePlotBorderRowVisibility();
                if (id === 'showTicks') updateTickVisibility();
                if (id === 'squareMode') { updateCanvasSizeUI(); applyCanvasSize(); }
                if (id === 'showLegend') updateLegendUI();
                render();
            });
        } else {
            el.value = state[id] !== undefined ? state[id] : '';
            el.addEventListener('input', e => {
                let val = e.target.value;
                if (e.target.type === 'number' || e.target.type === 'range') val = parseFloat(val);
                state[id] = val;
                if (id === 'canvasWidth' || id === 'canvasHeight' || id === 'squareSize') applyCanvasSize();
                saveState();
                render();
            });
        }
    });

    // Chart-scoped IDs (write to active chart in advanced mode; to state in classic)
    CHART_SCOPED_KEYS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const val = readScoped(id);
        if (el.type === 'checkbox') {
            el.checked = !!val;
            el.addEventListener('change', e => {
                writeScoped(id, e.target.checked);
                saveState();
                if (id === 'shadowEnabled') updateShadowSubgroup();
                render();
            });
        } else {
            el.value = val !== undefined ? val : '';
            el.addEventListener('input', e => {
                let v = e.target.value;
                if (e.target.type === 'number' || e.target.type === 'range') v = parseFloat(v);
                writeScoped(id, v);
                saveState();
                render();
            });
        }
    });

    // Chart-label controls
    const showChartLabel = document.getElementById('showChartLabel');
    if (showChartLabel) {
        showChartLabel.addEventListener('change', () => {
            const chart = getActiveChart();
            if (showChartLabel.checked) {
                // check collision if turning on
                if (checkLabelCollision(chart, chart.chartLabelAnchor, chart.chartLabelPosition, null) === false) {
                    chart.showChartLabel = true;
                } else {
                    chart.showChartLabel = true; // Still allow, but user has been placing already
                }
            } else {
                chart.showChartLabel = false;
            }
            const opts = document.getElementById('chartLabelOptions');
            if (opts) opts.style.display = chart.showChartLabel ? 'flex' : 'none';
            saveState();
            render();
        });
    }
    const chartLabelFontSize = document.getElementById('chartLabelFontSize');
    if (chartLabelFontSize) {
        chartLabelFontSize.addEventListener('input', () => {
            const chart = getActiveChart();
            chart.chartLabelFontSize = parseInt(chartLabelFontSize.value) || 14;
            saveState();
            render();
        });
    }
    const chartLabelBold = document.getElementById('chartLabelBold');
    if (chartLabelBold) {
        chartLabelBold.addEventListener('change', () => {
            const chart = getActiveChart();
            chart.chartLabelBold = chartLabelBold.checked;
            saveState();
            render();
        });
    }

    renderPointsTable();
    renderMarkedPointsList();
    renderChartTabs();
    setupStepperButtons();
    setupFormatToolbars();

    rebuildAllFontDropdowns();
    setupDropdowns();
    updateChartLabelAnchorMenu();
    syncAllDropdowns();
    syncChartLabelControls();

    updateShadowSubgroup();
    updatePlotBorderRowVisibility();
    updateTickVisibility();
    updateCanvasSizeUI();
    updateSubtitleUI();
    updateLegendUI();
    applyCanvasSize();

    applyModeUI();
    applySidebarPanel();

    initializeEditors();

    const fontFileInput = document.getElementById('fontFileInput');
    fontFileInput.addEventListener('change', (e) => {
        const targetId = fontFileInput.dataset.dropdownTarget;
        handleFontUpload(e.target.files, targetId);
        fontFileInput.value = '';
    });
}

// ─────────────────────────────────────────────
// Points table
// ─────────────────────────────────────────────
function renderPointsTable() {
    const chart = getActiveChart();
    sortChartPoints(chart);
    const c = document.getElementById('pointsContainer');
    c.innerHTML = '';
    chart.points.forEach((pt, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
    <td><input type="number" step="0.1" value="${pt.x.toFixed(1)}"
        onfocus="highlightPoint(${i})" onblur="unhighlightPoint()"
        onchange="updatePoint(${i},'x',this.value)"></td>
    <td><input type="number" step="0.1" value="${pt.y.toFixed(1)}"
        onfocus="highlightPoint(${i})" onblur="unhighlightPoint()"
        onchange="updatePoint(${i},'y',this.value)"></td>
    <td class="td-mark advanced-only">
        <input type="checkbox" class="mark-checkbox" ${pt.marked ? 'checked' : ''}
            onchange="toggleMarkPoint(${i}, this.checked)">
    </td>
    <td><button class="point-delete-btn" onclick="removePoint(${i})" title="Remove">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 3h4" />
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    </svg>
</button></td>`;
        c.appendChild(tr);
    });
}

function highlightPoint(i) {
    const chart = getActiveChart();
    highlightedPointIndex = i;
    highlightedChartId = chart.id;
    render();
}
function unhighlightPoint() {
    highlightedPointIndex = -1;
    highlightedChartId = null;
    render();
}

function updatePoint(i, f, v) {
    const chart = getActiveChart();
    chart.points[i][f] = formatDec(v);
    saveState(); renderPointsTable(); renderMarkedPointsList();
    updateChartLabelAnchorMenu();
    render();
}

function addPoint() {
    const chart = getActiveChart();
    const last = chart.points[chart.points.length - 1] || { x: 0, y: 0 };
    chart.points.push({ x: formatDec(last.x + 10), y: formatDec(Math.max(0, last.y - 10)), marked: false });
    saveState(); renderPointsTable(); renderMarkedPointsList();
    updateChartLabelAnchorMenu();
    render();
}

function removePoint(i) {
    const chart = getActiveChart();
    chart.points.splice(i, 1);
    if (selectedPointIndex === i) selectedPointIndex = -1;
    saveState(); renderPointsTable(); renderMarkedPointsList();
    updateChartLabelAnchorMenu();
    render();
}

function toggleMarkPoint(i, checked) {
    const chart = getActiveChart();
    chart.points[i].marked = checked;
    if (checked) {
        const key = markKeyFor(chart, i);
        if (!chart.markedPointsMeta[key]) {
            chart.markedPointsMeta[key] = {
                label: '',
                fillColor: chart.color,
                outlineColor: '#ffffff',
                outlineWidth: 2,
                labelPosition: 'above'
            };
        }
    }
    saveState();
    renderMarkedPointsList();
    render();
}

function markKeyFor(chart, i) {
    const pt = chart.points[i];
    return `${pt.x}_${pt.y}`;
}

// ─────────────────────────────────────────────
// Marked points list
// ─────────────────────────────────────────────
function renderMarkedPointsList() {
    const container = document.getElementById('markedPointsContainer');
    const shared = document.getElementById('markedPointsSharedOptions');
    if (!container) return;
    container.innerHTML = '';

    let count = 0;
    state.charts.forEach(chart => {
        chart.points.forEach((pt, i) => {
            if (!pt.marked) return;
            const key = markKeyFor(chart, i);
            if (!chart.markedPointsMeta[key]) {
                chart.markedPointsMeta[key] = {
                    label: '',
                    fillColor: chart.color,
                    outlineColor: '#ffffff',
                    outlineWidth: 2,
                    labelPosition: 'above'
                };
            }
            const meta = chart.markedPointsMeta[key];
            const dropdownTarget = `mkLabelPos:${chart.id}:${key}`;

            const positionLabel = (val) => {
                if (val === 'above') return 'Above';
                if (val === 'below') return 'Below';
                if (val === 'left') return 'Left';
                if (val === 'right') return 'Right';
                return 'Above';
            };

            const card = document.createElement('div');
            card.className = 'marked-point-card';
            card.innerHTML = `
                <div class="marked-point-header">
                    <span class="marker-swatch" style="background:${meta.fillColor}"></span>
                    <span>${escapeHtml(chart.name)}</span>
                    <span class="coords">(${pt.x}, ${pt.y})</span>
                </div>
                <input type="text" class="marked-input" placeholder="Label text" value="${escapeHtml(meta.label || '')}">
                <div class="control-row">
                    <label>Fill color</label>
                    <input type="color" class="mk-fill" value="${meta.fillColor}">
                </div>
                <div class="control-row">
                    <label>Outline color</label>
                    <input type="color" class="mk-outline" value="${meta.outlineColor}">
                </div>
                <div class="control-row">
                    <label>Outline width</label>
                    <input type="range" class="mk-outline-w" min="0" max="6" step="0.5" value="${meta.outlineWidth}">
                </div>
                <div class="control-row">
                    <label>Label position</label>
                    <div class="custom-dropdown" data-target="${dropdownTarget}">
                        <button type="button" class="dropdown-trigger">
                            <span class="dropdown-value">${positionLabel(meta.labelPosition)}</span>
                            <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        <div class="dropdown-menu">
                            <div class="dropdown-item" data-value="above">Above</div>
                            <div class="dropdown-item" data-value="below">Below</div>
                            <div class="dropdown-item" data-value="right">Right</div>
                            <div class="dropdown-item" data-value="left">Left</div>
                        </div>
                    </div>
                </div>
            `;

            card.querySelector('.marked-input').addEventListener('input', (e) => {
                meta.label = e.target.value;
                saveState();
                render();
            });
            card.querySelector('.mk-fill').addEventListener('input', (e) => {
                meta.fillColor = e.target.value;
                card.querySelector('.marker-swatch').style.background = e.target.value;
                saveState();
                render();
            });
            card.querySelector('.mk-outline').addEventListener('input', (e) => {
                meta.outlineColor = e.target.value;
                saveState();
                render();
            });
            card.querySelector('.mk-outline-w').addEventListener('input', (e) => {
                meta.outlineWidth = parseFloat(e.target.value);
                saveState();
                render();
            });

            container.appendChild(card);
            count++;
        });
    });

    if (shared) shared.style.display = count > 0 ? 'block' : 'none';

    if (count === 0) {
        container.innerHTML = '<p class="hint-text" style="margin-top:0;">No marked points yet.</p>';
    } else {
        setupDropdowns();
        syncAllDropdowns();
    }
}

function resetToDefault() {
    if (!confirm('Reset ' + currentMode + ' mode to default? Your other mode remains untouched.')) return;
    const key = currentMode === 'advanced' ? STORAGE_KEY_ADVANCED : STORAGE_KEY_CLASSIC;
    localStorage.removeItem(key);
    state = loadModeState(currentMode);
    refreshAllUI();
    closeQuickEdit();
    render();
}

// ─────────────────────────────────────────────
// Splines
// ─────────────────────────────────────────────
function getSmoothControlPoints(pts) {
    const n = pts.length;
    if (n < 2) return [];
    const result = [];
    for (let i = 0; i < n - 1; i++) {
        const p0 = i === 0 ? pts[i] : pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i + 2 < n ? pts[i + 2] : pts[i + 1];
        result.push({
            cp1x: p1.px + (p2.px - p0.px) / 6,
            cp1y: p1.py + (p2.py - p0.py) / 6,
            cp2x: p2.px - (p3.px - p1.px) / 6,
            cp2y: p2.py - (p3.py - p1.py) / 6
        });
    }
    return result;
}

function drawCurvedLine(pixelPts, tension) {
    if (pixelPts.length < 2) return;
    if (tension <= 0) {
        ctx.beginPath();
        pixelPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        return;
    }
    const controls = getSmoothControlPoints(pixelPts);
    ctx.beginPath();
    ctx.moveTo(pixelPts[0].px, pixelPts[0].py);
    for (let i = 0; i < pixelPts.length - 1; i++) {
        const p0 = pixelPts[i], p1 = pixelPts[i + 1], cp = controls[i];
        const cp1x = p0.px + (cp.cp1x - p0.px) * tension;
        const cp1y = p0.py + (cp.cp1y - p0.py) * tension;
        const cp2x = p1.px + (cp.cp2x - p1.px) * tension;
        const cp2y = p1.py + (cp.cp2y - p1.py) * tension;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.px, p1.py);
    }
    ctx.stroke();
}

function buildCurvedPath(pixelPts, tension, pad) {
    if (pixelPts.length < 2) return null;
    const path = new Path2D();
    const bottomY = pad.top + plotH(pad);
    path.moveTo(pixelPts[0].px, bottomY);
    path.lineTo(pixelPts[0].px, pixelPts[0].py);
    if (tension <= 0) {
        for (let i = 1; i < pixelPts.length; i++) {
            path.lineTo(pixelPts[i].px, pixelPts[i].py);
        }
    } else {
        const controls = getSmoothControlPoints(pixelPts);
        for (let i = 0; i < pixelPts.length - 1; i++) {
            const p0 = pixelPts[i], p1 = pixelPts[i + 1], cp = controls[i];
            const cp1x = p0.px + (cp.cp1x - p0.px) * tension;
            const cp1y = p0.py + (cp.cp1y - p0.py) * tension;
            const cp2x = p1.px + (cp.cp2x - p1.px) * tension;
            const cp2y = p1.py + (cp.cp2y - p1.py) * tension;
            path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.px, p1.py);
        }
    }
    path.lineTo(pixelPts[pixelPts.length - 1].px, bottomY);
    path.closePath();
    return path;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// ─────────────────────────────────────────────
// Rich text canvas render
// ─────────────────────────────────────────────
function measureRun(run, baseFontSize, baseFont) {
    const weight = run.bold ? 'bold' : 'normal';
    const style = run.italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${baseFontSize}px ${baseFont}`;
    return ctx.measureText(run.text).width;
}

function splitRunsIntoLines(runs) {
    const lines = [[]];
    runs.forEach(run => {
        const parts = run.text.split('\n');
        parts.forEach((p, i) => {
            if (i > 0) lines.push([]);
            if (p.length > 0) {
                lines[lines.length - 1].push({
                    text: p,
                    bold: run.bold,
                    italic: run.italic,
                    underline: run.underline,
                    color: run.color
                });
            }
        });
    });
    return lines;
}

function measureLineWidth(lineRuns, baseFontSize, baseFont) {
    let w = 0;
    lineRuns.forEach(r => w += measureRun(r, baseFontSize, baseFont));
    return w;
}

function drawRichLine(lineRuns, x, y, baseFontSize, baseFont, anchor, isRtl) {
    if (lineRuns.length === 0) return;
    const lineWidth = measureLineWidth(lineRuns, baseFontSize, baseFont);
    let startX;
    if (anchor === 'left') startX = x;
    else if (anchor === 'right') startX = x - lineWidth;
    else startX = x - lineWidth / 2;

    const orderedRuns = isRtl ? [...lineRuns].reverse() : lineRuns;

    let cursorX = startX;
    orderedRuns.forEach(run => {
        const weight = run.bold ? 'bold' : 'normal';
        const style = run.italic ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${baseFontSize}px ${baseFont}`;
        ctx.fillStyle = run.color || '#000000';
        ctx.textAlign = 'left';
        ctx.direction = isRtl ? 'rtl' : 'ltr';
        ctx.fillText(run.text, cursorX, y);
        const w = ctx.measureText(run.text).width;
        if (run.underline) {
            ctx.save();
            ctx.strokeStyle = run.color || '#000000';
            ctx.lineWidth = Math.max(1, baseFontSize * 0.06);
            const uly = y + baseFontSize * 0.15;
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

function drawRichText(runs, x, y, baseFontSize, baseFont, anchor, isRtl, lineHeight) {
    const lines = splitRunsIntoLines(runs);
    lines.forEach((line, i) => {
        drawRichLine(line, x, y + i * lineHeight, baseFontSize, baseFont, anchor, isRtl);
    });
    return lines.length;
}

function hasHebrewInRuns(runs) {
    return runs.some(r => /[\u0590-\u05FF]/.test(r.text));
}

// ─────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────
function render() {
    clickTargets = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = getPaddings();
    const pw = plotW(pad);
    const ph = plotH(pad);

    ctx.fillStyle = state.bgColor || '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const tickFontPx = parseInt(state.tickFontSize) || 15;

    // Title
    if (state.titleRuns && state.titleRuns.length > 0) {
        const isRtl = hasHebrewInRuns(state.titleRuns);
        const lineH = titleFontPx * 1.35;
        let tx = canvas.width / 2;
        let anchor = 'center';
        if (state.titlePosition === 'top-left') { tx = pad.left; anchor = 'left'; }
        if (state.titlePosition === 'top-right') { tx = canvas.width - pad.right; anchor = 'right'; }
        ctx.textBaseline = 'top';
        const startY = 22;
        const linesDrawn = drawRichText(state.titleRuns, tx, startY, titleFontPx, state.titleFont, anchor, isRtl, lineH);
        let afterTitleY = startY + linesDrawn * lineH;
        if (state.hasSubtitle && state.subtitleRuns && state.subtitleRuns.length > 0) {
            const subLineH = subtitleFontPx * 1.35;
            const isSubRtl = hasHebrewInRuns(state.subtitleRuns);
            const subStartY = afterTitleY + 4;
            drawRichText(state.subtitleRuns, tx, subStartY, subtitleFontPx, state.subtitleFont || state.titleFont, anchor, isSubRtl, subLineH);
            const subLines = splitRunsIntoLines(state.subtitleRuns).length;
            registerHitbox('subtitleText', tx - 250, subStartY - 5, 500, subLines * subLineH + 10);
        }
        registerHitbox('titleText', tx - 250, startY - 5, 500, linesDrawn * lineH + 10);
    }

    // Grid
    const xSubStep = state.xStep / state.xSubDiv;
    const ySubStep = state.yStep / state.ySubDiv;
    const totalXSteps = Math.round((state.xMax - state.xMin) / xSubStep);
    const totalYSteps = Math.round((state.yMax - state.yMin) / ySubStep);
    const tLen = state.showTicks ? (parseFloat(state.tickLength) || 7) : 0;
    const gridW = parseFloat(state.gridLineWidth);
    const innerGridColor = state.innerGridColor || '#e5e5e0';
    const outerGridColor = state.gridColor;
    const showOuter = currentMode === 'advanced' ? (state.showOuterGrid !== false) : true;

    ctx.lineWidth = gridW;
    if (state.gridLineStyle === 'dashed') ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);

    if (state.showVerticalGrid !== false) {
        for (let i = 0; i <= totalXSteps; i++) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal, pad);
            const isEdge = (i === 0 || Math.abs(xVal - state.xMax) < 0.001);
            if (isEdge && !showOuter) continue;
            ctx.strokeStyle = isEdge ? outerGridColor : (currentMode === 'advanced' ? innerGridColor : outerGridColor);
            ctx.beginPath();
            ctx.moveTo(xPx, pad.top);
            ctx.lineTo(xPx, pad.top + ph);
            ctx.stroke();
        }
    }
    if (state.showHorizontalGrid !== false) {
        for (let i = 0; i <= totalYSteps; i++) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal, pad);
            const isEdge = (i === 0 || Math.abs(yVal - state.yMax) < 0.001);
            if (isEdge && !showOuter) continue;
            ctx.strokeStyle = isEdge ? outerGridColor : (currentMode === 'advanced' ? innerGridColor : outerGridColor);
            ctx.beginPath();
            ctx.moveTo(pad.left, yPx);
            ctx.lineTo(pad.left + pw, yPx);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);

    const bothGridsOn = state.showVerticalGrid && state.showHorizontalGrid;
    if (state.showPlotBorder !== false && !bothGridsOn) {
        ctx.strokeStyle = outerGridColor;
        ctx.lineWidth = gridW;
        ctx.strokeRect(pad.left, pad.top, pw, ph);
    }

    if (currentMode === 'advanced' && state.showAxisLines) {
        const axCol = state.axisLineColor || '#000';
        const axW = parseFloat(state.axisLineWidth) || 1.5;
        ctx.strokeStyle = axCol;
        ctx.lineWidth = axW;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top + ph);
        ctx.lineTo(pad.left + pw, pad.top + ph);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + ph);
        ctx.stroke();
    }

    if (state.showTicks) {
        ctx.strokeStyle = state.tickColor;
        ctx.lineWidth = gridW;
        for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal, pad);
            ctx.beginPath();
            ctx.moveTo(xPx, pad.top + ph - tLen);
            ctx.lineTo(xPx, pad.top + ph + tLen);
            ctx.stroke();
        }
        for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal, pad);
            ctx.beginPath();
            ctx.moveTo(pad.left - tLen, yPx);
            ctx.lineTo(pad.left + tLen, yPx);
            ctx.stroke();
        }
    }

    for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
        const xVal = state.xMin + i * xSubStep;
        if (xVal > state.xMax + 0.001) break;
        const xPx = mapX(xVal, pad);
        ctx.fillStyle = '#000';
        ctx.font = `${tickFontPx}px ${state.tickFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.direction = 'ltr';
        ctx.fillText(xVal % 1 === 0 ? xVal.toFixed(0) : xVal.toFixed(1), xPx, pad.top + ph + tLen + 4);
    }
    for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
        const yVal = state.yMin + i * ySubStep;
        if (yVal > state.yMax + 0.001) break;
        const yPx = mapY(yVal, pad);
        ctx.fillStyle = '#000';
        ctx.font = `${tickFontPx}px ${state.tickFont}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.direction = 'ltr';
        ctx.fillText(yVal % 1 === 0 ? yVal.toFixed(0) : yVal.toFixed(1), pad.left - tLen - 6, yPx);
    }

    if (state.xLabelRuns && state.xLabelRuns.length > 0) {
        const isRtl = hasHebrewInRuns(state.xLabelRuns);
        const lineH = axisFontPx * 1.35;
        const startY = pad.top + ph + tLen + tickFontPx + 14;
        const cx = pad.left + pw / 2;
        ctx.textBaseline = 'top';
        const linesDrawn = drawRichText(state.xLabelRuns, cx, startY, axisFontPx, state.axisFont, 'center', isRtl, lineH);
        registerHitbox('xLabel', cx - 200, startY - 5, 400, linesDrawn * lineH + 10);
    }

    if (state.yLabelRuns && state.yLabelRuns.length > 0) {
        const isRtl = hasHebrewInRuns(state.yLabelRuns);
        const lineH = axisFontPx * 1.35;
        const totalLines = splitRunsIntoLines(state.yLabelRuns).length;
        const totalH = totalLines * lineH;
        const xPos = 25;
        const cy = pad.top + ph / 2;

        ctx.save();
        ctx.translate(xPos, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = 'middle';
        const linesArr = splitRunsIntoLines(state.yLabelRuns);
        linesArr.forEach((line, i) => {
            const yOff = (i - (linesArr.length - 1) / 2) * lineH;
            drawRichLine(line, 0, yOff, axisFontPx, state.axisFont, 'center', isRtl);
        });
        ctx.restore();
        registerHitbox('yLabel', xPos - 18, cy - totalH / 2, 36, totalH);
    }

    state.charts.forEach(chart => drawChart(chart, pad));

    if (currentMode === 'advanced' && state.showLegend && state.charts.length > 0) {
        drawLegend(pad);
    }
}

function drawChart(chart, pad) {
    sortChartPoints(chart);
    if (chart.points.length === 0) return;

    const pw = plotW(pad);
    const ph = plotH(pad);
    const tension = parseFloat(chart.lineTension) || 0;
    const pixelPts = chart.points.map(pt => ({
        px: mapX(pt.x, pad),
        py: mapY(pt.y, pad)
    }));

    // Shadow (uses chart's own settings)
    if (chart.shadowEnabled && pixelPts.length >= 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(pad.left, pad.top, pw, ph);
        ctx.clip();
        const fillPath = buildCurvedPath(pixelPts, tension, pad);
        if (fillPath) {
            const intensity = parseFloat(chart.shadowIntensity) || 0.6;
            const offset = parseFloat(chart.shadowOffset) || 0;
            const opacity1 = parseFloat(chart.shadowOpacity1) || 0;
            const opacity2 = parseFloat(chart.shadowOpacity2) || 0;
            const c1 = hexToRgb(chart.shadowColor1 || '#4A90D9');
            const c2 = hexToRgb(chart.shadowColor2 || '#4A90D9');
            let minPy = Infinity;
            pixelPts.forEach(p => { if (p.py < minPy) minPy = p.py; });
            const bottomY = pad.top + ph;
            const grad = ctx.createLinearGradient(0, minPy, 0, bottomY);
            const eo1 = opacity1 * intensity;
            const eo2 = opacity2 * intensity;
            const clampedOffset = Math.max(0, Math.min(1, offset));
            grad.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${eo1})`);
            if (clampedOffset > 0 && clampedOffset < 1) {
                grad.addColorStop(clampedOffset, `rgba(${c1.r},${c1.g},${c1.b},${eo1})`);
                grad.addColorStop(Math.min(1, clampedOffset + 0.01), `rgba(${c2.r},${c2.g},${c2.b},${(eo1 + eo2) / 2})`);
            }
            grad.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${eo2})`);
            ctx.fillStyle = grad;
            ctx.fill(fillPath);
        }
        ctx.restore();
    }

    const lineColor = currentMode === 'advanced' ? chart.color : chart.lineColor;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = chart.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawCurvedLine(pixelPts, tension);

    if (chart.markerShape !== 'none') {
        const sz = parseFloat(chart.markerSize);
        chart.points.forEach((pt, idx) => {
            const px = mapX(pt.x, pad), py = mapY(pt.y, pad);
            const isMarked = pt.marked === true;
            const active = (idx === hoveredPointIndex && chart.id === hoveredChartId) ||
                (idx === draggingPointIndex && chart.id === draggingChartId) ||
                (idx === selectedPointIndex && chart.id === selectedChartId) ||
                (idx === highlightedPointIndex && chart.id === highlightedChartId);

            let fillC = lineColor;
            let outlineC = null;
            let outlineW = 0;

            if (isMarked) {
                const key = markKeyFor(chart, idx);
                const meta = chart.markedPointsMeta[key];
                if (meta) {
                    fillC = meta.fillColor || chart.color;
                    outlineC = meta.outlineColor;
                    outlineW = meta.outlineWidth || 0;
                }
            }
            if (active) fillC = '#3a3b3cff';

            ctx.fillStyle = fillC;
            ctx.strokeStyle = outlineC || fillC;
            drawMarker(px, py, sz, chart.markerShape, active, outlineW, outlineC);

            if (isMarked) {
                const key = markKeyFor(chart, idx);
                const meta = chart.markedPointsMeta[key];
                if (meta && meta.label) {
                    ctx.save();
                    const fs = parseInt(state.markedFontSize) || 13;
                    const ff = state.markedFont || state.axisFont || 'sans-serif';
                    ctx.font = `bold ${fs}px ${ff}`;
                    ctx.fillStyle = '#000';
                    ctx.direction = /[\u0590-\u05FF]/.test(meta.label) ? 'rtl' : 'ltr';
                    const off = sz + 8;
                    const pos = meta.labelPosition || 'above';
                    if (pos === 'above') {
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(meta.label, px, py - off);
                    } else if (pos === 'below') {
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(meta.label, px, py + off);
                    } else if (pos === 'right') {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(meta.label, px + off, py);
                    } else if (pos === 'left') {
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(meta.label, px - off, py);
                    }
                    ctx.restore();
                }
            }
        });
    }

    if (currentMode === 'advanced' && chart.showChartLabel && chart.name) {
        drawChartNameLabel(chart, pad);
    }
}

function drawChartNameLabel(chart, pad) {
    if (chart.points.length === 0) return;
    const anchor = chart.chartLabelAnchor || 'last';
    let idx = anchorToPointIndex(chart, anchor);
    if (idx < 0) idx = chart.points.length - 1;

    const pt = chart.points[idx];
    const px = mapX(pt.x, pad);
    const py = mapY(pt.y, pad);
    const sz = parseFloat(chart.markerSize) || 8;
    const off = sz + 10;
    const fontSize = chart.chartLabelFontSize || 14;
    const weight = chart.chartLabelBold ? 'bold' : 'normal';

    ctx.save();
    ctx.font = `${weight} ${fontSize}px ${state.axisFont || 'sans-serif'}`;
    ctx.fillStyle = '#000';
    ctx.direction = /[\u0590-\u05FF]/.test(chart.name) ? 'rtl' : 'ltr';
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

function drawMarker(px, py, size, shape, active, outlineW, outlineC) {
    ctx.save();
    ctx.translate(px, py);
    if (shape === 'diamond') {
        ctx.rotate(Math.PI / 4);
        const s = size * 1.2;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        if (outlineW > 0 && outlineC) {
            ctx.lineWidth = outlineW;
            ctx.strokeStyle = outlineC;
            ctx.strokeRect(-s / 2, -s / 2, s, s);
        }
    } else if (shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
        if (outlineW > 0 && outlineC) {
            ctx.lineWidth = outlineW;
            ctx.strokeStyle = outlineC;
            ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();
        }
    } else if (shape === 'square') {
        ctx.fillRect(-size, -size, size * 2, size * 2);
        if (outlineW > 0 && outlineC) {
            ctx.lineWidth = outlineW;
            ctx.strokeStyle = outlineC;
            ctx.strokeRect(-size, -size, size * 2, size * 2);
        }
    } else if (shape === 'cross') {
        ctx.beginPath(); ctx.lineWidth = 2.5;
        ctx.moveTo(-size, -size); ctx.lineTo(size, size);
        ctx.moveTo(size, -size); ctx.lineTo(-size, size);
        ctx.stroke();
    }
    if (active) {
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(58, 59, 60, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
    ctx.restore();
}

// ─────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────
function drawLegend(pad) {
    const fontSize = parseInt(state.legendFontSize) || 13;
    const legendFont = state.legendFont || state.axisFont || 'sans-serif';
    const padding = 10;
    const rowHeight = fontSize + 8;
    const swatchSize = fontSize;
    const gap = 8;

    ctx.font = `500 ${fontSize}px ${legendFont}`;
    let maxTextW = 0;
    state.charts.forEach(c => {
        const w = ctx.measureText(c.name).width;
        if (w > maxTextW) maxTextW = w;
    });

    const boxW = padding * 2 + swatchSize + gap + maxTextW;
    const boxH = padding * 2 + state.charts.length * rowHeight - (rowHeight - fontSize - 4);

    const pw = plotW(pad), ph = plotH(pad);
    let x, y;
    const margin = 12;
    switch (state.legendPosition) {
        case 'top-right': x = pad.left + pw - boxW - margin; y = pad.top + margin; break;
        case 'bottom-right': x = pad.left + pw - boxW - margin; y = pad.top + ph - boxH - margin; break;
        case 'top-left': x = pad.left + margin; y = pad.top + margin; break;
        case 'bottom-left': x = pad.left + margin; y = pad.top + ph - boxH - margin; break;
        default: x = pad.left + pw - boxW - margin; y = pad.top + margin;
    }

    ctx.save();
    ctx.fillStyle = state.legendBg || '#f7f7f5';
    roundRect(x, y, boxW, boxH, 8);
    ctx.fill();
    if (state.legendBorder) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        roundRect(x, y, boxW, boxH, 8);
        ctx.stroke();
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    state.charts.forEach((c, i) => {
        const rowY = y + padding + rowHeight * i + rowHeight / 2 - 2;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(x + padding + swatchSize / 2, rowY, swatchSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = `500 ${fontSize}px ${legendFont}`;
        ctx.fillText(c.name, x + padding + swatchSize + gap, rowY);
    });
    ctx.restore();
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ─────────────────────────────────────────────
// Hit-testing
// ─────────────────────────────────────────────
function registerHitbox(key, x, y, w, h) {
    clickTargets.push({ key, x, y, w, h });
}

function getCanvasCoords(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
        cx: e.clientX,
        cy: e.clientY
    };
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function findHitPoint(cx, cy, pad) {
    let bestChart = null, bestIdx = -1, bestDist = Infinity;
    state.charts.forEach(chart => {
        const threshold = Math.max((parseFloat(chart.markerSize) || 8) * 1.8, 14);
        chart.points.forEach((pt, idx) => {
            const d = dist(mapX(pt.x, pad), mapY(pt.y, pad), cx, cy);
            if (d <= threshold && d < bestDist) {
                bestChart = chart;
                bestIdx = idx;
                bestDist = d;
            }
        });
    });
    return bestChart ? { chart: bestChart, idx: bestIdx } : null;
}

canvas.addEventListener('mousedown', e => {
    const c = getCanvasCoords(e);
    const pad = getPaddings();

    const hit = findHitPoint(c.x, c.y, pad);
    if (hit) {
        draggingPointIndex = hit.idx;
        draggingChartId = hit.chart.id;
        selectedPointIndex = hit.idx;
        selectedChartId = hit.chart.id;
        if (hit.chart.id !== state.activeChartId) {
            setActiveChart(hit.chart.id);
        }
        closeQuickEdit();
        return;
    }
    selectedPointIndex = -1;
    selectedChartId = null;

    const hitLabel = clickTargets.find(t =>
        c.x >= t.x && c.x <= t.x + t.w && c.y >= t.y && c.y <= t.y + t.h
    );
    if (hitLabel) openQuickEdit(hitLabel.key, { cx: e.clientX, cy: e.clientY });
    else closeQuickEdit();
});

window.addEventListener('mousemove', e => {
    const pad = getPaddings();

    if (draggingPointIndex !== -1 && draggingChartId) {
        const chart = state.charts.find(c => c.id === draggingChartId);
        if (!chart) return;
        const c = getCanvasCoords(e);
        chart.points[draggingPointIndex].x = formatDec(Math.max(state.xMin, Math.min(state.xMax, unmapX(c.x, pad))));
        chart.points[draggingPointIndex].y = formatDec(Math.max(state.yMin, Math.min(state.yMax, unmapY(c.y, pad))));
        saveState();
        if (chart.id === state.activeChartId) {
            renderPointsTable();
            renderMarkedPointsList();
            updateChartLabelAnchorMenu();
        }
        render();
        showTooltip(
            `${chart.points[draggingPointIndex].x.toFixed(1)}, ${chart.points[draggingPointIndex].y.toFixed(1)}`,
            c.cx, c.cy
        );
        return;
    }

    const c = getCanvasCoords(e);
    const hit = findHitPoint(c.x, c.y, pad);
    const newHoverIdx = hit ? hit.idx : -1;
    const newHoverChart = hit ? hit.chart.id : null;

    if (newHoverIdx !== hoveredPointIndex || newHoverChart !== hoveredChartId) {
        hoveredPointIndex = newHoverIdx;
        hoveredChartId = newHoverChart;
        canvas.style.cursor = hit ? 'grab' : 'default';
        render();
    }

    if (hit) {
        showTooltip(`${hit.chart.points[hit.idx].x.toFixed(1)}, ${hit.chart.points[hit.idx].y.toFixed(1)}`, c.cx, c.cy);
    } else {
        hideTooltip();
    }
});

window.addEventListener('mouseup', () => {
    if (draggingPointIndex !== -1) {
        draggingPointIndex = -1;
        draggingChartId = null;
        hideTooltip();
        renderPointsTable();
        render();
    }
});

window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== -1 && selectedChartId) {
        const chart = state.charts.find(c => c.id === selectedChartId);
        if (chart) {
            chart.points.splice(selectedPointIndex, 1);
            selectedPointIndex = -1;
            selectedChartId = null;
            saveState();
            renderPointsTable();
            renderMarkedPointsList();
            updateChartLabelAnchorMenu();
            render();
        }
        e.preventDefault();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportPNG(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); exportSVG(); }
    if (e.key === 'Escape') {
        closeQuickEdit();
        closeAllDropdowns();
        cancelModeChange();
        cancelDeleteChart();
    }
});

// ─────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────
function showTooltip(text, cx, cy) {
    const r = document.getElementById('canvasCard').getBoundingClientRect();
    tooltip.style.left = `${cx - r.left + 14}px`;
    tooltip.style.top = `${cy - r.top - 32}px`;
    tooltip.textContent = text;
    tooltip.style.display = 'block';
}
function hideTooltip() { tooltip.style.display = 'none'; }

// ─────────────────────────────────────────────
// Quick-edit
// ─────────────────────────────────────────────
function openQuickEdit(key, clickPos) {
    activeQuickEditKey = key;
    quickEditClickPos = clickPos;

    const runsKey = editorIdToRunsKey(key);
    setEditorContent(quickInput, state[runsKey] || []);

    const titleEl = document.getElementById('quickEditTitle');
    const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const labelText = key === 'titleText' ? 'Edit title' :
        key === 'subtitleText' ? 'Edit subtitle' :
            key === 'xLabel' ? 'Edit X-axis label' : 'Edit Y-axis label';
    titleEl.innerHTML = `${iconSvg} ${labelText}`;

    const toolbar = document.getElementById('quickFmtToolbar');
    toolbar.querySelectorAll('.fmt-btn').forEach(btn => {
        const clone = btn.cloneNode(true);
        btn.replaceWith(clone);
    });
    const colorBtn = document.getElementById('quickFmtColor');
    if (colorBtn) {
        const cClone = colorBtn.cloneNode(true);
        colorBtn.replaceWith(cClone);
    }

    toolbar.querySelectorAll('.fmt-btn').forEach(btn => {
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('click', () => {
            const fmt = btn.dataset.fmt;
            applyQuickEditFormat(fmt);
        });
    });
    const freshColor = document.getElementById('quickFmtColor');
    if (freshColor) {
        freshColor.addEventListener('input', () => {
            applyQuickEditFormat('color', freshColor.value);
        });
    }

    quickEditBox.style.visibility = 'hidden';
    quickEditBox.style.display = 'flex';
    quickEditBox.style.left = '0px';
    quickEditBox.style.top = '0px';

    requestAnimationFrame(() => {
        positionQuickEditAtCursor();
        quickEditBox.style.visibility = 'visible';
        setTimeout(() => quickInput.focus(), 30);
    });
}

function applyQuickEditFormat(cmd, value) {
    quickInput.focus();
    const sel = window.getSelection();
    if (currentMode === 'advanced') {
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.anchorNode && quickInput.contains(sel.anchorNode)) {
            if (cmd === 'bold') document.execCommand('bold', false, null);
            else if (cmd === 'italic') document.execCommand('italic', false, null);
            else if (cmd === 'underline') document.execCommand('underline', false, null);
            else if (cmd === 'color') document.execCommand('foreColor', false, value);
        } else {
            const range = document.createRange();
            range.selectNodeContents(quickInput);
            sel.removeAllRanges();
            sel.addRange(range);
            if (cmd === 'bold') document.execCommand('bold', false, null);
            else if (cmd === 'italic') document.execCommand('italic', false, null);
            else if (cmd === 'underline') document.execCommand('underline', false, null);
            else if (cmd === 'color') document.execCommand('foreColor', false, value);
            sel.removeAllRanges();
        }
    } else {
        const runs = htmlToRuns(quickInput);
        if (cmd === 'bold') {
            const anyNot = runs.some(r => !r.bold);
            runs.forEach(r => r.bold = anyNot);
        } else if (cmd === 'italic') {
            const anyNot = runs.some(r => !r.italic);
            runs.forEach(r => r.italic = anyNot);
        } else if (cmd === 'underline') {
            const anyNot = runs.some(r => !r.underline);
            runs.forEach(r => r.underline = anyNot);
        } else if (cmd === 'color') {
            runs.forEach(r => r.color = value);
        }
        setEditorContent(quickInput, runs);
    }
}

function positionQuickEditAtCursor() {
    if (!quickEditClickPos || !activeQuickEditKey) return;
    const cardEl = document.getElementById('canvasCard');
    const cardRect = cardEl.getBoundingClientRect();
    const clickRelX = quickEditClickPos.cx - cardRect.left;
    const clickRelY = quickEditClickPos.cy - cardRect.top;
    const boxW = quickEditBox.offsetWidth || 340;
    const boxH = quickEditBox.offsetHeight || 200;
    const cardW = cardRect.width, cardH = cardRect.height;

    let left = clickRelX - boxW / 2;
    let top = clickRelY + 18;
    if (top + boxH > cardH - 10) top = clickRelY - boxH - 18;
    left = Math.max(10, Math.min(left, cardW - boxW - 10));
    top = Math.max(10, Math.min(top, cardH - boxH - 10));

    quickEditBox.style.left = `${left}px`;
    quickEditBox.style.top = `${top}px`;
}

function closeQuickEdit() {
    quickEditBox.style.display = 'none';
    activeQuickEditKey = null;
    quickEditClickPos = null;
}

function saveQuickEdit() {
    if (activeQuickEditKey) {
        const runs = htmlToRuns(quickInput);
        const runsKey = editorIdToRunsKey(activeQuickEditKey);
        state[runsKey] = runs;
        const sidebarEl = document.getElementById(activeQuickEditKey);
        if (sidebarEl) setEditorContent(sidebarEl, runs);
        saveState();
        render();
        closeQuickEdit();
    }
}

// ─────────────────────────────────────────────
// Export PNG
// ─────────────────────────────────────────────
function exportPNG() {
    closeQuickEdit(); hideTooltip();
    const prevH = hoveredPointIndex;
    const prevHL = highlightedPointIndex;
    hoveredPointIndex = -1; highlightedPointIndex = -1;
    render();
    const link = document.createElement('a');
    link.download = 'graph-studio-export.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    hoveredPointIndex = prevH; highlightedPointIndex = prevHL;
}

// ─────────────────────────────────────────────
// SVG export
// ─────────────────────────────────────────────
function escXml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildSplinePathD(pixelPts, tension) {
    if (pixelPts.length < 2) return '';
    if (tension <= 0) {
        let d = '';
        pixelPts.forEach((p, i) => { d += `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(2)} ${p.py.toFixed(2)} `; });
        return d;
    }
    const controls = getSmoothControlPoints(pixelPts);
    let d = `M ${pixelPts[0].px.toFixed(2)} ${pixelPts[0].py.toFixed(2)} `;
    for (let i = 0; i < pixelPts.length - 1; i++) {
        const p0 = pixelPts[i], p1 = pixelPts[i + 1], cp = controls[i];
        const cp1x = p0.px + (cp.cp1x - p0.px) * tension;
        const cp1y = p0.py + (cp.cp1y - p0.py) * tension;
        const cp2x = p1.px + (cp.cp2x - p1.px) * tension;
        const cp2y = p1.py + (cp.cp2y - p1.py) * tension;
        d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.px.toFixed(2)} ${p1.py.toFixed(2)} `;
    }
    return d;
}

function buildSvgRichText(runs, x, y, baseFontSize, baseFont, anchor, isRtl, lineH) {
    if (!runs || runs.length === 0) return '';
    const lines = splitRunsIntoLines(runs);
    let out = '';
    const dirAttr = isRtl ? ' direction="rtl" unicode-bidi="bidi-override"' : '';

    lines.forEach((line, li) => {
        const lineY = y + li * lineH;
        let totalW = 0;
        line.forEach(run => {
            const weight = run.bold ? 'bold' : 'normal';
            const style = run.italic ? 'italic' : 'normal';
            ctx.font = `${style} ${weight} ${baseFontSize}px ${baseFont}`;
            totalW += ctx.measureText(run.text).width;
        });

        let startX;
        if (anchor === 'middle') startX = x - totalW / 2;
        else if (anchor === 'end') startX = x - totalW;
        else startX = x;

        const orderedLine = isRtl ? [...line].reverse() : line;
        let cursor = startX;
        orderedLine.forEach(run => {
            const weight = run.bold ? 'bold' : 'normal';
            const style = run.italic ? 'italic' : 'normal';
            const decor = run.underline ? 'underline' : 'none';
            ctx.font = `${style} ${weight} ${baseFontSize}px ${baseFont}`;
            const w = ctx.measureText(run.text).width;
            out += `<text x="${cursor.toFixed(2)}" y="${lineY.toFixed(2)}" font-size="${baseFontSize}" font-family="${escXml(baseFont)}" font-weight="${weight}" font-style="${style}" text-decoration="${decor}" fill="${escXml(run.color || '#000')}" text-anchor="start"${dirAttr}>${escXml(run.text)}</text>\n`;
            cursor += w;
        });
    });
    return out;
}

function buildVectorSVG() {
    const pad = getPaddings();
    const pw = plotW(pad);
    const ph = plotH(pad);
    const tLen = state.showTicks ? (parseFloat(state.tickLength) || 7) : 0;
    const tickFontPx = parseInt(state.tickFontSize) || 15;
    const axisFontPx = parseInt(state.axisFontSize) || 18;
    const titleFontPx = parseInt(state.titleFontSize) || 20;
    const subtitleFontPx = parseInt(state.subtitleFontSize) || 16;
    const gridW = parseFloat(state.gridLineWidth);
    const showOuter = currentMode === 'advanced' ? (state.showOuterGrid !== false) : true;
    const showAxisLines = currentMode === 'advanced' && state.showAxisLines;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n`;
    svg += `<rect width="100%" height="100%" fill="${state.bgColor || '#fff'}"/>\n`;

    if (state.titleRuns && state.titleRuns.length > 0) {
        const lines = splitRunsIntoLines(state.titleRuns);
        const lineH = titleFontPx * 1.35;
        const isRtl = hasHebrewInRuns(state.titleRuns);
        let tx = canvas.width / 2, anchor = 'middle';
        if (state.titlePosition === 'top-left') { tx = pad.left; anchor = 'start'; }
        if (state.titlePosition === 'top-right') { tx = canvas.width - pad.right; anchor = 'end'; }
        svg += buildSvgRichText(state.titleRuns, tx, 22 + titleFontPx * 0.85, titleFontPx, state.titleFont, anchor, isRtl, lineH);
        let afterY = 22 + titleFontPx * 0.85 + lines.length * lineH;
        if (state.hasSubtitle && state.subtitleRuns && state.subtitleRuns.length > 0) {
            const subLineH = subtitleFontPx * 1.35;
            const isSubRtl = hasHebrewInRuns(state.subtitleRuns);
            svg += buildSvgRichText(state.subtitleRuns, tx, afterY + subtitleFontPx * 0.85, subtitleFontPx, state.subtitleFont || state.titleFont, anchor, isSubRtl, subLineH);
        }
    }

    const dashAttr = state.gridLineStyle === 'dashed' ? ' stroke-dasharray="6,4"' : '';
    const xSubStep = state.xStep / state.xSubDiv;
    const ySubStep = state.yStep / state.ySubDiv;
    const totalXSteps = Math.round((state.xMax - state.xMin) / xSubStep);
    const totalYSteps = Math.round((state.yMax - state.yMin) / ySubStep);
    const innerGridColor = state.innerGridColor || '#e5e5e0';

    if (state.showVerticalGrid !== false) {
        for (let i = 0; i <= totalXSteps; i++) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const isEdge = (i === 0 || Math.abs(xVal - state.xMax) < 0.001);
            if (isEdge && !showOuter) continue;
            const col = isEdge ? state.gridColor : (currentMode === 'advanced' ? innerGridColor : state.gridColor);
            const xPx = mapX(xVal, pad);
            svg += `<line x1="${xPx}" y1="${pad.top}" x2="${xPx}" y2="${pad.top + ph}" stroke="${col}" stroke-width="${gridW}"${dashAttr}/>\n`;
        }
    }
    if (state.showHorizontalGrid !== false) {
        for (let i = 0; i <= totalYSteps; i++) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const isEdge = (i === 0 || Math.abs(yVal - state.yMax) < 0.001);
            if (isEdge && !showOuter) continue;
            const col = isEdge ? state.gridColor : (currentMode === 'advanced' ? innerGridColor : state.gridColor);
            const yPx = mapY(yVal, pad);
            svg += `<line x1="${pad.left}" y1="${yPx}" x2="${pad.left + pw}" y2="${yPx}" stroke="${col}" stroke-width="${gridW}"${dashAttr}/>\n`;
        }
    }

    const bothGridsOn = state.showVerticalGrid && state.showHorizontalGrid;
    if (state.showPlotBorder !== false && !bothGridsOn) {
        svg += `<rect x="${pad.left}" y="${pad.top}" width="${pw}" height="${ph}" fill="none" stroke="${state.gridColor}" stroke-width="${gridW}"/>\n`;
    }

    if (showAxisLines) {
        const axCol = state.axisLineColor || '#000';
        const axW = parseFloat(state.axisLineWidth) || 1.5;
        svg += `<line x1="${pad.left}" y1="${pad.top + ph}" x2="${pad.left + pw}" y2="${pad.top + ph}" stroke="${axCol}" stroke-width="${axW}"/>\n`;
        svg += `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + ph}" stroke="${axCol}" stroke-width="${axW}"/>\n`;
    }

    if (state.showTicks) {
        for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
            const xVal = state.xMin + i * xSubStep;
            if (xVal > state.xMax + 0.001) break;
            const xPx = mapX(xVal, pad);
            svg += `<line x1="${xPx}" y1="${pad.top + ph - tLen}" x2="${xPx}" y2="${pad.top + ph + tLen}" stroke="${state.tickColor}" stroke-width="${gridW}"/>\n`;
        }
        for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
            const yVal = state.yMin + i * ySubStep;
            if (yVal > state.yMax + 0.001) break;
            const yPx = mapY(yVal, pad);
            svg += `<line x1="${pad.left - tLen}" y1="${yPx}" x2="${pad.left + tLen}" y2="${yPx}" stroke="${state.tickColor}" stroke-width="${gridW}"/>\n`;
        }
    }

    for (let i = 0; i <= totalXSteps; i += state.xSubDiv) {
        const xVal = state.xMin + i * xSubStep;
        if (xVal > state.xMax + 0.001) break;
        const xPx = mapX(xVal, pad);
        const label = xVal % 1 === 0 ? xVal.toFixed(0) : xVal.toFixed(1);
        svg += `<text x="${xPx}" y="${pad.top + ph + tLen + tickFontPx + 2}" font-family="${escXml(state.tickFont)}" font-size="${tickFontPx}" text-anchor="middle" fill="#000">${label}</text>\n`;
    }
    for (let i = 0; i <= totalYSteps; i += state.ySubDiv) {
        const yVal = state.yMin + i * ySubStep;
        if (yVal > state.yMax + 0.001) break;
        const yPx = mapY(yVal, pad);
        const label = yVal % 1 === 0 ? yVal.toFixed(0) : yVal.toFixed(1);
        svg += `<text x="${pad.left - tLen - 6}" y="${yPx + tickFontPx * 0.35}" font-family="${escXml(state.tickFont)}" font-size="${tickFontPx}" text-anchor="end" fill="#000">${label}</text>\n`;
    }

    if (state.xLabelRuns && state.xLabelRuns.length > 0) {
        const isRtl = hasHebrewInRuns(state.xLabelRuns);
        const lineH = axisFontPx * 1.35;
        const startY = pad.top + ph + tLen + tickFontPx + 14 + axisFontPx * 0.85;
        const cx = pad.left + pw / 2;
        svg += buildSvgRichText(state.xLabelRuns, cx, startY, axisFontPx, state.axisFont, 'middle', isRtl, lineH);
    }

    if (state.yLabelRuns && state.yLabelRuns.length > 0) {
        const isRtl = hasHebrewInRuns(state.yLabelRuns);
        const lineH = axisFontPx * 1.35;
        const xPos = 25;
        const cy = pad.top + ph / 2;
        const lines = splitRunsIntoLines(state.yLabelRuns);
        svg += `<g transform="translate(${xPos},${cy}) rotate(-90)">\n`;
        lines.forEach((line, li) => {
            const yOff = (li - (lines.length - 1) / 2) * lineH;
            let totalW = 0;
            line.forEach(run => {
                const weight = run.bold ? 'bold' : 'normal';
                const style = run.italic ? 'italic' : 'normal';
                ctx.font = `${style} ${weight} ${axisFontPx}px ${state.axisFont}`;
                totalW += ctx.measureText(run.text).width;
            });
            const startX = -totalW / 2;
            const orderedLine = isRtl ? [...line].reverse() : line;
            let cursor = startX;
            orderedLine.forEach(run => {
                const weight = run.bold ? 'bold' : 'normal';
                const style = run.italic ? 'italic' : 'normal';
                const decor = run.underline ? 'underline' : 'none';
                ctx.font = `${style} ${weight} ${axisFontPx}px ${state.axisFont}`;
                const w = ctx.measureText(run.text).width;
                const dirAttr = isRtl ? ' direction="rtl" unicode-bidi="bidi-override"' : '';
                svg += `  <text x="${cursor.toFixed(2)}" y="${yOff.toFixed(2)}" font-size="${axisFontPx}" font-family="${escXml(state.axisFont)}" font-weight="${weight}" font-style="${style}" text-decoration="${decor}" fill="${escXml(run.color || '#000')}" text-anchor="start" dominant-baseline="middle"${dirAttr}>${escXml(run.text)}</text>\n`;
                cursor += w;
            });
        });
        svg += `</g>\n`;
    }

    state.charts.forEach(chart => {
        if (chart.points.length === 0) return;
        sortChartPoints(chart);
        const tension = parseFloat(chart.lineTension) || 0;
        const pixelPts = chart.points.map(pt => ({ px: mapX(pt.x, pad), py: mapY(pt.y, pad) }));
        const lineColor = currentMode === 'advanced' ? chart.color : chart.lineColor;
        const pathD = buildSplinePathD(pixelPts, tension);
        svg += `<path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="${chart.lineWidth}" stroke-linejoin="round" stroke-linecap="round"/>\n`;

        const sz = parseFloat(chart.markerSize);
        chart.points.forEach((pt, idx) => {
            const px = mapX(pt.x, pad), py = mapY(pt.y, pad);
            let fill = lineColor;
            let outlineC = null, outlineW = 0;
            if (pt.marked) {
                const key = markKeyFor(chart, idx);
                const meta = chart.markedPointsMeta[key];
                if (meta) {
                    fill = meta.fillColor || chart.color;
                    outlineC = meta.outlineColor;
                    outlineW = meta.outlineWidth || 0;
                }
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

            if (pt.marked) {
                const key = markKeyFor(chart, idx);
                const meta = chart.markedPointsMeta[key];
                if (meta && meta.label) {
                    const off = sz + 8;
                    const fs = parseInt(state.markedFontSize) || 13;
                    const ff = state.markedFont || state.axisFont;
                    let lx = px, ly = py, ta = 'middle';
                    const pos = meta.labelPosition || 'above';
                    if (pos === 'above') { ly = py - off; }
                    else if (pos === 'below') { ly = py + off + fs; }
                    else if (pos === 'right') { lx = px + off; ta = 'start'; ly = py + 4; }
                    else if (pos === 'left') { lx = px - off; ta = 'end'; ly = py + 4; }
                    svg += `<text x="${lx}" y="${ly}" font-size="${fs}" font-family="${escXml(ff)}" font-weight="bold" text-anchor="${ta}" fill="#000">${escXml(meta.label)}</text>\n`;
                }
            }
        });

        if (currentMode === 'advanced' && chart.showChartLabel && chart.name && chart.points.length > 0) {
            const anchor = chart.chartLabelAnchor || 'last';
            let idx = anchorToPointIndex(chart, anchor);
            if (idx < 0) idx = chart.points.length - 1;
            const pt = chart.points[idx];
            const px = mapX(pt.x, pad), py = mapY(pt.y, pad);
            const off = sz + 10;
            const fs = chart.chartLabelFontSize || 14;
            const wt = chart.chartLabelBold ? 'bold' : 'normal';
            if (chart.chartLabelPosition === 'below') {
                svg += `<text x="${px}" y="${py + off + fs}" font-size="${fs}" font-family="${escXml(state.axisFont)}" font-weight="${wt}" text-anchor="middle" fill="#000">${escXml(chart.name)}</text>\n`;
            } else {
                svg += `<text x="${px}" y="${py - off}" font-size="${fs}" font-family="${escXml(state.axisFont)}" font-weight="${wt}" text-anchor="middle" fill="#000">${escXml(chart.name)}</text>\n`;
            }
        }
    });

    if (currentMode === 'advanced' && state.showLegend && state.charts.length > 0) {
        const fontSize = parseInt(state.legendFontSize) || 13;
        const legendFont = state.legendFont || state.axisFont;
        const padding = 10;
        const rowHeight = fontSize + 8;
        const swatchSize = fontSize;
        const gap = 8;
        ctx.font = `500 ${fontSize}px ${legendFont}`;
        let maxTextW = 0;
        state.charts.forEach(c => {
            const w = ctx.measureText(c.name).width;
            if (w > maxTextW) maxTextW = w;
        });
        const boxW = padding * 2 + swatchSize + gap + maxTextW;
        const boxH = padding * 2 + state.charts.length * rowHeight - (rowHeight - fontSize - 4);
        const margin = 12;
        let lx, ly;
        switch (state.legendPosition) {
            case 'top-right': lx = pad.left + pw - boxW - margin; ly = pad.top + margin; break;
            case 'bottom-right': lx = pad.left + pw - boxW - margin; ly = pad.top + ph - boxH - margin; break;
            case 'top-left': lx = pad.left + margin; ly = pad.top + margin; break;
            case 'bottom-left': lx = pad.left + margin; ly = pad.top + ph - boxH - margin; break;
            default: lx = pad.left + pw - boxW - margin; ly = pad.top + margin;
        }
        svg += `<rect x="${lx}" y="${ly}" width="${boxW}" height="${boxH}" rx="8" fill="${state.legendBg}" ${state.legendBorder ? 'stroke="rgba(0,0,0,0.12)" stroke-width="1"' : ''}/>\n`;
        state.charts.forEach((c, i) => {
            const rowY = ly + padding + rowHeight * i + rowHeight / 2 - 2;
            svg += `<circle cx="${lx + padding + swatchSize / 2}" cy="${rowY}" r="${swatchSize / 2}" fill="${c.color}"/>\n`;
            svg += `<text x="${lx + padding + swatchSize + gap}" y="${rowY + fontSize * 0.35}" font-size="${fontSize}" font-family="${escXml(legendFont)}" font-weight="500" fill="#333">${escXml(c.name)}</text>\n`;
        });
    }

    svg += `</svg>`;
    return svg;
}

function exportSVG() {
    closeQuickEdit(); hideTooltip();
    const svg = buildVectorSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = 'graph-studio-vector.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
}

window.addEventListener('resize', () => {
    if (activeQuickEditKey && quickEditClickPos) positionQuickEditAtCursor();
    if (activePortalMenu) closeAllDropdowns();
});

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
loadCustomFonts();
setupInputs();
render();