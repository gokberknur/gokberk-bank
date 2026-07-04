# Chart recipes

Concrete `{ data, layout, config }` figures for the bank's charts, with brand theming applied. Each assumes
the wrapper resolved a theme once — `const t = chartTheme()` — and spreads the shared **`gokTemplate(t)`**
(from `theming-and-tokens.md`) so axes/fonts/backgrounds are consistent. Data stays **integer minor units**;
formatting happens in `tickformat` / `hovertemplate`. Build the figure **immutably** each render so
`Plotly.react` diffs correctly. Confirm any attribute against the clone (`reference-lookup.md`) — don't
guess.

Shared config for a calm resting chart:

```ts
const calm = { displayModeBar: false, displaylogo: false, responsive: true };
```

## 1. Line / area over time (net worth, balance history)

An area chart is **`scatter` with `fill`** — there is no area trace. One accent line over a soft accent
fill; mono date ticks; hairline horizontal grid; hidden vertical grid.

```ts
function figure(points: { date: string; value: number }[]) {
  return {
    data: [{
      type: 'scatter', mode: 'lines',
      x: points.map(p => p.date), y: points.map(p => p.value),
      line: { color: t.accent, width: 2, shape: 'linear' },
      fill: 'tozeroy',
      fillcolor: `rgba(${accentRGB}, 0.10)`,     // resolve t.accent → "r,g,b" once; flat, low-alpha
      hovertemplate: '%{x|%d %b %Y}   %{y:$,.2f}<extra></extra>'
    }],
    layout: {
      ...gokTemplate(t).layout,
      xaxis: { type: 'date', tickformat: '%b %Y', showgrid: false,
               tickfont: { color: t.muted, family: t.fontMono } },
      yaxis: { tickprefix: '€', tickformat: ',.0f', nticks: 3, showgrid: true, gridcolor: t.border },
      template: gokTemplate(t), uirevision: 'nw'
    },
    config: calm
  };
}
```

Notes: pick tick granularity by span (day+month for short, month+year for long) as the LineChart wrapper
does. For minor-unit money, divide by 100 into the value or keep cents and format with `%{y:$,.2f}` where the
data is already major units — be explicit and consistent.

## 2. Spending by category / month (stacked bars)

Bars stack via **`layout.barmode`**, not a trace prop. Categories use a **resolved neutral ramp**, never the
accent.

```ts
const ramp = resolvedRamp(t, series.length);   // resolved neutral-ink ramp (see theming gotcha)
data = series.map((s, i) => ({
  type: 'bar', name: s.label, x: months, y: s.values,
  marker: { color: ramp[i] },
  hovertemplate: `${s.label}: %{y:$,.2f}<extra></extra>`
}));
layout = { ...gokTemplate(t).layout, barmode: 'stack', showlegend: true,
           yaxis: { tickprefix: '€', tickformat: ',.0f' }, template: gokTemplate(t) };
```

Horizontal bars: set `orientation: 'h'` on the trace and swap x/y. A single-series spend bar stays on the
accent only if it's the focal figure; a category breakdown never does.

## 3. Allocation / portfolio split (donut)

`pie` with `hole` for a donut; `marker.colors` is the **resolved neutral ramp**; center text via an
annotation (pie has no native center label).

```ts
data = [{
  type: 'pie', hole: 0.62,
  labels: slices.map(s => s.name), values: slices.map(s => s.value),
  marker: { colors: resolvedRamp(t, slices.length), line: { color: t.surface, width: 2 } },
  textinfo: 'none', sort: false, direction: 'clockwise',
  hovertemplate: '%{label}   %{percent}   %{value:$,.2f}<extra></extra>'
}];
layout = { ...gokTemplate(t).layout, showlegend: false,
           annotations: [{ text: totalFormatted, showarrow: false, font: { family: t.fontMono, size: 18, color: t.text } }],
           template: gokTemplate(t) };
```

## 4. Price + volume (candlestick with a volume pane)

Candlestick with brand up/down (paired with the number, never color alone), plus a `bar` volume trace on a
secondary y-axis. This is the one chart that earns interactivity (`scrollZoom`, a range slider).

```ts
data = [
  { type: 'candlestick', x: c.t, open: c.o, high: c.h, low: c.l, close: c.c,
    increasing: { line: { color: t.up } }, decreasing: { line: { color: t.down } },
    yaxis: 'y', name: 'Price' },
  { type: 'bar', x: c.t, y: c.v, yaxis: 'y2', name: 'Volume',
    marker: { color: t.border } }                       // volume recedes; never the accent
];
layout = {
  ...gokTemplate(t).layout,
  xaxis: { type: 'date', rangeslider: { visible: false }, showgrid: false },
  yaxis:  { domain: [0.28, 1], tickprefix: '€', tickformat: ',.2f', gridcolor: t.border },
  yaxis2: { domain: [0, 0.20], showgrid: false, tickfont: { color: t.muted } },
  template: gokTemplate(t), uirevision: 'px'
};
config = { ...calm, scrollZoom: true };
```

Gotchas: Plotly candlestick has **no built-in volume pane** — you add the `bar` trace + a second y-axis
domain (done above). Its `increasing`/`decreasing` default to Plotly green/red; the override above re-maps to
brand tokens. Keep the OHLC number in the hover so direction reads without color.

## 5. KPI gauge / big number (savings rate, goal progress)

`indicator` — calm single accent arc, big numeral, optional delta.

```ts
data = [{
  type: 'indicator', mode: 'gauge+number+delta',
  value: current, delta: { reference: previous, valueformat: ',.0f' },
  number: { prefix: '€', valueformat: ',.0f', font: { family: t.fontMono, color: t.text } },
  gauge: {
    axis: { range: [0, goal], tickcolor: t.border, tickfont: { color: t.muted } },
    bar: { color: t.accent },                       // the one earned accent
    bgcolor: t.surface, bordercolor: t.border,
    threshold: { line: { color: t.text, width: 2 }, value: goal }
  }
}];
layout = { ...gokTemplate(t).layout, margin: { t: 24, r: 24, b: 8, l: 24 } };
```

## Applying the wrapper lifecycle

Drop any of these `figure()` builders into the wrapper skeleton in `install-and-setup.md`: `newPlot` once,
`react` on data change **and** on `onThemeChange` (rebuild the figure so freshly-resolved `t` colors flow in;
keep `uirevision` stable), `purge` on teardown, `role="img"` + `label` + an adjacent text summary on the
container. Author the `.svelte` wrapper through the `svelte:svelte-file-editor` agent; hold the result
against `gokberk-design`'s `verification.md`.
