import { describe, expect, it } from 'vitest';
import { defaultColumn, makeDefaultState } from '../src/lib/defaults.js';
import { getColumns, getColumnConfig, computeLayout } from '../src/lib/layout.js';
import { flipRunsForWord, textToRuns } from '../src/lib/richText.js';
import { buildVectorSVG } from '../src/lib/svg.js';

const withColumns = (extra = {}) => {
    const s = makeDefaultState();
    s.columns = {
        0: { ...defaultColumn(), runs: textToRuns('Alpha'), align: 'left' },
        1: { ...defaultColumn(), runs: textToRuns('Beta'), placement: 'below', bgEnabled: true, bgColor: '#ff0000', bgOpacity: 0.3 },
        2: { ...defaultColumn(), runs: textToRuns('אבג') }
    };
    return Object.assign(s, extra);
};

describe('columns', () => {
    it('creates one column per major X step', () => {
        const s = makeDefaultState();
        expect(getColumns(s)).toHaveLength(7);
        s.xStep = 0;
        expect(getColumns(s)).toEqual([]);
    });

    it('merges per-column overrides with the defaults', () => {
        const s = withColumns({ columnDefaultAlign: 'right' });
        expect(getColumnConfig(s, 0).align).toBe('left');
        expect(getColumnConfig(s, 2).align).toBe('right');
        expect(getColumnConfig(s, 5).placement).toBe('above');
        expect(getColumnConfig(s, 1).placement).toBe('below');
    });

    it('reserves space above and below the grid for titles', () => {
        const plain = computeLayout(makeDefaultState(), 850, 680);
        const l = computeLayout(withColumns(), 850, 680);
        expect(l.columnTitles.map(t => t.placement)).toEqual(['above', 'below', 'above']);
        expect(l.pad.top).toBeGreaterThan(plain.pad.top);
        expect(l.pad.bottom).toBeGreaterThan(plain.pad.bottom);
    });
});

describe('svg export', () => {
    it('contains column titles and tinted column backgrounds', () => {
        const svg = buildVectorSVG(withColumns(), { mode: 'classic' });
        expect(svg).toContain('Alpha');
        expect(svg).toContain('Beta');
        expect(svg).toMatch(/fill="#ff0000"[^>]*opacity="0\.3"|opacity="0\.3"[^>]*fill="#ff0000"/);
    });

    it('invert reverses text boxes (including column titles) and does not touch tick numbers', () => {
        const normal = buildVectorSVG(withColumns(), { mode: 'classic', invertText: false });
        const inverted = buildVectorSVG(withColumns(), { mode: 'classic', invertText: true });
        expect(normal).toContain('אבג');
        expect(inverted).not.toContain('אבג');
        expect(inverted).toContain('גבא');
    });

    it('paints a background when requested', () => {
        const svg = buildVectorSVG(makeDefaultState(), { mode: 'classic', background: '#123456' });
        expect(svg).toContain('#123456');
    });
});

