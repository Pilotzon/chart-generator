import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { defaultExportSettings } from '../lib/defaults.js';

/**
 * Export settings that are actually in effect.
 * Classic mode stays simple: only "invert text" is configurable there (it is shared with the
 * preview), everything else uses the plain defaults (PNG at 1×, no crop, transparent).
 */
export function useEffectiveExport() {
    const { mode, exportSettings } = useApp();
    return useMemo(() => {
        if (mode === 'advanced') return exportSettings;
        const d = defaultExportSettings();
        return { invertText: exportSettings.invertText, svg: d.svg, png: { ...d.png, scale: 1 } };
    }, [mode, exportSettings]);
}
