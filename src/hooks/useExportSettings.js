import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { defaultExportSettings } from '../lib/defaults.js';

/**
 * Export settings that are actually in effect.
 * Classic mode stays simple: only "flip text" and the PNG resolution are configurable there
 * (flip text is shared with the preview); the rest uses the plain defaults (transparent, no background).
 */
export function useEffectiveExport() {
    const { mode, exportSettings } = useApp();
    return useMemo(() => {
        if (mode === 'advanced') return exportSettings;
        const d = defaultExportSettings();
        return { invertText: exportSettings.invertText, svg: d.svg, png: { ...d.png, scale: exportSettings.png.scale } };
    }, [mode, exportSettings]);
}
