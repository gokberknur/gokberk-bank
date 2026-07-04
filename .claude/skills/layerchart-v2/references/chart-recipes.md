# Chart recipes (adapted to `--gok-*`)

One recipe per chart type the app uses. Snippets are adapted from the official examples but use app
tokens (`chartTokens`, `categoricalRamp` from `src/lib/charts/tokens.ts`) instead of the docs' Tailwind
utility classes. **Never copy `class="fill-primary/30"`-style Tailwind from the docs** — this app has no
Tailwind. Wrap each in a thin wrapper under `src/lib/charts/`, keep `role="img"` + `label`, keep money in
minor units with a `formatValue` fn. Author `.svelte` through the Svelte MCP.

Verify any prop against `<page-url>/llms.txt` before shipping.

## Verified gotchas (from building a pilot in this app)

- **SVG presentation props are hyphenated when they fall through to `SVGAttributes`.** On `Area`/marks,
  it's `'stroke-width'` and `'fill-opacity'`, **not** `strokeWidth`/`fillOpacity`. But some components
  expose their own camelCase prop — e.g. `Rule strokeWidth={3}` is real (per the official candlestick
  example). Check the component's `.d.ts` when unsure.
- **`fill-opacity` as a component prop type-checks but does NOT bind at runtime** (it never reaches the
  path). For a soft fill, use a **fill color with built-in alpha** instead — robust and on-brand:
  `fill="color-mix(in oklab, var(--gok-color-primary) 12%, transparent)"`. (Verified: this re-themes on
  `data-theme` flip with zero JS.)
- **Preset charts render `axis`/`grid`/`rule`/`tooltip` ON by default.** For the app's calm, chrome-light
  look, slim them: `axis`/`grid` via `false` or `props={{ xAxis, yAxis }}`, hairline splitlines via the
  grid `stroke`.
- **The default tooltip shows the RAW value**, not your axis `format` — it ignores `props.yAxis.format`.
  Format the tooltip separately (a custom `Tooltip.Root`/`Tooltip.Item` with `formatValue`, or
  `props={{ tooltip: … }}`), or money renders as unformatted minor units.
- **Pre-measure frame leaks a transient `MNaN` `<path>` console error — gate the mark with `defined`.**
  On the first render frame `<Chart>` hasn't measured yet, so its `xScale`/`yScale` briefly return `NaN`
  for perfectly valid data → the `<Area>`/`<Spline>` `d` attribute becomes `"MNaN,NaN…"` and the browser
  logs an *Error parsing path data* console error. `Area`'s built-in `defined` guard only rejects `null`,
  **not `NaN`**, so it doesn't catch this. The fix (confirmed against the clone: `defined` propagates to
  **both** the fill `Path` and the line `Spline`) is a custom `defined` that re-derives finiteness from the
  live scales inside the `marks` snippet — `{#snippet marks({ context })}` gives you `context.xScale` /
  `context.yScale`:
  ```svelte
  <Area
    defined={(d) => Number.isFinite(context.xScale?.(d.date)) && Number.isFinite(context.yScale?.(d.value))}
    … />
  ```
  Post-measure every scaled coord is finite, so nothing is dropped in steady state — this only suppresses
  the transient frame. **Do not** try to gate on `context.width > 0`: width goes positive *before* the
  scales are ready, so that check doesn't stop the NaN. (Setting `motion="none"` on the `Area` is a
  separate, complementary choice — it stops the path from *tweening* through NaN intermediates — but it
  does **not** fix the pre-measure frame on its own; the `defined` guard is what actually clears it.)

---

## 1. Candlestick / OHLC price — replaces `PriceChart.svelte`

There is **no `<Candlestick>`**. Compose `Chart` + two `Rule` marks (wick high→low, body open→close),
colored up/down by a `c` accessor. Time axis via `scaleUtc()`, crosshair via `Highlight lines`.
Source: `docs/components/Rule/candlestick/llms.txt`.

