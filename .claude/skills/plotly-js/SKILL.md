---
name: plotly-js
description: >-
  Plotly.js (v3.7.0) charting how-to for the gökberk bank app — the guide for building, editing, or
  debugging ANY chart with Plotly.js in this repo, and the reference-lookup layer over the local
  plotly.js source clone at `.claude/gitrepos/plotly.js`. Use this WHENEVER work involves Plotly.js
  specifically: adding or changing a `Plotly.newPlot`/`Plotly.react` chart, a plotly trace (scatter,
  bar, candlestick, ohlc, pie/donut, indicator/gauge, waterfall, funnel, histogram, box, heatmap),
  a plotly `layout`/`config`, plotly events (`plotly_click`, `plotly_hover`, `plotly_relayout`),
  theming a plotly chart to `--gok-*` tokens, building a partial/custom plotly bundle for tree-shaking,
  or looking up what a plotly attribute means. Trigger it EVEN IF the user just says 'use plotly',
  'plot this with plotly', 'the plotly candlestick', 'make a plotly gauge', or 'why is my plotly chart
  not theming'. It owns HOW plotly.js is installed, imported client-only (`ssr=false`), themed with
  resolved `--gok-*` colors that re-theme on `data-theme`, composed as a Svelte wrapper, and looked up
  against the local clone. It composes WITH — never overrides — the Svelte MCP (how `.svelte` is
  written) and `gokberk-design` (how it looks). Do NOT use it for LayerChart v2 charts (that's
  `layerchart-v2`), the DS `gok-sparkline` primitive, or non-chart UI.
---

# Plotly.js — charting in gökberk bank

**Plotly.js v3.7.0** is a standalone, imperative JavaScript charting library (SVG by default, WebGL for
`*gl`/3D, tile backends for maps). It draws dozens of chart types from a plain **declarative figure**:
`{ data, layout, config }`. Unlike LayerChart (Svelte components) or the DS web components, Plotly is a
**JS library you mount onto a real `<div>`** — so a Plotly wrapper carries a small imperative lifecycle
(mount → update → resize → teardown) that the Svelte MCP helps you write correctly.

> **You have the whole library on disk.** The full source is cloned (git-ignored) at
> **`.claude/gitrepos/plotly.js`** (v3.7.0). It is your **reference-lookup target** — grep it instead of
> guessing an attribute or fetching docs. The per-trace `attributes.js` files ARE the canonical schema
> (see `references/reference-lookup.md`). Prefer the clone over memory; Plotly's attribute surface is huge
> and subtly versioned.

## This skill sits under the two authorities — it does not replace them

1. **Svelte MCP governs how the code is written.** Author/edit every `.svelte` chart wrapper through the
   `svelte:svelte-file-editor` agent. A Plotly wrapper mixes runes (`$props`, `$effect`), an `{@attach}`
   or `$effect` mount, and imperative `Plotly.*` calls — sharp edges the MCP's autofixer catches. Never
   hand-write it from memory.
2. **`gokberk-design` governs how it looks and reads.** Hold every chart against its `brand-language.md` /
   `patterns.md` / `verification.md`. This skill gives you the Plotly *mechanics*; `gokberk-design` decides
   whether the result is on-brand. Read the feature's `.planning` spec and consult the owning domain expert
   (`gok-bank-wealth` for the price/candlestick chart, `gok-bank-money` for spend bars) for what the chart
   must *say*.

## Mental model (read this before writing any chart)

- **A figure is data, not components.** `data` is an **array of trace objects** — each `{ type, x, y, … }`
  is one series. `layout` is one object of chart-wide chrome (axes, legend, margins, colors, fonts).
  `config` is behaviour (responsiveness, mode bar, static). You build these three plain objects and hand
  them to Plotly; you do **not** compose marks in markup.
- **`newPlot` for the first render, `react` for every update.** `Plotly.newPlot(div, data, layout, config)`
  creates the chart imperatively. **`Plotly.react(div, data, layout, config)`** diffs against the current
  figure and updates in place — this is the reconciliation path and the one a reactive Svelte wrapper uses
  on every `$effect` re-run. Don't `newPlot` twice; don't reach for `restyle`/`relayout` from Svelte when
  `react` expresses the new state declaratively. See `references/api-and-events.md`.
- **It mounts into a DOM node and must be torn down.** Plotly needs `window`/DOM, so it is **client-only**
  (this app is already `ssr = false`) and imported **dynamically** (`await import(...)`) so it never lands
  in the SSR/prerender path. On unmount, call **`Plotly.purge(div)`** or you leak the chart + its listeners.
- **SVG is the default and what you want.** Cartesian traces render SVG — themeable, accessible, light.
  WebGL (`scattergl`, `scatter3d`, `surface`, …) and tile maps (`scattermap`) pull in **huge** deps; the
  bank avoids them unless a surface genuinely needs them. Partial/custom bundles keep only the traces you
  use — see `references/install-and-setup.md`.

