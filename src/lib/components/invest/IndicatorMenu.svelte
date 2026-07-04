<script lang="ts">
	// V08 Phase C — the toggleable-indicator menu. A non-modal gok-popover whose trigger is a
	// small "Indicators" button (it lives in the chart controls / thumb zone); its surface lists
	// one gok-switch per indicator, split into two labelled groups: price-pane OVERLAYS (drawn on
	// the price chart) and OSCILLATORS (RSI/MACD, which open their own sub-pane below). Both slices
	// read from INDICATORS, partitioned by group. State lives in chartPrefs (persisted); each switch
	// reflects its indicator with `checked` set as a DOM *property* and toggles on the composed
	// `change` event — never `bind:` on a custom element. Every switch carries a visible text label,
	// so its state reads by text + thumb position, never colour alone.
	import { chartPrefs } from '$lib/invest/chart-prefs.svelte';
	import { INDICATORS } from '$lib/charts/indicator-series';
	import { setProps, on } from '$lib/wc.svelte';

	const overlays = INDICATORS.filter((i) => i.group === 'overlay');
	const oscillators = INDICATORS.filter((i) => i.group === 'oscillator');

	// A calm on-count for the trigger — how many indicators are drawn right now across BOTH
	// groups (overlays + oscillators). Reads chartPrefs.active (via isOn), so it re-runs
	// whenever a switch flips.
	const onCount = $derived(
		[...overlays, ...oscillators].filter((i) => chartPrefs.isOn(i.key)).length
	);
</script>

<gok-popover>
	<gok-button size="s" variant="secondary">
		Indicators{#if onCount > 0}<span class="gok-tabular-nums"> · {onCount}</span>{/if}
	</gok-button>

	<span slot="heading" class="gok-headline-6">Indicators</span>

	<div slot="content" class="menu">
		<div class="group">
			<p class="caption">Overlays draw on the price chart.</p>
			<ul class="rows">
				{#each overlays as indicator (indicator.key)}
					<li class="row">
						<gok-switch
							{@attach setProps({ checked: chartPrefs.isOn(indicator.key) })}
							{@attach on('change', () => chartPrefs.toggle(indicator.key))}
						>{indicator.label}</gok-switch>
					</li>
				{/each}
			</ul>
		</div>
		<div class="group">
			<p class="caption">Oscillators open their own pane below.</p>
			<ul class="rows">
				{#each oscillators as indicator (indicator.key)}
					<li class="row">
						<gok-switch
							{@attach setProps({ checked: chartPrefs.isOn(indicator.key) })}
							{@attach on('change', () => chartPrefs.toggle(indicator.key))}
						>{indicator.label}</gok-switch>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</gok-popover>

<style>
	.menu {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		padding-block: var(--gok-space-100);
	}
</style>
