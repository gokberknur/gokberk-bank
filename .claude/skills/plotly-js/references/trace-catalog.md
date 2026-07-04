# Trace catalog

Plotly draws every chart from an array of **trace** objects (`data: [{ type, … }]`). This is the full
v3.7.0 catalog (49 types), grouped by rendering backend, with each type's canonical attribute file in the
clone. **★ = the bank's primary set** (SVG cartesian, light). Read a type's options from
`.claude/gitrepos/plotly.js/src/traces/<type>/attributes.js` (see `reference-lookup.md`).

## SVG cartesian / statistical — use these

| type | plots | attributes.js |
|---|---|---|
| ★ `scatter` | lines / markers / **area** (via `fill`) — the base trace | `src/traces/scatter/attributes.js` |
| ★ `bar` | vertical/horizontal bars (`orientation`); stack/group via `barmode` (layout) | `src/traces/bar/attributes.js` |
| ★ `pie` | pie / **donut** (`hole`) | `src/traces/pie/attributes.js` |
| ★ `indicator` | **gauge / big-number / delta KPI tile** | `src/traces/indicator/attributes.js` |
| ★ `candlestick` | candlestick (composes ohlc + box) | `src/traces/candlestick/attributes.js` |
| ★ `ohlc` | open-high-low-close bars | `src/traces/ohlc/attributes.js` |
| ★ `waterfall` | running-total bars (increasing/decreasing/total) | `src/traces/waterfall/attributes.js` |
| ★ `funnel` | funnel bar chart | `src/traces/funnel/attributes.js` |
| ★ `histogram` | auto-binned 1-D distribution | `src/traces/histogram/attributes.js` |
| ★ `box` | box-and-whisker distribution | `src/traces/box/attributes.js` |
| `violin` | violin (KDE) distribution | `src/traces/violin/attributes.js` |
| ★ `heatmap` | color-mapped z-matrix grid | `src/traces/heatmap/attributes.js` |
| `contour` | contour lines of a z-matrix | `src/traces/contour/attributes.js` |
| `histogram2d` / `histogram2dcontour` | 2-D binned heatmap / contour | `src/traces/histogram2d*/attributes.js` |
| `image` | pixel image (z as RGBA) | `src/traces/image/attributes.js` |
| `funnelarea` | area-proportional funnel (pie-like) | `src/traces/funnelarea/attributes.js` |

## Non-cartesian / hierarchy / DOM (SVG, situational)

| type | plots | attributes.js |
|---|---|---|
| `sunburst` / `treemap` / `icicle` | radial / nested-rect / icicle hierarchies | `src/traces/{sunburst,treemap,icicle}/attributes.js` |
| `sankey` | flow / sankey diagram | `src/traces/sankey/attributes.js` |
| `table` | data table (prefer `gok-table` in this app) | `src/traces/table/attributes.js` |
| `parcoords` / `parcats` | parallel coordinates / categories | `src/traces/{parcoords,parcats}/attributes.js` |

## Heavy backends — avoid unless a surface truly needs them

- **WebGL 2-D (regl):** `scattergl`, `splom`, `scatterpolargl` — only for tens-of-thousands of points.
- **WebGL 3-D (gl-\*):** `scatter3d`, `surface`, `mesh3d`, `cone`, `streamtube`, `isosurface`, `volume`.
- **Tile maps:** `scattermap`/`choroplethmap`/`densitymap` (MapLibre), `scattermapbox`/… (Mapbox).
- **Geo (d3-geo/topojson):** `scattergeo`, `choropleth`.
- **Polar / ternary / smith / carpet:** `scatterpolar`, `barpolar`, `scatterternary`, `scattersmith`,
  `scattercarpet`, `contourcarpet`, `carpet`.

These drag in `regl-*` / the vendored `gl-*` stack / `maplibre-gl` / `d3-geo` and add 150–220 kB+ gzip.
For balance / spend / net-worth / allocation / price charts, **stay on SVG cartesian** (`install-and-setup.md`).

## The attribute convention (same for every trace)

A trace is a plain object. Options nest, and **dotted paths mirror the nesting** (`line.color`,
`marker.size`, `increasing.line.width`) — the exact strings `restyle` takes. Common leaf metadata:
`valType`, `dflt`, `editType`, `description` (see `reference-lookup.md`). Attributes shared by *all* traces
(`name`, `visible`, `opacity`, `hoverinfo`, `showlegend`, `legendgroup`, `customdata`, `meta`) live in
`src/plots/attributes.js`, not the per-trace file.

**Worked example — `scatter`** (`src/traces/scatter/attributes.js`): `x`/`y` data; `mode`
(`'lines'|'markers'|'text'` flaglist, `:243`); `line` (`.color`, `.width` dflt 2, `.shape`
`linear|spline|hv|vh|…`, `.dash`, `:272`); `fill` (`'none'|'tozeroy'|'tonexty'|'toself'|…`, `:359`) +
`fillcolor` (`:386`); `marker` (`.symbol`, `.size`, `.color`, `.line`, `:439`); `hovertemplate` (`:269`);
`text`/`texttemplate`. An **area chart is `scatter` with `fill: 'tozeroy'`** — there is no separate area
trace.

**Worked example — `candlestick`** (`src/traces/candlestick/attributes.js`): `x`, `open`, `high`, `low`,
`close` (`:28–32`); `increasing`/`decreasing` each `{ line: {color, width}, fillcolor }` (`:46`, `:48`);
`xhoverformat`/`yhoverformat`; `whiskerwidth`. Defaults are Plotly green/red (`src/constants/delta.js`) —
re-map to brand up/down tokens (see `theming-and-tokens.md`).

## Choosing a trace for a bank chart

| Bank chart | Trace | Notes |
|---|---|---|
| Net-worth / balance / performance line | `scatter` `mode:'lines'` (+ `fill:'tozeroy'` for area) | one accent line over a soft accent fill |
| Spending by category / month | `bar` (+ `barmode:'stack'` or `'group'` in layout) | neutral ramp, never the accent for categories |
| Allocation / portfolio split | `pie` with `hole: 0.6` (donut) | `marker.colors` = resolved neutral ramp + center text |
| Price / OHLC | `candlestick` or `ohlc` (+ a `bar` volume trace on a second y-axis) | brand up/down + shape; see recipe |
| KPI / gauge (savings rate, goal %) | `indicator` (`mode:'gauge+number+delta'`) | calm; single accent arc |
| Cash-flow / P&L bridge | `waterfall` | increasing/decreasing/total by shape + label |
| Distribution (returns, spend) | `histogram` or `box` | |
| Calendar / intensity grid | `heatmap` | neutral single-hue colorscale, resolved |
