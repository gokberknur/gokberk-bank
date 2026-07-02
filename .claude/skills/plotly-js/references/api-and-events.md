# Top-level API, events & config

All method definitions live in **`.claude/gitrepos/plotly.js/src/plot_api/plot_api.js`** (assembled onto
the `Plotly` object in `src/core.js` + `src/plot_api/index.js`). Every render method returns a `Promise`
that resolves to the graph div (`gd`). Line anchors below are into that clone for lookup.

## Render & mutate

| Method | Signature | Use it for |
|---|---|---|
| **`newPlot`** | `newPlot(gd, data, layout, config)` — `plot_api.js:554` | The **first** render. Purges `gd` then draws from scratch. Idempotent full redraw; also accepts one `{data, layout, config, frames}` figure object. |
| **`react`** | `react(gd, data, layout, config)` — `plot_api.js:2582` | **Every update.** Diffs new vs previous `_fullData`/`_fullLayout` and does the minimal redraw, preserving pan/zoom/selection and reusing GL contexts. Self-bootstraps to `newPlot` on first call. |
| `restyle` | `restyle(gd, astr, val, [traces])` / `restyle(gd, aobj, [traces])` — `:1240` | Imperative single-trace-attribute patch (`'marker.color'`). Prefer `react` from Svelte. |
| `relayout` | `relayout(gd, astr, val)` / `relayout(gd, aobj)` — `:1712` | Imperative layout patch (`'xaxis.range[0]'`). |
| `update` | `update(gd, traceUpdate, layoutUpdate, [traces])` — `:2237` | restyle + relayout in one redraw. |
| `addTraces`/`deleteTraces`/`moveTraces` | `:1004` / `:1078` / `:1144` | Add/remove/reorder traces. |
| `extendTraces`/`prependTraces` | `(gd, update, indices, [maxPoints])` — `:884` / `:940` | Streaming append/prepend to data-array tails/heads; `maxPoints` windows the length. |
| `animate`/`addFrames`/`deleteFrames` | `:3059` / `:3425` / `:3568` | Frame-based animation. Rarely needed; honour reduced-motion. |
| **`purge`** | `purge(gd)` — `:3612` | **Mandatory on unmount.** Tears the div fully back to pre-plot state, removes the event emitter, deletes `gd._context`. Skipping it leaks listeners and (for GL traces) GL contexts. |

### `newPlot` vs `react` — the SPA rule

Same signature; different update strategy. `newPlot` purges and rebuilds every call (destroys zoom/
selection — expensive). `react` reconciles by diffing, so it is the reactive path. **Call `newPlot` once at
mount, then `react` on every data/layout change** (or just `react` always — it self-bootstraps).

`react` treats **new object/array identity as "changed"** (`immutable` path), so build the figure
**immutably** each time (as the wrapper's `figure()` does) rather than mutating in place. Two layout signals
tune it:
- **`datarevision`** — bump this string/number to force a re-read of data arrays even when their identity is
  unchanged (use if you ever mutate arrays in place).
- **`uirevision`** — keep it constant across `react` calls to **preserve user interaction state** (pan/zoom/
  selection) through re-renders; change it to reset. Set `layout.uirevision` when a chart is interactive.

## Non-`plot_api` top-level helpers

| Method | Anchor | Notes |
|---|---|---|
| `toImage(gd, opts)` | `src/plot_api/to_image.js:80` | → Promise of a data URL. `opts.format`: `'png'\|'jpeg'\|'webp'\|'svg'\|'full-json'`; `width`/`height`/`scale`/`setBackground`. |
| `downloadImage(gd, opts)` | `src/snapshot/download.js:20` | Triggers a browser download; adds `filename`. Use for a "download chart" action. |
| `validate(data, layout)` | `src/plot_api/validate.js:33` | Pure — no `gd`. Returns an array of `{code, container, trace, path, astr, msg}` errors. Great in a dev assertion. |
| `Plotly.Plots.resize(gd)` | `src/plots/plots.js:63` | Debounced resize; call after a sidebar/tab resize that doesn't fire a window `resize`. |
| `makeTemplate(figure)` / `validateTemplate(figure, template)` | `src/plot_api/template_api.js:24` / `:278` | Build/validate a `layout.template` (see `theming-and-tokens.md`). |
| `register(module|module[])` | `src/registry.js:67` | The custom-bundle entry point (see `install-and-setup.md`). |
| `PlotSchema.get()` | `src/plot_api/plot_schema.js:41` | The full machine-readable attribute schema (see `reference-lookup.md`). |

## Events

Plotly binds a Node `EventEmitter` onto `gd` **after the first render** (`src/lib/events.js`). Subscribe with
`gd.on(name, handler)`; detach with `gd.removeListener` / `gd.removeAllListeners`; `Plotly.purge` removes the
emitter entirely.

```js
await Plotly.newPlot(el, data, layout, config);
const onClick = (e) => { const pt = e.points[0]; /* pt.x, pt.y, pt.customdata, pt.data … */ };
el.on('plotly_click', onClick);
// teardown: el.removeListener('plotly_click', onClick); then Plotly.purge(el);
```

Because `gd.on` only exists post-render, **(re)attach listeners after `newPlot`/`react` and detach on
unmount** in the wrapper's effect.

**Events the bank actually uses** (full list is in the clone; grep `plotly_` under `src/`):
- `plotly_click` (`src/components/fx/click.js:27`) — drill into a point/bar/slice (e.g. open an instrument).
- `plotly_hover` / `plotly_unhover` (`src/components/fx/hover.js`) — custom hover side-effects.
- `plotly_relayout` (`plot_api.js:1764`) — fired on pan/zoom/range change; read `e['xaxis.range[0]']` etc.
  to sync a timeframe control.
- `plotly_selected` / `plotly_selecting` / `plotly_deselect` (`src/components/selections/select.js`) — box/
  lasso selection.
- `plotly_legendclick` / `plotly_legenddoubleclick` (`src/components/legend/draw.js:543`) — **return `false`
  to cancel** the default series show/hide toggle.
- `plotly_afterplot` (`plot_api.js:405`), `plotly_doubleclick` (`src/plots/cartesian/dragbox.js:846`).

## Config (the third arg)

Defined in `src/plot_api/plot_config.js` (`configAttributes` at `:15`). Set per-plot, or globally via
`Plotly.setPlotConfig`. The load-bearing set for this app:

| Option | Set to | Why |
|---|---|---|
| `responsive` | `true` | Re-layout on container/window resize. Pair with a `layout` that has **no** fixed `width`/`height`. |
| `displayModeBar` | `false` | Hide the toolbar on calm resting charts. (`'hover'` default shows it on hover.) Trim individual buttons with `modeBarButtonsToRemove` if you keep it. |
| `displaylogo` | `false` | Drop the Plotly logo. |
| `staticPlot` | `true` | For a non-interactive tile (sparngline-like, KPI): zero interactivity, fastest. |
| `scrollZoom` | `true` | Enable wheel-zoom on cartesian (it's **off** for cartesian by default) — for time-series/candlestick where zoom is wanted. |
| `doubleClick` | `'reset'` | What a double-click does (`'reset+autosize'` default). |
| `locale` | `'en-GB'` etc. | i18n number/date formatting (must be registered). |

Keep interactivity **deliberate**: default the bank's resting charts to `displayModeBar:false`,
`displaylogo:false`, `responsive:true`; add `scrollZoom`/mode-bar only where the surface (a price chart)
earns it. `gokberk-design` decides whether a given chart is calm-static or interactive.