```svelte
<script lang="ts">
	import { scaleUtc } from 'd3-scale';
	import { Axis, Chart, Highlight, Layer, Rule, Tooltip } from 'layerchart';
	import { chartTokens } from '$lib/charts/tokens';
	// candles: { date: Date, open, high, low, close }[]  (major units)
	let { candles, label, formatValue = (n: number) => n.toFixed(2) } = $props();
</script>

<div role="img" aria-label={label} style="font-family: var(--gok-font-family-mono)">
	<Chart
		data={candles}
		x="date" xScale={scaleUtc()}
		y={['high', 'low']} yNice
		c={(d) => (d.close < d.open ? 'down' : 'up')}
		cDomain={['down', 'up']}
		cRange={[chartTokens.down, chartTokens.up]}
		padding={{ left: 20, bottom: 32, top: 12 }}
		tooltipContext={{ mode: 'quadtree-x' }}
		height={320}
	>
		<Layer>
			<Axis placement="left" grid rule tickSpacing={40} />
			<Axis placement="bottom" rule tickMultiline />
			<Rule y={['high', 'low']} />
			<Rule y={['open', 'close']} strokeWidth={3} />
			<Highlight lines />
		</Layer>
		<Tooltip.Root>
			{#snippet children({ data })}
				<Tooltip.Header value={data.date} format="day" />
				<Tooltip.List>
					<Tooltip.Item label="Open" value={formatValue(data.open)} />
					<Tooltip.Item label="High" value={formatValue(data.high)} />
					<Tooltip.Item label="Low" value={formatValue(data.low)} />
					<Tooltip.Item label="Close" value={formatValue(data.close)} />
				</Tooltip.List>
			{/snippet}
		</Tooltip.Root>
	</Chart>
</div>
```

Notes:
- **App's hollow-up convention:** the `Rule` body is a stroke, so it can't be "hollow". To keep the
  current hollow-up / filled-down shape cue, render the body as `Bars`/`Rect` instead —
  `fill="none" stroke={chartTokens.up}` for up, `fill={chartTokens.down}` for down (see the
  `Bars/horizontal-candlestick-bars` example, which adds `xInterval={utcDay}` for real bar width).
  Otherwise color+position+OHLC-tooltip already satisfy "not hue alone."
- **No built-in volume pane** — add a second `Bars` layer with its own y-scale, or a small linked
  chart below. **Pan/zoom** is `TransformContext`; **range brushing** is the
  `Rule/candlestick-with-brushing` example. Line mode (crypto) → use recipe 2 with a single series.
- Keep the **"Charts by TradingView" attribution only if you still render Lightweight Charts** — once
  migrated to LayerChart, that attribution is no longer required.

---

## 2. Line / multi-series — the line half of `LineChart.svelte`, `PayoffChart.svelte`

`LineChart` gives axes/grid/tooltip/highlight for free. One series uses `--color-primary` (already
bridged to the accent); multi-series takes a `series` array. Source: `LineChart/series.svelte`.

```svelte
<LineChart
	{data}
	x="date"
	series={[
		{ key: 'afterAction', label: 'After overpayment', color: chartTokens.accent },
		{ key: 'original', label: 'Original', color: chartTokens.muted, props: { spline: { class: 'dashed' } } }
	]}
	props={{ yAxis: { format: (v) => formatValue(v) }, xAxis: { format: 'day' } }}
	legend
	padding={defaultChartPadding({ right: 10, legend: true })}
	height={300}
/>
```

For the two-series **payoff glide** (`PayoffChart`): focal `afterAction` = accent + area, muted
`original` = dashed line. Combine with recipe 3's `Area` in a `{#snippet marks()}` if you want the fill.

---

## 3. Area over time (soft fill) — `LineChart.svelte` with `area=true`, net-worth hero

The current app fill is a **flat low-opacity accent tint, not a gradient slab** (`opacity: 0.12`). Match
it directly — simplest and on-brand. This is the **shipped `LineChart.svelte` pattern**: take the `context`
off the `marks` snippet and use it to `defined`-gate the pre-measure NaN frame (see gotchas above), and set
`motion="none"` so the path never tweens through NaN:

```svelte
<AreaChart {data} x="date" y="value" props={{ yAxis: { format: (v) => formatValue(v) } }} height={260}>
	{#snippet marks({ context })}
		<!-- soft fill via a color WITH alpha (accentFill) — do NOT use fill-opacity (doesn't bind).
		     defined drops any point whose scaled coord is NaN on the pre-measure frame. -->
		<Area
			line={{ stroke: chartTokens.accent, 'stroke-width': 2 }}
			fill={accentFill}
			motion="none"
			defined={(d) => Number.isFinite(context.xScale?.(d.date)) && Number.isFinite(context.yScale?.(d.value))}
		/>
	{/snippet}
</AreaChart>
```

If a **true gradient** (accent fading to transparent) is wanted, wrap `Area` in `<LinearGradient>` and
pass the yielded `gradient` as `fill`. Supply stops with token colors via its **`stops`** prop —
**not** the docs' Tailwind `class="from-primary/50 to-primary/1"` form. Verify the exact `stops` shape in
`AreaChart/gradient` + `LinearGradient/llms.txt` first:

```svelte
{#snippet marks()}
	<LinearGradient stops={[chartTokens.accent, 'transparent']} vertical>
		{#snippet children({ gradient })}
			<Area line={{ stroke: chartTokens.accent }} fill={gradient} />
		{/snippet}
	</LinearGradient>
{/snippet}
```

---

## 4. Bar — `StackedBar.svelte` (stacked; horizontal; grouped)

