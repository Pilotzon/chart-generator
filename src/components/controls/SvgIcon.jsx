import { DROPDOWN_ICONS, FONT_ICON, UPLOAD_ICON, HEXAGON_WARN_ICON } from '../../lib/icons.js';

const EXTRA = { font: FONT_ICON, upload: UPLOAD_ICON, warning: HEXAGON_WARN_ICON };

/** Renders one of the raw SVG strings from lib/icons.js. */
export function SvgIcon({ name, className = 'dropdown-item-icon', style }) {
    const html = DROPDOWN_ICONS[name] || EXTRA[name] || DROPDOWN_ICONS.point;
    return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
