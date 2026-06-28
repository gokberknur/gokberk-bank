<script lang="ts">
	// S02 · Dispute a charge — a calm, no-blame chargeback wizard on the disputes spine.
	// Five steps (the charge → what went wrong → tell me more → add evidence → review &
	// submit) ride the F05 wizard composite: `disputes.wizard.data` IS the $state draft,
	// and the per-step validators live in the state module, so this surface only renders
	// the fields that write into the draft and lets the shell gate forward movement.
	//
	// Disputing money is stressful and usually follows a scam or an error, so the whole
	// tone is first-person singular and strictly no-blame: I tell the bank what happened
	// to me, I'm never accused. The eligibility check on the charge step is the one hard
	// gate (a charge outside the window or already disputed can't be raised here, and the
	// state's validate already blocks Continue — the alert is the honest explanation). The
	// merchant-first question is the softer, in-flow gate: asked once, never blaming, with
	// a calm nudge when the merchant hasn't been tried. The terminal submit is a forced-
	// decision confirm dialog — a formal claim, but no money moves, so no danger tone —
	// then I'm taken to the tracker.
	//
	// Interop is strictly `setProps` / `on` — never `bind:` on a gok-* host; fields write
	// into the draft through `patch` (an immutable patch so persistence + reactivity both
	// flow), and gok-* values are read off the event. The native <textarea> is app-local
	// (the DS ships no gok-textarea), so a plain value / oninput is fine there.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import {
		disputes,
		DISPUTE_REASON_LABELS,
		DISPUTE_REASON_HINTS
	} from '$lib/disputes/disputes.svelte';
	import type { DisputeData, DisputeReason } from '$lib/disputes/disputes.svelte';
	import Wizard from '$lib/components/wizard/Wizard.svelte';

	// The five reasons, in the order they read on the radio group.
	const REASONS: DisputeReason[] = [
		'not-recognised',
		'duplicate',
		'not-received',
		'faulty',
		'wrong-amount'
	];

	// Small label maps so the charge ledger never shows a raw enum string.
	const TXN_TYPE_LABELS: Record<string, string> = {
		card: 'Card',
		sepa: 'SEPA transfer',
		swift: 'SWIFT transfer',
		transfer: 'Transfer',
		fee: 'Fee',
		topup: 'Top-up',
		fx: 'Currency exchange'
	};
	const TXN_STATUS_LABELS: Record<string, string> = {
		pending: 'Pending',
		settled: 'Settled'
	};

	// ── Reads off the disputes state (revision-reactive getters). ──
	const txn = $derived(disputes.transaction());
	const eligibility = $derived(disputes.eligibility());
	const disputable = $derived(disputes.disputableTransactions());
	const needsMerchant = $derived(disputes.needsMerchantFirst());
	const getsCredit = $derived(disputes.getsProvisionalCredit());

	// The reason currently chosen (typed for the label/hint lookups).
	const chosenReason = $derived(disputes.wizard.data.reason);

	// The segmented control speaks strings; the draft stores a boolean | null.
	const contactedValue = $derived(
		disputes.wizard.data.contactedMerchant === null
			? ''
			: disputes.wizard.data.contactedMerchant
				? 'yes'
				: 'no'
	);

	/** Patch the wizard draft immutably so persistence + reactivity both flow. */
	function patch(part: Partial<DisputeData>) {
		disputes.wizard.data = { ...disputes.wizard.data, ...part };
	}

	// ── Entry pre-fill · a `?txn=<id>` deep-link opens the flow on that charge. ──
	// An $effect that tracks the last-applied id, so it seeds once per id and never
	// re-runs `startFor` (which would wipe the draft) on subsequent renders.
	let appliedTxnId = '';
	$effect(() => {
		const requested = page.url.searchParams.get('txn');
		if (requested && requested !== appliedTxnId) {
			appliedTxnId = requested;
			disputes.startFor(requested);
		}
	});

	// ── Step 1 · the charge. The picker (when there's no pre-fill) writes the charge. ──
	function onTransactionChange(event: Event) {
		const id = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ transactionId: id });
	}

	// ── Step 2 · reason. A radio-card group of the five dispute reasons. ──
	function onReasonChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ reason: value as DisputeReason });
	}

	// ── Step 3 · details. Native textarea + the merchant-first Yes/No segmented. ──
	function onStatementInput(event: Event) {
		patch({ statement: (event.currentTarget as HTMLTextAreaElement).value });
	}
	function onContactedChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ contactedMerchant: value === 'yes' ? true : value === 'no' ? false : null });
	}

	// ── Step 4 · evidence. Simulated adds with deterministic, descriptive names. ──
	function addReceipt() {
		const n = disputes.wizard.data.evidence.length + 1;
		disputes.addEvidence(`receipt-${n}.pdf`, 'receipt');
	}
	function addScreenshot() {
		const n = disputes.wizard.data.evidence.length + 1;
		disputes.addEvidence(`screenshot-${n}.png`, 'photo');
	}
	function addEmail() {
		const n = disputes.wizard.data.evidence.length + 1;
		disputes.addEvidence(`email-${n}.pdf`, 'document');
	}

	// ── Step 5 · review. Each row edits back to its step (charge=0, reason=1, details=2, evidence=3). ──
	function editStep(index: number) {
		disputes.wizard.goTo(index);
	}

	// ── Submit · a forced-decision confirm dialog, then on to the tracker. ──
	let submitOpen = $state(false);

	function onReviewComplete() {
		submitOpen = true;
	}
	function closeSubmit() {
		submitOpen = false;
	}
	function confirmSubmit() {
		const dispute = disputes.submit();
		submitOpen = false;
		goto(`/support/disputes/${dispute.id}`);
	}

	// The charge amount + merchant, formatted for the dialog body (charge is an outflow).
	const chargeMerchant = $derived(txn?.merchant ?? 'this charge');
	const chargeAmount = $derived(txn ? formatMoney(Math.abs(txn.amountMinor), txn.currency) : '');
