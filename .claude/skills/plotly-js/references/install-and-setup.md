# Install, bundling & the Svelte wrapper lifecycle

Plotly is a large, imperative, DOM-mounting library. Two things dominate setup in this app: **keeping it
out of the bundle you don't need** (it does *not* tree-shake) and **mounting/tearing it down correctly**
in a client-only SvelteKit SPA.

> Sanity check first: the app already ships `layerchart-v2` as its Svelte-native charting standard. Before
> adding Plotly (~370 kB gzip minimum), confirm the chart genuinely needs something Plotly does and
> LayerChart doesn't (e.g. a specific finance/statistical trace). `gok-bank-product-owner` gates that call.

## The dependency — pick the smallest entry, because Plotly won't tree-shake

`package.json` in the clone declares only `"main": "./lib/index.js"` — **no `module`, `exports`, or
`sideEffects` field.** So Vite/Rollup cannot dead-code-eliminate unused traces: importing a full entry pulls
**every** trace. Bundle size is controlled by **which entry you import**, not by the bundler.

Ranked by preference for this app:

### 1. `plotly.js/lib/core` + `register()` — recommended (SVG cartesian only)

`lib/core` registers **only `scatter`** plus all API methods and core components. You then register exactly
the traces you use. This is what every official `lib/index-*.js` does internally.

```bash
npm i plotly.js          # source; Vite compiles the CJS + glsl on demand
```

```ts
// src/lib/charts/plotly.ts — a single place that assembles the app's Plotly instance.
import Plotly from 'plotly.js/lib/core';
import bar from 'plotly.js/lib/bar';
import pie from 'plotly.js/lib/pie';
// finance surfaces only:
import candlestick from 'plotly.js/lib/candlestick';
import ohlc from 'plotly.js/lib/ohlc';

Plotly.register([bar, pie, candlestick, ohlc]); // scatter is already in core
export default Plotly;
```

Each `plotly.js/lib/<trace>.js` is a thin re-export of `src/traces/<trace>`. Register lists to copy from:
`lib/index-basic.js` (bar, pie), `lib/index-finance.js` (bar, histogram, funnel, waterfall, pie,
funnelarea, indicator, ohlc, candlestick), `lib/index-cartesian.js` (all SVG cartesian).

### 2. A prebuilt partial dist package — no `register` step, slightly larger

If a stock list matches your needs and you'd rather not maintain the register call:
`plotly.js-basic-dist-min` (bar, pie, scatter), `plotly.js-finance-dist-min` (+ candlestick/ohlc/waterfall/
funnel/indicator), `plotly.js-cartesian-dist-min` (all SVG cartesian). Default export is a ready `Plotly`.

### 3. `plotly.js-dist-min` — the full bundle. Avoid.

All traces, ~1.4 MB gzip. Only if you truly need many trace families.

**Approx sizes (min + gzip, from `dist/README.md`):** basic **366 kB** · finance **400 kB** · cartesian
465 kB · full **1.4 MB** · gl2d 523 kB · gl3d 529 kB · mapbox 582 kB.

**Never pull `gl2d`/`gl3d`/`mapbox`/`map`/`geo` traces** for balance/spend/net-worth/price charts — they
drag in `regl-*`, the vendored `gl-*` stack, `maplibre-gl`/`mapbox-gl`, or `d3-geo`/topojson for no benefit.
Stay on **SVG cartesian**.

### Custom prebuilt artifact (rarely needed)

The clone can emit a single minimal IIFE bundle: `npm run custom-bundle -- --traces scatter,bar,pie`
(→ `dist/plotly-<out>.min.js`; `scatter` is always force-included; `--strict` for CSP-safe, ~10% larger).
For a Vite app the `lib/core` + `register` path above is simpler and the same size — use custom-bundle only
if you want one vendored file.

## Client-only, dynamic import (this app is `adapter-static`, `ssr = false`)

`src/core.js` touches `window`/`document` at **module-eval time** (injects `plotcss`, reads
`window.PlotlyLocales`). A top-level `import` in any prerender/SSR pass throws `window is not defined`. Even
with `ssr = false`, the module graph is analyzed for prerender — so **import Plotly dynamically, inside the
mount**, which also keeps it out of the initial route chunk:

```ts
// inside the wrapper's mount (see lifecycle below) — never a top-level import
const Plotly = (await import('$lib/charts/plotly')).default; // the assembled instance from step 1
```

## The Svelte wrapper lifecycle (author via the `svelte:svelte-file-editor` agent)

Plotly mounts onto a real `<div>` and must be updated with `react`, resized, and purged. A wrapper is a
small state machine, not markup. The shape (Svelte 5 runes; the MCP will refine the exact rune/attachment
idiom):

```svelte
<script lang="ts">
  import { chartTheme, onThemeChange, prefersReducedMotion } from '$lib/charts/theme';

  interface Props { data: /* SeriesPoint[] etc. */; label: string; height?: string; }
  let { data, label, height = '16rem' }: Props = $props();

  let el: HTMLDivElement;
  let Plotly: typeof import('$lib/charts/plotly').default | undefined = $state();

  // Build { data, layout, config } from props + the resolved theme. Pure — no side effects.
  function figure() {
    const t = chartTheme();                       // resolved rgb() strings (see theming-and-tokens.md)
    return {
      data: [/* trace objects using t.accent, t.border, … */],
      layout: { paper_bgcolor: t.surface, plot_bgcolor: t.surface, font: { family: t.fontMono },
                margin: { t: 8, r: 12, b: 22, l: 48 }, showlegend: false,
                transition: prefersReducedMotion() ? undefined : { duration: 200 } },
      config: { displayModeBar: false, responsive: true, displaylogo: false }
    };
  }

  $effect(() => {
    let disposed = false, offTheme = () => {};
    (async () => {
      Plotly = (await import('$lib/charts/plotly')).default;
      if (disposed) return;
      const f = figure();
      await Plotly.newPlot(el, f.data, f.layout, f.config);   // first render
      offTheme = onThemeChange(() => { const g = figure(); Plotly!.react(el, g.data, g.layout, g.config); });
    })();
    return () => { disposed = true; offTheme(); if (Plotly) Plotly.purge(el); };  // teardown
  });

  // Reactive data updates → react(), not newPlot():
  $effect(() => { if (Plotly && data) { const f = figure(); Plotly.react(el, f.data, f.layout, f.config); } });
</script>

<div bind:this={el} style:height role="img" aria-label={label}></div>
```

Key rules the lifecycle encodes:
- **`newPlot` once, `react` for every update** (data change *and* theme flip). Never `newPlot` twice.
- **`onThemeChange` → `react`** re-themes with no remount (Plotly can't follow `data-theme` on its own —
  see `references/theming-and-tokens.md`).
- **`config: { responsive: true }`** auto-resizes; call `Plotly.Plots.resize(el)` after a sidebar/tab
  resize that doesn't fire a window resize.
- **`Plotly.purge(el)` in teardown** — mandatory; leaks listeners/GL contexts otherwise.
- **`role="img"` + `label`** on the container; keep an adjacent text summary of the key figure.
