import {
    createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { CHART_PALETTE, FONT_OPTIONS } from '../lib/constants.js';
import {
    defaultChart, defaultColumn, makeDefaultState, newChartId
} from '../lib/defaults.js';
import {
    clearModeState, copyStateToMode, hasSavedState, loadCustomFonts, loadExportSettings,
    loadMode, loadModeState, loadPanel, saveCustomFonts, saveExportSettings, saveModeState,
    savePanel, sortChartPoints
} from '../lib/storage.js';
import { defaultMarkMeta, formatDec, markKeyForPoint } from '../lib/points.js';
import { TEXT_RUNS_KEYS } from '../lib/constants.js';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

const NO_INTERACTION = {
    hoverIdx: null, hoverChartId: null,
    dragIdx: null, dragChartId: null,
    selectedIdx: null, selectedChartId: null,
    highlightIdx: null, highlightChartId: null
};

const normalizePanel = (p) => (['chart', 'text', 'axes', 'columns'].includes(p) ? p : 'chart');

function registerFontFace(name, dataUrl, onLoaded) {
    try {
        const ff = new FontFace(name, `url(${dataUrl})`);
        ff.load().then(loaded => {
            document.fonts.add(loaded);
            onLoaded();
        }).catch(err => console.warn('Failed to load font:', name, err));
    } catch (e) { console.warn('FontFace API error:', e); }
}

/** Replace one chart in the list, applying `fn` to it. */
const mapChart = (state, id, fn) => ({
    ...state,
    charts: state.charts.map(c => (c.id === id ? fn(c) : c))
});

/**
 * Replace point `idx` of a chart, migrating the marked-point metadata
 * (keyed by coordinates) so that labels follow the point they belong to.
 */
function replacePoint(chart, idx, nextPoint) {
    const old = chart.points[idx];
    if (!old) return chart;
    const points = chart.points.map((p, i) => (i === idx ? nextPoint : p));
    let meta = chart.markedPointsMeta || {};
    const oldKey = markKeyForPoint(old);
    const newKey = markKeyForPoint(nextPoint);
    if (oldKey !== newKey && meta[oldKey]) {
        meta = { ...meta };
        meta[newKey] = meta[oldKey];
        delete meta[oldKey];
    }
    return { ...chart, points, markedPointsMeta: meta };
}

export function AppProvider({ children }) {
    const [mode, setModeState] = useState(loadMode);
    const [state, setState] = useState(() => loadModeState(loadMode()));
    const [panel, setPanelState] = useState(() => normalizePanel(loadPanel()));
    const [exportSettings, setExportSettingsState] = useState(loadExportSettings);
    const [interaction, setInteractionState] = useState(NO_INTERACTION);
    const [pendingMode, setPendingMode] = useState(null);
    const [pendingDeleteChartId, setPendingDeleteChartId] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [resetCount, setResetCount] = useState(0);
    const [customFonts, setCustomFonts] = useState(loadCustomFonts);
    const [fontTick, setFontTick] = useState(0);

    // ───── persistence ─────
    useEffect(() => { saveModeState(mode, state); }, [mode, state]);
    useEffect(() => { savePanel(panel); }, [panel]);
    useEffect(() => { saveExportSettings(exportSettings); }, [exportSettings]);

    // ───── body classes (CSS keys off them) ─────
    useEffect(() => {
        document.body.classList.toggle('mode-advanced', mode === 'advanced');
        document.body.classList.toggle('mode-classic', mode === 'classic');
    }, [mode]);

    // ───── fonts ─────
    const customFontsRef = useRef(customFonts);
    customFontsRef.current = customFonts;
    useEffect(() => {
        customFontsRef.current.forEach(cf => registerFontFace(cf.name, cf.dataUrl, () => setFontTick(t => t + 1)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const allFonts = useMemo(() => [
        ...FONT_OPTIONS,
        ...customFonts.map(cf => ({ name: cf.name, value: `'${cf.name}', sans-serif`, custom: true }))
    ], [customFonts]);

    /** Reads font files; resolves with the CSS font-family value of the first uploaded font. */
    const uploadFonts = useCallback((files) => {
        const list = Array.from(files || []);
        if (list.length === 0) return Promise.resolve(null);
        return Promise.all(list.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let name = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
                if (customFontsRef.current.some(cf => cf.name === name)) {
                    name = name + ' (' + Date.now().toString(36).slice(-3) + ')';
                }
                const entry = { name, dataUrl: e.target.result };
                const next = [...customFontsRef.current, entry];
                customFontsRef.current = next;
                saveCustomFonts(next);
                setCustomFonts(next);
                registerFontFace(name, entry.dataUrl, () => setFontTick(t => t + 1));
                resolve(`'${name}', sans-serif`);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        }))).then(values => values.find(Boolean) || null);
    }, []);

    // ───── toasts ─────
    const toast = useCallback((message) => {
        const id = Date.now() + Math.random();
        setToasts(t => [...t, { id, message }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
    }, []);

    // ───── derived ─────
    const activeChart = useMemo(
        () => state.charts.find(c => c.id === state.activeChartId) || state.charts[0],
        [state.charts, state.activeChartId]
    );

    // ───── actions ─────
    const actions = useMemo(() => {
        const patch = (partial) => setState(s => ({ ...s, ...partial }));
        const patchChart = (id, partial) => setState(s => mapChart(s, id, c => ({ ...c, ...partial })));
        const patchActiveChart = (partial) => setState(s => mapChart(s, s.activeChartId, c => ({ ...c, ...partial })));

        return {
            patch,
            patchChart,
            patchActiveChart,

            setRuns(editorKey, runs) {
                if (editorKey.startsWith('col:')) {
                    const index = editorKey.slice(4);
                    setState(s => ({
                        ...s,
                        columns: { ...s.columns, [index]: { ...defaultColumn(), ...s.columns[index], runs } }
                    }));
                } else if (TEXT_RUNS_KEYS[editorKey]) {
                    setState(s => ({ ...s, [TEXT_RUNS_KEYS[editorKey]]: runs }));
                }
            },

            patchColumn(index, partial) {
                setState(s => ({
                    ...s,
                    columns: { ...s.columns, [index]: { ...defaultColumn(), ...s.columns[index], ...partial } }
                }));
            },

            // ── charts ──
            setActiveChart: (id) => setState(s => ({ ...s, activeChartId: id })),
            setChartColor: (id, color) => patchChart(id, { color, lineColor: color }),
            addChart() {
                setState(s => {
                    const n = s.charts.length;
                    const c = defaultChart('Chart ' + (n + 1), n);
                    return { ...s, charts: [...s.charts, c], activeChartId: c.id };
                });
            },
            duplicateChart(id) {
                setState(s => {
                    const src = s.charts.find(c => c.id === id);
                    if (!src) return s;
                    const copy = JSON.parse(JSON.stringify(src));
                    copy.id = newChartId();
                    copy.name = src.name + ' copy';
                    copy.color = CHART_PALETTE[s.charts.length % CHART_PALETTE.length];
                    return { ...s, charts: [...s.charts, copy], activeChartId: copy.id };
                });
            },
            deleteChart(id) {
                setState(s => {
                    if (s.charts.length <= 1) return s;
                    const idx = s.charts.findIndex(c => c.id === id);
                    if (idx === -1) return s;
                    const charts = s.charts.filter(c => c.id !== id);
                    const activeChartId = s.activeChartId === id
                        ? charts[Math.max(0, idx - 1)].id
                        : s.activeChartId;
                    return { ...s, charts, activeChartId };
                });
            },

            // ── points ──
            addPoint(chartId) {
                setState(s => mapChart(s, chartId, c => {
                    const last = c.points[c.points.length - 1];
                    const x = last ? formatDec(last.x + 10) : 0;
                    const y = last ? formatDec(Math.max(0, last.y - 10)) : 0;
                    return sortChartPoints({ ...c, points: [...c.points, { x, y, marked: false }] });
                }));
            },
            removePoint(chartId, idx) {
                setState(s => mapChart(s, chartId, c => {
                    const pt = c.points[idx];
                    if (!pt) return c;
                    const meta = { ...(c.markedPointsMeta || {}) };
                    delete meta[markKeyForPoint(pt)];
                    return { ...c, points: c.points.filter((_, i) => i !== idx), markedPointsMeta: meta };
                }));
            },
            /** Live edit while typing/dragging: the order is kept so indices stay stable. */
            setPointCoords(chartId, idx, x, y) {
                setState(s => mapChart(s, chartId, c => {
                    const old = c.points[idx];
                    if (!old) return c;
                    return replacePoint(c, idx, { ...old, x, y });
                }));
            },
            /** Re-sort the points of a chart (after a drag ended or a table edit was committed). */
            sortPoints(chartId) {
                setState(s => mapChart(s, chartId, sortChartPoints));
            },
            toggleMark(chartId, idx, marked) {
                setState(s => mapChart(s, chartId, c => {
                    const pt = c.points[idx];
                    if (!pt) return c;
                    const points = c.points.map((p, i) => (i === idx ? { ...p, marked } : p));
                    const meta = { ...(c.markedPointsMeta || {}) };
                    const key = markKeyForPoint(pt);
                    if (marked && !meta[key]) meta[key] = defaultMarkMeta(c);
                    return { ...c, points, markedPointsMeta: meta };
                }));
            },
            patchMarkMeta(chartId, key, partial) {
                setState(s => mapChart(s, chartId, c => ({
                    ...c,
                    markedPointsMeta: {
                        ...(c.markedPointsMeta || {}),
                        [key]: { ...((c.markedPointsMeta || {})[key] || defaultMarkMeta(c)), ...partial }
                    }
                })));
            }
        };
    }, []);

    const setPanel = useCallback((p) => setPanelState(normalizePanel(p)), []);

    const setInteraction = useCallback((partial) => {
        setInteractionState(prev => {
            for (const k of Object.keys(partial)) if (prev[k] !== partial[k]) return { ...prev, ...partial };
            return prev;
        });
    }, []);

    const setExportSettings = useCallback((updater) => {
        setExportSettingsState(prev => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
    }, []);

    // ───── mode switching ─────
    const requestModeChange = useCallback((next) => { if (next !== mode) setPendingMode(next); }, [mode]);
    const cancelModeChange = useCallback(() => setPendingMode(null), []);
    const confirmModeChange = useCallback(() => {
        const next = pendingMode;
        setPendingMode(null);
        if (!next) return;
        saveModeState(mode, state);
        if (mode === 'classic' && next === 'advanced' && !hasSavedState('advanced')) {
            copyStateToMode('advanced', state);
        }
        setInteractionState(NO_INTERACTION);
        setModeState(next);
        setState(loadModeState(next));
        setResetCount(n => n + 1);
    }, [pendingMode, mode, state]);

    const resetToDefault = useCallback(() => {
        if (!window.confirm('Reset ' + mode + ' mode to default? Your other mode remains untouched.')) return;
        clearModeState(mode);
        setInteractionState(NO_INTERACTION);
        setState(makeDefaultState());
        setResetCount(n => n + 1);
    }, [mode]);

    const value = useMemo(() => ({
        mode, state, activeChart, actions,
        panel, setPanel,
        interaction, setInteraction,
        exportSettings, setExportSettings,
        allFonts, uploadFonts, fontTick,
        pendingMode, requestModeChange, cancelModeChange, confirmModeChange,
        pendingDeleteChartId, setPendingDeleteChartId,
        resetToDefault, resetCount,
        toasts, toast
    }), [
        mode, state, activeChart, actions, panel, setPanel, interaction, setInteraction,
        exportSettings, setExportSettings, allFonts, uploadFonts, fontTick,
        pendingMode, requestModeChange, cancelModeChange, confirmModeChange,
        pendingDeleteChartId, resetToDefault, resetCount, toasts, toast
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
