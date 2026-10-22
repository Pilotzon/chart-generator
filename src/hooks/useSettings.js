import { useApp } from '../context/AppContext.jsx';

/**
 * Convenience accessors for the settings blocks:
 *   set(key, value)       → global setting
 *   setChart(key, value)  → setting of the active chart
 */
export function useSettings() {
    const { state, activeChart, actions, mode } = useApp();
    return {
        state,
        chart: activeChart,
        mode,
        advanced: mode === 'advanced',
        actions,
        set: (key, value) => actions.patch({ [key]: value }),
        setChart: (key, value) => actions.patchActiveChart({ [key]: value })
    };
}
