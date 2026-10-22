import { drawScene } from './scene.js';
import { buildVectorSVG } from './svg.js';
import { getCanvasSize } from './layout.js';

function download(href, filename) {
    const a = document.createElement('a');
    a.download = filename;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/** PNG export: { scale, bgEnabled, bgColor } — transparent unless a background is requested. */
export function exportPNG(state, mode, settings = {}) {
    const { scale = 1, bgEnabled = false, bgColor = '#ffffff' } = settings;
    const { width: W, height: H } = getCanvasSize(state);
    const out = document.createElement('canvas');
    out.width = Math.round(W * scale);
    out.height = Math.round(H * scale);
    const ctx = out.getContext('2d');
    ctx.scale(scale, scale);
    drawScene(ctx, state, {
        mode, width: W, height: H,
        invertText: false,
        background: bgEnabled ? bgColor : null
    });
    download(out.toDataURL('image/png'), 'graph-studio-export.png');
}

/** SVG export: { invertText, bgEnabled, bgColor } */
export function exportSVG(state, mode, settings = {}) {
    const { invertText = false, bgEnabled = false, bgColor = '#ffffff' } = settings;
    const svg = buildVectorSVG(state, { mode, invertText, background: bgEnabled ? bgColor : null });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    download(url, 'graph-studio-vector.svg');
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
