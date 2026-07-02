# Component catalog (the parts this app uses)

LayerChart v2 has a large surface; this lists the components the bank actually needs, with the props
that matter. Always confirm exact props/defaults against `<page-url>/llms.txt` — v2 renamed several.

## Containers & layout

### `Chart` — the root context
Holds dimensions, accessors, scales. Key props:
- **`data`** (required), **`x` / `y` / `c`** accessors — each a string (`x="date"`), function
  (`x={(d) => d.date}`), or array (`y={['low','high']}` to span fields).
- **`xScale` / `yScale` / `cScale`** — d3 scales, e.g. `xScale={scaleUtc()}` for time.
- **`cDomain` / `cRange`** — color scale domain/range (arrays or a scheme). Drives series/category color.
- **`xDomain` / `yDomain`** — `yDomain={[0, null]}` pins a baseline; `yNice` rounds the domain.
- **`padding`** — `{ top, right, bottom, left }` (use `defaultChartPadding({ right: 10, legend: true })`).
- **`tooltipContext`** — `true | { mode }` to enable hover tracking. Modes: `bisect-x` (sorted time
  series), `band` (bars), `voronoi`/`quadtree` (scatter), `quadtree-x` (candlestick), `bounds`.
- Default feature flags (each `boolean | props | snippet`): `axis`, `grid`, `rule`, `highlight`,
  `points`, `labels`, `legend`, `brush`.
- **Snippets:** `belowContext`, `belowMarks`, `marks`, `aboveMarks`, `aboveContext`, `children` — each
  gets `{ context }` (the `ChartState`: `width`, `height`, scales, `tooltip`, …).

### `Layer` — the render target
Wraps marks; renders **svg** by default. `type="canvas"` / `type="html"` (or `layer=` on preset
charts) switch the target. `center` centers the coordinate origin (used by Pie/Arc/gauge).

### Preset charts (start here)
`LineChart`, `AreaChart`, `BarChart`, `PieChart`, `ArcChart`, `ScatterChart`. Each is a pre-wired
`Chart` picking the right mark + tooltip mode + axis/grid/rule/highlight defaults + a default series
(`[{ key:'default', value:y, color:'var(--color-primary)' }]`). Shared knobs:
- **`series: { key, label?, color?, value?, props?, data? }[]`** — multi-series; `color` is used by
  mark + legend + tooltip together.
- **`props={{ xAxis, yAxis, tooltip, highlight, grid, spline, bars, area, … }}`** — forwards config to
  inner sub-components. This is how you style axes/tooltip without dropping to composition.
- **`legend`** (boolean) — add a legend; reserve room with `padding={defaultChartPadding({ legend: true })}`.
- **`{#snippet marks()}`** — replace/augment the default marks while keeping axes/tooltip.
- **`layer="svg" | "canvas"`** (BarChart also `"html"`), **`onPointClick`**.

## Axes & decorations

### `Axis`
- **`placement`** (required): `'top' | 'bottom' | 'left' | 'right' | 'angle' | 'radius'`.
- **`format`**: a `FormatType` name (`'day'`, `'decimal'`, `'metric'`, `'none'`, `'currency'`) or a
  function — drives tick formatting (money/date/number).
- **`grid`**: `boolean | { class, stroke, strokeWidth, dashArray, … }` — grid lines for that axis.
- **`rule`**: boolean — the axis baseline/domain line.
- **`ticks` / `tickSpacing`** (approx px between ticks; default 80 h / 50 v), **`tickMultiline`**,
  **`tickLength`**, **`label`**, **`labelPlacement`**.
- In presets, configure via `props={{ xAxis: {...}, yAxis: {...} }}` rather than placing `<Axis>` yourself.

### `Grid`, `Rule`, `Frame`, `Legend`, `CircleLegend`
- **`Grid`** — standalone gridlines. **`Frame`** — a border rect.
- **`Rule`** — a data-driven line mark (also the candlestick primitive): `x` / `y` accept a value or a
  `[from, to]` array; `strokeWidth`, `stroke`/`class`.
- **`Legend`** — standalone: `scale` (a d3 scale, required), `title`, `variant: 'ramp' | 'swatches'`,
  `orientation`, `value` (auto-reads hovered datum), `onclick` (toggle series). Easiest path is the
  preset `legend` prop instead.

## Marks (data → shapes)

| Mark | Renders | Notes |
|---|---|---|
| `Spline` | line path | the line in LineChart; `stroke`, `class`, `curve` |
| `Area` | filled area | `fill` (accepts a gradient), `line={{ stroke }}`, `fillOpacity` |
| `Bars` | bar series | vertical/horizontal via chart `orientation`; `radius` |
| `Rule` | wick/reference line | candlestick body & wick; `[from,to]` value arrays |
| `Pie` | pie/donut arcs | inside PieChart; `innerRadius`, `cornerRadius`, `padAngle` |
| `Arc` | single arc | gauges/radial progress; `value`, `domain`, `range`, `track`, `motion` |
| `Points` | scatter dots | `r`, `fill`; used for highlight dots |
| `Text` | text label | `value`, `x`/`y`, `textAnchor`, `verticalAnchor`, `dy` — donut center text |
| `Labels` | per-datum labels | auto labels on a series |
| `LinearGradient` | `<def>` gradient | wraps a mark; snippet yields `{ gradient }` to pass as `fill` |

## Interactions

### `Tooltip` (compositional, plain stylable HTML)
Two parts: **`tooltipContext`** on `Chart` (pointer tracking) + display components:
- **`Tooltip.Root`** — `children` snippet gets `{ data }` (and a `series` array for multi-series).
  Props: positioning (`x`/`y`, snap-to-data), `classes: { root, container, content, header }`, `portal`.
- **`Tooltip.Header`** — `value`, `format`.
- **`Tooltip.List`** + **`Tooltip.Item`** — `label`, `value`, `format` (`'currency'`, `'decimal'`,
  `'metric'`), a `color` swatch for the series.

### `Highlight` (crosshair/indicators at hovered point)
Independent visual modes, each `true | props | snippet`: **`points`** (`{ r, class }`), **`lines`**
(crosshair), **`area`** (shaded region), **`bar`**. **`axis: 'x' | 'y' | 'both' | 'none'`** chooses
which crosshair lines render. In presets: `props={{ highlight: { points: { r: 3, class: '…' } } }}`.

### `TransformContext`, `BrushContext`, `Voronoi`
Pan/zoom, brush-select, and scatter hit-testing respectively. Needed for candlestick pan/zoom and
range-brushing (not built into the basic recipes).

## Color assignment (three layers)

1. **Default** — every mark inherits `currentColor`; default series color is `var(--color-primary)`.
2. **Explicit `series[].color`** — used by mark + legend + tooltip together. Pass `var(--gok-*)`.
3. **Data-driven `c` scale** on `Chart` — `c` accessor + `cScale`/`cDomain`/`cRange`. Used by
   candlestick (up/down), heatmaps, and pie (where `c` defaults to `key`).
