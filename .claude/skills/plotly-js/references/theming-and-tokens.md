# Theming & the `--gok-*` token-bridge

This is the crux of using Plotly in this app, and it is the **opposite** of the LayerChart story. Read it
before theming any chart.

## The constraint (confirmed in Plotly's source): Plotly cannot read `var(--gok-*)`

Every color you pass is validated by **tinycolor2** in `src/lib/coerce.js:173–178`:

```js
coerceFunction: function(v, propOut, dflt) {
    if(tinycolor(v).isValid()) propOut.set(v);
    else propOut.set(dflt);   // invalid → silently dropped, reverts to Plotly's default
}
```

tinycolor2 understands **only** hex / `rgb(a)` / `hsl` / `hsv` / named CSS colors. `tinycolor('var(--gok-color-primary)').isValid()` is `false`, so the value is discarded and the attribute reverts to Plotly's built-in
default (`#444` ink, `#fff` background, the 10-color rainbow `colorway`). This holds **even inside a
`layout.template`** — template values still pass through the same coerce function. There is **no**
CSS-custom-property code path in Plotly (grep confirms zero color `getComputedStyle`/`var(--` usage), and
Plotly bakes the resolved string into an SVG attribute, so the browser will **not** re-color it on a
`data-theme` flip either.

**So Plotly needs exactly what the old ECharts/Lightweight wrappers needed** — concrete resolved colors and a
JS re-theme. LayerChart got to delete this; Plotly keeps it.

## The solution: reuse `src/lib/charts/theme.ts` (do not reinvent it)

The app already ships the bridge. Use it verbatim:

- **`chartTheme()`** → a `ChartTheme` of concrete `rgb()` strings resolved from the `--gok-*` roles (via a
  probe-`<span>` + 1×1-canvas rasterizer that collapses `light-dark(oklch(…))` to sRGB). Roles:
  `text`, `muted`, `border`, `surface`, `surfaceStrong`, `accent`, `up`, `down`, and the raw `fontText` /
  `fontMono` family strings.
- **`onThemeChange(cb)`** → a `data-theme` MutationObserver. On flip, recompute the template and `react`.
- **`categoricalRamp(theme, n)`** → the graded neutral-ink ramp for multi-category charts (never the accent).
  Note this returns `color-mix()` strings — for Plotly (canvas-resolved) you should pass these through
  `resolveColor` too, or add a resolved variant (see "gotcha" below).
- **`prefersReducedMotion()`** → gate `layout.transition` / animation.

> **Gotcha — `categoricalRamp` returns `color-mix()`, which tinycolor also rejects.** For LayerChart (SVG,
> CSS-resolved) that's fine; for Plotly it is not. Either resolve each ramp entry with the (currently
> file-private) `resolveColor` — export it from `theme.ts` — or compute the ramp from the already-resolved
> `theme.text`/`theme.surface` with `Color.interpolate`/`addOpacity`. Simplest: export a
> `resolvedRamp(theme, n)` helper alongside `categoricalRamp`. Everything a Plotly figure receives must be a
> concrete `rgb()`.

## Author ONE token-mapped `layout.template`, reuse it on every chart

Plotly's theme object is `layout.template` = `{ layout: {...}, data: { <traceType>: [ {...}, ... ] } }`.
Coercion order (`coerce.js:415–420`) is **user value → template value → built-in default**, uniformly for
layout and traces — so a single template restyles the whole app. The `data.<type>` array is applied
**round-robin** across traces of that type (so `data.scatter = [{...A}, {...B}]` cycles A, B, A, …).

Build it from a resolved `chartTheme()`:

```ts
// src/lib/charts/plotly-theme.ts (app-local; composes theme.ts, never restyles a DS component)
import { chartTheme, type ChartTheme } from './theme';

export function gokTemplate(t: ChartTheme = chartTheme()) {
  const axis = {
    gridcolor: t.border, zerolinecolor: t.border, linecolor: t.border, tickcolor: t.border,
    tickfont: { color: t.muted, family: t.fontMono, size: 11 },
    showgrid: true, zeroline: false, showline: false, ticks: '' as const,
    automargin: true
  };
  return {
    layout: {
      paper_bgcolor: t.surface, plot_bgcolor: t.surface,
      font: { family: t.fontMono, color: t.text, size: 12 },
      colorway: [t.accent],                      // kill the rainbow — accent only (override per chart)
      xaxis: { ...axis }, yaxis: { ...axis, showgrid: true },
      hoverlabel: { bgcolor: t.surfaceStrong, bordercolor: t.border,
                    font: { color: t.text, family: t.fontMono } },
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: t.text, family: t.fontText } },
      margin: { t: 8, r: 12, b: 22, l: 48 }, showlegend: false
    },
    data: {
      scatter: [{ line: { color: t.accent, width: 2 } }],
      bar:     [{ marker: { color: t.accent } }]
    }
  };
}
```

