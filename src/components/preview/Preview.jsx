import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useEffectiveExport } from '../../hooks/useExportSettings.js';
import { getCanvasSize } from '../../lib/layout.js';
import { formatDec } from '../../lib/points.js';
import { drawScene } from '../../lib/scene.js';
import { ExportBar } from '../export/ExportBar.jsx';
import { QuickEdit } from './QuickEdit.jsx';

const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

export function Preview() {
    const { state, mode, interaction, setInteraction, setPanel, actions, fontTick, resetCount } = useApp();
    const { invertText } = useEffectiveExport();
    const canvasRef = useRef(null);
    const cardRef = useRef(null);
    const sceneRef = useRef({ clickTargets: [], layout: null });
    const [tooltip, setTooltip] = useState(null);
    const [quick, setQuick] = useState(null);

    const { width, height } = getCanvasSize(state);

    // Latest values for the window-level handlers
    const live = useRef({});
    live.current = { state, interaction, quick };

    // ───── draw ─────
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        sceneRef.current = drawScene(ctx, state, {
            mode, width, height, invertText,
            view: interaction
        });
    }, [state, mode, width, height, invertText, interaction, fontTick]);

    // Close the quick editor when the workspace is replaced
    useEffect(() => { setQuick(null); setTooltip(null); }, [mode, resetCount]);

    const toCanvas = useCallback((e) => {
        const r = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (canvasRef.current.width / r.width),
            y: (e.clientY - r.top) * (canvasRef.current.height / r.height),
            cx: e.clientX, cy: e.clientY
        };
    }, []);

    const findHitPoint = useCallback((x, y) => {
        const { layout } = sceneRef.current;
        if (!layout) return null;
        let best = null, bestDist = Infinity;
        live.current.state.charts.forEach(chart => {
            const threshold = Math.max((parseFloat(chart.markerSize) || 8) * 1.8, 14);
            chart.points.forEach((pt, idx) => {
                const d = dist(layout.mapX(pt.x), layout.mapY(pt.y), x, y);
                if (d <= threshold && d < bestDist) { best = { chart, idx }; bestDist = d; }
            });
        });
        return best;
    }, []);

    // ───── dragging (window-level so the drag survives leaving the canvas) ─────
    useEffect(() => {
        const onMove = (e) => {
            const { interaction: it, state: st } = live.current;
            if (it.dragIdx === null || !it.dragChartId) return;
            const chart = st.charts.find(c => c.id === it.dragChartId);
            const { layout } = sceneRef.current;
            if (!chart || !layout) return;
            const c = toCanvas(e);
            const x = formatDec(Math.max(st.xMin, Math.min(st.xMax, layout.unmapX(c.x))));
            const y = formatDec(Math.max(st.yMin, Math.min(st.yMax, layout.unmapY(c.y))));
            actions.setPointCoords(chart.id, it.dragIdx, x, y);
            setTooltip({ text: `${x.toFixed(1)}, ${y.toFixed(1)}`, cx: c.cx, cy: c.cy });
        };
        const onUp = () => {
            const { interaction: it, state: st } = live.current;
            if (it.dragIdx === null) return;
            const chart = st.charts.find(c => c.id === it.dragChartId);
            let selectedIdx = it.dragIdx;
            if (chart) {
                // the order is restored only now, so indices stayed stable during the drag
                const order = chart.points.map((_, i) => i).sort((a, b) => chart.points[a].x - chart.points[b].x);
                selectedIdx = order.indexOf(it.dragIdx);
                actions.sortPoints(chart.id);
            }
            setInteraction({ dragIdx: null, dragChartId: null, selectedIdx });
            setTooltip(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [actions, setInteraction, toCanvas]);

    // ───── keyboard: delete selected point, Esc closes the quick editor ─────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { setQuick(null); return; }
            const t = e.target;
            if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
            const { interaction: it } = live.current;
            if ((e.key === 'Delete' || e.key === 'Backspace') && it.selectedIdx !== null && it.selectedChartId) {
                actions.removePoint(it.selectedChartId, it.selectedIdx);
                setInteraction({ selectedIdx: null, selectedChartId: null, hoverIdx: null, hoverChartId: null });
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [actions, setInteraction]);

    // ───── canvas handlers ─────
    const onMouseDown = (e) => {
        const c = toCanvas(e);
        const hit = findHitPoint(c.x, c.y);
        if (hit) {
            setInteraction({
                dragIdx: hit.idx, dragChartId: hit.chart.id,
                selectedIdx: hit.idx, selectedChartId: hit.chart.id
            });
            if (hit.chart.id !== state.activeChartId) actions.setActiveChart(hit.chart.id);
            if (mode === 'advanced') setPanel('chart'); // the points editor lives in the Chart tab
            setQuick(null);
            return;
        }
        setInteraction({ selectedIdx: null, selectedChartId: null });
        const label = sceneRef.current.clickTargets.find(t =>
            c.x >= t.x && c.x <= t.x + t.w && c.y >= t.y && c.y <= t.y + t.h);
        setQuick(label ? { key: label.key, cx: e.clientX, cy: e.clientY } : null);
    };

    const onMouseMove = (e) => {
        if (interaction.dragIdx !== null) return;
        const c = toCanvas(e);
        const hit = findHitPoint(c.x, c.y);
        const hoverIdx = hit ? hit.idx : null;
        const hoverChartId = hit ? hit.chart.id : null;
        canvasRef.current.style.cursor = hit ? 'grab' : 'default';
        setInteraction({ hoverIdx, hoverChartId });
        setTooltip(hit
            ? { text: `${hit.chart.points[hit.idx].x.toFixed(1)}, ${hit.chart.points[hit.idx].y.toFixed(1)}`, cx: c.cx, cy: c.cy }
            : null);
    };

    const onMouseLeave = () => {
        if (interaction.dragIdx !== null) return;
        setInteraction({ hoverIdx: null, hoverChartId: null });
        setTooltip(null);
    };

    const cardRect = cardRef.current?.getBoundingClientRect();

    return (
        <div id="viewport">
            <div className="viewport-header"><h2>Preview</h2></div>
            <div className="viewport-scroll">
                <div className="canvas-card" id="canvasCard" ref={cardRef}>
                    <canvas
                        id="graphCanvas"
                        ref={canvasRef}
                        width={width}
                        height={height}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseLeave={onMouseLeave}
                    />
                    <div
                        id="floatingTooltip"
                        style={tooltip && cardRect ? {
                            display: 'block',
                            left: tooltip.cx - cardRect.left + 14,
                            top: tooltip.cy - cardRect.top - 32
                        } : undefined}
                    >{tooltip?.text}</div>
                    {quick && (
                        <QuickEdit
                            key={`${quick.key}:${quick.cx}:${quick.cy}`}
                            target={quick}
                            cardRef={cardRef}
                            onClose={() => setQuick(null)}
                        />
                    )}
                </div>
            </div>
            <ExportBar />
        </div>
    );
}
