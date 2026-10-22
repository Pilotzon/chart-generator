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
