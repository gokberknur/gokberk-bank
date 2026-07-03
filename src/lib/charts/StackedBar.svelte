<script lang="ts">
	// Stacked bar (F11) — spend by category, cashflow in/out. Neutral-ink
	// `categoricalRamp` segments, no gridlines (space over rules), muted mono axis
	// labels, and a quiet per-category tooltip. Vertical by default; `horizontal`
	// swaps the axes. Built on LayerChart v2: SVG colours are live `var(--gok-*)`
	// strings that re-theme on `data-theme` through the CSS cascade — no probe
	// canvas, no MutationObserver.
	import { BarChart, Tooltip } from 'layerchart';
	import { chartTokens, categoricalRamp } from './tokens';

	interface BarSeries {
		name: string;
		values: number[];
	}

	interface Props {
		/** Axis categories (one per bar). */
		categories: string[];
		/** Stack segments — each `values[i]` aligns with `categories[i]`. */
		series: BarSeries[];
		/** Format a minor-unit value for the tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Lay the bars horizontally (category axis on the left). */
		horizontal?: boolean;
	}

	let {
		categories,
		series,
		formatValue = (n: number) => String(n),
		height = '16rem',
		label,
		horizontal = false
	}: Props = $props();

	// Neutral-ink ramp, one swatch per series — the accent is spent elsewhere, never a
	// chart category (CV-VIS-1).
	const ramp = $derived(categoricalRamp(series.length));

	// LayerChart wants row-objects keyed by field name: one row per category, each
	// series' value keyed by its own name.
	const rows = $derived(
		categories.map((cat, i) => {
			const row: Record<string, string | number> = { category: cat };
			for (const s of series) row[s.name] = s.values[i] ?? 0;
			return row;
		})
	);
	const barSeries = $derived(series.map((s, i) => ({ key: s.name, color: ramp[i] })));

	// LayerChart uses fixed padding (no ECharts `containLabel` auto-fit), so reserve left room
	// for the widest tick label or it clips when the chart sits flush at its container's edge:
	// money ticks on the value axis (vertical) or category text on the band axis (horizontal).
	// ~8px per mono glyph at the axis size, plus the tick gap.
	const stackTotals = $derived(
		categories.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
	);
	const axisMax = $derived(stackTotals.length ? Math.max(0, ...stackTotals.map((t) => Math.abs(t))) : 0);
	const leftPad = $derived(
		horizontal
			? Math.max(48, Math.max(0, ...categories.map((c) => c.length)) * 8 + 14)
			: Math.max(48, formatValue(axisMax).length * 8 + 14)
	);
</script>

<div class="bar" style:height role="img" aria-label={label}>
	<BarChart
		data={rows}
		x={horizontal ? undefined : 'category'}
		y={horizontal ? 'category' : undefined}
		orientation={horizontal ? 'horizontal' : 'vertical'}
		series={barSeries}
		seriesLayout="stack"
		grid={false}
		rule={false}
		padding={{ top: 8, right: 12, bottom: 22, left: leftPad }}
		props={{
			xAxis: {
				format: horizontal ? (v: number) => formatValue(v) : 'none',
				rule: false,
				tickMarks: false,
				fill: chartTokens.muted
			},
			yAxis: {
				format: horizontal ? 'none' : (v: number) => formatValue(v),
				rule: false,
				tickMarks: false,
				fill: chartTokens.muted
			}
		}}
	>
		{#snippet tooltip({ context })}
			<Tooltip.Root {context} class="lc-tip-quiet">
				{#snippet children({ data: d })}
					<Tooltip.Header value={d.category} />
					<Tooltip.List>
						{#each series as s (s.name)}
							<Tooltip.Item label={s.name} value={formatValue(Number(d[s.name] ?? 0))} />
						{/each}
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
</div>

<style>
	.bar {
		inline-size: 100%;
		/* Mono numerals for axis ticks (and the tooltip, via the global rule below). */
		font-family: var(--gok-font-family-mono);
	}

	/* The tooltip is calm, flat surface-strong (bridged) — strip LayerChart's default drop
	   shadow + blur, and keep numerals mono even though it can portal out of `.bar`. */
	:global(.lc-tooltip-container.lc-tip-quiet) {
		box-shadow: none;
		backdrop-filter: none;
		font-family: var(--gok-font-family-mono);
	}
</style>