Pass it on every chart: `layout: { ...perChartLayout, template: gokTemplate() }`.

## Re-theme on a `data-theme` flip — `Plotly.react` with a rebuilt template

`template` is `editType: 'calc'`, so replacing it forces a full recompute. In the wrapper's mount effect:

```ts
const offTheme = onThemeChange(() => {
  const layout = { ...perChartLayout, template: gokTemplate(), uirevision: 'keep' };
  Plotly.react(el, data, layout, config);   // rebuild with freshly-resolved colors
});
// teardown: offTheme(); Plotly.purge(el);
```

Keep **`layout.uirevision`** constant across `react` calls so the user's pan/zoom/selection survive the
flip. `relayout` alone is **not** enough — it won't re-run the per-trace `data.<type>` template, so per-series
colors won't update; `react` with a new template is the complete path.

## Monochrome discipline (Plotly's defaults fight you here — override them)

- **Kill the rainbow `colorway`.** Its default is a 10-color qualitative palette (`src/components/color/attributes.js:5`). Set `colorway: [t.accent]` in the template, and for any multi-series / pie chart pass a
  **resolved neutral ramp** explicitly (`marker.colors` on pie, per-trace `line.color` on multi-line) — never
  the accent for a *category*, never Plotly's palette. The accent is the **focal** series only.
- **Direction by shape + text, never hue alone.** Candlestick/ohlc default to Plotly green/red
  (`src/constants/delta.js`). Re-map to the brand up/down tokens **and** keep the number/label:
  ```js
  increasing: { line: { color: t.up } }, decreasing: { line: { color: t.down } }
  ```
  Pair with the standard hollow-up / filled-down convention so it reads without color.

## Hairline, flat chrome

- `paper_bgcolor` / `plot_bgcolor` = `t.surface`. **Hide vertical gridlines** (`xaxis.showgrid: false` for a
  time series), keep **hairline horizontal** gridlines in `t.border`. `zeroline: false`, `showline: false`,
  `ticks: ''` (no tick marks). Axis labels muted mono (`tickfont.color = t.muted`, `family = fontMono`).
- **Hover label on `surfaceStrong` with no shadow** — Plotly draws the hover box as SVG; set
  `hoverlabel.bgcolor = t.surfaceStrong`, `bordercolor = t.border`. (There's no drop-shadow attribute to
  fight; keep it flat.)
- **Hide the mode bar and logo** on resting charts: `config: { displayModeBar: false, displaylogo: false }`.
  Add zoom/pan only where a chart earns it (a price chart).

## Money & dates (integer minor units in data, format at render)

- **Axis ticks:** `yaxis.tickformat` uses **d3-format** — `'$,.2f'`, or `',.2f'` + `yaxis.tickprefix: '€'`.
  Thousands/decimal glyphs come from `layout.separators` (e.g. `'. '`). Dates: `xaxis.type: 'date'` +
  `xaxis.tickformat: '%d %b'` (d3-time-format; Plotly adds `%h` half-year).
- **Hover:** `hovertemplate` with an inline format — `'%{y:$,.2f}<extra></extra>'` — or pass **pre-formatted
  strings in `customdata`** and reference `%{customdata}`. Keep the underlying `y` in minor units; scale/
  format only in the specifier or via `customdata`. See `reference-lookup.md` for the template grammar.

## Motion & accessibility (keep these)

- **`prefersReducedMotion()`** → omit `layout.transition` (and any `animate`) when true.
- **`role="img"` + text `label`** on the wrapper's container `<div>`; the SVG is decorative, the accessible
  name is the summary string; keep an adjacent text figure. **Numerals for everything.**
- **Fonts:** set the chart `font.family` to `t.fontMono` for numerals/axes (matches the mono-tick
  convention); use `fontText` only for prose-y legend/title text.
