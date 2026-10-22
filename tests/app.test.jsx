import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';
import { computeLayout } from '../src/lib/layout.js';

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
        await click(q('.export-menu:nth-child(2) .export-split-main'));
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
        expect(byText('.export-menu:nth-child(2) .export-split-main', 'PNG')).not.toBeNull();
        expect(qa('.export-split')).toHaveLength(2);
        expect(q('.export-split.is-dark')).not.toBeNull();
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
        // lines are drawn on the inner side of each strip, running corner to corner
        expect(qa('.edge-sketch-edge .edge-sketch-line')).toHaveLength(4);
        expect(edges.map(e => e.className.match(/edge-(top|right|bottom|left)/)[1])).toEqual(['top', 'right', 'bottom', 'left']);
        const top = edges[0];
        const before = top.getAttribute('aria-pressed') === 'true';
        await click(top);
        expect(top.getAttribute('aria-pressed')).toBe(String(!before));
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').borderTop).toBe(!before);
        expect(q('.border-toggle')).toBeNull();
    });

    it('title alignment is a row of 3 icon buttons, not a dropdown', async () => {
        await render();
        await click(byText('.group-title-text', 'Titles & Labels'));
        const btns = qa('.align-buttons .align-btn');
        expect(btns.map(b => b.title)).toEqual(['Left', 'Center', 'Right']);
        expect(btns.every(b => b.querySelector('svg'))).toBe(true);
        expect(btns[1].getAttribute('aria-checked')).toBe('true');
        await click(btns[0]);
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').titlePosition).toBe('top-left');
        expect(btns[0].getAttribute('aria-checked')).toBe('true');
        expect(btns.filter(c => c.getAttribute('aria-checked') === 'true')).toHaveLength(1);
        expect(q('.pos-sketch-title')).toBeNull();
    });

    it('column alignment uses the same 3 buttons', async () => {
        await render();
        await click(byText('.group-title-text', 'Column Titles'));
        await click(qa('.col-sketch-col')[1]);
        const btns = qa('.col-editor .align-btn');
        expect(btns).toHaveLength(3);
        await click(btns[2]);
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').columns[1].align).toBe('right');
    });

    it('classic PNG chevron holds the resolution (no background option)', async () => {
        await render();
        await click(q('.export-menu:nth-child(2) .export-split-chev'));
        const pop = q('.export-popover');
        expect(pop.textContent).toContain('Resolution');
        expect(pop.textContent).not.toContain('Background');
        expect(downloads).toHaveLength(0);
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

        await click(q('.export-menu:nth-child(2) .export-split-main'));
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
    it('tick numbers can be switched off (advanced only)', async () => {
        await render();
        const lastDraw = () => {
            const calls = q('#graphCanvas').getContext('2d').calls;
            const i = calls.map(c => c[0]).lastIndexOf('clearRect');
            return calls.slice(i + 1).filter(c => c[0] === 'fillText').map(c => c[1]);
        };
        expect(lastDraw()).toContain('50');
        await goAdvanced();
        await click(q('.rail-btn[data-panel="text"]'));
        const row = qa('.control-row').find(r => r.textContent.includes('Show Tick Numbers'));
        expect(row).toBeTruthy();
        await click(row.querySelector('input'));
        expect(stored('GRAPH_STUDIO_PRO_V13_ADVANCED').showTickLabels).toBe(false);
        expect(lastDraw()).not.toContain('50');
        // the SVG has no tick numbers either
        await click(q('.export-split-main'));
        await click(byText('.btn', 'Download SVG', q('.export-popover')));
        const svg = await blobs.at(-1).text();
        expect(svg).not.toMatch(/>50<\/text>/);
    });

    it('PNG is a dark split button in advanced mode; both zones open the popup', async () => {
        await render();
        await goAdvanced();
        await click(q('.export-menu:nth-child(2) .export-split-main'));
        expect(q('.export-popover').textContent).toContain('Resolution');
        expect(q('.export-popover').textContent).toContain('Background');
        await click(q('.export-menu:nth-child(2) .export-split-chev'));
        expect(q('.export-popover')).toBeNull();
        expect(downloads).toHaveLength(0);
    });

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

describe('axis titles, margins and arrows (UI)', () => {
    const dropdownRow = (text) => qa('.control-row').find(r => r.querySelector(':scope > label')?.textContent === text);
    const pick = async (row, itemText) => {
        await click(row.querySelector('.dropdown-trigger'));
        await click(byText('.portal-dropdown-menu .dropdown-item', itemText));
    };

    it('axis title positions can be changed in classic mode too', async () => {
        await render();
        await click(byText('.group-title-text', 'Titles & Labels'));
        await pick(dropdownRow('X Label Position'), 'At the axis end');
        await pick(dropdownRow('Y Label Position'), 'Above the axis');
        const st = stored('GRAPH_STUDIO_PRO_V13_CLASSIC');
        expect(st.xLabelPlacement).toBe('end');
        expect(st.yLabelPlacement).toBe('above');
        expect(q('#graphCanvas').width).toBe(850);
    });

    it('line margin steppers live in the axis scale settings', async () => {
        await render();
        await click(byText('.group-title-text', 'Axes & Grid'));
        const rows = qa('.control-row').filter(r => r.textContent.includes('Line Margin'));
        expect(rows).toHaveLength(2);
        await click(rows[0].querySelectorAll('.stepper-btn')[1]);
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').plotMarginX).toBe(2);
    });

    it('long triangle is offered for the axis arrows and the line ends (advanced)', async () => {
        await render();
        await goAdvanced();
        await click(q('.rail-btn[data-panel="axes"]'));
        const toggle = qa('.control-row').find(r => r.textContent.includes('Show Arrows')).querySelector('input');
        await click(toggle);
        await pick(dropdownRow('Style'), 'Long triangle');
        expect(stored('GRAPH_STUDIO_PRO_V13_ADVANCED').axisArrowStyle).toBe('long-triangle');
    });
});

describe('dropdown menu geometry and line ends', () => {
    it('every item is as big as the closed dropdown; the menu is wider by its own frame', async () => {
        await render();
        const trigger = q('.dropdown-trigger');
        trigger.getBoundingClientRect = () => ({ left: 300, top: 100, width: 160, height: 36, right: 460, bottom: 136 });
        await click(trigger);
        const menu = q('.portal-dropdown-menu');
        expect(menu.style.width).toBe('172px');
        expect(menu.style.left).toBe('294px');
        expect(menu.style.getPropertyValue('--dd-item-w')).toBe('160px');
        expect(menu.style.getPropertyValue('--dd-item-h')).toBe('36px');
        expect(qa('.dropdown-item.selected', menu)).toHaveLength(1);
    });

    it('line end (flat / rounded) is a chart option in both modes', async () => {
        await render();
        const rows = () => qa('.control-row').find(r => r.querySelector(':scope > label')?.textContent === 'Line Ends');
        expect(rows()).toBeTruthy();
        await click(rows().querySelector('.dropdown-trigger'));
        await click(byText('.portal-dropdown-menu .dropdown-item', 'Flat'));
        expect(stored('GRAPH_STUDIO_PRO_V13_CLASSIC').charts[0].lineCap).toBe('butt');
    });

    it('PNG and SVG buttons share one size; switches are #2C7BD7', async () => {
        const fs = await import('node:fs');
        const css = fs.readFileSync('src/styles/additions.css', 'utf8') + fs.readFileSync('src/styles/index.css', 'utf8');
        expect(css).toMatch(/\.export-split \{[^}]*width: 110px/);
        expect(css).toMatch(/\.toggle-switch input:checked\+\.toggle-slider \{\s*background: #2C7BD7/);
        expect(css).toContain("stroke='%232C7BD7'");
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

describe('empty text locks its options; placeholders; checkboxes; point highlight', () => {
    const rowOf = (label) => qa('.control-row').find(r => r.querySelector('label')?.textContent.trim() === label);

    it('every text box has a placeholder, and none is empty text', async () => {
        await render();
        const editors = qa('.rich-text-editor');
        expect(editors.length).toBeGreaterThanOrEqual(3);
        editors.forEach(ed => expect(ed.dataset.placeholder.length).toBeGreaterThan(8));
        await click(byText('.group-title-text', 'Column Titles'));
        await click(q('.col-sketch-col'));
        const colEditor = q('.col-editor .rich-text-editor');
        expect(colEditor.dataset.placeholder.length).toBeGreaterThan(8);
        // an empty column title locks its alignment and placement
        const colRow = (l) => qa('.col-editor .control-row').find(r => r.querySelector('label')?.textContent === l);
        expect(colRow('Alignment').dataset.disabled).toBe('true');
        expect(colRow('Placement').dataset.disabled).toBe('true');
        await typeInto(colEditor, 'First');
        expect(colRow('Alignment').dataset.disabled).toBeUndefined();
    });

    it('options of the title are locked while it is empty, and so is the Add Subtitle button', async () => {
        await render();
        expect(q('.btn-add-subtitle').disabled).toBe(false);
        expect(rowOf('Alignment').dataset.disabled).toBeUndefined();
        await typeInto(q('#titleText'), '');
        expect(rowOf('Alignment').dataset.disabled).toBe('true');
        expect(rowOf('Alignment').hasAttribute('inert')).toBe(true);
        expect(rowOf('Size').dataset.disabled).toBe('true');
        expect(q('.btn-add-subtitle').disabled).toBe(true);
        await typeInto(q('#titleText'), 'Hello');
        expect(rowOf('Alignment').dataset.disabled).toBeUndefined();
        expect(q('.btn-add-subtitle').disabled).toBe(false);
    });

    it('axis label placements and fonts follow their text; no divider above the subtitle button', async () => {
        await render();
        await typeInto(q('#xLabel'), '');
        expect(rowOf('X Label Position').dataset.disabled).toBe('true');
        expect(rowOf('Y Label Position').dataset.disabled).toBeUndefined();
        expect(rowOf('Label Size').dataset.disabled).toBeUndefined();
        await typeInto(q('#yLabel'), '');
        expect(rowOf('Y Label Position').dataset.disabled).toBe('true');
        expect(rowOf('Label Size').dataset.disabled).toBe('true');
        expect(q('.btn-add-subtitle').previousElementSibling?.classList.contains('subgroup-divider')).toBeFalsy();
    });

    it('advanced: no divider between title and the subtitle button', async () => {
        await render();
        await goAdvanced();
        await click(q('.rail-btn[data-panel="text"]'));
        const btn = q('.btn-add-subtitle');
        expect(btn.previousElementSibling?.classList.contains('subgroup-divider')).toBeFalsy();
    });

    it('a point picked on the graph is highlighted in the points editor (and the Chart tab opens)', async () => {
        await render();
        await goAdvanced();
        await click(q('.rail-btn[data-panel="text"]'));
        const canvas = q('#graphCanvas');
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 850, height: 680, right: 850, bottom: 680 });
        const st = stored('GRAPH_STUDIO_PRO_V13_ADVANCED');
        const lay = computeLayout(st, canvas.width, canvas.height, { advanced: true });
        const pt = st.charts[0].points[1];
        expect(qa('.points-table tr.is-selected').length).toBe(0);
        await mouse(canvas, 'mousedown', { clientX: lay.mapX(pt.x), clientY: lay.mapY(pt.y) });
        await mouse(window, 'mouseup');
        const rows = qa('.points-table tbody tr');
        expect(rows[1].classList.contains('is-selected')).toBe(true);
        expect(qa('.points-table tr.is-selected').length).toBe(1);
        expect(q('.rail-btn.active').dataset.panel).toBe('chart');
    });

    it('checkboxes are rounder with their own border colour; the Mark box sits lower', async () => {
        const fs = await import('node:fs');
        const css = fs.readFileSync('src/styles/additions.css', 'utf8');
        expect(css).toMatch(/input\[type="checkbox"\]:not\(\.toggle-switch input\) \{[^}]*border: 1\.5px solid #8497B3;[^}]*border-radius: 6px/);
        expect(css).toMatch(/td-mark \.mark-checkbox \{ position: relative; top: 4px/);
        expect(css).toMatch(/\.points-table tr\.is-selected td/);
    });

    it('the marked-point label position is locked until the label has text', async () => {
        await render();
        await goAdvanced();
        const box = qa('.mark-checkbox')[1];
        await click(box);
        expect(rowOf('Label position').dataset.disabled).toBe('true');
        const input = q('.marked-input');
        expect(input.placeholder.length).toBeGreaterThan(8);
        await act(async () => {
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            set.call(input, 'Peak');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(rowOf('Label position').dataset.disabled).toBeUndefined();
    });
});
