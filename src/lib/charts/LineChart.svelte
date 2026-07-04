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
		/** An optional second series drawn as a comparison line (e.g. a rebased benchmark). */
		compare?: SeriesPoint[];
		/** Accessible name fragment for the compare line (appended to the chart's aria description). */
		compareLabel?: string;
	}

	let {
		data,
		formatValue = (n: number) => String(n),
		height = '16rem',
		label,
		area = true,
		compare,
		compareLabel
	}: Props = $props();

	// LayerChart wants Date x-values on a UTC time scale; convert the ISO points once.
	const points = $derived(data.map((d) => ({ date: new Date(d.date), value: d.value })));

	// Optional benchmark overlay — the same Date-x conversion as the primary. A non-empty result
	// gates the second line, the combined y-domain and the line-only rendering (both series read as
	// plain lines). Absent/empty `compare` leaves every path below byte-for-byte unchanged.
	const comparePoints = $derived(
		compare && compare.length ? compare.map((d) => ({ date: new Date(d.date), value: d.value })) : []
	);
	const comparing = $derived(comparePoints.length > 0);

	// The primary's auto y-domain is computed from `data` alone, so a benchmark that runs above or
	// below the portfolio would clip. When comparing, span BOTH series; `yNice` still rounds it, so
	// it keeps the same calm padding feel as the single-series auto domain. Undefined ⇒ auto (today's
	// behaviour, so the no-compare path is unchanged).
	const yDomain = $derived.by(() => {
		if (!comparing) return undefined;
		const values = [...points, ...comparePoints].map((p) => p.value);
		return [Math.min(...values), Math.max(...values)];
	});

	// Name the benchmark in the chart's text alternative only when a compare line is actually drawn.
	const ariaLabel = $derived(
		comparing && compareLabel ? `${label} Compared with ${compareLabel}.` : label
	);

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

<div class="line" style:height role="img" aria-label={ariaLabel}>
	<AreaChart
		data={points}
		x="date"
		y="value"
		xScale={scaleUtc()}
		yBaseline={null}
		{yDomain}
		grid={false}
		rule={false}
		padding={{ top: 8, right: 12, bottom: 22, left: 48 }}
		props={chartProps}
		{motion}
	>
		{#snippet marks({ context })}
			{#if comparing}
				<!-- The benchmark: a muted, dashed reference line sharing the chart's x/y scales (via its
				     own `data` + the combined yDomain above), so it reads as distinct from the accent
				     portfolio line drawn on top. Same finite-coord guard as the primary drops transient
				     pre-measure NaN points; `fill="none"` collapses its area to a plain line. -->
				<Area
					data={comparePoints}
					line={{ stroke: chartTokens.muted, 'stroke-width': 2, 'stroke-dasharray': '4 4' }}
					fill="none"
					motion="none"
					defined={(d: { date: Date; value: number }) =>
						Number.isFinite(context.xScale?.(d.date)) && Number.isFinite(context.yScale?.(d.value))}
				/>
			{/if}
			<!-- Drop any point whose SCALED coord isn't finite. On LayerChart's pre-measure frame the
			     scales briefly return NaN for valid data (raw-value paths like "MNaN,1156442"), and
			     Area's built-in `defined` guard only rejects null, not NaN — so it leaks a transient
			     "MNaN" <path> console error. Re-deriving finiteness from context.xScale/yScale
			     excludes those points until the scales are ready; post-measure all points are finite
			     so nothing is dropped. The fill is a colour WITH alpha (accentFill), not fill-opacity
			     which doesn't bind at runtime; `fill="none"` collapses the area to a plain line — which
			     is also what a compare overlay forces, so both series then read as plain lines. -->
			<Area
				line={{ stroke: chartTokens.accent, 'stroke-width': 2 }}
				fill={area && !comparing ? accentFill : 'none'}
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
