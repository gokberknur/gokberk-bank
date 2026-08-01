<script lang="ts">
	// Allocation / spend donut (F11) — a thin LayerChart `PieChart` ring (never a full
	// pie), neutral-ink `categoricalRamp` segments separated by hairline gaps, labels
	// kept off the chart (legend is the caller's job), a quiet tooltip with name +
	// formatted value + percent, and an optional mono readout in the hole. Because
	// LayerChart renders SVG, every colour is a live `var(--gok-*)` string that re-themes
	// on `data-theme` through the CSS cascade — no probe canvas, no MutationObserver.
	import { PieChart, Tooltip } from 'layerchart';
	import { categoricalRamp } from './tokens';
	import type { NamedValue } from './series';

	interface Props {
		/** Slices (minor units in `value`). */
		data: NamedValue[];
		/** Format a minor-unit value for the tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Optional mono eyebrow in the donut hole. */
		centerTitle?: string;
		/** Optional value in the donut hole (already formatted by the caller). */
		centerValue?: string;
	}

	let {
		data,
		formatValue = (n: number) => String(n),
		height = '14rem',
		label,
		centerTitle,
		centerValue
	}: Props = $props();

	// Neutral-ink ramp, one swatch per slice — the accent is spent elsewhere, never a
	// chart category (CV-VIS-1).
	const ramp = $derived(categoricalRamp(data.length));
	const total = $derived(data.reduce((s, d) => s + d.value, 0));
	const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
</script>

<div class="donut" style:height role="img" aria-label={label}>
	<PieChart
		{data}
		key="name"
		value="value"
		cRange={ramp}
		innerRadius={-24}
		cornerRadius={1}
		padAngle={0.01}
	>
		{#snippet tooltip({ context })}
			<Tooltip.Root {context} class="lc-tip-quiet">
				{#snippet children({ data: d })}
					<Tooltip.List>
						<Tooltip.Item label={d.name} value={`${formatValue(d.value)} (${pct(d.value)}%)`} />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</PieChart>
	{#if centerTitle || centerValue}
		<div class="hole" aria-hidden="true">
			{#if centerTitle}<span class="title">{centerTitle}</span>{/if}
			{#if centerValue}<span class="value">{centerValue}</span>{/if}
		</div>
	{/if}
</div>

<style>
	.donut {
		position: relative;
		inline-size: 100%;
	}

	.hole {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--gok-space-100);
		pointer-events: none;
	}

	.title {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--gok-color-text-muted);
	}

	.value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: 600;
		color: var(--gok-color-text);
		font-variant-numeric: tabular-nums;
	}

	/* The tooltip is calm, flat surface-strong (bridged) — strip LayerChart's default drop
	   shadow + blur, and keep numerals mono even though it can portal out of `.donut`. */
	:global(.lc-tooltip-container.lc-tip-quiet) {
		box-shadow: none;
		backdrop-filter: none;
		font-family: var(--gok-font-family-mono);
	}
</style>
