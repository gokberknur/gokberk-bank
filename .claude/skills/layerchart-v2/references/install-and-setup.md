# Install & setup

## The dependency

```bash
npm i layerchart          # v2.x
```

- **Only peer dependency is `svelte@^5`.** This app is Svelte 5.56 — a native fit.
- **d3 is bundled** (`d3-scale`, `d3-shape`, `d3-array`, `d3-time`, `d3-scale-chromatic`, …). You do
  **not** install or manage d3 yourself — but you *do* import specific d3 helpers when a recipe needs
  them, e.g. `import { scaleUtc } from 'd3-scale'` for a time axis, `import { utcDay } from 'd3-time'`.
- **LayerCake is gone** in v2 — context/scales/layout are handled internally by LayerChart's own
  `ChartState`. Don't look for or install `layercake`.
- No Tailwind, no `svelte-ux`, no `culori`, no `date-fns` needed.

When migrating for real, add `layerchart` and remove `echarts` + `lightweight-charts` once the last
wrapper is ported (see `migration-from-echarts.md`). Keep `@gokberknur/design-system` — `Sparkline`
still uses its `gok-sparkline`.

## Imports & bundle-size subpaths

```ts
import { LineChart, AreaChart, BarChart, PieChart, ArcChart } from 'layerchart';
import { Chart, Layer, Axis, Rule, Area, Bars, Spline, Highlight, Tooltip, LinearGradient, Text } from 'layerchart';
```

High-level charts can also be imported from **`layerchart/svg`** or **`layerchart/canvas`** to shave
~5–12% gzip when you know the render layer up front. Specialized layouts live on subpaths:
`layerchart/geo`, `layerchart/hierarchy`, `layerchart/force`. Default to the plain `layerchart`
import unless a chart is on a hot path and you've measured the bundle.

## SPA / SSR notes (this app is `adapter-static`, `ssr = false`)

- The app already sets `ssr = false` in `src/routes/+layout.ts`, so everything renders client-side.
  LayerChart components therefore mount and render normally — **no lazy-load dance is required** the
  way the ECharts wrappers did `await import('echarts')` in `onMount` to keep prerender clean. Just
  `import` the components at the top of the wrapper.
- Because charts are compiled into the bundle now (not fetched at runtime), prefer preset imports and
  the `layerchart/svg` subpath on heavy routes to keep chunks lean.

## Verifying API against the docs (do this every time)

LayerChart's docs site is a client-rendered SPA — a plain fetch of `/docs/...` returns only a
"Loading…" shell. **Use the `/llms.txt` twin of any page** for clean, reliable markdown:

- Index of everything: `https://www.layerchart.com/llms.txt`
- A component: `https://www.layerchart.com/docs/components/BarChart/llms.txt`
- A guide: `https://www.layerchart.com/docs/guides/styles/llms.txt`
- Verbatim example source lives in the repo:
  `https://raw.githubusercontent.com/techniq/layerchart/main/docs/src/examples/components/<Name>/<example>.svelte`

v2 renamed several v1 props (`renderContext=`→`layer=`, `<Axis x="left">`→`<Axis placement="left">`
with `$`-prefixed position values in some spots, `tooltip=`→`tooltipContext=` on `Chart`). When a
snippet from memory or an old blog post doesn't compile, check the component's `/llms.txt` first.
