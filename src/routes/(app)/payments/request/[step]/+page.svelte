<script lang="ts">
	// P07 · Request money — the create wizard. Two steps on the F05 wizard model:
	// (1) Amount + note (+ optional expiry / let-them-choose), then (2) Share — the
	// shareable link, a real QR, and a native share. Creating a request **moves no
	// money** (the deliberate act is *sharing*), so there is no forced-decision
	// confirm here: step 1's primary creates the open request and step 2 is the calm
	// result, not a success-spine. The numeric `[step]` segment is just the entry URL
	// (`/payments/request/1`); the surface owns its two-step state in-memory via
	// `createWizard` — a created request is a one-time result, never resumed, so the
	// flow runs with `persist: false`.
	//
	// Interop is strictly `setProps`/`on` — never `bind:` on a gok-* host. MoneyInput
	// is a Svelte composite, so its `value`/`onchange` are plain props. The native
	// date input borrows the claims/new tokened pattern (the DS ships no date control).
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { requests } from '$lib/payments/requests.svelte';
	import type { PaymentRequest } from '$lib/payments/requests.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import QrCode from '$lib/components/payments/QrCode.svelte';

	// ── The draft the wizard carries (it IS the create payload, bar the expiry→ISO). ──
	interface RequestDraftData {
		amountMinor: number;
		note: string;
		walletId: string;
		/** The native date-input string (yyyy-mm-dd); '' = no expiry. Converted to ISO on create. */
		expiryDate: string;
		payerChoosesAmount: boolean;
	}

	// Destination wallets; default the EUR wallet (else the first), so the amount
	// field opens in my home currency.
	const wallets = requests.wallets();
	const eurWallet = wallets.find((w) => w.currency === 'EUR') ?? wallets[0];

	function freshData(): RequestDraftData {
		return {
			amountMinor: 0,
			note: '',
			walletId: eurWallet?.id ?? '',
			expiryDate: '',
			payerChoosesAmount: false
		};
	}

	// ── The two-step flow. Step 1 validates reward-early; step 2 is the result. ──
	const steps: StepDef<RequestDraftData>[] = [
		{
			id: 'amount',
			title: 'Amount & note',
			validate: (data) => {
				if (data.note.trim() === '') return "Add a note so they know what it's for.";
				if (!data.payerChoosesAmount && data.amountMinor <= 0) {
					return 'Enter an amount, or let them choose how much.';
				}
				return true;
			}
		},
		{ id: 'share', title: 'Share' }
	];

	const wizard = createWizard<RequestDraftData>({
		flowId: 'request-create',
		steps,
		initialData: freshData(),
		// A created request is a one-time result — never resume a half-shared link.
		persist: false
	});

	// The request created at the step 1 → 2 boundary; null until then.
	let created = $state<PaymentRequest | null>(null);
	let showMore = $state(false);

	const selectedCurrency = $derived(
		wallets.find((w) => w.id === wizard.data.walletId)?.currency ?? eurWallet?.currency ?? 'EUR'
	);

	// Reward-early: the primary lights up the instant the step is valid.
	const canCreate = $derived(
		wizard.data.note.trim() !== '' &&
			(wizard.data.payerChoosesAmount || wizard.data.amountMinor > 0)
	);

	const shareLink = $derived(created ? requests.link(created) : '');
	const summaryAmount = $derived(
		created
			? created.payerChoosesAmount
				? 'They choose'
				: formatMoney(created.amountMinor, created.currency)
			: ''
	);

	// Native share is opt-in: only offered where the platform supports it.
	const canShare = $derived(
		typeof navigator !== 'undefined' && typeof navigator.share === 'function'
	);

	/** Patch the draft immutably so reactivity flows. */
	function patch(part: Partial<RequestDraftData>) {
		wizard.data = { ...wizard.data, ...part };
	}

	function onNoteInput(event: Event) {
		patch({ note: (event.target as HTMLElement & { value?: string }).value ?? '' });
	}
	function onWalletChange(event: Event) {
		patch({ walletId: (event.target as HTMLElement & { value?: string }).value ?? '' });
	}
	function onExpiryInput(event: Event) {
		patch({ expiryDate: (event.currentTarget as HTMLInputElement).value });
	}
	function onPayerChoosesChange(event: Event) {
		patch({ payerChoosesAmount: (event.target as HTMLElement & { checked?: boolean }).checked ?? false });
	}
	function toggleMore() {
		showMore = !showMore;
	}

	// ── Step 1 primary · create the open request, then advance to Share. ──
	function onCreate() {
		const result = wizard.current.validate?.(wizard.data);
		if (result !== undefined && result !== true) {
			wizard.error = result;
			return;
		}
		const data = wizard.data;
		const wallet = wallets.find((w) => w.id === data.walletId);
		created = requests.create({
			amountMinor: data.payerChoosesAmount ? 0 : data.amountMinor,
			currency: wallet?.currency ?? 'EUR',
			note: data.note.trim(),
			walletId: data.walletId,
			expiryIso: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
			payerChoosesAmount: data.payerChoosesAmount
		});
		wizard.error = null;
		wizard.goNext();
	}

	// ── Step 2 · share affordances. ──
	async function copyLink() {
		if (!created) return;
		try {
			await navigator.clipboard.writeText(requests.link(created));
			toast('Link copied', { status: 'success' });
		} catch {
			toast('Couldn’t copy — select the link and copy it manually', { status: 'error' });
		}
	}

	async function shareNative() {
		if (!created || !canShare) return;
		try {
			await navigator.share({
				title: 'A payment request',
				text: created.note,
				url: `https://${requests.link(created)}`
			});
		} catch {
			// The user dismissed the share sheet — nothing to report.
		}
	}

	/** Restart for another ask — fresh draft, back to step 1. */
	function newRequest() {
		created = null;
		showMore = false;
		wizard.data = freshData();
		wizard.error = null;
		wizard.goTo(0);
	}

	// Move focus to the active step's heading on a step change; skip the first run
	// (mount), where stealing focus would be jarring. `primed` is a plain flag.
	let primed = false;
	function focusOnStepChange(node: HTMLHeadingElement) {
		void wizard.currentIndex;
		if (primed) node.focus();
		else primed = true;
	}
