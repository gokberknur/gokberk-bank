<script lang="ts">
	// L04 Flow B · Mortgage overpay drawer — paying a lump sum off my mortgage principal.
	// It rides the money spine: gather (an extra amount, in EUR) → a live effect preview
	// (the new balance, the months it shaves off, the interest it saves) → a forced
	// decision → a security step-up → place. The mortgage carries an early-repayment
	// charge (ERC) while it's inside the fixed period, so the review splits two ways:
	//
	//   • Within my annual 10% allowance → a calm, no-charge review.
	//   • Above the allowance, while fixed → an ERC-warning forced decision (a danger,
	//     no-dismiss dialog) that names the EXACT charge and the full cost before I can go on.
	//
	// Both paths then run a StepUp re-auth, then `ms.commitOverpay`. The math is owned by
	// `mortgage-servicing` (I never recompute a figure here — I read the quote). Interop is
	// strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* element (MoneyInput
	// is an app composite, so its own `bind:value` is fine).
	//
	// Dogfooding #33 (nested-dialog guard): the drawer hosts a nested review dialog AND a
	// nested StepUp; both emit composed `gok-close`/`gok-cancel` that bubble up here. The
	// drawer's close handler guards `e.target !== e.currentTarget` so a child's bubbled close
	// doesn't tear the drawer down mid-flow.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { mortgageServicing as ms } from '$lib/state/mortgage-servicing.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	interface Props {
		/** Whether the drawer is shown (two-way; the host opens it, the drawer closes it). */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// bps → a two-decimal percent string (300 → "3.00%"), honest for the ERC rate.
	const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;

	// ── Live reads (the single source of effect + charge truth) ──
	let amountMinor = $state(0);
	const quote = $derived(ms.quoteOverpay(amountMinor));
	const fundsMinor = $derived(ms.mortgage.balanceMinor); // a soft cap for the field affordance
	const canReview = $derived(amountMinor > 0);

	// ── Phase machine: the form (with a review dialog + a step-up over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let reviewOpen = $state(false);
	let stepUpOpen = $state(false);
	let amountValue = $state(0);
	let placed = $state<{
		amountLabel: string;
		ercMinor: number;
		ercLabel: string;
		monthsSaved: number;
		interestLabel: string;
	} | null>(null);

	// Open is the rising edge: reset the field, the phase, and both gates. `untrack`
	// keeps the effect keyed on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				phase = 'form';
				reviewOpen = false;
				stepUpOpen = false;
				placed = null;
				amountValue = 0;
				amountMinor = 0;
			}
			wasOpen = isOpen;
		});
	});

	// ── Field handler — the canonical minor-unit amount drives the live quote ──
	function onAmount(minor: number) {
		amountMinor = minor;
	}

	// ── Review → step-up → place ──
	function openReview() {
		if (!canReview) return;
		reviewOpen = true;
	}

	function closeReview() {
		reviewOpen = false;
	}

	/** The review's confirm hands off to the step-up; nothing has moved yet. */
	function toStepUp() {
		reviewOpen = false;
		stepUpOpen = true;
	}

	/** The deliberate commit: capture the figures, place the overpayment, advance. */
	function stepUpConfirmed() {
		const amt = amountMinor;
		const q = ms.commitOverpay(amt);
		stepUpOpen = false;
		placed = {
			amountLabel: eur(amt),
			ercMinor: q.ercMinor,
			ercLabel: eur(q.ercMinor),
			monthsSaved: q.monthsSaved,
			interestLabel: eur(q.interestSavedMinor)
		};
		phase = 'done';
	}

	function stepUpCancelled() {
		stepUpOpen = false; // No side effect — the mortgage hasn't moved.
	}

	function closeDrawer(e?: Event) {
		// Dogfooding #33: only the drawer's OWN cancel/close should close it. The nested
		// review dialog and the StepUp emit composed `gok-close`/`gok-cancel` that bubble
		// here; their retargeted `target` is the inner dialog, not this drawer, so ignore them.
		if (e && e.target !== e.currentTarget) return;
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-drawer
	placement="end"
	heading="Overpay my mortgage"
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
				I paid {placed.amountLabel} off my balance{#if placed.ercMinor > 0}, plus a {placed.ercLabel} early-repayment
					charge{/if} — {placed.monthsSaved} months sooner. My mortgage updates straight away.
			</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Overpaid</dt>
					<dd class="gok-tabular-nums">{placed.amountLabel}</dd>
				</div>
				{#if placed.ercMinor > 0}
					<div class="row">
						<dt>Early-repayment charge</dt>
						<dd class="gok-tabular-nums">{placed.ercLabel}</dd>
					</div>
				{/if}
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
				A lump sum comes straight off my balance, so my mortgage finishes sooner. While I'm in the
				fixed period I can overpay up to {eur(quote.allowanceMinor)} a year free of charge; above that, an
				early-repayment charge applies.
			</p>

			<!-- Amount -->
			<div class="field">
				<MoneyInput
					bind:value={amountValue}
					currency="EUR"
					label="Extra amount"
					balanceMinor={fundsMinor}
					onchange={onAmount}
				/>
			</div>

			<!-- Live effect preview -->
			<gok-card class="preview">
				<p class="preview-eyebrow gok-eyebrow">If I overpay</p>
				<dl class="ledger">
					<div class="row">
						<dt>Overpayment</dt>
						<dd class="gok-tabular-nums">{eur(amountMinor)}</dd>
					</div>
					<div class="row">
						<dt>New balance</dt>
						<dd class="gok-tabular-nums">{eur(quote.newBalanceMinor)}</dd>
					</div>
					<div class="row total">
						<dt>Term saved</dt>
						<dd class="gok-tabular-nums">{quote.monthsSaved} months</dd>
					</div>
					<div class="row">
						<dt>Interest saved</dt>
						<dd class="gok-tabular-nums">{eur(quote.interestSavedMinor)}</dd>
					</div>
				</dl>
				{#if !quote.withinAllowance}
					<gok-alert status="warning" class="erc-flag">
						{eur(quote.ercableMinor)} of this is above my {eur(quote.allowanceMinor)} allowance, so a {pct(
							quote.ercBps
						)} early-repayment charge of {eur(quote.ercMinor)} applies.
					</gok-alert>
				{/if}
			</gok-card>
		</div>

		<!-- The review gate lives inside the drawer so focus stays within its scope. It is
		     the calm, no-charge review within allowance, and the ERC-warning forced decision
		     (danger, no-dismiss) above it. -->
		<gok-dialog
			tone={quote.withinAllowance ? undefined : 'danger'}
			size="s"
			heading={quote.withinAllowance ? 'Review overpayment' : 'Early-repayment charge applies'}
			{@attach setProps({ open: reviewOpen, noDismiss: !quote.withinAllowance })}
			{@attach on('gok-cancel', closeReview)}
			{@attach on('gok-close', closeReview)}
		>
			{#if quote.withinAllowance}
				<p class="confirm-body">
					This comes straight off my balance — there's no early-repayment charge, it's within my {eur(
						quote.allowanceMinor
					)} annual allowance.
				</p>
				<dl class="ledger confirm-ledger">
					<div class="row">
						<dt>Overpayment</dt>
						<dd class="gok-tabular-nums">{eur(amountMinor)}</dd>
					</div>
					<div class="row">
						<dt>New balance</dt>
						<dd class="gok-tabular-nums">{eur(quote.newBalanceMinor)}</dd>
					</div>
					<div class="row">
						<dt>Term saved</dt>
						<dd class="gok-tabular-nums">{quote.monthsSaved} months</dd>
					</div>
					<div class="row">
						<dt>Interest saved</dt>
						<dd class="gok-tabular-nums">{eur(quote.interestSavedMinor)}</dd>
					</div>
				</dl>

				<div slot="footer" class="confirm-actions">
					<gok-button variant="secondary" {@attach on('click', closeReview)}>Back</gok-button>
					<gok-button variant="primary" {@attach on('click', toStepUp)}>
						Overpay {eur(amountMinor)}
					</gok-button>
				</div>
			{:else}
				<p class="confirm-body">
					Paying {eur(amountMinor)} now is more than my {eur(quote.allowanceMinor)} annual allowance while
					I'm in the fixed period. Paying this much triggers a {pct(quote.ercBps)} early-repayment charge
					on the {eur(quote.ercableMinor)} above the allowance.
				</p>
				<dl class="ledger confirm-ledger">
					<div class="row">
						<dt>Overpayment</dt>
						<dd class="gok-tabular-nums">{eur(amountMinor)}</dd>
					</div>
					<div class="row">
						<dt>Annual allowance</dt>
						<dd class="gok-tabular-nums">{eur(quote.allowanceMinor)}</dd>
					</div>
					<div class="row">
						<dt>Above the allowance</dt>
						<dd class="gok-tabular-nums">{eur(quote.ercableMinor)}</dd>
					</div>
					<div class="row">
						<dt>Charge ({pct(quote.ercBps)})</dt>
						<dd class="gok-tabular-nums">{eur(quote.ercMinor)}</dd>
					</div>
					<div class="row total">
						<dt>Total to pay today</dt>
						<dd class="gok-tabular-nums">{eur(quote.totalCostMinor)}</dd>
					</div>
					<div class="row">
						<dt>New balance</dt>
						<dd class="gok-tabular-nums">{eur(quote.newBalanceMinor)}</dd>
					</div>
					<div class="row">
						<dt>Term saved</dt>
						<dd class="gok-tabular-nums">{quote.monthsSaved} months</dd>
					</div>
					<div class="row">
						<dt>Interest saved</dt>
						<dd class="gok-tabular-nums">{eur(quote.interestSavedMinor)}</dd>
					</div>
				</dl>

				<div slot="footer" class="confirm-actions">
					<gok-button variant="secondary" {@attach on('click', closeReview)}>Back</gok-button>
					<!-- Deliberate confirm naming the full cost: outline/text in the status colour,
					     transparent fill — never a solid fill. App-local <button> so the rule holds
					     without restyling a DS component. -->
					<button type="button" class="status-confirm" onclick={toStepUp}>
						Pay {eur(quote.totalCostMinor)} incl. {eur(quote.ercMinor)} ERC
					</button>
				</div>
			{/if}
		</gok-dialog>

		<!-- Step-up re-auth. Cancellable; declining has no side effect. Sibling of the review
		     dialog inside the drawer — its bubbled close reaches the drawer guard, not the review. -->
		<StepUp
			open={stepUpOpen}
			title="Overpay my mortgage?"
			consequence={quote.withinAllowance
				? `This pays ${eur(amountMinor)} off my mortgage today.`
				: `This pays ${eur(quote.totalCostMinor)} today — ${eur(amountMinor)} off my mortgage plus a ${eur(quote.ercMinor)} early-repayment charge.`}
			confirmLabel="Confirm overpayment"
			tone="danger"
			onConfirm={stepUpConfirmed}
			onCancel={stepUpCancelled}
		/>
	{/if}

	{#if phase === 'form'}
		<div slot="footer" class="form-actions">
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canReview })}
				{@attach on('click', openReview)}
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

	.erc-flag {
		display: block;
		margin-block-start: var(--gok-space-300);
	}

	/* --- Shared key/value ledger (preview + receipt + confirm) --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.confirm-ledger {
		margin-block-start: var(--gok-space-300);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
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

	/* --- Review / confirm dialog --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
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
