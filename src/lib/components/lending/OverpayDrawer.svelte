<script lang="ts">
	// L02 · Overpay drawer — a calm `gok-drawer` for paying a lump sum against my loan
	// principal. It rides the money spine: gather (an extra amount, in EUR) → a live
	// effect preview (the new balance, the months it shaves off my term, the interest
	// it saves) with a reward-early insufficient-funds block → a forced-decision confirm
	// naming the exact figure → place. Overpaying isn't destructive (no step-up), but
	// the commit is still deliberate.
	//
	// Single source of truth: `lending.overpayDraft` + `lending.overpayPreview()`. The
	// form never holds derived money state — it patches the draft (`setOverpay`) and
	// reads the fresh preview. Web-component interop is strictly `setProps`/`on` from
	// `wc.svelte` — never `bind:` on a gok-* element (MoneyInput is an app Svelte
	// composite, so its own `bind:value`/`onchange` is fine).
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { lending } from '$lib/state/lending.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import { PayoffChart } from '$lib/charts';

	interface Props {
		/** Whether the drawer is shown (two-way; the host opens it, the drawer closes it). */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// ── Live reads (the single source of effect + funds truth) ──
	const preview = $derived(lending.overpayPreview());
	const glide = $derived(lending.overpayGlide());
	const servicing = $derived(lending.servicing());
	const extraMinor = $derived(lending.overpayDraft.extraMinor);
	const fx = $derived(preview.effect);

	// The Review gate: a positive amount, funded, the loan still active.
	const canReview = $derived(
		extraMinor > 0 && !preview.insufficientFunds && servicing.status === 'active'
	);

	// The chart's text alternative — the saving, legible without colour.
	const chartSummary = $derived(
		`Original balance: paid off in ${fx.monthsBefore} months. After overpaying ${eur(extraMinor)}: ${fx.monthsAfter} months.`
	);

	// ── Phase machine: the form (with a confirm dialog over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let confirmOpen = $state(false);
	let amountValue = $state(0);
	let placed = $state<{ amountLabel: string; monthsSaved: number; interestLabel: string } | null>(
		null
	);

	// Open is the rising edge: reset the draft, the phase, and the field mirror.
	// `untrack` keeps the effect keyed on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				lending.openOverpay();
				phase = 'form';
				confirmOpen = false;
				placed = null;
				amountValue = 0;
			}
			wasOpen = isOpen;
		});
	});

	// ── Field handler — patches the single draft ──
	function onAmount(minor: number) {
		lending.setOverpay(minor);
	}

	// ── Confirm → place → done ──
	function openConfirm() {
		if (!canReview) return;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: capture the figures, place the overpayment, advance. */
	function placeNow() {
		const amt = extraMinor;
		const savedMonths = fx.monthsSavedMinor;
		const savedInterest = fx.interestSavedMinor;
		const ok = lending.placeOverpay();
		if (!ok) return; // A blocking flag slipped in — stay on review.
		placed = {
			amountLabel: eur(amt),
			monthsSaved: savedMonths,
			interestLabel: eur(savedInterest)
		};
		confirmOpen = false;
		phase = 'done';
	}

	function closeDrawer() {
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-drawer
	placement="end"
	heading="Overpay my loan"
	{@attach setProps({ open })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if phase === 'done' && placed}
		<!-- Done · the overpayment made + what it bought me. -->
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Overpayment made</h2>

			<p class="done-note">
				I paid {placed.amountLabel} against my balance — {placed.monthsSaved} months sooner. My loan updates
				straight away.
			</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Overpaid</dt>
					<dd class="gok-tabular-nums">{placed.amountLabel}</dd>
				</div>
				<div class="row">
					<dt>Term saved</dt>
					<dd class="gok-tabular-nums">{placed.monthsSaved} months</dd>
				</div>
				<div class="row">
					<dt>Interest saved</dt>
					<dd class="gok-tabular-nums">{placed.interestLabel}</dd>
				</div>
			</dl>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', closeDrawer)}>Done</gok-button>
			</div>
		</gok-empty-state>
	{:else}
		<!-- Form · the overpay ticket, top to bottom. -->
		<div class="form">
			<p class="lead">
				A lump sum comes straight off my balance. I keep the same monthly payment, so the loan
				finishes sooner — there's no fee for overpaying.
			</p>

			<!-- Amount -->
			<div class="field">
				<MoneyInput
					bind:value={amountValue}
					currency="EUR"
					label="Extra amount"
					balanceMinor={preview.fundsAvailableMinor}
					onchange={onAmount}
				/>
			</div>

			<!-- Live effect preview -->
			<gok-card class="preview">
				<p class="preview-eyebrow gok-eyebrow">If I overpay</p>
				<dl class="ledger">
					<div class="row">
						<dt>Overpayment</dt>
						<dd class="gok-tabular-nums">{eur(extraMinor)}</dd>
					</div>
					<div class="row">
						<dt>New balance</dt>
						<dd class="gok-tabular-nums">{eur(fx.newBalanceMinor)}</dd>
					</div>
					<div class="row total">
						<dt>Term saved</dt>
						<dd class="gok-tabular-nums">{fx.monthsSavedMinor} months</dd>
					</div>
					<div class="row">
						<dt>Interest saved</dt>
						<dd class="gok-tabular-nums">{eur(fx.interestSavedMinor)}</dd>
					</div>
				</dl>
				<p class="caption">
					Reduces my term by {fx.monthsSavedMinor} months, and I'd save {eur(
						fx.interestSavedMinor
					)} in interest.
				</p>
			</gok-card>

			<!-- Glide path: original vs after overpaying, with a text summary. -->
			<div class="chart">
				<PayoffChart original={glide.original} afterAction={glide.afterAction} label={chartSummary} />
				<p class="chart-summary">{chartSummary}</p>
			</div>

			<!-- Reward-early funds block -->
			{#if preview.insufficientFunds}
				<gok-alert status="error">
					That's more than my available balance of {eur(preview.fundsAvailableMinor)}.
				</gok-alert>
			{/if}
		</div>

		<!-- The confirm gate lives inside the drawer so focus stays within its scope. -->
		<gok-dialog
			tone="danger"
			size="s"
			heading="Confirm overpayment"
			no-dismiss
			{@attach setProps({ open: confirmOpen })}
			{@attach on('gok-cancel', closeConfirm)}
			{@attach on('gok-close', closeConfirm)}
		>
			<p class="confirm-body">
				I'm paying <strong class="gok-tabular-nums">{eur(extraMinor)}</strong> off my loan today. It
				leaves my account now and shortens my term by
				<strong class="gok-tabular-nums">{fx.monthsSavedMinor} months</strong>.
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<!-- Deliberate confirm: outline/text in the status colour, transparent fill —
				     never a solid fill. App-local <button> so the rule holds without
				     restyling a DS component. -->
				<button type="button" class="status-confirm" onclick={placeNow}>Pay {eur(extraMinor)}</button>
			</div>
		</gok-dialog>
	{/if}

	{#if phase === 'form'}
		<div slot="footer" class="form-actions">
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canReview })}
				{@attach on('click', openConfirm)}
			>
				Review overpayment
			</gok-button>
		</div>
	{/if}
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
		gap: var(--gok-space-200);
	}

	/* --- Effect preview card --- */
	.preview {
		display: block;
	}

	.preview-eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

	.caption {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Glide chart + its text alternative --- */
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.chart-summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Shared key/value ledger (preview + receipt) --- */
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

	.row.total {
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row.total dt,
	.row.total dd {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	/* --- Form action row (drawer footer) --- */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Confirm dialog --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* Deliberate confirm — outline/text in the status colour, transparent fill. */
	.status-confirm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.5rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-error);
		border-radius: var(--gok-radius-s);
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		transition:
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.status-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.status-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	/* --- Done / success --- */
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

	.done-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.done-note {
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

	.done-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