</script>

<svelte:head>
	<title>Ask for money · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/payments/request">&larr; Requests</gok-link>
		<p class="eyebrow gok-eyebrow">Request money</p>
		<h1 class="title gok-headline-2">Ask for money</h1>
		<p class="lead">
			I'll make a link and a QR I can share. Money lands in my wallet when they pay — nothing moves
			until then.
		</p>
	</header>

	<section class="wizard">
		<header class="wiz-head">
			<p class="gok-eyebrow wiz-eyebrow">Step {wizard.stepNumber} of {wizard.total}</p>
			<gok-progress
				format="fraction"
				label={wizard.current.title}
				{@attach setProps({ value: wizard.stepNumber, max: wizard.total })}
			></gok-progress>
		</header>

		<nav class="rail" aria-label="Progress">
			<ol class="rail-list">
				{#each wizard.steps as step, i (step.id)}
					{@const isCurrent = i === wizard.currentIndex}
					{@const isDone = wizard.visited[i] === true && i < wizard.currentIndex}
					<li class="rail-item">
						<span
							class="step"
							class:is-current={isCurrent}
							class:is-done={isDone}
							aria-current={isCurrent ? 'step' : undefined}
						>
							<span class="step-title">{step.title}</span>
							{#if isDone}<span class="sr-only">(done)</span>{/if}
						</span>
					</li>
				{/each}
			</ol>
		</nav>

		<div class="panel">
			<h2 class="gok-headline-5 step-heading" tabindex="-1" {@attach focusOnStepChange}>
				{wizard.current.title}
			</h2>

			{#if typeof wizard.error === 'string'}
				<gok-alert status="error" class="step-alert">{wizard.error}</gok-alert>
			{/if}

			{#if wizard.current.id === 'amount'}
				<!-- Step 1 · how much, what for, where it lands — plus optional extras. -->
				<section class="step-fields" aria-label="Amount and note">
					{#if !wizard.data.payerChoosesAmount}
						<MoneyInput
							value={wizard.data.amountMinor}
							currency={selectedCurrency}
							label="How much"
							onchange={(minor) => patch({ amountMinor: minor })}
						/>
					{:else}
						<p class="open-ask">They'll choose how much to pay.</p>
					{/if}

					<gok-input
						label="What's it for?"
						placeholder="Dinner Tuesday"
						{@attach setProps({ value: wizard.data.note })}
						{@attach on('input', onNoteInput)}
					></gok-input>

					<gok-select
						label="Where it lands"
						{@attach setProps({ value: wizard.data.walletId })}
						{@attach on('change', onWalletChange)}
					>
						{#each wallets as wallet (wallet.id)}
							<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
						{/each}
					</gok-select>

					<!-- More options · progressive disclosure for expiry + open-amount. -->
					<div class="more">
						<button
							type="button"
							class="more-toggle"
							aria-expanded={showMore}
							aria-controls="more-options"
							{@attach on('click', toggleMore)}
						>
							<span class="more-glyph" aria-hidden="true">{showMore ? '−' : '+'}</span>
							More options
						</button>

						{#if showMore}
							<div id="more-options" class="more-body">
								<div class="date-field">
									<label class="date-label" for="request-expiry">Expires (optional)</label>
									<input
										id="request-expiry"
										class="date-input"
										type="date"
										value={wizard.data.expiryDate}
										aria-describedby="request-expiry-message"
										oninput={onExpiryInput}
									/>
									<p id="request-expiry-message" class="date-message">
										After this date the link stops working. Leave it blank for no expiry.
									</p>
								</div>

								<gok-switch
									{@attach setProps({ checked: wizard.data.payerChoosesAmount })}
									{@attach on('change', onPayerChoosesChange)}
								>
									Let them choose the amount
								</gok-switch>
							</div>
						{/if}
					</div>
				</section>
			{:else if wizard.current.id === 'share'}
				<!-- Step 2 · the result. The link is always available as text; the QR is
				     never the only path. No money moved — calm, not a success-spine. -->
				{#if created}
					<section class="step-share" aria-label="Share this request">
						<p class="share-lead">
							My request is <strong>open</strong>. Share the link or the QR — money lands in my
							wallet when they pay.
						</p>

						<div class="share-grid">
							<div class="link-block">
								<gok-input
									label="Shareable link"
									readonly
									{@attach setProps({ value: shareLink })}
								></gok-input>
								<div class="link-actions">
									<gok-button variant="secondary" {@attach on('click', copyLink)}>Copy link</gok-button>
									{#if canShare}
										<gok-button variant="secondary" {@attach on('click', shareNative)}>
											Share…
										</gok-button>
									{/if}
								</div>
							</div>

							<div class="qr-block">
								<QrCode value={shareLink} label={`QR code for my request: ${created.note}`} />
								<p class="qr-note">Scan to open the link. The link text above always works too.</p>
							</div>
						</div>

						<dl class="summary">
							<div class="summary-row">
								<dt>Amount</dt>
								<dd class="gok-tabular-nums">{summaryAmount}</dd>
							</div>
							<div class="summary-row">
								<dt>For</dt>
								<dd>{created.note}</dd>
							</div>
							<div class="summary-row">
								<dt>Status</dt>
								<dd>Open</dd>
							</div>
						</dl>

						<div class="share-actions">
							<gok-link href="/payments/request">
								<gok-button variant="secondary">See all requests</gok-button>
							</gok-link>
							<gok-button variant="primary" {@attach on('click', newRequest)}>New request</gok-button>
						</div>
					</section>
				{/if}
			{/if}
		</div>

		{#if wizard.current.id === 'amount'}
			<footer class="actions">
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !canCreate })}
					{@attach on('click', onCreate)}
				>
					Create request
				</gok-button>
			</footer>
		{/if}
	</section>
</div>

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

	/* --- Wizard frame (mirrors the F05 shell). --- */
	.wizard {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.wiz-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.wiz-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.rail {
		margin: 0;
	}

	.rail-list {
		display: flex;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rail-item {
		flex: 1 1 0;
		min-inline-size: 0;
	}

	.step {
		display: flex;
		align-items: center;
		inline-size: 100%;
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.step.is-done {
		border-block-start-color: var(--gok-color-text);
		color: var(--gok-color-text);
	}

	.step.is-current {
		border-block-start-color: var(--gok-color-primary);
		color: var(--gok-color-text);
		font-weight: var(--gok-type-body-large-weight);
	}

	.step-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.step-heading {
		margin: 0;
		color: var(--gok-color-text);
	}

	.step-heading:focus {
		outline: none;
	}

	.step-alert {
		display: block;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* --- Step 1 fields --- */
	.step-fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.open-ask {
		margin: 0;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* More-options disclosure */
	.more {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.more-toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-link);
		cursor: pointer;
	}

	.more-toggle:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.more-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		font-family: var(--gok-font-family-mono);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-s);
	}

	.more-body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		padding-inline-start: var(--gok-space-300);
		border-inline-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* Native date field, tokened to rhyme with gok-input. */
	.date-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.date-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.date-input {
		inline-size: 100%;
		padding-inline: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
	}

	.date-input::-webkit-calendar-picker-indicator {
		cursor: pointer;
	}

	.date-input:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-color: var(--gok-color-primary);
	}

	.date-message {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step 2 share --- */
	.step-share {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.share-lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.share-lead strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.share-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-500);
		align-items: flex-start;
	}

	.link-block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		flex: 1 1 18rem;
		min-inline-size: 0;
	}

	.link-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.qr-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-200);
		flex: 0 0 auto;
	}

	.qr-note {
		margin: 0;
		max-inline-size: 14rem;
		text-align: center;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		max-inline-size: 32rem;
	}

	.summary-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.summary-row:first-child {
		border-block-start: none;
	}

	.summary-row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.summary-row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.share-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
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

	@media (max-width: 40rem) {
		.rail {
			display: none;
		}
	}
</style>
