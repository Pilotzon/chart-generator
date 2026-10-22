export const formatDec = v => Math.round(parseFloat(v) * 10) / 10;

export const markKeyForPoint = pt => `${pt.x}_${pt.y}`;
export const markKeyFor = (chart, i) => markKeyForPoint(chart.points[i]);

export function defaultMarkMeta(chart) {
    return {
        label: '',
        fillColor: chart.color,
        outlineColor: '#ffffff',
        outlineWidth: 2,
        labelPosition: 'above'
    };
}

export function anchorToPointIndex(chart, anchor) {
    if (!chart || chart.points.length === 0) return -1;
    if (anchor === 'last') return chart.points.length - 1;
    if (anchor === 'first') return 0;
    if (typeof anchor === 'string' && anchor.startsWith('idx:')) {
        const i = parseInt(anchor.slice(4));
        return (i >= 0 && i < chart.points.length) ? i : -1;
    }
    return -1;
}

/** True when a marked point's label collides with the chart-name label anchored at the same point. */
export function detectLabelOverlap(chart, pointIndex) {
    if (!chart.showChartLabel) return false;
    const pt = chart.points[pointIndex];
    if (!pt || !pt.marked) return false;
    if (anchorToPointIndex(chart, chart.chartLabelAnchor) !== pointIndex) return false;
    const meta = chart.markedPointsMeta[markKeyFor(chart, pointIndex)];
    if (!meta) return false;
    return (chart.chartLabelPosition || 'above') === (meta.labelPosition || 'above');
}

export const sortedPoints = chart => [...chart.points].sort((a, b) => a.x - b.x);

export const getLegendCharts = state => state.charts.filter(c => c.name && c.name.trim());
