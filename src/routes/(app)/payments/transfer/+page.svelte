<script lang="ts">
	// P02 (EUR-only cut) — the flagship send-money flow: pay a saved euro payee
	// from the primary wallet over SEPA Instant. It rides the money spine end to
	// end — gather (recipient → amount) → review → forced-decision confirm →
	// settled success — composing the F05 wizard, the F07 money input,
	// gok-* components, and `--gok-*` tokens only.
	//
	// SCOPE (this cut): same-currency EUR · primary wallet → saved payee.
	// DEFERRED (noted inline): cross-currency FX + rate disclosure (P04), own-wallet
	// transfers (P01), scheduling / speed selection beyond the fixed rail badge
	// (P05), SWIFT charge options OUR/SHA/BEN (P03), and URL `[step]` deep-linking
	// (the wizard persists a localStorage draft for resume — a single route hosts
	// all three steps for now).
	//
	// Single source of truth: `payments.draft`. The wizard's `data` mirrors it only
	// so the draft survives a reload (resume); every step's `validate` reads the
	// live `payments.draft`. Web-component interop is strictly `setProps`/`on` from
	// `wc.svelte` — never `bind:` on a gok-* element.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { TODAY } from '$lib/data/time';
	import { payments } from '$lib/state/payments.svelte';
	import type { SendDraft } from '$lib/state/payments.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import type { Payee } from '$lib/data/types';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// The amount (≥ €1,000) and new-payee thresholds that force a step-up before
	// the money can leave. Real OTP / passkey verification is F08/F12 — here the
	// "Approve with passkey" action is SIMULATED (sets a local verified flag).
	const STEP_UP_MIN_MINOR = 100_000; // €1,000.00 in minor units.
	const MAX_REFERENCE = 140;

	const primary = $derived(accounts.home);
	// EUR-eligible saved payees only (cross-currency send is deferred to P04).
	const eurPayees = $derived(payments.payees.filter((p) => p.currency === 'EUR'));
	const selectedPayee = $derived<Payee | undefined>(
		eurPayees.find((p) => p.id === payments.draft.payeeId)
	);

	// --- The wizard: 3 steps, validating against the live draft. ---
	const wizard = createWizard<SendDraft>({
		flowId: 'send-money',
		initialData: { ...payments.draft },
		steps: [
			{
				id: 'recipient',
				title: 'Who am I paying?',
				validate: () => (payments.draft.payeeId ? true : 'Choose who you are paying to continue.')
			},
			{
				id: 'amount',
				title: 'How much?',
				validate: () => {
					const { amountMinor } = payments.draft;
					if (amountMinor <= 0) return 'Enter an amount to send.';
					if (amountMinor > primary.availableMinor) {
						return `That is more than your ${formatMoney(primary.availableMinor, 'EUR')} available.`;
					}
					return true;
				}
			},
			{ id: 'review', title: 'Review and send' }
		]
	});

	// Resume hydration: a restored wizard draft flows back into `payments.draft`
	// once, on mount, so the live store the UI reads matches what was persisted.
	// onMount (not $effect) — this is one-time mount sync with side effects, not
	// derived reactive state.
	onMount(() => {
		payments.setDraft($state.snapshot(wizard.data));
		amountValue = payments.draft.amountMinor;
	});

	/** Patch both the live draft (the UI's truth) and the wizard mirror (persisted). */
	function patchDraft(patch: Partial<SendDraft>) {
		payments.setDraft(patch);
		wizard.data = { ...wizard.data, ...patch };
	}

	// --- Step 1: recipient selection (radio-group semantics). ---
	function onPayeeChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patchDraft({ recipientKind: 'payee', payeeId: value });
	}

	/** Masked account line: the gök handle, else the last 4 of the IBAN. */
	function accountLine(p: Payee): string {
		if (p.type === 'gok' && p.handle) return p.handle;
		if (p.iban) return '•••• ' + p.iban.replace(/\s/g, '').slice(-4);
		return '—';
	}

	// --- Step 2: amount + reference. MoneyInput is a Svelte composite, so bind:
	// value is fine here (the no-bind rule is for gok-* custom elements only). ---
	let amountValue = $state(payments.draft.amountMinor);

	function onAmountChange(minor: number) {
		patchDraft({ amountMinor: minor });
	}

	function onReferenceInput(event: Event) {
		const value = (event.target as HTMLInputElement).value.slice(0, MAX_REFERENCE);
		patchDraft({ reference: value });
	}

	// --- Review / confirm / success derived copy. ---
	const amountLabel = $derived(formatMoney(payments.draft.amountMinor, 'EUR'));
	const payeeName = $derived(selectedPayee?.name ?? '');
	// Honest rail per payee kind; both arrive in seconds this cut.
	const railLabel = $derived(selectedPayee?.type === 'gok' ? 'gök · instant' : 'SEPA Instant');
	const isFirstPayment = $derived(selectedPayee?.lastUsedAt === null);
	// The irreversible gate forces a step-up for a brand-new payee or a large sum.
	const stepUpRequired = $derived(
		isFirstPayment || payments.draft.amountMinor >= STEP_UP_MIN_MINOR
	);

	// --- Confirm dialog + send + success state machine. ---
	let confirmOpen = $state(false);
	let stepUpVerified = $state(false);
	let sent = $state(false);
	// The receipt is captured at send time because the draft is cleared on success.
	let receipt = $state<{
		amount: string;
		payeeName: string;
		account: string;
		reference: string;
		when: string;
		txnId: string;
	} | null>(null);

	/** Final wizard action: open the forced-decision confirm (does NOT send yet). */
	function openConfirm() {
		stepUpVerified = false;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** SIMULATED step-up (real passkey/OTP is F08/F12). Marks identity verified. */
	function approveWithPasskey() {
		stepUpVerified = true;
	}

	/** The irreversible commit: record the move, capture a receipt, switch to success. */
	function sendNow() {
		if (stepUpRequired && !stepUpVerified) return;
		const snapshot = {
			amount: amountLabel,
			payeeName,
			account: selectedPayee ? accountLine(selectedPayee) : '—',
			reference: payments.draft.reference.trim() || 'None'
		};
		const result = payments.executeSend();
		if (!result) return; // Source/recipient couldn't resolve — stay on review.
		receipt = { ...snapshot, when: formatDate(TODAY), txnId: result.txnId };
		confirmOpen = false;
		sent = true;
		// Clear the persisted draft + the live draft — the flow is done.
		wizard.clearDraft();
		payments.resetDraft();
	}

	/** Move focus to the success heading when the success view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	function goToPayments() {
		goto('/payments');
	}
</script>

<svelte:head>
	<title>Send money · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if sent}
		<!-- Success: receipt + settled status for the irrevocable SEPA Instant send. -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark mark-sent" aria-hidden="true">
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
					<span class="gok-tabular-nums">{receipt?.amount}</span> sent to {receipt?.payeeName}
				</h1>

				<gok-tag size="m" dot>Settled</gok-tag>

				<dl class="ledger receipt">
					<div class="row">
						<dt>To</dt>
						<dd class="mono">{receipt?.account}</dd>
					</div>
					<div class="row">
						<dt>Reference</dt>
						<dd>{receipt?.reference}</dd>
					</div>
					<div class="row">
						<dt>When</dt>
						<dd>{receipt?.when}</dd>
					</div>
				</dl>

				<div slot="actions" class="outcome-actions">
					<gok-button variant="primary" {@attach on('click', () => goToPayments())}>
						Done
					</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<header class="head">
			<gok-link href="/payments">&larr; Payments</gok-link>
			<p class="eyebrow gok-eyebrow">Send money</p>
			<h1 class="title gok-headline-2">Pay someone</h1>
		</header>

		<Wizard {wizard} submitLabel="Confirm &amp; send" onComplete={openConfirm}>
			{#if wizard.current.id === 'recipient'}
				<!-- Step 1 · recipient: a labelled radio-group of EUR payees. -->
				<div class="from-line">
					<span class="from-key gok-eyebrow">From</span>
					<span class="from-val">
						{primary.name} · EUR ·
						<span class="gok-tabular-nums">{formatMoney(primary.availableMinor, 'EUR')}</span>
						available
					</span>
				</div>

				{#if eurPayees.length === 0}
					<gok-empty-state variant="compact">
						<p class="empty-title">No euro payees yet</p>
						<p class="empty-body">Add a payee to send your first euro payment.</p>
						<gok-link slot="actions" href="/payments/payees">Manage payees</gok-link>
					</gok-empty-state>
				{:else}
					<gok-radio-group
						label="Saved payees"
						orientation="vertical"
						{@attach setProps({ value: payments.draft.payeeId ?? '' })}
						{@attach on('change', onPayeeChange)}
					>
						{#each eurPayees as payee (payee.id)}
							<gok-radio
								class="payee"
								class:is-selected={payee.id === payments.draft.payeeId}
								value={payee.id}
							>
								<span class="payee-label">
									<span class="payee-name">{payee.name}</span>
									<span class="payee-account mono">{accountLine(payee)}</span>
									{#if payee.lastUsedAt === null}
										<gok-tag size="s">New payee</gok-tag>
									{/if}
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>

					<gok-link href="/payments/payees">Manage payees</gok-link>
				{/if}
			{:else if wizard.current.id === 'amount'}
				<!-- Step 2 · amount + optional reference. Reward-early balance check. -->
				<MoneyInput
					bind:value={amountValue}
					currency="EUR"
					label="Amount"
					balanceMinor={primary.availableMinor}
					onchange={onAmountChange}
				/>

				<gok-input
					label="Reference (optional)"
					helper="Up to {MAX_REFERENCE} characters — the payee sees this."
					maxlength={MAX_REFERENCE}
					{@attach setProps({ value: payments.draft.reference })}
					{@attach on('input', onReferenceInput)}
					{@attach on('change', onReferenceInput)}
				></gok-input>
			{:else}
				<!-- Step 3 · review: the read-only ledger + trust signals. -->
				{#if isFirstPayment}
					<gok-alert status="info">
						This is my first payment to {payeeName}. I'll double-check the details below.
					</gok-alert>
				{/if}

				<dl class="ledger">
					<div class="row">
						<dt>Payee</dt>
						<dd>{payeeName}</dd>
					</div>
					<div class="row">
						<dt>Account</dt>
						<dd class="mono">{selectedPayee ? accountLine(selectedPayee) : '—'}</dd>
					</div>
					<div class="row">
						<dt>Amount</dt>
						<dd class="gok-tabular-nums">{amountLabel}</dd>
					</div>
					<div class="row">
						<dt>Fee</dt>
						<dd class="row-inline">
							No fee
							<gok-badge variant="success" size="s">No fee</gok-badge>
						</dd>
					</div>
					<div class="row">
						<dt>Rail</dt>
						<dd>{railLabel}</dd>
					</div>
					<div class="row">
						<dt>Arrives</dt>
						<dd>In seconds</dd>
					</div>
					<div class="row">
						<dt>Reference</dt>
						<dd>{payments.draft.reference.trim() || 'None'}</dd>
					</div>
				</dl>
			{/if}
		</Wizard>
	{/if}
</div>

<!-- The irreversible gate: a forced-decision dialog (no-dismiss, danger tone). -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Confirm payment"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
>
	<p class="confirm-body">
		Send <strong class="gok-tabular-nums">{amountLabel}</strong> to {payeeName}? This can't be undone
		once it leaves my account.
	</p>

	{#if stepUpRequired}
		<!-- Step-up panel: required for a new payee or a sum ≥ €1,000.
		     SIMULATED — real passkey / OTP verification is F08 / F12. -->
		<div class="stepup">
			<p class="stepup-key gok-eyebrow">Verify it's you</p>
			{#if stepUpVerified}
				<p class="stepup-done">
					<span class="stepup-check" aria-hidden="true">
						<svg viewBox="0 0 16 16" width="14" height="14" fill="none">
							<path
								d="M3 8.5l3 3 7-8"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					Verified with passkey
				</p>
			{:else}
				<p class="stepup-body">
					A new payee and larger amounts need a quick identity check before the money moves.
				</p>
				<gok-button variant="secondary" {@attach on('click', approveWithPasskey)}>
					Approve with passkey
				</gok-button>
			{/if}
		</div>
	{/if}

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: stepUpRequired && !stepUpVerified })}
			{@attach on('click', sendNow)}
		>
			Send {amountLabel}
		</gok-button>
	</div>
</gok-dialog>

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

	/* --- Step 1: from-line + payee radios as cards --- */
	.from-line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-200);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.from-key {
		color: var(--gok-color-text-muted);
	}

	.from-val {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/*
	 * Card chrome wraps the host gok-radio — we compose layout around the control,
	 * never restyle the radio's own visuals. The selected card firms its hairline
	 * to ink (the earned green stays on the radio dot — one accent per context).
	 */
	.payee {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.payee:hover {
		border-color: var(--gok-color-border-strong);
	}

	.payee.is-selected {
		border-color: var(--gok-color-text);
	}

	.payee-label {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.payee-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.payee-account {
		color: var(--gok-color-text-muted);
	}

	.empty-title {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- The key/value ledger (mirrors TransactionDrawer's idiom) --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-200);
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

	.row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	.row-inline {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* --- Confirm dialog body + step-up --- */
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

	.stepup {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.stepup-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.stepup-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.stepup-done {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.stepup-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
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
	}

	.mark-sent {
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 22rem;
		margin-inline: auto;
		text-align: start;
	}

	.outcome-actions {
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
