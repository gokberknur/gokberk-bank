<script lang="ts">
	// V11 · Arm a price alert. A calm, no-nudge form: pick the instrument, a direction (Above /
	// Below), a level (anchored to the current price so the market is visible), and whether it
	// repeats. The threshold is integer minor units; `alerts.guard()` blocks the equal-to-current
	// (and duplicate / cap) cases reward-early, and `alerts.crossingNote()` calmly flags a level the
	// price has already passed. Creating fires immediately if the seed's session move already crossed
	// the level (arm → watch it fire), else it arms with a set+undo toast. Informs, never sells.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { INSTRUMENTS } from '$lib/data/market';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import { alerts, type AlertCondition, type AlertMode } from '$lib/invest/alerts.svelte';

	let { symbol: initialSymbol }: { symbol?: string } = $props();

	const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));
	const first = INSTRUMENTS[0];
	// Seed once from the scoped instrument (`?alerts=SYMBOL`); afterwards the form drives itself.
	// `untrack` makes the seed-once intent explicit (repo idiom — ScheduledManage's deepLinkId).
	const resolved = untrack(() =>
		initialSymbol && BY_SYMBOL.has(initialSymbol) ? initialSymbol : first.symbol
	);

	let symbol = $state(resolved);
	let condition = $state<AlertCondition>('above');
	let mode = $state<AlertMode>('once');
	// Anchor the level to the instrument's current price so the market reference is on screen; the
	// guard blocks the equal-to-current case until the user nudges it above/below.
	let thresholdMinor = $state((BY_SYMBOL.get(resolved) ?? first).lastPriceMinor);

	const instrument = $derived(BY_SYMBOL.get(symbol) ?? first);
	const guardMsg = $derived(alerts.guard(symbol, condition, thresholdMinor));
	// Only surface the (non-blocking) crossing note when the input is otherwise valid.
	const note = $derived(guardMsg ? null : alerts.crossingNote(symbol, condition, thresholdMinor));

	function onSymbol(e: Event) {
		symbol = (e.target as HTMLElement & { value: string }).value;
		// Re-anchor the level (and its currency follows via `instrument`) to the new instrument.
		thresholdMinor = (BY_SYMBOL.get(symbol) ?? first).lastPriceMinor;
	}
	function onCondition(e: Event) {
		condition = (e.target as HTMLElement & { value: string }).value as AlertCondition;
	}
	function onMode(e: Event) {
		mode = (e.target as HTMLElement & { value: string }).value as AlertMode;
	}
	function submit() {
		if (guardMsg) return;
		alerts.create({ symbol, condition, thresholdMinor, mode });
	}
</script>

<div class="form">
	<div class="field">
		<gok-select
			label="Instrument"
			{@attach setProps({ value: symbol })}
			{@attach on('change', onSymbol)}
		>
			{#each INSTRUMENTS as inst (inst.symbol)}
				<gok-option value={inst.symbol}>{inst.symbol} · {inst.name}</gok-option>
			{/each}
		</gok-select>
	</div>

	<div class="field">
		<gok-segmented
			label="Alert when the price is"
			{@attach setProps({ value: condition })}
			{@attach on('change', onCondition)}
		>
			<gok-segmented-item value="above">Above</gok-segmented-item>
			<gok-segmented-item value="below">Below</gok-segmented-item>
		</gok-segmented>
	</div>

	<div class="field">
		<MoneyInput bind:value={thresholdMinor} currency={instrument.currency} label="Price" />
		<p class="now gok-tabular-nums">
			{instrument.symbol} now: {formatMoney(instrument.lastPriceMinor, instrument.currency)}
		</p>
	</div>

	<div class="field">
		<gok-segmented
			label="Repeat"
			size="s"
			{@attach setProps({ value: mode })}
			{@attach on('change', onMode)}
		>
			<gok-segmented-item value="once">Once</gok-segmented-item>
			<gok-segmented-item value="repeating">Repeating</gok-segmented-item>
		</gok-segmented>
		<p class="hint">
			{mode === 'once'
				? 'You’ll be told the first time it crosses, then the alert stops.'
				: 'You’ll be told each time it crosses this level.'}
		</p>
	</div>

	<!-- Reserved line: the blocking guard reason, else the calm already-past note, else nothing. -->
	<p class="status-line" class:is-guard={!!guardMsg} aria-live="polite">
		{guardMsg ?? note ?? ''}
	</p>

	<gok-button
		variant="primary"
		{@attach setProps({ disabled: !!guardMsg })}
		{@attach on('click', submit)}
	>
		Set price alert
	</gok-button>
</div>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}
	.now {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
	/* Reserved so the button never jumps as the message toggles. The blocking guard reads full-ink
	   (the disabled button carries the block); the neutral already-past note reads muted. Never
	   colour-as-status. */
	.status-line {
		margin: 0;
		min-block-size: var(--gok-type-body-small-line);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
	.status-line.is-guard {
		color: var(--gok-color-text);
	}
</style>
