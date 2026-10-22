import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

let root, host, downloads, blobs;

const q = (sel, el = document) => el.querySelector(sel);
const qa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const byText = (sel, text, el = document) => qa(sel, el).find(n => n.textContent.trim() === text);
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const mouse = async (el, type, init = {}) => { await act(async () => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })); }); };
const stored = (key) => JSON.parse(localStorage.getItem(key));
const textCalls = () => q('#graphCanvas').getContext('2d').calls.filter(c => c[0] === 'fillText').map(c => c[1]);

async function render() {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<App />); });
}

async function goAdvanced() {
    await click(byText('.mode-btn', 'Advanced'));
    await click(byText('.modal-actions .btn', 'Switch to Advanced'));
}

async function typeInto(editor, html) {
    await act(async () => {
        editor.innerHTML = html;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

beforeEach(() => {
    localStorage.clear();
    downloads = [];
    blobs = [];
    HTMLAnchorElement.prototype.click = function click() { downloads.push({ name: this.download, href: this.href }); };
    URL.createObjectURL = (b) => { blobs.push(b); return 'blob:test'; };
    URL.revokeObjectURL = () => {};
});

afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    document.body.innerHTML = '';
    document.body.className = '';
});

describe('classic mode', () => {
    it('renders the groups, the canvas and the export bar', async () => {
        await render();
        expect(qa('.group-title-text').map(n => n.textContent)).toEqual([
            'Line & Markers', 'Data Points', 'Titles & Labels', 'Canvas Size', 'Axes & Grid', 'Visual Style', 'Column Titles'
        ]);
        expect(q('#graphCanvas').width).toBe(850);
        expect(q('.rail-btn')).toBeNull();
        // classic PNG button exports directly
        await click(q('.export-menu > .btn-primary'));
        expect(downloads.map(d => d.name)).toEqual(['graph-studio-export.png']);
    });

    it('SVG popup has the invert checkbox above the download button and inverts the preview', async () => {
        await render();
        const before = textCalls().join('|');
        await click(q('.export-split-main'));
        const pop = q('.export-popover');
        expect(pop).not.toBeNull();
        const checkbox = q('input[type=checkbox]', pop);
        const dl = byText('.btn', 'Download SVG', pop);
        expect(checkbox.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // classic: only the invert option
        expect(qa('input[type=checkbox]', pop)).toHaveLength(1);

        await click(checkbox);
        const after = textCalls().join('|');
        expect(after).not.toBe(before);
        expect(stored('GRAPH_STUDIO_PRO_V13_EXPORT').invertText).toBe(true);

        await click(dl);
        expect(downloads.map(d => d.name)).toContain('graph-studio-vector.svg');
        const svg = await blobs[0].text();
        expect(svg).toContain('<svg');
        expect(q('.export-popover')).toBeNull(); // closes after download
    });

    it('SVG button is one split rectangle: label zone + chevron zone, both open the popup', async () => {
        await render();
        const split = q('.export-split');
        expect(split.children).toHaveLength(2);
        expect(split.children[0].className).toBe('export-split-main');
        expect(split.children[1].className).toBe('export-split-chev');
        expect(byText('.export-bar .btn-primary', 'Export PNG')).not.toBeNull();
        expect(q('.export-pill')).toBeNull();
        await click(q('.export-split-chev'));
        expect(q('.export-popover')).not.toBeNull();
        expect(q('.export-split').classList.contains('is-open')).toBe(true);
        await click(q('.export-split-main'));
        expect(q('.export-popover')).toBeNull();
    });

    it('closes the popup with Escape and on outside click', async () => {
        await render();
        await click(q('.export-split-main'));
        await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
        expect(q('.export-popover')).toBeNull();
        await click(q('.export-split-main'));
        await mouse(document.body, 'mousedown');
        expect(q('.export-popover')).toBeNull();
    });

    it('edits a column through the sketch: title, placement, alignment, background', async () => {
        await render();
        await click(byText('.group-title-text', 'Column Titles'));
        const cols = qa('.col-sketch-col');
        expect(cols).toHaveLength(7); // xMin 0 … xMax 70, step 10
        expect(q('.col-editor')).toBeNull();
        await click(cols[1]);
        const editor = q('.col-editor');
        expect(editor).not.toBeNull();
        expect(editor.textContent).toContain('Column 2');
        // no "Default" entries any more
        expect(editor.textContent).not.toContain('Default');
        await typeInto(q('.rich-text-editor', editor), '<b>Second</b>');
        expect(textCalls()).toContain('Second');
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').columns[1].runs[0]).toMatchObject({ text: 'Second', bold: true });
        // placement dropdown → below
        const placementTrigger = qa('.control-row', editor).find(r => r.textContent.includes('Placement')).querySelector('.dropdown-trigger');
        await click(placementTrigger);
        await click(byText('.portal-dropdown-menu .dropdown-item', 'Below grid'));
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').columns[1].placement).toBe('below');
        expect(q('.col-sketch-title.below')).not.toBeNull();
        // background
        const toggle = qa('.control-row', editor).find(r => r.textContent.includes('Background')).querySelector('input');
        await click(toggle);
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').columns[1].bgEnabled).toBe(true);
        expect(qa('input[type=range]', q('.col-editor'))).toHaveLength(1);
        // selecting another column moves the menu
        await click(qa('.col-sketch-col')[4]);
        expect(q('.col-editor').textContent).toContain('Column 5');
        await click(qa('.col-sketch-col')[4]);
        expect(q('.col-editor')).toBeNull();
    });

    it('column sketch: solid separators, rounded side corners flags, number kept in the column', async () => {
        await render();
        await click(byText('.group-title-text', 'Column Titles'));
        const cols = qa('.col-sketch-col');
        expect(cols[0].classList.contains('is-first')).toBe(true);
        expect(cols[0].classList.contains('is-last')).toBe(false);
        expect(cols.at(-1).classList.contains('is-last')).toBe(true);
        expect(cols[3].classList.contains('is-first') || cols[3].classList.contains('is-last')).toBe(false);
        expect(cols[0].querySelector('.col-sketch-num').textContent).toBe('1');
    });

    it('border lines: click the edges of the frame sketch', async () => {
        await render();
        await click(byText('.group-title-text', 'Axes & Grid'));
        const edges = qa('.edge-sketch-edge');
        expect(edges.map(e => e.className.match(/edge-(top|right|bottom|left)/)[1])).toEqual(['top', 'right', 'bottom', 'left']);
        const top = edges[0];
        const before = top.getAttribute('aria-pressed') === 'true';
        await click(top);
        expect(top.getAttribute('aria-pressed')).toBe(String(!before));
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').borderTop).toBe(!before);
        expect(q('.border-toggle')).toBeNull();
    });

    it('title position: pick left / right / center in the frame sketch', async () => {
        await render();
        await click(byText('.group-title-text', 'Titles & Labels'));
        const chips = qa('.pos-sketch-title .pos-chip');
        expect(chips).toHaveLength(3);
        await click(chips[1]);
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').titlePosition).toBe(chips[1].title === 'Left' ? 'top-left' : 'top-right');
        expect(chips[1].getAttribute('aria-checked')).toBe('true');
        expect(chips.filter(c => c.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    });
});

describe('advanced mode', () => {
    it('switches with confirmation, regroups into four tabs and pins the chart selector', async () => {
        await render();
        await goAdvanced();
        expect(document.body.classList.contains('mode-advanced')).toBe(true);
        expect(qa('.rail-btn')).toHaveLength(4);
        // chart selector is a header above the scroll area, not inside it
        const sel = q('.chart-selector-container');
        expect(sel.parentElement.classList.contains('sidebar-main')).toBe(true);
        expect(q('.sidebar-content').contains(sel)).toBe(false);
        expect(qa('.group-title-text').map(n => n.textContent)).toEqual(['Data', 'Line & markers', 'Name label & legend']);

        await click(q('.rail-btn[data-panel="text"]'));
        expect(q('.chart-selector-container')).toBeNull();
        expect(qa('.group-title-text').map(n => n.textContent)).toEqual(['Titles', 'Axis text']);
        await click(q('.rail-btn[data-panel="axes"]'));
        expect(qa('.group-title-text').map(n => n.textContent)).toEqual(['Scale', 'Grid & ticks', 'Frame & arrows', 'Canvas size']);
        await click(q('.rail-btn[data-panel="columns"]'));
        expect(qa('.group-title-text').map(n => n.textContent)).toEqual(['Title font', 'Columns']);
    });

    it('shows rail tooltips in a body-level portal', async () => {
        await render();
        await goAdvanced();
        const btn = q('.rail-btn[data-panel="axes"]');
        await mouse(btn, 'mouseover');
        await act(async () => { btn.dispatchEvent(new MouseEvent('mouseenter')); });
        await click(btn); // clicking must not break/hide it under panel content
        const tip = q('.rail-tooltip-portal');
        expect(tip).not.toBeNull();
        expect(tip.parentElement).toBe(document.body);
        expect(tip.textContent).toBe('Axes & canvas');
    });

    it('SVG popup has extra options; PNG popup has resolution/no-margins/background', async () => {
        await render();
        await goAdvanced();
        await click(q('.export-split-main'));
        let pop = q('.export-popover');
        expect(qa('.export-option span', pop).map(n => n.textContent)).toEqual(['Flip text for MS Word macOS', 'Background']);
        expect(pop.textContent).not.toContain('No margins');
        await click(qa('input[type=checkbox]', pop)[1]);
        expect(q('input[type=color]', pop)).not.toBeNull();
        await click(byText('.btn', 'Download SVG', pop));
        expect(downloads.at(-1).name).toBe('graph-studio-vector.svg');
        const svg = await blobs.at(-1).text();
                expect(svg).toContain('<rect'); // background

        await click(q('.export-menu > .btn-primary'));
        pop = q('.export-popover');
        expect(pop.textContent).toContain('Resolution');
        expect(pop.textContent).toContain('1700 × 1360 px');
        await click(q('.dropdown-trigger', pop));
        await click(byText('.portal-dropdown-menu .dropdown-item', '4× (print)'));
        expect(q('.export-popover')).not.toBeNull(); // picking from the portal menu keeps the popup open
        expect(q('.export-popover').textContent).toContain('3400 × 2720 px');
        expect(stored('GRAPH_STUDIO_PRO_V13_EXPORT').png.scale).toBe(4);
        await click(byText('.btn', 'Download PNG', q('.export-popover')));
        expect(downloads.at(-1).name).toBe('graph-studio-export.png');
    });

    it('chart selector adds, renames and deletes charts', async () => {
        await render();
        await goAdvanced();
        await click(byText('.btn-mini', 'New chart'));
        expect(qa('.chart-tab')).toHaveLength(2);
        expect(qa('.chart-tab')[1].classList.contains('active')).toBe(true);
        await click(qa('.chart-tab')[0]);
        expect(qa('.chart-tab')[0].classList.contains('active')).toBe(true);
        await click(qa('.chart-tab [title="Delete"]')[1]);
        await click(byText('.modal-actions .btn', 'Delete'));
        expect(qa('.chart-tab')).toHaveLength(1);
    });

    it('marks a point and keeps its label meta when the point is edited', async () => {
        await render();
        await goAdvanced();
        const cb = qa('.mark-checkbox')[1];
        await click(cb);
        expect(qa('.marked-point-card')).toHaveLength(1);
        const input = q('.marked-input');
        await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'hello');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(textCalls()).toContain('hello');
        expect(qa('.mark-sketch-dot')).toHaveLength(1);
        // edit the X of that point
        const xInput = qa('.points-table tbody tr')[1].querySelector('input[type=number]');
        await act(async () => {
            xInput.focus();
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(xInput, '25');
            xInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => { xInput.blur(); });
        const chart = stored('GRAPH_STUDIO_PRO_V13_ADVANCED').charts[0];
        const meta = chart.markedPointsMeta['25_67'];
        expect(meta && meta.label).toBe('hello');
        expect(chart.points.map(p => p.x)).toEqual([0, 25, 40, 60]);
    });
});

describe('advanced sketches', () => {
    it('marked points: click a dot to open its card below the sketch', async () => {
        await render();
        await goAdvanced();
        const boxes = qa('.mark-checkbox');
        await click(boxes[1]);
        await click(boxes[2]);
        const dots = qa('.mark-sketch-dot');
        expect(dots).toHaveLength(2);
        expect(qa('.marked-point-card')).toHaveLength(1);
        const first = q('.marked-point-card .coords').textContent;
        await click(dots[1]);
        expect(dots[1].classList.contains('is-on')).toBe(true);
        expect(q('.marked-point-card .coords').textContent).not.toBe(first);
        expect(q('.marked-point-card').style.getPropertyValue('--caret-x')).not.toBe('');
    });

    it('legend position: corner chips in a frame sketch', async () => {
        await render();
        await goAdvanced();
        await click(byText('.group-title-text', 'Name label & legend'));
        if (qa('.pos-sketch-legend .pos-chip').length === 0) {
            const toggle = qa('.control-row').find(r => r.textContent.includes('Show Legend')).querySelector('input');
            await click(toggle);
        }
        const corners = qa('.pos-sketch-legend .pos-chip');
        expect(corners).toHaveLength(4);
        const bl = corners.find(c => c.title === 'Bottom Left');
        await click(bl);
        expect(stored('GRAPH_STUDIO_PRO_V13_ADVANCED').legendPosition).toBe('bottom-left');
        expect(bl.getAttribute('aria-checked')).toBe('true');
    });
});

describe('selection toolbar and quick edit', () => {
    it('hit-tests title clicks on the canvas and saves the quick edit', async () => {
        await render();
        const canvas = q('#graphCanvas');
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 850, height: 680, right: 850, bottom: 680 });
        // find a hit target by scanning the canvas for the title area
        let opened = false;
        for (let y = 10; y < 120 && !opened; y += 6) {
            for (let x = 200; x < 650 && !opened; x += 25) {
                await mouse(canvas, 'mousedown', { clientX: x, clientY: y });
                opened = !!q('#quickEditBox');
            }
        }
        expect(opened).toBe(true);
        const editor = q('#quickInput');
        await typeInto(editor, 'New title');
        await click(byText('#quickEditBox .btn', 'Save changes'));
        expect(q('#quickEditBox')).toBeNull();
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').titleRuns[0].text).toBe('New title');
    });
});
