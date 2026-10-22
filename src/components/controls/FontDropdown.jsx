import { useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Dropdown } from './Dropdown.jsx';

/** Font picker: built-in + uploaded fonts, plus an "Upload font…" action. */
export function FontDropdown({ value, onChange }) {
    const { allFonts, uploadFonts } = useApp();
    const fileRef = useRef(null);
    const options = allFonts.map(f => ({ value: f.value, label: f.name, icon: 'font' }));
    // keep a stale value (e.g. an uploaded font that was removed) visible
    if (value && !options.some(o => o.value === value)) {
        options.push({ value, label: String(value).split(',')[0].replace(/['"]/g, ''), icon: 'font' });
    }
    return (
        <>
            <Dropdown
                className="font-dropdown"
                value={value}
                options={options}
                onChange={onChange}
                extraItems={[{ key: 'upload', className: 'dropdown-item-upload', label: 'Upload font…', icon: 'upload', onSelect: () => fileRef.current?.click() }]}
            />
            <input
                ref={fileRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                style={{ display: 'none' }}
                onChange={async (e) => {
                    const files = e.target.files;
                    const v = await uploadFonts(files);
                    if (v) onChange(v);
                    e.target.value = '';
                }}
            />
        </>
    );
}
