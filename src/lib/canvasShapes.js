// Canvas drawing primitives (splines, arrow heads, markers, warnings)

export function getSmoothControlPoints(pts) {
    const n = pts.length;
    if (n < 2) return [];
    const result = [];
    for (let i = 0; i < n - 1; i++) {
        const p0 = i === 0 ? pts[i] : pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i + 2 < n ? pts[i + 2] : pts[i + 1];
        result.push({
            cp1x: p1.px + (p2.px - p0.px) / 6,
            cp1y: p1.py + (p2.py - p0.py) / 6,
            cp2x: p2.px - (p3.px - p1.px) / 6,
            cp2y: p2.py - (p3.py - p1.py) / 6
        });
    }
    return result;
}

function bezierSegments(pixelPts, tension) {
    const controls = getSmoothControlPoints(pixelPts);
    const segs = [];
    for (let i = 0; i < pixelPts.length - 1; i++) {
        const p0 = pixelPts[i], p1 = pixelPts[i + 1], cp = controls[i];
        segs.push({
            cp1x: p0.px + (cp.cp1x - p0.px) * tension,
            cp1y: p0.py + (cp.cp1y - p0.py) * tension,
            cp2x: p1.px + (cp.cp2x - p1.px) * tension,
            cp2y: p1.py + (cp.cp2y - p1.py) * tension,
            x: p1.px, y: p1.py
        });
    }
    return segs;
}

export function drawCurvedLine(ctx, pixelPts, tension) {
    if (pixelPts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pixelPts[0].px, pixelPts[0].py);
    if (tension <= 0) {
        pixelPts.slice(1).forEach(p => ctx.lineTo(p.px, p.py));
    } else {
        bezierSegments(pixelPts, tension).forEach(s => ctx.bezierCurveTo(s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x, s.y));
    }
    ctx.stroke();
}

export function buildCurvedPath(pixelPts, tension, bottomY) {
    if (pixelPts.length < 2) return null;
    const path = new Path2D();
    path.moveTo(pixelPts[0].px, bottomY);
    path.lineTo(pixelPts[0].px, pixelPts[0].py);
    if (tension <= 0) {
        for (let i = 1; i < pixelPts.length; i++) path.lineTo(pixelPts[i].px, pixelPts[i].py);
    } else {
        bezierSegments(pixelPts, tension).forEach(s => path.bezierCurveTo(s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x, s.y));
    }
    path.lineTo(pixelPts[pixelPts.length - 1].px, bottomY);
    path.closePath();
    return path;
}

export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function drawArrowHead(ctx, x, y, angle, size, style, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    switch (style) {
        case 'arrow':
            ctx.lineWidth = Math.max(1.5, size * 0.15);
            ctx.beginPath();
            ctx.moveTo(-size, -size * 0.5);
            ctx.lineTo(0, 0);
            ctx.lineTo(-size, size * 0.5);
            ctx.stroke();
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size, -size * 0.45);
            ctx.lineTo(-size, size * 0.45);
            ctx.closePath();
            ctx.fill();
            break;
        case 'stealth':
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size, -size * 0.45);
            ctx.lineTo(-size * 0.55, 0);
            ctx.lineTo(-size, size * 0.45);
            ctx.closePath();
            ctx.fill();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            break;
        default:
    }
    ctx.restore();
}

export function drawHexagonWarning(ctx, cx, cy, size) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = cx + size * Math.cos(angle);
        const hy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 138, 30, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 138, 30, 1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 1.1)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy - size * 0.05);
    ctx.restore();
}

export function drawMarker(ctx, px, py, size, shape, active, outlineW, outlineC) {
    ctx.save();
    ctx.translate(px, py);
    if (shape === 'diamond') {
        ctx.rotate(Math.PI / 4);
        const s = size * 1.2;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        if (outlineW > 0 && outlineC) { ctx.lineWidth = outlineW; ctx.strokeStyle = outlineC; ctx.strokeRect(-s / 2, -s / 2, s, s); }
    } else if (shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
        if (outlineW > 0 && outlineC) { ctx.lineWidth = outlineW; ctx.strokeStyle = outlineC; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke(); }
    } else if (shape === 'square') {
        ctx.fillRect(-size, -size, size * 2, size * 2);
        if (outlineW > 0 && outlineC) { ctx.lineWidth = outlineW; ctx.strokeStyle = outlineC; ctx.strokeRect(-size, -size, size * 2, size * 2); }
    } else if (shape === 'cross') {
        ctx.beginPath(); ctx.lineWidth = 2.5;
        ctx.moveTo(-size, -size); ctx.lineTo(size, size);
        ctx.moveTo(size, -size); ctx.lineTo(-size, size);
        ctx.stroke();
    }
    if (active) {
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(58, 59, 60, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
    ctx.restore();
}