describe('flip text for MS Word (macOS)', () => {
    const flip = (str) => flipRunsForWord(textToRuns(str)).map(r => r.text).join('');

    it('leaves lines without Hebrew / Arabic untouched', () => {
        expect(flip('big light')).toBe('big light');
        expect(flip('(abc) 12.5%')).toBe('(abc) 12.5%');
    });

    it('reverses Hebrew / Arabic letters', () => {
        expect(flip('שלום')).toBe('םולש');
        expect(flip('שלום עולם')).toBe('םלוע םולש');
        expect(flip('مرحبا')).toBe('ابحرم');
    });

    it('keeps Latin words and numbers readable inside a Hebrew line', () => {
        expect(flip('שלום big light')).toBe('big light םולש');
        expect(flip('אחוז 50%')).toBe('50% זוחא');
        expect(flip('גרף 1,000 נקודות')).toBe('תודוקנ 1,000 ףרג');
    });

    it('mirrors brackets that sit in the Hebrew stretch', () => {
        expect(flip('(שלום)')).toBe('(םולש)');
        expect(flip('שלום (big) עולם')).toBe('םלוע (big) םולש');
    });

    it('flips each line separately and keeps combining marks on their letter', () => {
        expect(flip('שלום\nbig')).toBe('םולש\nbig');
        expect(flip('שָלום')).toBe('םולשָ');
    });

    it('is its own inverse', () => {
        ['שלום big light', 'שלום (big) עולם', 'אחוז 50% מ-100', 'مرحبا world 123', 'a ב c ד e', 'שלום\nעולם big'].forEach(t => {
            expect(flip(flip(t))).toBe(t);
        });
    });

    it('keeps per-character formatting with its character', () => {
        const runs = [
            { text: 'אב', bold: true, italic: false, underline: false, color: '#ff0000' },
            { text: 'ג', bold: false, italic: false, underline: false, color: '#000000' }
        ];
        const out = flipRunsForWord(runs);
        expect(out.map(r => [r.text, r.bold])).toEqual([['ג', false], ['בא', true]]);
    });
});

describe('Y axis title placement', () => {
    it('sits right next to the tick numbers instead of far away at the canvas edge', () => {
        const s = makeDefaultState();
        s.yLabelRuns = textToRuns('Temperature');
        const l = computeLayout(s, 850, 680);
        const blockW = 1 * (parseInt(s.axisFontSize) || 18) * 1.35;
        expect(l.pad.left).toBeLessThan(90);                      // used to be ≥ 90
        expect(l.yLabelX - blockW / 2).toBeCloseTo(6, 5);          // small margin at the canvas edge
        // tick numbers start at pad.left - tLen - 6 - width; the title block ends 6px before them
        expect(l.yLabelX + blockW / 2).toBeLessThan(l.pad.left - l.tLen - 6 - 6);
    });

    it('shrinks further when the tick numbers are hidden', () => {
        const s = makeDefaultState();
        s.yLabelRuns = textToRuns('Temperature');
        const withTicks = computeLayout(s, 850, 680).pad.left;
        s.showTickLabels = false;
        expect(computeLayout(s, 850, 680).pad.left).toBeLessThan(withTicks);
    });
});

describe('line margins', () => {
    it('keeps the axis values inside a margin without touching the scale', () => {
        const s = makeDefaultState();
        const plain = computeLayout(s, 850, 680);
        s.plotMarginX = 20; s.plotMarginY = 10;
        const l = computeLayout(s, 850, 680);
        expect(l.mapX(s.xMin)).toBeCloseTo(l.pad.left + 20, 5);
        expect(l.mapX(s.xMax)).toBeCloseTo(l.pad.left + l.pw - 20, 5);
        expect(l.mapY(s.yMin)).toBeCloseTo(l.pad.top + l.ph - 10, 5);
        expect(l.mapY(s.yMax)).toBeCloseTo(l.pad.top + 10, 5);
        expect(l.pw).toBeCloseTo(plain.pw, 5);                       // the frame itself does not move
        expect(l.unmapX(l.mapX(33))).toBeCloseTo(33, 5);
        expect(l.unmapY(l.mapY(41))).toBeCloseTo(41, 5);
        // first / last column backgrounds still reach the frame
        expect(l.mapEdgeX(s.xMin)).toBe(l.pad.left);
        expect(l.mapEdgeX(s.xMax)).toBe(l.pad.left + l.pw);
    });

    it('has no margin by default', () => {
        const s = makeDefaultState();
        const l = computeLayout(s, 850, 680);
        expect(l.mapX(s.xMin)).toBeCloseTo(l.pad.left, 6);
        expect(l.mapY(s.yMax)).toBeCloseTo(l.pad.top, 6);
    });
});

