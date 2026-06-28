<script lang="ts">
	// A04 · Pot detail — the centrepiece. The big ProgressRing leads, with the figures
	// stated as text beside it. Add and Withdraw are instant, reversible internal
	// transfers: each opens a light `gok-drawer` with the F07 MoneyInput, validates
	// reward-early (Add capped at the wallet's spare, Withdraw at the pot's balance),
	// then commits optimistically with a toast — never a forced-decision dialog, and
	// over-moves are blocked with no-blame copy. A reached goal swaps the ring to its
	// mark-led complete state and offers to move the money back. The Rules section holds
	// round-ups, auto-save, and a close affordance that only appears once the pot is empty.
	//
	// Interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* host
	// (MoneyInput is an app composite, so its own `onchange` is fine).
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { pots } from '$lib/accounts/pots.svelte';
	import type { PotFrequency } from '$lib/accounts/pots.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import ProgressRing from '$lib/components/accounts/ProgressRing.svelte';

	const potId = $derived(page.params.id ?? '');
	const pot = $derived(potId ? pots.get(potId) : undefined);

	// ── Reads off the pots state (revision-reactive). ──
	const wallet = $derived(pot ? pots.walletFor(pot) : undefined);
	const available = $derived(pot ? pots.walletAvailableMinor(pot) : 0);
	const pct = $derived(pot ? pots.pct(pot) : null);
	const pctLabel = $derived(pot ? pots.pctLabel(pot) : null);
	const reached = $derived(pot ? pots.reached(pot) : false);
	const toGo = $derived(pot ? pots.toGoMinor(pot) : 0);
	const accrued = $derived(pot ? pots.roundUpAccrued(pot.id) : 0);

	const balance = $derived(pot ? formatMoney(pot.balanceMinor, pot.currency) : '');
	const goal = $derived(
		pot && pot.goalMinor != null ? formatMoney(pot.goalMinor, pot.currency) : null
	);
	const ringLabel = $derived(
		!pot
			? ''
			: reached
				? `${pot.name}: goal reached, ${balance} saved`
				: goal
					? `${balance} of ${goal}, ${pctLabel}%`
					: `${balance} saved`
	);

	// ── Add money — instant transfer wallet → pot. ──
	let addOpen = $state(false);
	let addAmount = $state(0);

	function openAdd() {
		addAmount = 0;
		addOpen = true;
	}
	function submitAdd() {
		if (!pot || !pots.canAdd(pot, addAmount)) return;
		if (pots.add(pot.id, addAmount)) addOpen = false;
	}

	// ── Withdraw — instant transfer pot → wallet (also the "move to wallet" path). ──
	let withdrawOpen = $state(false);
	let withdrawAmount = $state(0);

	function openWithdraw() {
		withdrawAmount = 0;
		withdrawOpen = true;
	}
	function submitWithdraw() {
		if (!pot || !pots.canWithdraw(pot, withdrawAmount)) return;
		if (pots.withdraw(pot.id, withdrawAmount)) withdrawOpen = false;
	}

	// ── Rules · round-ups ──
	function onRoundUps(e: Event) {
		if (!pot) return;
		const on_ = (e.target as HTMLElement & { checked?: boolean }).checked ?? false;
		pots.setRoundUps(pot.id, on_);
	}

	// ── Rules · auto-save (seeded from the live rule). ──
	let autoSaveAmount = $state(pots.get(page.params.id ?? '')?.autoSave?.amountMinor ?? 0);
	let autoSaveFreq = $state<PotFrequency>(
		pots.get(page.params.id ?? '')?.autoSave?.frequency ?? 'monthly'
	);
	const hasRule = $derived(pot?.autoSave != null);
	const rulePaused = $derived(pot?.autoSave?.paused ?? false);

	function onAutoSaveAmount(minor: number) {
		autoSaveAmount = minor;
	}
	function onAutoSaveFreq(e: Event) {
		autoSaveFreq = (e.target as HTMLElement & { value: PotFrequency }).value;
	}
	function saveRule() {
		if (!pot || autoSaveAmount <= 0) return;
		pots.setAutoSave(pot.id, { amountMinor: autoSaveAmount, frequency: autoSaveFreq, paused: false });
	}
	function turnOffRule() {
		if (!pot) return;
		pots.setAutoSave(pot.id, null);
		autoSaveAmount = 0;
	}
	function togglePause() {
		if (!pot) return;
		pots.toggleAutoSavePause(pot.id);
	}

	// ── Close pot — only once it's empty. ──
	function closePot() {
		if (!pot || pot.balanceMinor !== 0) return;
		pots.remove(pot.id);
		goto('/accounts/pots');
	}
</script>

<svelte:head>
	<title>{pot ? `${pot.name} · gökberk bank` : 'Pot · gökberk bank'}</title>
</svelte:head>

