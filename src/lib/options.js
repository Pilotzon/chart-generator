// Option lists shared by the sidebar dropdowns
export const ARROW_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: 'Arrow' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'stealth', label: 'Stealth' },
    { value: 'circle', label: 'Circle' }
];

export const AXIS_ARROW_OPTIONS = ARROW_OPTIONS.filter(o => o.value !== 'none' && o.value !== 'circle');

export const MARKER_OPTIONS = [
    { value: 'diamond', label: 'Diamond' },
    { value: 'circle', label: 'Circle' },
    { value: 'square', label: 'Square' },
    { value: 'cross', label: 'Cross' },
    { value: 'none', label: 'None' }
];

export const TITLE_POSITION_OPTIONS = [
    { value: 'top-center', label: 'Center' },
    { value: 'top-left', label: 'Left' },
    { value: 'top-right', label: 'Right' }
];

export const GRID_STYLE_OPTIONS = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' }
];

export const LEGEND_POSITION_OPTIONS = [
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'top-left', label: 'Top Left' },
    { value: 'bottom-left', label: 'Bottom Left' }
];

export const LABEL_POSITION_OPTIONS = [
    { value: 'above', label: 'Above' },
    { value: 'below', label: 'Below' },
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' }
];

export const CHART_LABEL_POSITION_OPTIONS = LABEL_POSITION_OPTIONS.slice(0, 2);

// Column titles: horizontal alignment inside the column (icons reuse the text-align glyphs)
export const COLUMN_ALIGN_OPTIONS = [
    { value: 'left', label: 'Left', icon: 'top-left' },
    { value: 'center', label: 'Center', icon: 'top-center' },
    { value: 'right', label: 'Right', icon: 'top-right' }
];

export const COLUMN_PLACEMENT_OPTIONS = [
    { value: 'above', label: 'Above grid', icon: 'above' },
    { value: 'below', label: 'Below grid', icon: 'below' }
];

export const PNG_SCALE_OPTIONS = [
    { value: 1, label: '1× (original)' },
    { value: 2, label: '2× (high)' },
    { value: 3, label: '3× (very high)' },
    { value: 4, label: '4× (print)' }
];
