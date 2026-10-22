// jsdom has no canvas: provide a recording 2D-context stub so the drawing code can run.
class Ctx2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.calls = [];
        return new Proxy(this, {
            get(t, p) {
                if (p in t) return t[p];
                if (p === 'measureText') return (s) => ({ width: String(s).length * 7 });
                if (p === 'getImageData') {
                    return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
                }
                if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
                return (...args) => { t.calls.push([p, ...args]); };
            },
            set(t, p, v) { t[p] = v; return true; }
        });
    }
}

HTMLCanvasElement.prototype.getContext = function getContext() {
    if (!this.__ctx) this.__ctx = new Ctx2D(this);
    return this.__ctx;
};
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';

if (!document.execCommand) document.execCommand = () => true;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