describe('axis title placement', () => {
    const base = () => {
        const s = makeDefaultState();
        s.xLabelRuns = textToRuns('Time');
        s.yLabelRuns = textToRuns('Temperature');
        return s;
    };

    it('X title at the axis end frees the space below the axis and sits inside, right-aligned', () => {
        const s = base();
        const below = computeLayout(s, 850, 680);
        s.xLabelPlacement = 'end';
        const end = computeLayout(s, 850, 680);
        expect(end.pad.bottom).toBeLessThan(below.pad.bottom);
        expect(end.ph).toBeGreaterThan(below.ph);
        expect(end.xLabel.anchor).toBe('right');
        expect(end.xLabel.x).toBeCloseTo(end.pad.left + end.pw, 5);
        expect(end.xLabel.y).toBeLessThan(end.pad.top + end.ph);          // above the axis line
    });

    it('Y title above the axis frees the left side, is centred over the axis and fits the canvas', () => {
        const s = base();
        const side = computeLayout(s, 850, 680);
        s.yLabelPlacement = 'above';
        const above = computeLayout(s, 850, 680);
        expect(above.pad.left).toBeLessThan(side.pad.left);
        expect(above.pad.top).toBeGreaterThan(side.pad.top);               // room for the title above
        expect(above.yLabel.placement).toBe('above');
        expect(above.yLabel.x).toBe(above.pad.left);
        expect(above.yLabel.y + 18 * 1.35).toBeLessThanOrEqual(above.pad.top);
        // a long title never sticks out on the left
        s.yLabelRuns = textToRuns('A very long horizontal Y axis title that is wider than the margin');
        const long = computeLayout(s, 850, 680);
        expect(long.pad.left).toBeGreaterThan(40);
        expect(long.pad.left - 7 * 'A very long horizontal Y axis title that is wider than the margin'.length / 2).toBeGreaterThan(0);
    });

    it('SVG places the titles where the layout says', () => {
        const s = base();
        s.xLabelPlacement = 'end';
        s.yLabelPlacement = 'above';
        const svg = buildVectorSVG(s, { mode: 'classic' });
        expect(svg).toContain('text-anchor="end"');
        expect(svg).not.toContain('rotate(-90)');
    });
});

describe('line clipping and the long triangle arrow', () => {
    it('SVG cuts the data line at the plot area', () => {
        const s = makeDefaultState();
        const svg = buildVectorSVG(s, { mode: 'classic' });
        expect(svg).toContain('<clipPath id="plot-clip">');
        expect(svg).toContain('clip-path="url(#plot-clip)"');
    });

    it('the clip rectangle stays inside the visible border lines', () => {
        const s = makeDefaultState();
        const l = computeLayout(s, 850, 680);
        expect(l.clip.x).toBeGreaterThan(l.pad.left);
        expect(l.clip.x + l.clip.w).toBeLessThan(l.pad.left + l.pw);
        s.borderLeft = false;
        expect(computeLayout(s, 850, 680).clip.x).toBe(l.pad.left);
    });

    it('long triangle is longer and very slightly narrower than the triangle', () => {
        const s = makeDefaultState();
        s.showAxisArrows = true;
        s.axisArrowStyle = 'long-triangle';
        const poly = (style) => {
            s.axisArrowStyle = style;
            const svg = buildVectorSVG(s, { mode: 'advanced' });
            const m = svg.match(/<polygon points="([^"]+)" fill="#000000"\/>/);
            return m[1].split(' ').map(p => p.split(',').map(Number));
        };
        const tri = poly('triangle'), long = poly('long-triangle');
        const length = pts => Math.abs(pts[1][0] - pts[0][0]);
        const width = pts => Math.abs(pts[2][1] - pts[1][1]);
        expect(length(long)).toBeGreaterThan(length(tri));
        expect(width(long)).toBeLessThan(width(tri));
        expect(width(long)).toBeGreaterThan(width(tri) * 0.85);              // "very subtle"
    });
});