## Reference lookup — target the local clone

The single biggest reason this skill exists: **don't guess Plotly attributes, read them from
`.claude/gitrepos/plotly.js`.** Every trace's options live in `src/traces/<type>/attributes.js`; layout in
`src/plots/**/layout_attributes.js`. Each leaf carries `valType`, `dflt`, `editType`, and a `description`.
`references/reference-lookup.md` is the map of where everything is and the exact `grep` recipes. When in
doubt about a prop name, its default, or its allowed values, look it up there first.

## Theming — reuse `theme.ts`; Plotly is the *opposite* of LayerChart here

**Plotly cannot consume `var(--gok-*)`, `light-dark()`, or `oklch()`.** Like the old ECharts/Lightweight
wrappers, it parses only concrete `hex`/`rgb()`/`hsl()` and **bakes** the resolved color into the figure —
so it does **not** re-theme on a `data-theme` flip by itself. This is exactly the problem the app's existing
**`src/lib/charts/theme.ts`** already solves, and which LayerChart got to delete. For Plotly you **keep it**:

- **`chartTheme()`** resolves each `--gok-*` role to a concrete `rgb()` (probe-span + 1×1 canvas) — feed
  those strings into `layout` colors and `trace` colors.
- **`onThemeChange(cb)`** is a `data-theme` MutationObserver — on flip, recompute `chartTheme()` and
  `Plotly.react(div, …)` with the new colors (no remount).
- **`categoricalRamp(theme, n)`** gives the graded neutral-ink ramp for multi-category charts (never the
  accent). **`prefersReducedMotion()`** gates `layout.transition` / `config` animation.

`references/theming-and-tokens.md` has the whole recipe: the token→figure mapping, the re-theme effect, and
d3-format money/date ticks via `tickformat` + `hovertemplate`.

## Non-negotiable chart discipline (carried over — Plotly makes some of these easy to break)

These are app rules `gokberk-design` enforces; hold them regardless of what Plotly defaults to:

- **Monochrome canvas, one earned accent.** The forest-green accent (`--gok-color-primary`) is the *focal*
  series only. Kill Plotly's default `colorway` (a 10-color rainbow) — multi-series/pie use
  `categoricalRamp(n)`, never the accent, never Plotly's palette.
- **Direction by shape + text, never hue alone.** Candlestick/ohlc default to Plotly green/red
  (`src/constants/delta.js`) — re-map `increasing`/`decreasing` to the brand up/down tokens **and** keep the
  hollow-up/filled-down shape + the number, so it reads without color.
- **Hairline, flat chrome.** `paper_bgcolor`/`plot_bgcolor` = surface tokens; hidden vertical gridlines,
  hairline horizontal gridlines in `--gok-color-border`; muted mono axis labels; hover label on
  `surface-strong` with no shadow. **Hide the mode bar** (`config.displayModeBar: false`) and the Plotly
  logo unless a chart truly needs zoom/pan.
- **`prefers-reduced-motion`** disables transitions. **Every chart is `role="img"` with a text `label`**,
  treated as decorative, with an adjacent text summary of the key figure. **Numerals for everything.**
- **Money stays integer minor units** in `data`; a `formatValue`/d3-`tickformat`/`hovertemplate` renders it
  (`%{y:$,.2f}` or pre-formatted `customdata`). Routes stay dumb — no chart logic in routes; wrappers live
  in `src/lib/charts/`.
- **`Sparkline` stays on the DS `gok-sparkline` web component** — not a Plotly wrapper, out of scope.

## Where to go next

| Read this reference | When |
|---|---|
| `references/install-and-setup.md` | Adding the dep, client-only dynamic import, **partial vs custom bundles** (tree-shaking with `plotly.js/lib/core` + `register`), the Svelte-wrapper lifecycle skeleton |
| `references/reference-lookup.md` | **Any attribute question** — where every trace/layout attribute lives in the clone, the `attributes.js` schema convention, `Plotly.validate` / `PlotSchema`, grep recipes |
| `references/trace-catalog.md` | Choosing a trace type — the full 49-type catalog, the bank's primary set, per-trace attribute anchors |
| `references/api-and-events.md` | The top-level API (`newPlot`/`react`/`restyle`/`relayout`/`update`/`toImage`/`purge`), events, and `config` options |
| `references/theming-and-tokens.md` | **Any theming** — the `theme.ts` bridge, resolved colors, re-theme on `data-theme`, monochrome discipline, d3-format money/date ticks |
| `references/chart-recipes.md` | Building a specific chart — line/area, bar, donut, candlestick + volume, indicator/gauge, with brand theming applied |

**Confirm API against the local clone, not memory.** Plotly's attribute surface is enormous and versioned;
`.claude/gitrepos/plotly.js/src` is the ground truth for this exact version (3.7.0).
