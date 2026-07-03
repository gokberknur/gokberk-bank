---
name: layerchart-v2
description: >-
  LayerChart v2 charting how-to for the gökberk bank app — the guide for building, editing, or
  migrating ANY chart, graph, plot, or data visualization in this repo with LayerChart v2 (the
  Svelte-native chart library adopted to replace the app's Apache ECharts + TradingView
  Lightweight Charts stack). Use this WHENEVER work touches a chart: the price/candlestick or
  crypto chart, a line or area trend (net worth, balance, portfolio performance, amortization),
  spending/category bars, an allocation or budget donut, a sparkline, a gauge/progress arc,
  tooltips/axes/legends on a chart, chart theming, or the chart token-bridge — anything under
  `src/lib/charts/**` or any route/component that renders one. Trigger it EVEN IF the user just
  says 'add a chart', 'the spending graph', 'the donut', 'make the balance chart', or 'migrate the
  charts to LayerChart'. It owns how LayerChart v2 is installed, themed with `--gok-*` tokens (no
  Tailwind), composed (Chart / Layer / marks / snippets), and mapped from the old
  ECharts/Lightweight-Charts wrappers. It composes WITH — never overrides — the Svelte MCP (how
  `.svelte` is written) and `gokberk-design` (how it looks). Do NOT use it for the DS
  `gok-sparkline` primitive path (that stays a design-system component) or for non-chart UI.
---

# LayerChart v2 — charting in gökberk bank

**LayerChart v2** (`layerchart@2.x`, published 2026-07) is a composable, Svelte-native charting
library built on D3. It is the app's charting foundation, replacing the imperatively-driven
**Apache ECharts** and **TradingView Lightweight Charts** wrappers under `src/lib/charts/`. Because
it is *Svelte components* (not a JS lib you `init()` onto a `<div>`), a LayerChart wrapper is far
smaller than the old ones: no `onMount`/`init`/`ResizeObserver`/`dispose` plumbing, and — the big
one — **no `data-theme` MutationObserver**, because it renders SVG and re-themes for free (below).

> **You have the full library source on disk.** A git-ignored clone of LayerChart v2.0.1 lives at
> **`.claude/gitrepos/layerchart`** — the **reference-lookup target**. The component source under
> `packages/layerchart/src/lib/components/` (props/defaults/behaviour of *this exact version* — e.g.
> `Area/Area.shared.svelte.ts`, `charts/AreaChart/AreaChart.base.svelte`) is ground truth; grep it
> before trusting memory or a blog. Docs + examples live under `docs/`. Prefer the clone over the
> network — it's version-exact and can't drift. (Example lesson it settled: v2's `Area` `defined`
> guard rejects `null` but **not `NaN`**, so a mark must be gated on measured `context.width`/`height`
> or the pre-measure frame leaks a transient `MNaN` `<path>` console error — see `chart-recipes.md`.)

## This skill sits under the two authorities — it does not replace them

1. **Svelte MCP governs how the code is written.** Author/edit every `.svelte` chart wrapper through
   the `svelte:svelte-file-editor` agent. LayerChart v2 is runes + snippets throughout, and
   web-component ↔ chart interop has sharp edges — never hand-write from memory.
2. **`gokberk-design` governs how it looks and reads.** Hold every chart against its
   `brand-language.md` / `patterns.md` / `verification.md`. This skill tells you the LayerChart
   *mechanics*; `gokberk-design` decides whether the result is on-brand.

Read the feature's `.planning` spec and consult the owning domain expert (e.g. `gok-bank-wealth`
for the price chart, `gok-bank-money` for spend bars) for what the chart must *say*.

## Mental model (read this before writing any chart)

- **`<Chart>`** is the root. It computes dimensions and holds context: data **accessors** (`x`, `y`,
  `c`, and friends — each accepts a **string** `x="date"`, a **function** `x={(d) => d.date}`, or an
  **array** `y={['low','high']}`), **scales** (`xScale`, `yScale`, `cScale`), domains, ranges, and
  padding. Child marks read this via context.
- **Render layers** wrap marks in a **`<Layer>`** (or set `layer="svg" | "canvas" | "html"`):
  - **svg** — the default. Best graphics + interactivity + introspection. Use it. (It's what makes
    `--gok-*` theming work natively.)
  - **canvas** — only for very large datasets; needs *resolved* colors (see token-bridge caveat).
  - **html** — layout-heavy text overlays.
- **Marks go inside snippets**, not slots. `<Chart>` renders ordered snippets, each receiving
  `{ context }`: `belowContext` → `belowMarks` → `marks` → `aboveMarks` → `aboveContext`, or
  `children` to take over the whole layout. Put your data marks (`Spline`, `Area`, `Bars`, `Rule`,
  `Pie`, `Arc`, `Points`) in `marks`; put centered labels/overlays in `aboveMarks`.
