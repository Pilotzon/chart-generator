const SIDES = [
    { key: 'Top', label: 'Top', line: { x1: 3, y1: 3, x2: 21, y2: 3 } },
    { key: 'Right', label: 'Right', line: { x1: 21, y1: 3, x2: 21, y2: 17 } },
    { key: 'Bottom', label: 'Bottom', line: { x1: 3, y1: 17, x2: 21, y2: 17 } },
    { key: 'Left', label: 'Left', line: { x1: 3, y1: 3, x2: 3, y2: 17 } }
];

/**
 * 2×2 grid of side toggles (Top / Right / Bottom / Left).
 * `prefix` + side name is the state key, e.g. prefix="border" → borderTop.
 */
export function BorderSelector({ prefix, values, onToggle, compact = false, titleSuffix = 'border' }) {
    return (
        <div className={`border-selector ${compact ? 'border-selector-compact' : ''}`}>
            {SIDES.map(side => (
                <label key={side.key} className="border-toggle" title={`${side.label} ${titleSuffix}`}>
                    <input
                        type="checkbox"
                        checked={!!values[prefix + side.key]}
                        onChange={e => onToggle(prefix + side.key, e.target.checked)}
                    />
                    <span className="border-toggle-face">
                        <svg viewBox="0 0 24 20" fill="none">
                            <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
                            <line {...side.line} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        <span>{side.label}</span>
                    </span>
                </label>
            ))}
        </div>
    );
}