{#if !pot}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Pot not found</p>
			<p class="missing-body">This pot doesn't exist, or I've already closed it.</p>
			<gok-link slot="actions" href="/accounts/pots">Back to pots</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/accounts/pots">&larr; Pots</gok-link>
			<div class="title-row">
				<span class="emoji" aria-hidden="true">{pot.emoji}</span>
				<div class="title-meta">
					<p class="eyebrow gok-eyebrow">Pot</p>
					<h1 class="title gok-headline-3">{pot.name}</h1>
				</div>
			</div>
		</header>

		<!-- Hero: the big ring + the figures, stated as text. -->
		<section class="hero" aria-label="Progress">
			<ProgressRing {pct} {reached} large ariaLabel={ringLabel}>
				{#if reached}
					<span class="ring-done gok-eyebrow">Done</span>
				{:else if pctLabel != null}
					<span class="ring-pct gok-tabular-nums">{pctLabel}%</span>
				{:else}
					<span class="ring-open gok-eyebrow">Open-ended</span>
				{/if}
			</ProgressRing>

			<dl class="figures">
				<div class="figure">
					<dt class="figure-label gok-eyebrow">Saved</dt>
					<dd class="figure-value gok-tabular-nums">{balance}</dd>
				</div>
				{#if goal}
					<div class="figure">
						<dt class="figure-label gok-eyebrow">Goal</dt>
						<dd class="figure-value gok-tabular-nums">{goal}</dd>
					</div>
					{#if reached}
						<div class="figure">
							<dt class="figure-label gok-eyebrow">Status</dt>
							<dd class="figure-value">Goal reached</dd>
						</div>
					{:else}
						<div class="figure">
							<dt class="figure-label gok-eyebrow">To go</dt>
							<dd class="figure-value gok-tabular-nums">{formatMoney(toGo, pot.currency)}</dd>
						</div>
					{/if}
				{:else}
					<div class="figure">
						<dt class="figure-label gok-eyebrow">Goal</dt>
						<dd class="figure-value">Open-ended</dd>
					</div>
				{/if}
				{#if pot.targetDate}
					<div class="figure">
						<dt class="figure-label gok-eyebrow">Target date</dt>
						<dd class="figure-value gok-tabular-nums">{formatDate(pot.targetDate)}</dd>
					</div>
				{/if}
			</dl>
		</section>

		{#if reached}
			<p class="reached-note">
				I've reached my goal for {pot.name}. I can keep adding, or move the money back to {wallet?.name ??
					'my wallet'} whenever I need it.
			</p>
		{/if}

		<!-- Move money — two instant, reversible transfers. -->
		<section class="actions" aria-label="Move money">
			<gok-button variant="primary" {@attach on('click', openAdd)}>Add money</gok-button>
			<gok-button variant="secondary" {@attach on('click', openWithdraw)}>
				{reached ? 'Move to wallet' : 'Withdraw'}
			</gok-button>
		</section>

		<!-- Rules — round-ups, auto-save, and close. -->
		<section class="rules" aria-labelledby="rules-heading">
			<h2 id="rules-heading" class="rules-title gok-headline-5">Rules</h2>

			<div class="rule">
				<gok-switch
					{@attach setProps({ checked: pot.roundUps })}
					{@attach on('change', onRoundUps)}
				>
					Round spare change to this pot
				</gok-switch>
				<p class="rule-hint">
					{#if pot.roundUps}
						Spare change from my card rounds up here. <span class="gok-tabular-nums"
							>{formatMoney(accrued, pot.currency)}</span
						> set aside so far.
					{:else}
						Each card payment rounds up to the next euro, and the change comes here.
					{/if}
				</p>
			</div>

			<div class="rule">
				<p class="rule-label gok-eyebrow">Auto-save</p>
				<p class="rule-hint">A set amount moves in on a schedule. I can pause it anytime.</p>

				<div class="autosave-fields">
					<MoneyInput
						value={autoSaveAmount}
						currency={pot.currency}
						label="Amount"
						onchange={onAutoSaveAmount}
					/>
					<gok-segmented
						label="How often"
						{@attach setProps({ value: autoSaveFreq })}
						{@attach on('change', onAutoSaveFreq)}
					>
						<gok-segmented-item value="weekly">Weekly</gok-segmented-item>
						<gok-segmented-item value="monthly">Monthly</gok-segmented-item>
					</gok-segmented>
				</div>

				{#if hasRule}
					<p class="rule-status">
						{#if rulePaused}
							Paused — {formatMoney(pot.autoSave?.amountMinor ?? 0, pot.currency)}
							{pot.autoSave?.frequency} is on hold.
						{:else}
							Saving {formatMoney(pot.autoSave?.amountMinor ?? 0, pot.currency)}
							{pot.autoSave?.frequency}.
						{/if}
					</p>
				{/if}

				<div class="autosave-actions">
					<gok-button
						variant="secondary"
						{@attach setProps({ disabled: autoSaveAmount <= 0 })}
						{@attach on('click', saveRule)}
					>
						{hasRule ? 'Update auto-save' : 'Set auto-save'}
					</gok-button>
					{#if hasRule}
						<gok-button variant="secondary" {@attach on('click', togglePause)}>
							{rulePaused ? 'Resume' : 'Pause'}
						</gok-button>
						<gok-button variant="secondary" {@attach on('click', turnOffRule)}>Turn off</gok-button>
					{/if}
				</div>
			</div>

			<div class="rule close-rule">
				<p class="rule-label gok-eyebrow">Close pot</p>
				{#if pot.balanceMinor === 0}
					<p class="rule-hint">This pot is empty, so I can close it. Nothing is lost.</p>
					<gok-button variant="secondary" {@attach on('click', closePot)}>Close pot</gok-button>
				{:else}
					<p class="rule-hint">
						To close {pot.name}, I move the
						<span class="gok-tabular-nums">{balance}</span> back to my wallet first.
					</p>
					<gok-button variant="secondary" {@attach on('click', openWithdraw)}>
						Move {balance} out
					</gok-button>
				{/if}
			</div>
		</section>
	</div>

	<!-- Add drawer — instant transfer, capped at the wallet's spare. -->
	<gok-drawer
		placement="end"
		heading="Add money"
		{@attach setProps({ open: addOpen })}
		{@attach on('gok-close', () => (addOpen = false))}
		{@attach on('gok-cancel', () => (addOpen = false))}
	>
		<div class="drawer-form">
			<p class="drawer-lead">
				Money moves straight from {wallet?.name ?? 'my wallet'} into {pot.name}. I can take it back
				anytime.
			</p>
			<MoneyInput
				value={addAmount}
				currency={pot.currency}
				label="Amount to add"
				balanceMinor={available}
				onchange={(m) => (addAmount = m)}
			/>
			<p class="drawer-hint gok-tabular-nums">
				{formatMoney(available, pot.currency)} spare in {wallet?.name ?? 'my wallet'}
			</p>
		</div>
		<div slot="footer" class="drawer-actions">
			<gok-button variant="secondary" {@attach on('click', () => (addOpen = false))}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !pots.canAdd(pot, addAmount) })}
				{@attach on('click', submitAdd)}
			>
				Add money
			</gok-button>
		</div>
	</gok-drawer>

	<!-- Withdraw drawer — instant transfer, capped at the pot's balance. -->
	<gok-drawer
		placement="end"
		heading="Move to wallet"
		{@attach setProps({ open: withdrawOpen })}
		{@attach on('gok-close', () => (withdrawOpen = false))}
		{@attach on('gok-cancel', () => (withdrawOpen = false))}
	>
		<div class="drawer-form">
			<p class="drawer-lead">
				Money moves back from {pot.name} into {wallet?.name ?? 'my wallet'}, ready to spend.
			</p>
			<MoneyInput
				value={withdrawAmount}
				currency={pot.currency}
				label="Amount to move"
				balanceMinor={pot.balanceMinor}
				onchange={(m) => (withdrawAmount = m)}
			/>
			<p class="drawer-hint gok-tabular-nums">{balance} in {pot.name}</p>
		</div>
		<div slot="footer" class="drawer-actions">
			<gok-button variant="secondary" {@attach on('click', () => (withdrawOpen = false))}>
				Cancel
			</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !pots.canWithdraw(pot, withdrawAmount) })}
				{@attach on('click', submitWithdraw)}
			>
				Move to wallet
			</gok-button>
		</div>
	</gok-drawer>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.missing {
		padding-block: var(--gok-space-700);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.emoji {
		font-size: var(--gok-type-headline-2-size);
		line-height: 1;
	}

	.title-meta {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* --- Hero: ring + figures --- */
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-600);
	}

	.ring-pct {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-3-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-3-line);
		color: var(--gok-color-text);
	}

	.ring-done,
	.ring-open {
		color: var(--gok-color-text-muted);
	}

	.figures {
		display: grid;
		grid-template-columns: repeat(2, minmax(8rem, auto));
		gap: var(--gok-space-400) var(--gok-space-600);
		margin: 0;
	}

	.figure {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.figure-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.figure-value {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		letter-spacing: var(--gok-type-headline-6-tracking);
		color: var(--gok-color-text);
	}

	.reached-note {
		margin: 0;
		max-inline-size: 44rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Move-money actions --- */
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-300);
		border-block: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* --- Rules --- */
	.rules {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.rules-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.rule {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block-end: var(--gok-space-500);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.close-rule {
		padding-block-end: 0;
		border-block-end: none;
	}

	.rule-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.rule-hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.rule-status {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.autosave-fields {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--gok-space-400);
		margin-block-start: var(--gok-space-100);
	}

	.autosave-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-100);
	}

	/* --- Drawers --- */
	.drawer-form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.drawer-lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.drawer-hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.drawer-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	@media (max-width: 30rem) {
		.figures {
			grid-template-columns: 1fr 1fr;
			gap: var(--gok-space-300) var(--gok-space-400);
		}
	}
</style>
