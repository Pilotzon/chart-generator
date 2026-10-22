# chart-generator

Graph studio for building publication-style charts (Hebrew / RTL friendly) with **Classic** and **Advanced** modes.
Built with React + Vite.

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # production build into dist/
npm test         # vitest + jsdom
```

## Structure

```
index.html
src/
  main.jsx                 entry
  App.jsx                  provider + layout
  context/AppContext.jsx   all app state: settings, mode, charts, export settings, fonts, toasts
  hooks/                   useSettings (block helpers), useExportSettings (effective export options)
  lib/                     pure logic, no React
    defaults / storage / constants / options / icons
    richText                runs <-> HTML, inversion, wrapping
    layout                  paddings, plot rect, column titles, coordinate mapping
    scene                   draws the chart on any 2D context (preview, PNG, bbox scan)
    svg                     vector export
    export                  PNG / SVG download, "no margins" bounding box
  components/
    layout/                 Sidebar, SidebarHeader, Rail (tab icons + portal tooltips), ChartSelector
    panels/                 ClassicPanel, AdvancedPanels (Chart / Text / Axes / Columns tabs)
    blocks/                 reusable groups of settings (line, markers, data, text, axes, columns, ...)
    controls/               Dropdown (portal), FontDropdown, NumberStepper, Toggle, Group, ...
    richtext/               RichTextEditor + floating SelectionToolbar
    preview/                Preview canvas (hover / drag / quick edit), QuickEdit
    export/                 ExportBar with SVG / PNG popovers
    modals/                 confirmation modals, toasts
  styles/                   index.css (base) + additions.css
  assets/fonts/
tests/                      vitest suites
```

## Features worth knowing

* **Advanced mode** groups settings into four rail tabs: *Chart*, *Text*, *Axes & canvas*, *Columns*.
  The chart switcher is a fixed header above the scrolling area of the Chart tab.
* **Column titles** (both modes): one column per major X step, each with a rich-text title
  (bold / italic / underline / colour), alignment (left / center / right), placement (above / below the grid)
  and an optional background colour with opacity.
* **Export**: the SVG button opens a popup with *Invert text boxes* (also applied to the preview) above
  *Download SVG*. In Advanced mode the SVG and PNG popups also offer *No margins* (crop to content),
  an optional *Background* colour and, for PNG, the resolution (1–4×). Shortcuts: Ctrl/Cmd+S → PNG, Ctrl/Cmd+E → SVG.
* Classic and Advanced workspaces are stored separately in `localStorage`.
