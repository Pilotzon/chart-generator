export const STORAGE_KEY_CLASSIC = 'GRAPH_STUDIO_PRO_V13_CLASSIC';
export const STORAGE_KEY_ADVANCED = 'GRAPH_STUDIO_PRO_V13_ADVANCED';
export const STORAGE_KEY_MODE = 'GRAPH_STUDIO_PRO_V13_MODE';
export const STORAGE_KEY_PANEL = 'GRAPH_STUDIO_PRO_V13_PANEL';
export const STORAGE_KEY_EXPORT = 'GRAPH_STUDIO_PRO_V13_EXPORT';
export const CUSTOM_FONTS_KEY = 'GRAPH_STUDIO_CUSTOM_FONTS_META';

export const FONT_OPTIONS = [
    { name: 'Times New Roman', value: "'Times New Roman', Times, serif", custom: false },
    { name: 'David', value: "'David', 'Times New Roman', serif", custom: false },
    { name: 'Frank Ruhl Libre', value: "'Frank Ruhl Libre', serif", custom: false },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif', custom: false },
    { name: 'Anthropic Sans', value: "'Anthropic Sans', sans-serif", custom: false },
    { name: 'Anthropic Serif', value: "'Anthropic Serif Display', serif", custom: false },
    { name: 'System (SF Pro)', value: '-apple-system, BlinkMacSystemFont, sans-serif', custom: false }
];

export const CHART_PALETTE = [
    '#3d87da', '#C96442', '#E5A93D', '#7BAA57', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

// Keys that live on a single chart (the rest live on the global state)
export const CHART_SCOPED_KEYS = [
    'lineColor', 'lineWidth', 'lineTension', 'markerShape', 'markerSize',
    'showLine',
    'shadowEnabled', 'shadowColor1', 'shadowOpacity1', 'shadowColor2',
    'shadowOpacity2', 'shadowOffset', 'shadowIntensity',
    'arrowStart', 'arrowEnd', 'arrowSize'
];

// Rich-text boxes: editor key -> state key
export const TEXT_RUNS_KEYS = {
    titleText: 'titleRuns',
    subtitleText: 'subtitleRuns',
    xLabel: 'xLabelRuns',
    yLabel: 'yLabelRuns'
};

export const MAX_COLUMNS = 60;