`BarChart` with `orientation` (vertical↔horizontal) and `seriesLayout` (`stack` | `group` | `overlap` |
`stackExpand` | `stackDiverging`). Categorical series use the **neutral ramp**. Source:
`BarChart/stack-series.svelte`, `BarChart/horizontal.svelte`.

```svelte
<script lang="ts">
	import { BarChart } from 'layerchart';
	import { categoricalRamp } from '$lib/charts/tokens';
	let { data, keys, label, formatValue, horizontal = false } = $props();
	const ramp = $derived(categoricalRamp(keys.length));
	const series = $derived(keys.map((key, i) => ({ key, color: ramp[i] })));
</script>

<div role="img" aria-label={label}>
	<BarChart
		{data}
		x={horizontal ? 'value' : 'month'}
		y={horizontal ? 'month' : undefined}
		{series}
		seriesLayout="stack"
		orientation={horizontal ? 'horizontal' : 'vertical'}
		props={{ yAxis: { format: (v) => formatValue(v) }, xAxis: { format: 'none' } }}
		height={300}
	/>
</div>
```

Switch `seriesLayout="group"` for grouped bars. Single-series bars just omit `series` (defaults to the
accent). `radial` turns it into a polar bar chart.

---

## 5. Donut with center text — `DonutChart.svelte`

`PieChart` with **negative `innerRadius`** (offset from the outer edge) makes the ring; center title/value
go in an **`aboveMarks` snippet** with centered `<Text>` marks. `cRange` = the neutral ramp (never the
accent). Source: `PieChart/donut.svelte`, `PieChart/donut-with-text.svelte`.

```svelte
<script lang="ts">
	import { PieChart, Text } from 'layerchart';
	import { categoricalRamp, chartTokens } from '$lib/charts/tokens';
	let { data, centerTitle, centerValue, label } = $props(); // data: { name, value }[]
</script>

<div role="img" aria-label={label}>
	<PieChart
		{data}
		key="name"
		value="value"
		cRange={categoricalRamp(data.length)}
		innerRadius={-24}
		cornerRadius={2}
		padAngle={0.01}
		height={220}
	>
		{#snippet aboveMarks()}
			<Text value={centerValue} textAnchor="middle" verticalAnchor="middle" dy={-2}
				style="font-size: 1.25rem; font-family: var(--gok-font-family-mono); fill: {chartTokens.text}" />
			<Text value={centerTitle} textAnchor="middle" verticalAnchor="middle" dy={22}
				style="font-size: 0.75rem; fill: {chartTokens.muted}" />
		{/snippet}
	</PieChart>
</div>
```

Arc labels (percentages on slices) via the `labels` prop: `true` for defaults, or an object with a
placement (`callout`, `centroid`, `outer`, …). A full pie (no hole) is just `PieChart` without
`innerRadius`.

---

## 6. Sparkline — **keep the DS `gok-sparkline`**; LayerChart only if a richer inline chart is needed

`Sparkline.svelte` stays on the design-system `gok-sparkline` web component (build with `gok-*` first —
out of migration scope). Only reach for LayerChart if you need something `gok-sparkline` can't do
(e.g. a hover tooltip inline). Then: a preset chart with `axis={false} grid={false}` and a tiny size.
Source: `LineChart/sparkline.svelte`.

```svelte
<LineChart {data} x="date" y="value" yDomain={null} axis={false} grid={false}
	props={{ highlight: { points: { r: 3 } } }} width={124} height={24} />
```

---

## 7. Gauge / radial progress — new capability (savings rate, budget used, health)

Single-value ring → **`ArcChart`**; a full speedometer with ticks/gradient → compose `Arc`. Gate motion
on `prefersReducedMotion()`. Source: `ArcChart/basic.svelte`, `Arc/gauge.svelte`.

```svelte
<script lang="ts">
	import { ArcChart } from 'layerchart';
	import { chartTokens, prefersReducedMotion } from '$lib/charts/tokens'; // + prefersReducedMotion
	let { value, label } = $props();
</script>

<div role="img" aria-label={label}>
	<ArcChart
		data={[{ key: label, value }]}
		key="key" value="value"
		maxValue={100}
		innerRadius={-16}
		cornerRadius={8}
		range={[chartTokens.accent]}
		track={{ fill: chartTokens.border }}
		motion={prefersReducedMotion() ? false : 'spring'}
		height={160}
	/>
</div>
```

For a true gauge (angle range, tick labels, threshold colors), see the `Arc/gauge` composition:
`Chart` + `Layer center` + `Arc` (with `domain`/`range` angles) + `Line`/`Text` ticks + `LinearGradient`
+ `ClipPath` + `scaleLinear`/`scaleThreshold`. Verify against `Arc/gauge` before building.
