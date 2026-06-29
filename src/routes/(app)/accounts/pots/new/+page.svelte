<script lang="ts">
	// A04 · Create a pot — a calm `gok-drawer` hosted on its own route. Name the pot,
	// pick the wallet it draws from (which sets the currency), optionally set a goal and
	// a target date, and choose round-ups + an emblem. A blank goal means open-ended — I
	// just save as I go. Reward-early: the only hard requirement is a name; a goal, if I
	// type one, is naturally positive. Interop is strictly `setProps`/`on` — never `bind:`
	// on a gok-* host (MoneyInput is an app composite, so its `onchange` is fine).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { pots } from '$lib/accounts/pots.svelte';
	import type { Currency } from '$lib/data/money';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// A short, brand-safe emblem set — neutral choices, no colour meaning attached.
	const EMOJIS = ['🪴', '✈️', '🏠', '🎓', '🚗', '🎁'];

	const wallets = $derived(pots.wallets());

	// ── Draft fields (the form is the source of truth; create() consumes them). ──
	let name = $state('');
	let walletId = $state(pots.wallets()[0]?.id ?? '');
	let goalMinor = $state(0); // 0 = left blank → open-ended
	let targetDate = $state('');
	let roundUps = $state(false);
	let emoji = $state(EMOJIS[0]);

	const currency = $derived<Currency>(
		wallets.find((w) => w.id === walletId)?.currency ?? 'EUR'
	);

	// Reward-early: a name is all that's required. A goal is optional (blank = open-ended).
	const canCreate = $derived(name.trim().length > 0 && walletId !== '');

	// ── Drawer open/close. Open on mount for the enter transition; dismiss → back. ──
	let open = $state(false);
	onMount(() => {
		open = true;
	});

	function dismiss() {
		open = false;
		goto('/accounts/pots');
	}

	// ── Field handlers — read values straight off the composed events. ──
	function onName(e: Event) {
		name = (e.target as HTMLInputElement).value;
	}
	function onWallet(e: Event) {
		walletId = (e.target as HTMLElement & { value: string }).value;
	}
	function onGoal(minor: number) {
		goalMinor = minor;
	}
	function onDate(e: Event) {
		targetDate = (e as CustomEvent<{ value: string }>).detail.value;
	}
	function onRoundUps(e: Event) {
		roundUps = (e.target as HTMLElement & { checked?: boolean }).checked ?? false;
	}

	function create() {
		if (!canCreate) return;
		const pot = pots.create({
			walletId,
			name: name.trim(),
			currency,
			goalMinor: goalMinor > 0 ? goalMinor : null,
			targetDate: targetDate || null,
			roundUps,
			emoji
		});
		open = false;
		goto(`/accounts/pots/${pot.id}`);
	}
</script>

<svelte:head>
	<title>Create a pot · gökberk bank</title>
</svelte:head>

<gok-drawer
	placement="end"
	heading="Create a pot"
	{@attach setProps({ open })}
	{@attach on('gok-close', dismiss)}
	{@attach on('gok-cancel', dismiss)}
>
	<div class="form">
		<p class="lead">
			A pot keeps money for one goal apart from my spending. I can move money in and out anytime —
			nothing is locked.
		</p>

		<gok-input
			label="What am I saving for?"
			placeholder="e.g. Apartment deposit"
			reserve-message
			{@attach setProps({ value: name })}
			{@attach on('input', onName)}
		></gok-input>

		<gok-select
			label="Draw from"
			{@attach setProps({ value: walletId })}
			{@attach on('change', onWallet)}
		>
			{#each wallets as wallet (wallet.id)}
				<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
			{/each}
		</gok-select>

		<div class="field">
			<MoneyInput
				value={goalMinor}
				{currency}
				label="Goal"
				placeholder="Leave blank for open-ended"
				onchange={onGoal}
			/>
			<p class="field-hint">A target is optional — without one, the pot just grows as I save.</p>
		</div>

		<gok-date-picker
			label="Target date (optional)"
			helper="The day I'd like to reach my goal — just a marker, never a deadline."
			{@attach setProps({ value: targetDate })}
			{@attach on('input', onDate)}
			{@attach on('change', onDate)}
		></gok-date-picker>

		<div class="emblem">
			<span class="emblem-label">Emblem</span>
			<div class="emblem-row" role="radiogroup" aria-label="Choose an emblem">
				{#each EMOJIS as glyph (glyph)}
					<button
						type="button"
						class="emblem-btn"
						class:is-selected={glyph === emoji}
						role="radio"
						aria-checked={glyph === emoji}
						aria-label={`Emblem ${glyph}`}
						onclick={() => (emoji = glyph)}
					>
						<span aria-hidden="true">{glyph}</span>
					</button>
				{/each}
			</div>
		</div>

		<gok-switch
			{@attach setProps({ checked: roundUps })}
			{@attach on('change', onRoundUps)}
		>
			Round spare change to this pot
		</gok-switch>
	</div>

	<div slot="footer" class="actions">
		<gok-button variant="secondary" {@attach on('click', dismiss)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !canCreate })}
			{@attach on('click', create)}
		>
			Create pot
		</gok-button>
	</div>
</gok-drawer>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Emblem picker — neutral, no colour; selection firms the hairline to ink. --- */
	.emblem {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.emblem-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.emblem-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.emblem-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		padding: 0;
		font-size: var(--gok-type-body-large-size);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		cursor: pointer;
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.emblem-btn:hover {
		border-color: var(--gok-color-border-strong);
	}

	.emblem-btn.is-selected {
		border-color: var(--gok-color-text);
		border-width: var(--gok-border-width-strong);
	}

	.emblem-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}
</style>
