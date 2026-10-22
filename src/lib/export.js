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

/**
 * Tight bounding box of everything the chart actually paints (alpha > 0).
 * Used for the "no margins" export: the frame is cropped to exactly the content.
 */
export function measureContentBounds(state, mode, invertText = false) {
    const { width: W, height: H } = getCanvasSize(state);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    drawScene(ctx, state, { mode, width: W, height: H, invertText });
    const data = ctx.getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return { x: 0, y: 0, w: W, h: H };
    // 1px safety margin for anti-aliasing / SVG viewers measuring text slightly differently
    const x = Math.max(0, minX - 1), y = Math.max(0, minY - 1);
    return { x, y, w: Math.min(W, maxX + 2) - x, h: Math.min(H, maxY + 2) - y };
}

/** PNG export: { scale, noMargins, bgEnabled, bgColor } — transparent unless a background is requested. */
export function exportPNG(state, mode, settings = {}) {
    const { scale = 1, noMargins = false, bgEnabled = false, bgColor = '#ffffff' } = settings;
    const { width: W, height: H } = getCanvasSize(state);
    const crop = noMargins ? measureContentBounds(state, mode, false) : { x: 0, y: 0, w: W, h: H };
    const out = document.createElement('canvas');
    out.width = Math.round(crop.w * scale);
    out.height = Math.round(crop.h * scale);
    const ctx = out.getContext('2d');
    ctx.scale(scale, scale);
    ctx.translate(-crop.x, -crop.y);
    drawScene(ctx, state, {
        mode, width: W, height: H,
        invertText: false,
        background: bgEnabled ? bgColor : null
    });
    download(out.toDataURL('image/png'), 'graph-studio-export.png');
}

/** SVG export: { invertText, noMargins, bgEnabled, bgColor } */
export function exportSVG(state, mode, settings = {}) {
    const { invertText = false, noMargins = false, bgEnabled = false, bgColor = '#ffffff' } = settings;
    const crop = noMargins ? measureContentBounds(state, mode, invertText) : null;
    const svg = buildVectorSVG(state, { mode, invertText, crop, background: bgEnabled ? bgColor : null });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    download(url, 'graph-studio-vector.svg');
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
