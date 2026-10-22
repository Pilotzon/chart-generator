import { describe, expect, it } from 'vitest';
import { defaultColumn, makeDefaultState } from '../src/lib/defaults.js';
import { getColumns, getColumnConfig, computeLayout } from '../src/lib/layout.js';
import { textToRuns } from '../src/lib/richText.js';
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

    it('mirrors paired punctuation together with the text', () => {
        const svg = buildVectorSVG(
            Object.assign(makeDefaultState(), { titleRuns: textToRuns('(abc) [x]') }),
            { mode: 'classic', invertText: true }
        );
        expect(svg).toContain('[x] (cba)');
    });
});
