<script lang="ts">
	// V08 Phase C · Crosshair OHLC readout — a single reserved line that narrates the
	// hovered bar (Date · O · H · L · C · Vol) above the price chart. Purely
	// presentational: PriceChart owns the crosshair subscription and hands the bar
	// down; this holds the latest bar at rest so it never reads blank. A fixed
	// single-line height means value changes never shift the layout, and the line is
	// aria-live so a screen reader announces the hovered bar without a jump. Labels
	// are quiet mono captions; the figures carry the ink. `--gok-*` tokens only.
	import { formatDate, formatNumber } from '$lib/format';

	let {
		bar,
		formatValue
	}: {
		bar: {
			time: string;
			open: number;
			high: number;
			low: number;
			close: number;
			volume?: number;
		} | null;
		/** Formats the O/H/L/C prices in the chart's own scale (money, decimals…). */
		formatValue: (v: number) => string;
	} = $props();
</script>

<p class="readout" role="status" aria-live="polite">
	{#if bar}
		<span class="date">{formatDate(bar.time)}</span>
		<span class="field"><span class="label">O</span><span class="value">{formatValue(bar.open)}</span></span>
		<span class="field"><span class="label">H</span><span class="value">{formatValue(bar.high)}</span></span>
		<span class="field"><span class="label">L</span><span class="value">{formatValue(bar.low)}</span></span>
		<span class="field"><span class="label">C</span><span class="value">{formatValue(bar.close)}</span></span>
		{#if bar.volume !== undefined}
			<span class="field"><span class="label">Vol</span><span class="value">{formatNumber(bar.volume)}</span></span>
		{/if}
	{:else}
		<span class="date" aria-hidden="true">—</span>
	{/if}
</p>

<style>
	/* A single reserved line: nowrap + a fixed line-height keep the block-size constant
	   no matter how the figures change (or when there's no bar), so hovering never
	   nudges the chart below. Long readouts scroll horizontally within this line
	   rather than wrapping — the height is what must stay put. */
	.readout {
		display: flex;
		flex-wrap: nowrap;
		align-items: baseline;
		gap: var(--gok-space-300);
		margin: 0;
		margin-block-end: var(--gok-space-200);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		white-space: nowrap;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-x: contain;
		color: var(--gok-color-text-muted);
		font-variant-numeric: tabular-nums;
		scrollbar-width: none;
	}

	.readout::-webkit-scrollbar {
		display: none;
	}

	.date {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.field {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
	}

	/* Quiet mono captions — the letter names the field, the figure carries the ink. */
	.label {
		color: var(--gok-color-text-muted);
	}

	.value {
		color: var(--gok-color-text);
	}
</style>
