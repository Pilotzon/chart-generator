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
    export                  PNG / SVG download
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
* **Column titles** (both modes): one column per major X step. Font and size are shared; click a column in the
  little chart sketch and a menu opens below it with a rich-text title (bold / italic / underline / colour),
  alignment (left / center / right), placement (above / below the grid) and an optional background colour with opacity.
* **Sketch pickers** (clickable mini charts, `components/controls/Sketches.jsx`): column titles (solid separators,
  number at the bottom, the selected column's ring follows the frame's rounded corners), border lines and axis-arrow
  sides (click the edges of a frame), legend position (four corner chips)
  and, in Advanced mode, marked points (click a dot to open its card below with a caret).
* **Y axis title** sits right next to the Y tick numbers (the left margin is measured from them).
* **Line margin** (Axes & Grid → X / Y axis → *Line Margin*): space between the frame and the data range, in px. The
  axis values and ticks move inwards with the data; the frame, borders and the first / last column backgrounds do not.
  (Use it instead of a negative axis minimum.)
* **Data lines are cut at the axes**: the line and its arrow heads are clipped to the plot area (canvas clip / SVG `clipPath`).
* **Axis title position**: X title *below the axis* or *at the axis end* (to the right of the axis and its arrow, vertically
  centred on the axis; the plot gets narrower and long titles wrap);
  Y title *beside the axis* (rotated) or *above the axis* (horizontal, centred over it). The space that is no longer
  used is given back to the plot, and the left margin grows only as far as a wide horizontal Y title needs.
* **Long triangle** arrow: a bit longer (1.35×) and very slightly narrower (0.42 vs 0.45 half-width) than the triangle;
  available for axis arrows and for line starts / ends.
* **Line ends**: *Line Ends* (Line & markers) switches both ends of the data line between rounded and flat (butt).
* **Dropdowns**: every menu item is exactly as big as the closed dropdown (the menu is wider by its own padding), the
  previously chosen item is marked with a blue check mark on the right. Switches are `#2C7BD7` when on.
* **Alignment inputs** (title alignment, column title alignment) are three icon buttons (left / center / right).
* **Tick numbers** can be hidden in Advanced mode (*Text* tab → *Show Tick Numbers*); the space they reserved is released too.
* **Export**: no bar background or border, just two bordered split buttons, each with a wide label zone and a small
  chevron zone that highlight on their own. SVG: both zones open the popup with *Flip text for MS Word macOS* above
  *Download SVG*. PNG (dark, same size as SVG): Advanced → both zones open the popup (resolution, background); Classic → the label
  downloads directly and the chevron opens a popup with the resolution.
  Shortcuts: Ctrl/Cmd+S → PNG, Ctrl/Cmd+E → SVG.
* **Flip text for MS Word macOS**: Word on macOS draws SVG text left-to-right without bidi, so Hebrew / Arabic comes out
  mirrored. With the option on, every text line that contains Hebrew / Arabic letters is stored in *visual* order:
  the Hebrew / Arabic stretches are reversed (brackets mirrored, niqqud / harakat kept on their letter) while Latin
  words and numbers stay intact and only change position, e.g. `שלום big light` → `big light םולש`. Lines without
  Hebrew / Arabic are untouched, the conversion is its own inverse, and PNG is never flipped.
* **Frame**: the four border lines are square (butt caps, corners filled by extending the sides by half the line width).
* **Axis title placement**: *above the axis* (Y) leaves a 10px gap to the axis top; *at the axis end* (X) puts the last
  text row exactly on the axis line (the arrow's height, real or imaginary).
* **Placeholders**: every text box (title, subtitle, axis labels, column titles, marked-point labels, chart names, quick
  edit) shows a funny grey placeholder (`src/lib/placeholders.js`).
* **Empty text locks its options**: with no title, its alignment / font / size and the *Add Subtitle* button are disabled;
  likewise subtitle font/size, axis-label placements and fonts, column alignment / placement and a marked point's label
  position (disabled rows are `inert`, dimmed and explain themselves in a tooltip).
* **Pick a point on the graph** and its row is highlighted (and scrolled into view) in the points editor; the Data group
  expands and, in Advanced mode, the Chart tab opens.
* **Checkboxes** share one style: 6px corners, slate-blue border, blue when checked.
* **Bigger text than the maximum**: font sizes go up to 200px. Crossing the recommended maximum (title 40, subtitle 30,
  axis labels 36, tick numbers 30, column titles 40; legend 24, marked-point and chart labels 30) first shows a warning.
  Confirm and the chart's frame expands instead of squeezing everything in: the extra room the bigger text needs is added
  around the plot, so the plot, the line, the grid and the other elements keep their size (`getCanvasSize` in
  `src/lib/layout.js`; the Canvas Size group shows the expanded size). Square mode stays square; PNG / SVG export use the
  expanded size. Legend, marked-point and chart-label text overlay the plot, so they just grow.
* Classic and Advanced workspaces are stored separately in `localStorage`.