</script>

<svelte:head>
	<title>Dispute a charge · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/support">&larr; Support</gok-link>
		<p class="eyebrow gok-eyebrow">Card dispute</p>
		<h1 class="title gok-headline-2">Dispute a charge</h1>
		<p class="lead">
			Tell me what happened. There's no blame here — I'll take it step by step and the bank will
			investigate.
		</p>
	</header>

	<Wizard wizard={disputes.wizard} submitLabel="Review &amp; submit" onComplete={onReviewComplete}>
		{#if disputes.wizard.current.id === 'transaction'}
			<!-- Step 1 · the charge — a pre-filled ledger, or a picker of disputable charges. -->
			<section class="step" aria-label="The charge">
				{#if txn}
					<!-- Pre-filled: a read-only ledger of the charge I'm disputing. -->
					<div class="cover" aria-live="polite">
						<p class="cover-eyebrow gok-eyebrow">Disputing this charge</p>
						<dl class="ledger">
							<div class="row">
								<dt>Merchant</dt>
								<dd>{txn.merchant}</dd>
							</div>
							<div class="row">
								<dt>Amount</dt>
								<dd class="gok-tabular-nums">{formatMoney(Math.abs(txn.amountMinor), txn.currency)}</dd>
							</div>
							<div class="row">
								<dt>Date</dt>
								<dd class="gok-tabular-nums">{formatDate(txn.date)}</dd>
							</div>
							<div class="row">
								<dt>Card</dt>
								<dd>{TXN_TYPE_LABELS[txn.type] ?? txn.type}</dd>
							</div>
							<div class="row">
								<dt>Status</dt>
								<dd>{TXN_STATUS_LABELS[txn.status] ?? txn.status}</dd>
							</div>
							<div class="row">
								<dt>Reference</dt>
								<dd class="mono">{txn.reference}</dd>
							</div>
						</dl>
					</div>
				{:else if disputable.length === 0}
					<gok-empty-state>
						<p class="empty-title gok-headline-6">No charges I can dispute right now</p>
						<p class="empty-body">
							I can only dispute a settled card charge that's still inside the dispute window. When
							there's one, it'll show up here.
						</p>
						<gok-link slot="actions" href="/activity">
							<gok-button variant="primary">View my activity</gok-button>
						</gok-link>
					</gok-empty-state>
				{:else}
					<!-- No pre-fill: pick the charge from my recent disputable card payments. -->
					<gok-radio-group
						label="Which charge do I want to dispute?"
						orientation="vertical"
						{@attach setProps({ value: disputes.wizard.data.transactionId })}
						{@attach on('change', onTransactionChange)}
					>
						{#each disputable as charge (charge.id)}
							<gok-radio
								class="charge"
								class:is-selected={charge.id === disputes.wizard.data.transactionId}
								value={charge.id}
							>
								<span class="charge-label">
									<span class="charge-merchant">{charge.merchant}</span>
									<span class="charge-amount gok-tabular-nums">
										{formatMoney(Math.abs(charge.amountMinor), charge.currency)}
									</span>
									<span class="charge-date">{formatDate(charge.date)}</span>
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>
				{/if}

				{#if eligibility && !eligibility.eligible}
					<!-- The honest eligibility gate — the state's validate already blocks Continue. -->
					<gok-alert status={eligibility.alreadyDisputed ? 'error' : 'warning'}>
						{eligibility.reason}
					</gok-alert>
				{/if}
			</section>
		{/if}

		{#if disputes.wizard.current.id === 'reason'}
			<!-- Step 2 · what went wrong — a radio-card group, each with a no-blame hint. -->
			<section class="step" aria-label="What went wrong">
				<gok-radio-group
					label="What went wrong with this charge?"
					orientation="vertical"
					{@attach setProps({ value: disputes.wizard.data.reason })}
					{@attach on('change', onReasonChange)}
				>
					{#each REASONS as reason (reason)}
						<gok-radio
							class="reason"
							class:is-selected={reason === disputes.wizard.data.reason}
							value={reason}
						>
							<span class="reason-label">
								<span class="reason-title">{DISPUTE_REASON_LABELS[reason]}</span>
								<span class="reason-hint">{DISPUTE_REASON_HINTS[reason]}</span>
							</span>
						</gok-radio>
					{/each}
				</gok-radio-group>
			</section>
		{/if}

		{#if disputes.wizard.current.id === 'details'}
			<!-- Step 3 · tell me more — the account, and the merchant-first question. -->
			<section class="step fields" aria-label="Tell me more">
				<!-- Statement · tokened <textarea> mirroring gok-input's label + message anatomy. -->
				<div class="field">
					<label class="field-label" for="dispute-statement">Tell me what happened</label>
					<textarea
						id="dispute-statement"
						class="field-textarea"
						rows="5"
						placeholder="In my own words — what happened with this charge."
						aria-describedby="dispute-statement-message"
						value={disputes.wizard.data.statement}
						oninput={onStatementInput}
					></textarea>
					<p id="dispute-statement-message" class="field-message">
						Just the facts as I remember them — there's no wrong way to tell it.
					</p>
				</div>

				{#if needsMerchant}
					<!-- Merchant-first branch · asked once for not-received / faulty, never blaming. -->
					<div class="field">
						<gok-segmented
							label="Have I contacted the merchant first?"
							{@attach setProps({ value: contactedValue })}
							{@attach on('change', onContactedChange)}
						>
							<gok-segmented-item value="yes">Yes, I have</gok-segmented-item>
							<gok-segmented-item value="no">No, not yet</gok-segmented-item>
						</gok-segmented>

						{#if disputes.wizard.data.contactedMerchant === false}
							<gok-alert status="info">
								Often the quickest fix is asking the merchant directly — but if this looks like
								fraud, I can dispute it now.
							</gok-alert>
						{/if}
					</div>
				{/if}
			</section>
		{/if}

		{#if disputes.wizard.current.id === 'evidence'}
			<!-- Step 4 · evidence — optional, simulated (no real file is read or stored). -->
			<section class="step" aria-label="Add evidence">
				<p class="evidence-help">
					A receipt, a screenshot or an email helps the bank settle this faster — but I can add
					them later too.
				</p>

				<div class="evidence-actions">
					<gok-button variant="secondary" {@attach on('click', addReceipt)}>Add receipt</gok-button>
					<gok-button variant="secondary" {@attach on('click', addScreenshot)}>
						Add screenshot
					</gok-button>
					<gok-button variant="secondary" {@attach on('click', addEmail)}>Add email</gok-button>
				</div>

				{#if disputes.wizard.data.evidence.length > 0}
					<ul class="evidence-list" aria-label="Attached evidence">
						{#each disputes.wizard.data.evidence as item (item.id)}
							<li class="evidence-item">
								<span class="evidence-glyph" aria-hidden="true">
									<svg viewBox="0 0 16 16" width="15" height="15" fill="none">
										<path
											d="M3 8.5l3 3 7-8"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
								<span class="evidence-main">
									<span class="evidence-name mono">{item.name}</span>
									<span class="evidence-meta">{item.kind} · {item.sizeLabel}</span>
								</span>
								<button
									type="button"
									class="evidence-remove"
									{@attach on('click', () => disputes.removeEvidence(item.id))}
								>
									Remove
									<span class="sr-only">{item.name}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="quiet">Nothing attached yet — that's fine, evidence is optional.</p>
				{/if}

				<p class="demo-note">
					This is a demo — no real file is read or stored. Each button attaches a placeholder so I
					can see the rest of the flow.
				</p>
			</section>
		{/if}

		{#if disputes.wizard.current.id === 'review'}
			<!-- Step 5 · review — a read-only ledger, each row editable in place. -->
			<section class="step" aria-label="Review and submit">
				<gok-card class="review-card">
					<dl class="ledger">
						<div class="row review-row">
							<div class="review-cell">
								<dt>Charge</dt>
								<dd>
									{txn?.merchant ?? '—'}
									<span class="review-sub gok-tabular-nums">
										{#if txn}{formatMoney(Math.abs(txn.amountMinor), txn.currency)} ·
											{formatDate(txn.date)}{/if}
									</span>
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(0))}>
								Edit<span class="sr-only"> charge</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>What went wrong</dt>
								<dd>{chosenReason ? DISPUTE_REASON_LABELS[chosenReason] : '—'}</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
								Edit<span class="sr-only"> reason</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>What happened</dt>
								<dd class="review-description">{disputes.wizard.data.statement || '—'}</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(2))}>
								Edit<span class="sr-only"> statement</span>
							</gok-button>
						</div>

						{#if needsMerchant}
							<div class="row review-row">
								<div class="review-cell">
									<dt>Contacted the merchant</dt>
									<dd>
										{disputes.wizard.data.contactedMerchant === null
											? '—'
											: disputes.wizard.data.contactedMerchant
												? 'Yes'
												: 'Not yet'}
									</dd>
								</div>
								<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(2))}>
									Edit<span class="sr-only"> contacted the merchant</span>
								</gok-button>
							</div>
						{/if}

						<div class="row review-row">
							<div class="review-cell">
								<dt>Evidence</dt>
								<dd>
									{disputes.wizard.data.evidence.length}
									{disputes.wizard.data.evidence.length === 1 ? 'file' : 'files'} attached
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(3))}>
								Edit<span class="sr-only"> evidence</span>
							</gok-button>
						</div>
					</dl>
				</gok-card>

				{#if getsCredit}
					<!-- Transparent provisional-credit note — temporary, reversible, fully disclosed. -->
					<gok-alert status="info">
						While I investigate, a temporary credit of
						{formatMoney(disputes.provisionalCreditMinor(), txn?.currency ?? 'EUR')} may be applied —
						it can be reversed if the dispute isn't upheld.
					</gok-alert>
				{/if}

				{#if eligibility && !eligibility.eligible}
					<gok-alert status={eligibility.alreadyDisputed ? 'error' : 'warning'}>
						{eligibility.reason}
					</gok-alert>
				{/if}
			</section>
		{/if}
	</Wizard>
</div>

<!-- Submit · a forced-decision confirm (a formal claim, but no money moves, so no danger tone). -->
<gok-dialog
	size="s"
	heading="Raise my dispute"
	no-dismiss
	{@attach setProps({ open: submitOpen })}
	{@attach on('gok-cancel', closeSubmit)}
	{@attach on('gok-close', closeSubmit)}
>
	<p class="submit-body">
		I'm formally disputing <strong>{chargeMerchant}</strong>
		{#if chargeAmount}for <strong>{chargeAmount}</strong>{/if}. The bank will investigate.
	</p>

	<div slot="footer" class="submit-actions">
		<gok-button variant="secondary" {@attach on('click', closeSubmit)}>Back</gok-button>
		<gok-button variant="primary" {@attach on('click', confirmSubmit)}>Raise dispute</gok-button>
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

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step scaffolding --- */
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.fields {
		max-inline-size: 32rem;
	}

	/* --- Charge + reason radio-cards --- */
	/*
	 * Card chrome wraps the host gok-radio — we compose layout around the control,
	 * never restyle the radio's own visuals. The selected card firms its hairline
	 * to ink (the earned green stays on the radio dot — one accent per context).
	 */
	.charge,
	.reason {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.charge:hover,
	.reason:hover {
		border-color: var(--gok-color-border-strong);
	}

	.charge.is-selected,
	.reason.is-selected {
		border-color: var(--gok-color-text);
	}

	.charge-label {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.charge-merchant {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.charge-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.charge-date {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.reason-label {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
	}

	.reason-title {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.reason-hint {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Charge summary ledger (pre-filled) --- */
	.cover {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.cover-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* --- Key/value ledgers --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
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

	/* --- Native textarea, mirroring gok-input's label + message anatomy --- */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.field-textarea {
		inline-size: 100%;
		padding: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		resize: vertical;
	}

	.field-textarea::placeholder {
		color: var(--gok-color-text-muted);
	}

	.field-textarea:focus-visible {
		outline: none;
		border-color: var(--gok-color-primary);
		box-shadow: 0 0 0 var(--gok-border-width-hairline) var(--gok-color-primary);
	}

	.field-message {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Evidence --- */
	.evidence-help {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.evidence-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.evidence-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.evidence-item {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.evidence-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		color: var(--gok-color-primary);
	}

	.evidence-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.evidence-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.evidence-meta {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		text-transform: capitalize;
	}

	.evidence-remove {
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.evidence-remove:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.demo-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Review --- */
	.review-card {
		display: block;
	}

	.review-row {
		gap: var(--gok-space-300);
	}

	.review-cell {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
		min-inline-size: 0;
	}

	.review-row dd {
		text-align: start;
	}

	.review-sub {
		display: block;
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.review-description {
		max-inline-size: 48ch;
	}

	/* --- Submit dialog --- */
	.submit-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.submit-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.submit-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Shared --- */
	.mono {
		font-family: var(--gok-font-family-mono);
	}

	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
