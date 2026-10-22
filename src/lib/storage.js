import {
    STORAGE_KEY_CLASSIC, STORAGE_KEY_ADVANCED, STORAGE_KEY_MODE, STORAGE_KEY_PANEL,
    STORAGE_KEY_EXPORT, CUSTOM_FONTS_KEY, CHART_SCOPED_KEYS
} from './constants.js';
import { defaultChart, makeDefaultState, defaultExportSettings } from './defaults.js';
import { textToRuns } from './richText.js';

const TEXT_KEYS = ['titleText', 'subtitleText', 'xLabel', 'yLabel'];

const keyForMode = mode => (mode === 'advanced' ? STORAGE_KEY_ADVANCED : STORAGE_KEY_CLASSIC);

export function sortChartPoints(chart) {
    return { ...chart, points: [...chart.points].sort((a, b) => a.x - b.x) };
}

export function loadMode() {
    return localStorage.getItem(STORAGE_KEY_MODE) === 'advanced' ? 'advanced' : 'classic';
}

export function loadPanel() {
    const p = localStorage.getItem(STORAGE_KEY_PANEL);
    return p || 'chart';
}

export function savePanel(panel) {
    localStorage.setItem(STORAGE_KEY_PANEL, panel);
}

export function hasSavedState(mode) {
    return !!localStorage.getItem(keyForMode(mode));
}

export function loadModeState(mode) {
    const saved = localStorage.getItem(keyForMode(mode));
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            TEXT_KEYS.forEach(k => {
                const runsKey = k + 'Runs';
                if (!parsed[runsKey]) parsed[runsKey] = textToRuns(parsed[k] || '');
            });
            // Defaults first, so newly introduced settings get sane values for old saves
            const merged = { ...makeDefaultState(), ...parsed };
            if (!merged.charts || merged.charts.length === 0) {
                const c = defaultChart();
                merged.charts = [c];
                merged.activeChartId = c.id;
            }
            if (!merged.activeChartId || !merged.charts.find(c => c.id === merged.activeChartId)) {
                merged.activeChartId = merged.charts[0].id;
            }
            const chartDefaults = defaultChart();
            merged.charts = merged.charts.map(ch => {
                const next = { ...ch };
                CHART_SCOPED_KEYS.forEach(k => { if (next[k] === undefined) next[k] = chartDefaults[k]; });
                if (!next.markedPointsMeta) next.markedPointsMeta = {};
                return sortChartPoints(next);
            });
            if (!merged.columns || typeof merged.columns !== 'object') merged.columns = {};
            delete merged.bgColor; // background is always transparent now
            return merged;
        } catch (e) { /* fall through to defaults */ }
    }
    return makeDefaultState();
}

export function saveModeState(mode, state) {
    try {
        localStorage.setItem(keyForMode(mode), JSON.stringify(state));
        localStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch (e) { /* storage full / unavailable */ }
}

export function clearModeState(mode) {
    localStorage.removeItem(keyForMode(mode));
}

export function copyStateToMode(mode, state) {
    localStorage.setItem(keyForMode(mode), JSON.stringify(state));
}

export function loadExportSettings() {
    const d = defaultExportSettings();
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_EXPORT) || 'null');
        if (raw) return { ...d, ...raw, svg: { ...d.svg, ...raw.svg }, png: { ...d.png, ...raw.png } };
    } catch (e) { /* ignore */ }
    return d;
}

export function saveExportSettings(s) {
    try { localStorage.setItem(STORAGE_KEY_EXPORT, JSON.stringify(s)); } catch (e) { /* ignore */ }
}

export function loadCustomFonts() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_FONTS_KEY) || '[]') || []; } catch (e) { return []; }
}

export function saveCustomFonts(list) {
    try { localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}