- **Two ways to build a chart:**
  - **Presets** — `LineChart`, `AreaChart`, `BarChart`, `PieChart`, `ArcChart`, `ScatterChart` wire
    up axis/grid/tooltip/highlight/legend/a default series for you. **Start here** for the common
    cases. Configure inner pieces via `props={{ xAxis, yAxis, tooltip, highlight }}` and drop into
    `{#snippet marks()}` for custom marks.
  - **Composition** — `Chart` + `Layer` + individual marks + `Axis`/`Highlight`/`Tooltip`. The
    escape hatch; needed for candlesticks and gauges (no preset exists).
- **No `<Candlestick>` component.** A candlestick is `Chart` + two `Rule` marks (thin high→low wick,
  thick open→close body) colored by a `c`/`cDomain`/`cRange` accessor. See `chart-recipes.md`.

## Styling — plain CSS variables, **no Tailwind** (this is why v2 fits us)

v2 dropped its Tailwind requirement. It ships default styles in Svelte `<style>` blocks scoped into
CSS cascade layers, and themes off variables on **`.lc-root-container`**. Docs sometimes show
Tailwind utility classes (`class="fill-primary/30"`) — **do not copy those**; use `--gok-*` instead.

Three ways to color a chart, all Tailwind-free:
1. **Map LayerChart's variables to our tokens, once, globally** — `--color-primary`,
   `--color-surface-100/200/300`, `--color-surface-content`. Because `--gok-*` tokens are already
   `light-dark(oklch(…))`, this auto-follows the theme with **no dark-mode block**.
2. **Per-series / per-mark props** — `stroke`, `fill`, `series[].color`, `cRange` all accept any CSS
   color, so pass `"var(--gok-color-primary)"` etc. directly.
3. **`class` / `style` props** for one-off overrides (target `:where(.lc-*)` for zero-specificity).

**The token-bridge and the exact variable list live in `references/theming-and-tokens.md` — read it
before theming anything.** It also covers the non-Tailwind `@layer` declaration you must add.

## Non-negotiable chart discipline (carried over from the current bridge)

These are app rules `gokberk-design` enforces — LayerChart makes them easy, don't regress them:
- **Monochrome canvas, one earned accent.** The forest-green accent (`--gok-color-primary`) is the
  *focal* series only. Multi-series / categorical charts (donut, stacked bars) use a **graded
  neutral ink ramp**, never the accent, never a rainbow. Use `categoricalRamp(n)` (see token-bridge).
- **Direction by shape + text, never hue alone.** Up candles hollow, down filled; a rising line uses
  `--gok-color-status-success`, falling uses `-error`, but always paired with the number/label.
- **Hairline, flat chrome.** Hidden vertical gridlines, hairline horizontal splitlines
  (`--gok-color-border`), muted mono axis labels, tooltip on `surface-strong` with **no shadow**.
- **`prefers-reduced-motion`** disables chart animation (`prefersReducedMotion()` helper).
- **Every chart is `role="img"` with a text `label`**, treated as decorative, with an adjacent text
  summary of the key figure. Numerals for everything.
- **Money stays integer minor units** in data; a `formatValue`/`format` fn renders it. Routes stay
  dumb — no chart logic in routes; wrappers live in `src/lib/charts/`.
- **`Sparkline` stays on the DS `gok-sparkline` web component** (build with `gok-*` first). It is not
  a LayerChart wrapper and is out of migration scope.

## Where to go next

| Read this reference | When |
|---|---|
| `references/install-and-setup.md` | Adding the dep, imports/subpaths, SPA/`ssr=false` notes, the `/llms.txt` docs trick |
| `references/theming-and-tokens.md` | **Any theming** — the `--gok-*` bridge, `categoricalRamp`, why the observer/probe-canvas are gone, canvas caveat |
| `references/component-catalog.md` | Looking up a component's props (Chart, Axis, Tooltip, Highlight, Legend, marks) |
| `references/chart-recipes.md` | Building a specific chart type — candlestick, line, area, bar, donut, sparkline, gauge |
| `references/migration-from-echarts.md` | Porting an existing `src/lib/charts/*` wrapper; ECharts/Lightweight → LayerChart mapping + gotchas |

**Confirm API against the local clone first.** `.claude/gitrepos/layerchart` is version-exact
(2.0.1, matches the installed dep) — grep `packages/layerchart/src/lib/components/**` for the real
prop names, defaults, and rendering logic. As a secondary source, every LayerChart docs page has a
machine-readable twin at `<page-url>/llms.txt` (index: `https://www.layerchart.com/llms.txt`) — far
more reliable than the client-rendered HTML. Verify before shipping; v2 renamed several v1 props.
