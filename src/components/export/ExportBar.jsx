import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useEffectiveExport } from '../../hooks/useExportSettings.js';
import { exportPNG, exportSVG } from '../../lib/export.js';
import { getCanvasSize } from '../../lib/layout.js';
import { PNG_SCALE_OPTIONS } from '../../lib/options.js';
import { ColorInput } from '../controls/Inputs.jsx';
import { Dropdown } from '../controls/Dropdown.jsx';
import { IconChevronDown, IconDownload } from '../controls/Icons.jsx';
import { CheckRow, ExportPopover } from './ExportPopover.jsx';

export function ExportBar() {
    const { state, mode, setExportSettings, toast } = useApp();
    const settings = useEffectiveExport();
    const advanced = mode === 'advanced';
    const [open, setOpen] = useState(null); // 'svg' | 'png' | null
    const svgRef = useRef(null);
    const pngRef = useRef(null);
    const close = useCallback(() => setOpen(null), []);

    const doSVG = useCallback(() => {
        exportSVG(state, mode, { invertText: settings.invertText, ...settings.svg });
        toast('SVG exported');
        setOpen(null);
    }, [state, mode, settings, toast]);

    const doPNG = useCallback(() => {
        exportPNG(state, mode, settings.png);
        toast('PNG exported');
        setOpen(null);
    }, [state, mode, settings, toast]);

    // Ctrl/Cmd+S → PNG, Ctrl/Cmd+E → SVG
    const latest = useRef({});
    latest.current = { doSVG, doPNG };
    useEffect(() => {
        const onKey = (e) => {
            if (!(e.metaKey || e.ctrlKey)) return;
            const k = e.key.toLowerCase();
            if (k === 's') { e.preventDefault(); latest.current.doPNG(); }
            if (k === 'e') { e.preventDefault(); latest.current.doSVG(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const setInvert = (v) => setExportSettings({ invertText: v });
    const setFormat = (fmt, partial) => setExportSettings(prev => ({ ...prev, [fmt]: { ...prev[fmt], ...partial } }));

    const { width, height } = getCanvasSize(state);
    const scale = settings.png.scale;
    const dims = `${Math.round(width * scale)} × ${Math.round(height * scale)} px`;

    return (
        <div className="export-bar">
            <div className="export-menu" ref={svgRef}>
                <button
                    type="button"
                    className={`btn btn-secondary ${open === 'svg' ? 'is-open' : ''}`}
                    aria-haspopup="dialog"
                    aria-expanded={open === 'svg'}
                    onClick={() => setOpen(open === 'svg' ? null : 'svg')}
                >
                    <IconDownload width={15} height={15} />
                    SVG
                    <IconChevronDown className="export-chevron" width={12} height={12} />
                </button>
                {open === 'svg' && (
                    <ExportPopover title="SVG export" onClose={close} anchorRef={svgRef}>
                        <CheckRow
                            label="Invert text boxes"
                            title="Reverse the characters of the title, subtitle, axis and column text boxes (also shown in the preview)"
                            checked={settings.invertText}
                            onChange={setInvert}
                        />
                        {advanced && (
                            <>
                                <CheckRow
                                    label="No margins"
                                    title="Crop the frame tightly around the chart content"
                                    checked={settings.svg.noMargins}
                                    onChange={v => setFormat('svg', { noMargins: v })}
                                />
                                <CheckRow
                                    label="Background"
                                    checked={settings.svg.bgEnabled}
                                    onChange={v => setFormat('svg', { bgEnabled: v })}
                                >
                                    {settings.svg.bgEnabled && (
                                        <ColorInput value={settings.svg.bgColor} onChange={v => setFormat('svg', { bgColor: v })} />
                                    )}
                                </CheckRow>
                            </>
                        )}
                        <button type="button" className="btn btn-primary export-popover-action" onClick={doSVG}>
                            <IconDownload width={15} height={15} />
                            Download SVG
                        </button>
                    </ExportPopover>
                )}
            </div>

            <div className="export-menu" ref={pngRef}>
                {advanced ? (
                    <>
                        <button
                            type="button"
                            className={`btn btn-primary ${open === 'png' ? 'is-open' : ''}`}
                            aria-haspopup="dialog"
                            aria-expanded={open === 'png'}
                            onClick={() => setOpen(open === 'png' ? null : 'png')}
                        >
                            <IconDownload width={15} height={15} />
                            PNG
                            <IconChevronDown className="export-chevron" width={12} height={12} />
                        </button>
                        {open === 'png' && (
                            <ExportPopover title="PNG export" onClose={close} anchorRef={pngRef}>
                                <div className="export-popover-row">
                                    <label className="export-popover-label">Resolution</label>
                                    <Dropdown
                                        value={settings.png.scale}
                                        options={PNG_SCALE_OPTIONS}
                                        onChange={v => setFormat('png', { scale: Number(v) })}
                                    />
                                </div>
                                <div className="export-popover-hint">
                                    {settings.png.noMargins ? 'Up to ' : ''}{dims}
                                </div>
                                <CheckRow
                                    label="No margins"
                                    title="Crop the image tightly around the chart content"
                                    checked={settings.png.noMargins}
                                    onChange={v => setFormat('png', { noMargins: v })}
                                />
                                <CheckRow
                                    label="Background"
                                    checked={settings.png.bgEnabled}
                                    onChange={v => setFormat('png', { bgEnabled: v })}
                                >
                                    {settings.png.bgEnabled && (
                                        <ColorInput value={settings.png.bgColor} onChange={v => setFormat('png', { bgColor: v })} />
                                    )}
                                </CheckRow>
                                <button type="button" className="btn btn-primary export-popover-action" onClick={doPNG}>
                                    <IconDownload width={15} height={15} />
                                    Download PNG
                                </button>
                            </ExportPopover>
                        )}
                    </>
                ) : (
                    <button type="button" className="btn btn-primary" onClick={doPNG}>
                        <IconDownload width={15} height={15} />
                        Export PNG
                    </button>
                )}
            </div>
        </div>
    );
}
