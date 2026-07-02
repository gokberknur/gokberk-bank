# Migrating the existing wrappers to LayerChart v2

The app's charts live behind a clean barrel — **no route imports `echarts` or `lightweight-charts`
directly**; everything imports from `$lib/charts`. So migration is wrapper-by-wrapper behind a stable
prop API: keep each wrapper's props (`data`, `formatValue`, `height`, `label`, …) identical and swap the
internals. Consumers don't change.

## Order of work

1. **Bridge first.** Add the `.lc-root-container` → `--gok-*` block + `@layer` declaration
   (`theming-and-tokens.md`), and create `src/lib/charts/tokens.ts` (`chartTokens`, `categoricalRamp`,
   move `prefersReducedMotion`). This unlocks every wrapper.
2. **Pilot one wrapper** end-to-end and verify in the running app (theme flip, no console errors,
   `npm run check`). Recommended pilot: `LineChart.svelte` (simplest, exercises area + token theming).
3. Port the rest. When the last JS-lib wrapper is gone, remove `echarts` + `lightweight-charts` from
   `package.json`; keep `@gokberknur/design-system` (Sparkline).
4. Log the DS-gap/dogfooding note in `docs/dogfooding/findings.md` (charts stay app-local; findings go
   to this repo only, per CLAUDE.md).

## Wrapper-by-wrapper map

| Wrapper (`src/lib/charts/`) | Today | LayerChart v2 | Recipe |
|---|---|---|---|
| `PriceChart.svelte` | Lightweight Charts (candlestick/line) | `Chart` + `Rule`×2 + `Highlight` + `Tooltip`, `scaleUtc()`; line mode → `LineChart` | recipe 1 / 2 |
| `LineChart.svelte` | ECharts (line + soft fill) | `AreaChart` + `Area` flat-opacity fill (or `LineChart` when `area=false`) | recipe 3 / 2 |
| `DonutChart.svelte` | ECharts (ring + center text) | `PieChart` negative `innerRadius` + `aboveMarks` `Text` + `categoricalRamp` | recipe 5 |
| `StackedBar.svelte` | ECharts (stacked, h/v) | `BarChart` `seriesLayout="stack"` + `orientation` + ramp series | recipe 4 |
| `PayoffChart.svelte` | ECharts (two-series glide) | `LineChart`/`AreaChart` multi-series: accent `afterAction` + area, muted dashed `original` | recipe 2 + 3 |
| `Sparkline.svelte` | DS `gok-sparkline` web component | **No change** — DS primitive, not a JS-lib wrapper | recipe 6 |

`util.ts` (the `color-mix()` → `rgb()` resolver for zrender) and most of `theme.ts` (the probe-canvas
`resolveColor` + `onThemeChange` observer) become **dead code** once ECharts/Lightweight are gone —
delete them. Keep `series.ts` (pure data derivations — unchanged) and `prefersReducedMotion`.

## What gets simpler

- **No imperative lifecycle.** ECharts wrappers do `await import('echarts')` in `onMount`, `echarts.init(el)`,
  a `ResizeObserver`, `chart.setOption(buildOption(), true)`, `onThemeChange(reapply)`, and `chart.dispose()`.
  A LayerChart wrapper is just markup + `$props()`; LayerChart handles sizing (ResizeObserver internally)
  and reactivity. **Delete all of that plumbing.**
- **No `data-theme` observer.** SVG re-themes via CSS cascade (see `theming-and-tokens.md`). Remove
  `onThemeChange` from every wrapper.
- **No `buildOption()` option object.** Declarative components replace the big ECharts config tree.

## API-shape translation (ECharts → LayerChart)

| ECharts | LayerChart |
|---|---|
| `series: [{ type: 'line' }]` | `<LineChart>` / `<Spline>` |
| `series: [{ type: 'bar', stack: 'x' }]` | `<BarChart seriesLayout="stack">` |
| `series: [{ type: 'bar' }]` grouped | `seriesLayout="group"` |
| horizontal bars via swapped `xAxis`/`yAxis` | `orientation="horizontal"` |
| `series: [{ type: 'pie', radius: ['62%','86%'] }]` | `<PieChart innerRadius={-24}>` |
| `areaStyle: { opacity: 0.12 }` | `<Area fillOpacity={0.12}>` |
| `tooltip.formatter` | `<Tooltip.Item value={formatValue(...)}>` or `format` |
| `xAxis.axisLabel.formatter` | `props={{ xAxis: { format: fn } }}` |
| `splitLine.lineStyle.color` | `props={{ yAxis: { grid: { stroke: ... } } }}` |
| `animation: !reduced` | per-component `motion` prop gated on `prefersReducedMotion()` |

## Gotchas (verify these during migration)

- **Candlestick has no built-in volume pane or pan/zoom.** Add a `Bars` layer for volume;
  `TransformContext` for pan/zoom; `Rule/candlestick-with-brushing` for range brush. Budget for this —
  Lightweight Charts gave these for free.
- **Money format.** LayerChart's named `format` values (`'currency'`, `'metric'`, `'decimal'`) use d3
  formatting and won't know your EUR minor-unit convention. Pass a **function** (`format={(v) => eur(v)}`
  or the wrapper's `formatValue`) so amounts render through `$lib/format`.
- **`c`/`cRange` domain length must match** the number of categories, else colors recycle. Build
  `categoricalRamp(data.length)`.
- **Canvas mode** (`layer="canvas"`) reintroduces the color-resolution problem — keep it SVG unless a
  dataset is genuinely huge (see `theming-and-tokens.md` caveat).
- **v1→v2 renamed props** (if you find any v1 snippet): `renderContext=`→`layer=`,
  `getRenderContext()`→`getLayerContext()`, `<Chart tooltip=>`→`tooltipContext=` (but Arc/Pie/Calendar go
  the other way: `tooltipContext`→boolean `tooltip`), `getTooltipContext()`→`getChartContext().tooltip`,
  `bind:brushContext`→`bind:state`, Geo `GeoContext`→`GeoProjection` from `layerchart/geo`. Confirm on
  `docs/guides/migrations/v1-to-v2/llms.txt`.

## Definition of done (per wrapper)

- Renders with `--gok-*` colors; flips correctly on `data-theme` **with no JS observer**.
- Monochrome discipline held: accent only on the focal series; categories on the neutral ramp.
- `role="img"` + `label`; adjacent text summary; mono numerals; money via `formatValue`.
- `prefers-reduced-motion` respected.
- No console errors; `npm run check` green; consumers unchanged (same props).
- Held against `gokberk-design` `verification.md`.
