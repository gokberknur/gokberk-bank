<script lang="ts">
	// P04 · Multi-currency FX exchange — convert between my own currency wallets at
	// today's tier-margined rate. A focused full-page surface (NOT the F05 wizard):
	// one screen — pick two wallets, type either amount and watch the other compute,
	// read the honest rate card — then a single forced-decision confirm. A convert
	// settles instantly because the bank owns both wallets, so the success is
	// immediate: both balances have already moved.
	//
	// The two money inputs are LINKED off the pure quote engine (`exchange` state):
	// I type one side, the other recomputes. MoneyInput's `value` is seed-only
	// (dogfooding #26), so the COMPUTED side is wrapped in `{#key …}` to remount with
	// its fresh seed while the side I'm typing stays put (no caret jump). Wallet
	// changes and swaps fold into the key too, so both seeds refresh on a pair change.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never
	// `bind:` on a gok-* element. MoneyInput and StepUp are Svelte composites. Status
	// is by rule + word, never hue alone. The margin is disclosed honestly.
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { exchange, MIN_FROM_MINOR } from '$lib/state/exchange.svelte';
	import { rateAsFloat } from '$lib/payments/fx';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	// ── The refresh countdown is a runtime effect on the shared state. startClock is
	// idempotent (guarded), and its own interval tears down with this effect. ──
	$effect(() => {
		exchange.startClock();
	});

	// ── Reactive reads off the exchange state (all method calls, revision-aware). ──
	const wallets = $derived(exchange.wallets());
	const editing = $derived(exchange.editing);
	const fromCurrency = $derived(exchange.fromCurrency());
	const toCurrency = $derived(exchange.toCurrency());
	const samePair = $derived(exchange.samePair());

	const fromLabel = $derived(formatMoney(exchange.fromMinor, fromCurrency));
	const toLabel = $derived(formatMoney(exchange.toMinor, toCurrency));

	// Rate card figures. rateAsFloat is display-only (never money math).
	const midRate = $derived(rateAsFloat(exchange.midScaled()).toFixed(4));
	const yourRate = $derived(rateAsFloat(exchange.yourScaled()).toFixed(4));
	const marginBps = $derived(exchange.marginBps());
	const noMarkup = $derived(marginBps === 0);

	// Reward-early validation surfaced on one reserved line (kept off the inputs so
	// the message lives in a single place). belowMin first, then funds.
	const validationMessage = $derived.by(() => {
		if (exchange.belowMin()) {
			return `The smallest amount I can convert is ${formatMoney(MIN_FROM_MINOR, fromCurrency)}.`;
		}
		if (exchange.insufficientFunds()) {
			const fw = exchange.fromWallet();
			return fw
				? `That's more than the ${formatMoney(fw.availableMinor, fw.currency)} available in ${fw.name}.`
				: 'That is more than I have available.';
		}
		return '';
	});

	const canReview = $derived(exchange.valid());

	// The COMPUTED side must remount to pick up its recomputed seed; the side I'm
	// actively typing must NOT (it would jerk the caret). The key tracks the value
	// only on the inactive side, plus the wallet id so a wallet change / swap reseeds
	// both. (Wrapping the active side's value-branch behind `editing` keeps it stable
	// keystroke to keystroke; a swap flips both ids, remounting both with new seeds.)
	const fromKey = $derived(`from:${exchange.fromId}:${editing === 'to' ? exchange.fromMinor : 'live'}`);
	const toKey = $derived(`to:${exchange.toId}:${editing === 'from' ? exchange.toMinor : 'live'}`);

	// ── Linked-amount handlers — set one side, the engine computes the other. ──
	function onFromInput(minor: number) {
		exchange.setFrom(minor);
	}

	function onToInput(minor: number) {
		exchange.setTo(minor);
	}

	// ── Wallet selection ──
	function onFromWallet(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		exchange.setFromWallet(value);
	}

	function onToWallet(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		exchange.setToWallet(value);
	}

	function swap() {
		exchange.swap();
	}

	// ── Review → forced-decision confirm → instant success ──
	let confirmOpen = $state(false);
	let stepUpOpen = $state(false);
	let phase = $state<'form' | 'success'>('form');
	// The receipt is snapshotted at convert time — convert() clears the amounts.
	let receipt = $state<{
		from: string;
		to: string;
		yourRate: string;
		margin: string;
		toWalletName: string;
		reference: string;
	} | null>(null);

	/** Open the right gate: a high-value own-money move steps up first. */
	function openReview() {
		if (!canReview) return;
		if (exchange.needsStepUp()) {
			stepUpOpen = true;
		} else {
			confirmOpen = true;
		}
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	function cancelStepUp() {
		stepUpOpen = false;
	}

	/** The deliberate commit: snapshot the receipt, settle, switch to success. */
	function doConvert() {
		// Capture the human figures before convert() resets the amounts to zero.
		const snapshot = {
			from: fromLabel,
			to: toLabel,
			yourRate: `1 ${fromCurrency} = ${yourRate} ${toCurrency}`,
			margin: noMarkup ? 'No markup' : `${marginBps / 100}% margin`,
			toWalletName: exchange.toWallet()?.name ?? toCurrency
		};
		const result = exchange.convert();
		if (!result) return; // A guard slipped in — stay on the form.
		receipt = { ...snapshot, reference: result.reference };
		confirmOpen = false;
		stepUpOpen = false;
		phase = 'success';
	}

	/** Start a fresh exchange from the success panel. */
	function newExchange() {
		exchange.reset();
		receipt = null;
		phase = 'form';
	}

	/** Move focus to the success heading when the success view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	function goToAccounts() {
		goto('/accounts');
	}

	// The step-up consequence names both sides + the rate (StepUp takes prose, not a
	// structured ledger), so the high-value path still discloses the full move.
	const stepUpConsequence = $derived(
		`I'll convert ${fromLabel} into ${toLabel} at ${yourRate} ${toCurrency} per ${fromCurrency}. Both balances update instantly.`
	);
</script>

<svelte:head>
	<title>Exchange · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if phase === 'success' && receipt}
		<!-- Success · INSTANT (C02). Both wallets have already moved — no pending. -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M5 12.5l4.5 4.5L19 7"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>

				<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
					<span class="gok-tabular-nums">{receipt.from}</span> converted
				</h1>

				<gok-tag size="m" dot variant="selected">Converted</gok-tag>

				<p class="outcome-body">
					I converted <span class="gok-tabular-nums">{receipt.from}</span> into
					<span class="gok-tabular-nums">{receipt.to}</span>. Both balances updated.
				</p>

				<dl class="ledger receipt">
					<div class="row">
						<dt>Received</dt>
						<dd class="gok-tabular-nums">{receipt.to}</dd>
					</div>
					<div class="row">
						<dt>Into</dt>
						<dd>{receipt.toWalletName}</dd>
					</div>
					<div class="row">
						<dt>My rate</dt>
						<dd class="gok-tabular-nums">{receipt.yourRate}</dd>
					</div>
					<div class="row">
						<dt>Reference</dt>
						<dd class="mono">{receipt.reference}</dd>
					</div>
				</dl>

				<div slot="actions" class="outcome-actions">
					<gok-button variant="primary" {@attach on('click', goToAccounts)}>
						View my wallets
					</gok-button>
					<gok-button variant="secondary" {@attach on('click', newExchange)}>
						New exchange
					</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<header class="head">
			<gok-link href="/payments">&larr; Payments</gok-link>
			<p class="eyebrow gok-eyebrow">Payments</p>
			<h1 class="title gok-headline-2">Exchange</h1>
			<p class="head-sub">Convert between my own wallets at today's rate.</p>
		</header>

		<!-- 1 · Wallets — From, swap, To. -->
		<section class="wallets" aria-label="Wallets">
			<div class="wallet-field">
				<gok-select
					label="From wallet"
					{@attach setProps({ value: exchange.fromId })}
					{@attach on('change', onFromWallet)}
				>
					{#each wallets as wallet (wallet.id)}
						<gok-option value={wallet.id}>
							{wallet.name} · {wallet.currency} · {formatMoney(wallet.availableMinor, wallet.currency)}
						</gok-option>
					{/each}
				</gok-select>
			</div>

			<button type="button" class="swap" onclick={swap} aria-label="Swap From and To wallets">
				<span aria-hidden="true">↕</span>
			</button>

			<div class="wallet-field">
				<gok-select
					label="To wallet"
					{@attach setProps({ value: exchange.toId })}
					{@attach on('change', onToWallet)}
				>
					{#each wallets as wallet (wallet.id)}
						<gok-option value={wallet.id}>
							{wallet.name} · {wallet.currency} · {formatMoney(wallet.availableMinor, wallet.currency)}
						</gok-option>
					{/each}
				</gok-select>
			</div>
		</section>

		{#if samePair}
			<p class="same-pair" role="note">
				From and To are the same currency — I'll pick a different wallet to convert into.
			</p>
		{/if}

		<!-- 2 · Linked amounts — type either, the other computes. -->
		<section class="amounts" aria-label="Amounts">
			{#key fromKey}
				<MoneyInput
					value={exchange.fromMinor}
					currency={fromCurrency}
					label="I convert"
					onchange={onFromInput}
				/>
			{/key}

			{#key toKey}
				<MoneyInput
					value={exchange.toMinor}
					currency={toCurrency}
					label="I receive"
					onchange={onToInput}
				/>
			{/key}
		</section>

		<!-- Reserved validation line keeps the layout from shifting. -->
		<p class="validation" aria-live="polite">{validationMessage}</p>

		<!-- 3 · Rate card — the honest mid, my rate, the margin, the countdown. -->
		<gok-card class="rate-card">
			<p class="rate-eyebrow gok-eyebrow">Today's rate</p>
			<dl class="ledger">
				<div class="row">
					<dt>Mid-market rate</dt>
					<dd class="gok-tabular-nums">1 {fromCurrency} = {midRate} {toCurrency}</dd>
				</div>
				<div class="row">
					<dt>My rate</dt>
					<dd class="gok-tabular-nums">1 {fromCurrency} = {yourRate} {toCurrency}</dd>
				</div>
				<div class="row">
					<dt>Margin</dt>
					<dd class="row-inline">
						{#if noMarkup}
							No markup
							<gok-badge variant="success" size="s">No markup</gok-badge>
						{:else}
							<span class="gok-tabular-nums">{marginBps / 100}% margin</span>
						{/if}
					</dd>
				</div>
			</dl>
			<p class="countdown gok-tabular-nums" aria-live="polite">
				Rate refreshes in {exchange.secondsLeft}s
			</p>
		</gok-card>

		<!-- 4 · Review → the forced-decision confirm. -->
		<div class="review-row">
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canReview })}
				{@attach on('click', openReview)}
			>
				Review
			</gok-button>
		</div>
	{/if}
</div>

<!-- The forced-decision gate (standard value). Danger tone, no-dismiss. -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Convert {fromLabel}?"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
>
	<p class="confirm-body">
		Convert <strong class="gok-tabular-nums">{fromLabel}</strong> into
		<strong class="gok-tabular-nums">{toLabel}</strong>? Both balances move the moment I confirm.
	</p>

	<dl class="ledger confirm-ledger">
		<div class="row">
			<dt>Convert</dt>
			<dd class="gok-tabular-nums">{fromLabel}</dd>
		</div>
		<div class="row">
			<dt>Receive</dt>
			<dd class="gok-tabular-nums">{toLabel}</dd>
		</div>
		<div class="row">
			<dt>My rate</dt>
			<dd class="gok-tabular-nums">1 {fromCurrency} = {yourRate} {toCurrency}</dd>
		</div>
		<div class="row">
			<dt>Margin</dt>
			<dd>{noMarkup ? 'No markup' : `${marginBps / 100}% margin`}</dd>
		</div>
		<div class="row">
			<dt>Fee</dt>
			<dd>No fee</dd>
		</div>
	</dl>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button variant="primary" {@attach on('click', doConvert)}>
			Convert {fromLabel}
		</gok-button>
	</div>
</gok-dialog>

<!-- High-value own-money move (EUR-equivalent ≥ €10k) steps up first. -->
<StepUp
	open={stepUpOpen}
	title="Convert {fromLabel}?"
	consequence={stepUpConsequence}
	confirmLabel="Convert {fromLabel}"
	tone="danger"
	onConfirm={doConvert}
	onCancel={cancelStepUp}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		/* Trim the sparse header→content gap to the standard ~32px (PAY-U-04). */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Wallets row: From · swap · To --- */
	.wallets {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: end;
		gap: var(--gok-space-300);
	}

	.wallet-field {
		min-inline-size: 0;
	}

	/*
	 * The swap control composes plain layout around an app-local button — it never
	 * restyles a DS component. It sits on the inputs' baseline; the accent stays
	 * unspent (ink hairline), firming on hover/focus.
	 */
	.swap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		margin-block-end: var(--gok-space-100);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-surface);
		color: var(--gok-color-text);
		font-size: var(--gok-type-body-large-size);
		cursor: pointer;
		transition:
			border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.swap:hover {
		border-color: var(--gok-color-border-strong);
		background: var(--gok-color-surface-strong);
	}

	.swap:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.same-pair {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Linked amounts --- */
	.amounts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--gok-space-300);
	}

	.validation {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	/* --- Rate card --- */
	.rate-card {
		display: block;
	}

	.rate-eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

	.countdown {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Key/value ledger (shared: rate card, confirm, receipt) --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	.row-inline {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* --- Review action --- */
	.review-row {
		display: flex;
		justify-content: flex-end;
	}

	/* --- Confirm dialog --- */
	.confirm-body {
		margin: 0 0 var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-ledger {
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Success outcome --- */
	.outcome {
		padding-block: var(--gok-space-700);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid currentcolor;
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.outcome-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 22rem;
		margin-inline: auto;
		text-align: start;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.outcome-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

	@media (max-width: 30rem) {
		.wallets {
			grid-template-columns: 1fr;
		}

		.swap {
			justify-self: center;
		}

		.amounts {
			grid-template-columns: 1fr;
		}

		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
