/**
 * Funny grey placeholders for every text input. One is picked per mounted field
 * (see `usePlaceholder`), so each editor gets a bit of personality.
 */
import { useState } from 'react';

export const PLACEHOLDERS = {
    titleText: [
        'Give your masterpiece a name…',
        'A title worth a thousand data points…',
        'Name it before the data gets ideas…'
    ],
    subtitleText: [
        'The title’s quieter sidekick…',
        'Whisper something clever here…',
        'Fine print, but make it charming…'
    ],
    xLabel: [
        'What goes sideways? (X)…',
        'X marks the label…',
        'Say what the horizontal line is up to…'
    ],
    yLabel: [
        'What climbs up? (Y)…',
        'Y so serious? Name this axis…',
        'Tell the vertical axis who it is…'
    ],
    column: [
        'Name this slice of the graph…',
        'Column title, no pressure…',
        'What happens in this column stays in this column…'
    ],
    mark: [
        'Say something about this dot…',
        'Tell the dot’s story…',
        'This point has a secret, label it…'
    ],
    chartName: [
        'Name this line…',
        'Untitled line #1 (be creative)…'
    ],
    quick: [
        'Type here, we won’t judge…',
        'Your words, front and center…'
    ]
};

export function pickPlaceholder(kind, seed = Math.random()) {
    const list = PLACEHOLDERS[kind] || PLACEHOLDERS.quick;
    return list[Math.floor(seed * list.length) % list.length];
}

export function placeholderKind(editorKey) {
    if (!editorKey) return 'quick';
    if (editorKey.startsWith('col:')) return 'column';
    return PLACEHOLDERS[editorKey] ? editorKey : 'quick';
}

/** A placeholder that stays the same for the lifetime of the component. */
export function usePlaceholder(kind) {
    const [text] = useState(() => pickPlaceholder(kind));
    return text;
}
