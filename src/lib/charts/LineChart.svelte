<script lang="ts">
	// Calm line / area over time (F11) — net worth, balance history. A single accent line over a
	// soft accent-tinted fill (a flat low-opacity token, not a gradient slab), sparse mono date
	// ticks, a whisper of a horizontal baseline instead of a grid, and a quiet tooltip with the
	// full date + formatted value. Built on LayerChart v2: it renders SVG, so every colour is a
	// live `var(--gok-*)` string that re-themes on `data-theme` through the CSS cascade — no probe
	// canvas, no MutationObserver, no ResizeObserver, no re-init on theme flip. LayerChart owns
	// sizing, reactivity and theming.
	import { scaleUtc } from 'd3-scale';
	import { AreaChart, Area, Tooltip } from 'layerchart';
	import { chartTokens, accentFill, prefersReducedMotion } from './tokens';
	import type { SeriesPoint } from './series';

	interface Props {
		/** Points (minor units in `value`). */
		data: SeriesPoint[];
		/** Format a minor-unit value for the axis + tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Soft accent area fill under the line. */
		area?: boolean;
	}

	let {
		data,
		formatValue = (n: number) => String(n),
		height = '16rem',
		label,
		area = true
	}: Props = $props();

	// LayerChart wants Date x-values on a UTC time scale; convert the ISO points once.
	const points = $derived(data.map((d) => ({ date: new Date(d.date), value: d.value })));

	/** Whole-series span in days — drives x-tick granularity so labels never collapse. A short
	 *  balance history reads day + month ("3 Jun"); anything spanning more than ~10 months (a
	 *  net-worth year, a 25-year amortization) reads month + year ("Jun 2025"), so the same
	 *  "3 Jun" can't repeat across years and a year-crossing 12-month chart doesn't degrade to a
	 *  handful of repeated bare years. LEND-D-03. */
	const longSpan = $derived.by(() => {
		if (points.length < 2) return false;
		const times = points.map((p) => p.date.getTime());
		return (Math.max(...times) - Math.min(...times)) / 86_400_000 > 305;
	});

	/** Short, sentence-case day + month (e.g. "3 Jun") — sub-year spans. */
	function shortDayMonth(d: Date): string {
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
	}

	/** Month + year (e.g. "Jun 2025") — multi-month / multi-year spans, so a month repeated
	 *  across years stays distinct instead of collapsing to a bare "Jun". */
	function monthYear(d: Date): string {
		return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
	}

	/** Full date incl. the year (e.g. "3 Jun 2031") — the tooltip header. */
	function fullDate(d: Date): string {
		return d.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

	// Read reduced-motion once. `tween`, not `spring` — a calm ease, no bounce; `none` disables
	// it. This drives the highlight/tooltip motion; the Area path itself is static (see below).
	const motion = prefersReducedMotion() ? 'none' : 'tween';

	// Slim the preset chrome: the x axis reads month+year on long spans, else day+month (see
	// `longSpan`); the y axis formats through `formatValue`, ~3 ticks, hairline horizontal
	// splitlines in the border token, no axis lines or tick marks, muted mono labels.
	const chartProps = $derived({
		xAxis: {
			format: (d: Date) => (longSpan ? monthYear(d) : shortDayMonth(d)),
			rule: false,
			tickMarks: false,
			fill: chartTokens.muted
		},
		yAxis: {
			format: (v: number) => formatValue(v),
			ticks: 3,
			rule: false,
			tickMarks: false,
			fill: chartTokens.muted,
			grid: { stroke: chartTokens.border }
		}
	});
</script>

<div class="line" style:height role="img" aria-label={label}>
	<AreaChart
		data={points}
		x="date"
		y="value"
		xScale={scaleUtc()}
		yBaseline={null}
		grid={false}
		rule={false}
		padding={{ top: 8, right: 12, bottom: 22, left: 48 }}
		props={chartProps}
		{motion}
	>
		{#snippet marks({ context })}
			<!-- Drop any point whose SCALED coord isn't finite. On LayerChart's pre-measure frame the
			     scales briefly return NaN for valid data (raw-value paths like "MNaN,1156442"), and
			     Area's built-in `defined` guard only rejects null, not NaN — so it leaks a transient
			     "MNaN" <path> console error. Re-deriving finiteness from context.xScale/yScale
			     excludes those points until the scales are ready; post-measure all points are finite
			     so nothing is dropped. The fill is a colour WITH alpha (accentFill), not fill-opacity
			     which doesn't bind at runtime; `fill="none"` collapses the area to a plain line. -->
			<Area
				line={{ stroke: chartTokens.accent, 'stroke-width': 2 }}
				fill={area ? accentFill : 'none'}
				motion="none"
				defined={(d: { date: Date; value: number }) =>
					Number.isFinite(context.xScale?.(d.date)) && Number.isFinite(context.yScale?.(d.value))}
			/>
		{/snippet}
		{#snippet tooltip()}
			<Tooltip.Root class="lc-tip-quiet">
				{#snippet children({ data: pt })}
					<Tooltip.Header value={pt.date} format={fullDate} />
					<Tooltip.List>
						<Tooltip.Item value={formatValue(pt.value)} />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</AreaChart>
</div>

<style>
	.line {
		inline-size: 100%;
		/* Mono numerals for axis ticks (and the tooltip, via the global rule below). */
		font-family: var(--gok-font-family-mono);
	}

	/* The tooltip is calm, flat surface-strong (bridged) — strip LayerChart's default drop
	   shadow + blur, and keep numerals mono even though it can portal out of `.line`. */
	:global(.lc-tooltip-container.lc-tip-quiet) {
		box-shadow: none;
		backdrop-filter: none;
		font-family: var(--gok-font-family-mono);
	}
</style>
