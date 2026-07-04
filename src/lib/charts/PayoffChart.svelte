<script lang="ts">
	// F11 · Payoff glide chart — a two-series line/area over a shared month index: the
	// loan's ORIGINAL balance glide path (running every payment to term, in a muted,
	// dashed neutral) against the AFTER-ACTION path (after I overpay, or after I pay
	// off — the one earned accent, with a soft area fill). Built on LayerChart v2: it
	// renders SVG, so every colour is a live `var(--gok-*)` string that re-themes on
	// `data-theme` through the CSS cascade — no probe canvas, no MutationObserver. The
	// custom `marks` snippet replaces the preset splines with the mixed area + dashed
	// line, and each mark re-derives finiteness from the scales to drop the pre-measure
	// NaN frame (LayerChart briefly returns NaN for valid data before it has measured).
	import { LineChart, Area, Spline, Tooltip } from 'layerchart';
	import { chartTokens, accentFill, prefersReducedMotion } from './tokens';
	import { formatMoney } from '$lib/format';

	interface Props {
		/** The original balance glide path (minor units), month 0 → term. */
		original: number[];
		/** The balance glide path after the proposed action (minor units). */
		afterAction: number[];
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** CSS height of the chart box. */
		height?: string;
	}

	let { original, afterAction, label, height = '14rem' }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// One shared month-index axis; pad the shorter series with trailing zeros so the
	// after-action line clearly rests at zero once the loan has cleared.
	const len = $derived(Math.max(original.length, afterAction.length, 2));
	const rows = $derived(
		Array.from({ length: len }, (_, i) => ({
			month: i,
			original: original[i] ?? 0,
			after: afterAction[i] ?? 0
		}))
	);

	// `tween`, not `spring` — a calm ease, no bounce; `none` disables it. The paths
	// themselves are static (motion="none" on each mark); this drives highlight/tooltip.
	const motion = prefersReducedMotion() ? 'none' : 'tween';

	// Slim the preset chrome: bare month index on x, EUR on y with ~3 ticks and hairline
	// horizontal splitlines, no axis lines or tick marks, muted mono labels.
	const chartProps = $derived({
		xAxis: {
			format: (m: number) => String(m),
			rule: false,
			tickMarks: false,
			fill: chartTokens.muted
		},
		yAxis: {
			format: (v: number) => eur(v),
			ticks: 3,
			rule: false,
			tickMarks: false,
			fill: chartTokens.muted,
			grid: { stroke: chartTokens.border }
		}
	});
</script>

<div class="payoff" style:height role="img" aria-label={label}>
	<LineChart
		data={rows}
		x="month"
		series={[
			{ key: 'original', color: chartTokens.muted },
			{ key: 'after', color: chartTokens.accent }
		]}
		grid={false}
		rule={false}
		padding={{ top: 8, right: 12, bottom: 22, left: 56 }}
		props={chartProps}
		{motion}
	>
		{#snippet marks({ context })}
			<!-- after-action: accent line over a soft accent fill. Drop any point whose SCALED
			     coord isn't finite so LayerChart's pre-measure NaN frame can't leak an "MNaN"
			     <path> error (its built-in `defined` only rejects null, not NaN). -->
			<Area
				seriesKey="after"
				line={{ stroke: chartTokens.accent, 'stroke-width': 2 }}
				fill={accentFill}
				motion="none"
				defined={(d: { month: number; after: number }) =>
					Number.isFinite(context.xScale?.(d.month)) && Number.isFinite(context.yScale?.(d.after))}
			/>
			<!-- original: muted dashed line, no fill, on top -->
			<Spline
				seriesKey="original"
				class="payoff-original"
				stroke={chartTokens.muted}
				motion="none"
				defined={(d: { month: number; original: number }) =>
					Number.isFinite(context.xScale?.(d.month)) &&
					Number.isFinite(context.yScale?.(d.original))}
			/>
		{/snippet}
		{#snippet tooltip({ context })}
			<Tooltip.Root {context} class="lc-tip-quiet">
				{#snippet children({ data: d })}
					<Tooltip.Header value={`Month ${d.month}`} />
					<Tooltip.List>
						<Tooltip.Item label="Original" value={eur(d.original)} />
						<Tooltip.Item label="After" value={eur(d.after)} />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</LineChart>
</div>

<style>
	.payoff {
		inline-size: 100%;
		font-family: var(--gok-font-family-mono);
	}

	/* Dashed muted glide path — Spline forwards `class` to its <path>. */
	:global(.payoff-original) {
		stroke-dasharray: 4 4;
	}

	/* The tooltip is calm, flat surface-strong (bridged) — strip LayerChart's default drop
	   shadow + blur, and keep numerals mono even though it can portal out of `.payoff`. */
	:global(.lc-tooltip-container.lc-tip-quiet) {
		box-shadow: none;
		backdrop-filter: none;
		font-family: var(--gok-font-family-mono);
	}
</style>
