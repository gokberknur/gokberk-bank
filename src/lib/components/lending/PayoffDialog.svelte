<script lang="ts">
	// L02 · Pay-off dialog — the money-spine settlement flow for closing my loan early.
	// It opens on the settlement ledger (outstanding principal, interest accrued to
	// date, the total to settle, and the interest it saves vs running to term) with a
	// reward-early insufficient-funds block and the glide path dropping to zero. The
	// commit is the most deliberate in the app, so it runs the security order from the
	// crypto send: review ledger → StepUp re-auth → a forced-decision dialog naming the
	// exact figure → place. Declining the step-up returns with no change.
	//
	// Single source of truth: `lending.payoff()` + `lending.payoffInsufficientFunds()`.
	// Interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-*
	// element. There is no early-settlement penalty — the payoff is principal + accrued
	// interest only, so settling early simply skips the rest of the interest.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { lending } from '$lib/state/lending.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';
	import { PayoffChart } from '$lib/charts';

	interface Props {
		/** Whether the dialog is shown (two-way; the host opens it, the dialog closes it). */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// ── Live reads (the single source of settlement truth) ──
	const quote = $derived(lending.payoff());
	const glide = $derived(lending.payoffGlide());
	const servicing = $derived(lending.servicing());
	const insufficient = $derived(lending.payoffInsufficientFunds());
	// The available funding balance for the no-blame block (independent of the overpay draft).
	const fundsAvailableMinor = $derived(lending.overpayPreview().fundsAvailableMinor);

	// The Review gate: a positive payoff, funded, the loan still active.
	const canSettle = $derived(
		quote.totalMinor > 0 && !insufficient && servicing.status === 'active'
	);

	const chartSummary = $derived(
		`Original balance: paid off in ${quote.monthsRemaining} months. After paying off: settled today, balance zero.`
	);

	// ── Phase machine: review (with two stacked gates over it) → done ──
	let phase = $state<'review' | 'done'>('review');
	let stepUpOpen = $state(false);
	let confirmOpen = $state(false);

	// Open is the rising edge: reset the phase + both gates. `untrack` keeps the effect
	// keyed on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				phase = 'review';
				stepUpOpen = false;
				confirmOpen = false;
			}
			wasOpen = isOpen;
		});
	});

	// ── Review → step-up → forced-decision → settle ──
	function openStepUp() {
		if (!canSettle) return;
		stepUpOpen = true;
	}

	function stepUpConfirmed() {
		stepUpOpen = false;
		confirmOpen = true;
	}

	function stepUpCancelled() {
		stepUpOpen = false; // No side effect — the loan hasn't moved.
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: settle in full, advance to the clearing confirmation. */
	function settleNow() {
		const ok = lending.placeSettlement();
		if (!ok) return; // A blocking flag slipped in — stay on the confirm gate.
		confirmOpen = false;
		phase = 'done';
	}

	function closeDialog(e?: Event) {
		// Only the parent dialog's OWN cancel/close should close it. The nested StepUp
		// and the forced-decision dialog emit composed `gok-close`/`gok-cancel` events
		// that bubble up to this listener; retargeting makes their `target` the nested
		// dialog host, not this one — ignore those so confirming the step-up doesn't tear
		// the whole flow down before the loan settles.
		if (e && e.target !== e.currentTarget) return;
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-dialog
	size="m"
	heading="Pay off my loan early"
	{@attach setProps({ open })}
	{@attach on('gok-cancel', closeDialog)}
	{@attach on('gok-close', closeDialog)}
>
	{#if phase === 'done'}
		<!-- Done · the loan is clearing (held distinct from closed until the money clears). -->
		<div class="done">
			<span class="mark" aria-hidden="true">
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Loan paid off</h2>

			<gok-tag size="m" dot>Clearing</gok-tag>

			<p class="done-note">
				My settlement of {eur(quote.totalMinor)} has left my account and the loan is clearing now. A settlement
				letter is in my documents.
			</p>

			<div class="chart">
				<PayoffChart original={glide.original} afterAction={glide.afterAction} label="Balance settled in full today — it drops to zero." />
				<p class="chart-summary">My balance is settled in full today — it drops to zero.</p>
			</div>
		</div>

		<div slot="footer" class="done-actions">
			<gok-button variant="primary" {@attach on('click', closeDialog)}>Done</gok-button>
		</div>
	{:else}
		<!-- Review · the settlement ledger + the glide to zero. -->
		<div class="review">
			<p class="lead">
				Settling pays off everything I owe today. There's no penalty — I pay the outstanding balance
				plus the interest accrued since my last payment, and skip the rest.
			</p>

			<dl class="ledger">
				<div class="row">
					<dt>Outstanding principal</dt>
					<dd class="gok-tabular-nums">{eur(quote.principalMinor)}</dd>
				</div>
				<div class="row">
					<dt>Interest to date</dt>
					<dd class="gok-tabular-nums">{eur(quote.accruedInterestMinor)}</dd>
				</div>
				<div class="row total">
					<dt>Total to pay off</dt>
					<dd class="gok-tabular-nums">{eur(quote.totalMinor)}</dd>
				</div>
				<div class="row">
					<dt>Interest saved</dt>
					<dd class="gok-tabular-nums">{eur(quote.interestSavedMinor)}</dd>
				</div>
			</dl>

			<div class="chart">
				<PayoffChart original={glide.original} afterAction={glide.afterAction} label={chartSummary} />
				<p class="chart-summary">{chartSummary}</p>
			</div>

			{#if insufficient}
				<gok-alert status="error">
					That's more than my available balance of {eur(fundsAvailableMinor)}. I'd need {eur(
						quote.totalMinor
					)} to settle in full.
				</gok-alert>
			{/if}
		</div>

		<div slot="footer" class="review-actions">
			<gok-button variant="secondary" {@attach on('click', closeDialog)}>Back</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canSettle })}
				{@attach on('click', openStepUp)}
			>
				Pay off early
			</gok-button>
		</div>
	{/if}

	<!-- Gate 1 · step-up re-auth. Cancellable; declining has no side effect. -->
	<StepUp
		open={stepUpOpen}
		title="Pay off my loan?"
		consequence="Settling pays {eur(quote.totalMinor)} from my account and closes this loan."
		confirmLabel="Continue"
		tone="danger"
		onConfirm={stepUpConfirmed}
		onCancel={stepUpCancelled}
	/>

	<!-- Gate 2 · the forced decision. Always runs before the loan settles. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Confirm pay off"
		no-dismiss
		{@attach setProps({ open: confirmOpen })}
		{@attach on('gok-cancel', closeConfirm)}
		{@attach on('gok-close', closeConfirm)}
	>
		<p class="confirm-body">
			I'm settling my loan in full today for
			<strong class="gok-tabular-nums">{eur(quote.totalMinor)}</strong>. It leaves my account now and
			closes the loan — this can't be undone.
		</p>

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
			<!-- Destructive confirm: outline/text in the status colour, transparent fill —
			     never a solid fill. App-local <button> so the rule holds without restyling
			     a DS component. -->
			<button type="button" class="status-confirm" onclick={settleNow}>
				Pay off {eur(quote.totalMinor)} — this closes my loan
			</button>
		</div>
	</gok-dialog>
</gok-dialog>

<style>
	.review,
	.done {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.done {
		align-items: center;
		text-align: center;
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* --- Glide chart + its text alternative --- */
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	.chart-summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Settlement ledger --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
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

	/* --- Action rows --- */
	.review-actions,
	.confirm-actions,
	.done-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* --- Confirm dialog body --- */
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

	/* Destructive confirm — outline/text in the status colour, transparent fill. */
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

	/* --- Done / success mark --- */
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
		max-inline-size: 40ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
