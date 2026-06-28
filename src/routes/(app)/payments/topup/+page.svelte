<script lang="ts">
	// P09 · Top up a wallet — the inbound "add money to my wallet" surface. A single
	// focused panel with progressive sections (amount + destination → method → review
	// → confirm → outcome), NOT a multi-route wizard. Its whole reason to exist is
	// honesty about speed: a linked **card** top-up settles **instantly** (the money
	// is there now); a **bank / open-banking** pull is genuinely **pending** until it
	// settles, and is shown as not-yet-in-the-balance. We never fake the instant.
	//
	// Single source of truth: the shared `topup` draft state. The page patches it
	// (`setWallet` / `setAmount` / `setSource`) and reads its derived getters. Money is
	// integer minor units throughout. Web-component interop is strictly `setProps`/`on`
	// from `wc.svelte` — never `bind:` on a gok-* element (the MoneyInput composite is a
	// Svelte component, so `bind:value` is fine there). Inbound money, so the confirm is
	// a plain gok-dialog (no danger tone); a large top-up gates behind the F12 step-up.
	import { topup } from '$lib/payments/topup.svelte';
	import type { TopUpReceipt } from '$lib/payments/topup.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import type { Currency } from '$lib/data/money';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	// --- Live derived reads off the shared draft -------------------------------
	const wallet = $derived(topup.wallet());
	// The destination wallet's currency drives the money field + every figure.
	const currency = $derived<Currency>(wallet?.currency ?? 'EUR');
	const source = $derived(topup.source());

	const amountLabel = $derived(formatMoney(topup.amountMinor, currency));
	const isInstant = $derived(topup.isInstant());
	// Honest speed, stated the same everywhere: a card lands now, a bank/OB pull is
	// processing until it settles.
	const speedLabel = $derived(isInstant ? 'Instant' : 'Processing — usually within an hour');
	const feeLabel = $derived(topup.feeMinor() === 0 ? 'No fee' : formatMoney(topup.feeMinor(), currency));

	// Reward-early limit message — a reserved line so the field never shifts. Bounds
	// come from the selected source, named in the destination currency.
	const limitMessage = $derived.by(() => {
		const reason = topup.limitReason();
		if (reason === 'below-min') return `At least ${formatMoney(source.minMinor, currency)}`;
		if (reason === 'above-max') return `That's over the ${formatMoney(source.maxMinor, currency)} top-up limit`;
		return '';
	});

	// --- Field handlers — each patches the single draft ------------------------
	// The money field is a Svelte composite, so bind:value is fine (the no-bind rule
	// is for gok-* custom elements only). The canonical amount lives on the draft.
	let amountValue = $state(topup.amountMinor);

	function onWalletChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		topup.setWallet(value);
	}

	function onAmountChange(minor: number) {
		topup.setAmount(minor);
	}

	function onSourceChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		topup.setSource(value);
	}

	// --- Confirm + step-up + outcome state machine ----------------------------
	let stepUpOpen = $state(false);
	let confirmOpen = $state(false);
	let done = $state(false);
	// Captured at commit time so the outcome survives a `reset()`.
	let receipt = $state<TopUpReceipt | null>(null);

	// After commit the wallet is read live: an instant top-up has already raised the
	// balance; a pending one leaves it untouched (the money is held separate). This
	// derived is the visible proof of the instant-vs-pending split.
	const outcomeWallet = $derived(receipt ? topup.wallet() : undefined);
	// The receipt's currency is a real wallet's currency (the model types it loosely
	// as `string`); narrow it for the formatter.
	const receiptCurrency = $derived((receipt?.currency ?? 'EUR') as Currency);

	/** Primary "Add …": gate a large top-up behind step-up, else open the confirm. */
	function onAdd() {
		if (!topup.valid()) return;
		if (topup.needsStepUp()) {
			stepUpOpen = true;
		} else {
			confirmOpen = true;
		}
	}

	function onStepUpConfirm() {
		stepUpOpen = false;
		confirmOpen = true;
	}

	function onStepUpCancel() {
		stepUpOpen = false;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit. Branches the outcome on `r.settled`. */
	function confirmTopUp() {
		const r = topup.commit();
		confirmOpen = false;
		if (!r) return; // Slipped out of bounds — stay on review.
		receipt = r;
		done = true;
	}

	/** Reset the draft (keeps the destination wallet) and return to the form. */
	function topUpAgain() {
		topup.reset();
		amountValue = 0;
		receipt = null;
		done = false;
		stepUpOpen = false;
		confirmOpen = false;
	}

	/** Move focus to the outcome heading when the success view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Top up · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if done && receipt}
		{#if receipt.settled}
			<!-- Instant (card): settled, the money is there now, the balance has risen. -->
			<section class="outcome">
				<gok-empty-state>
					<span slot="media" class="mark mark-settled" aria-hidden="true">
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
						<span class="gok-tabular-nums">{formatMoney(receipt.amountMinor, receiptCurrency)}</span>
						added to {receipt.walletName}
					</h1>

					<gok-tag size="m" dot>Settled</gok-tag>

					<p class="outcome-body">
						I added <span class="gok-tabular-nums">{formatMoney(receipt.amountMinor, receiptCurrency)}</span>
						to my {receipt.walletName} wallet. It's there now.
					</p>

					<dl class="ledger receipt">
						<div class="row">
							<dt>From</dt>
							<dd>{receipt.source.label} <span class="mono">· {receipt.source.maskedId}</span></dd>
						</div>
						<div class="row">
							<dt>Added</dt>
							<dd class="gok-tabular-nums">{formatMoney(receipt.amountMinor, receiptCurrency)}</dd>
						</div>
						<div class="row total">
							<dt>New balance</dt>
							<dd class="gok-tabular-nums">
								{formatMoney(outcomeWallet?.availableMinor ?? 0, receiptCurrency)}
							</dd>
						</div>
					</dl>

					<div slot="actions" class="outcome-actions">
						<gok-button variant="primary" href={`/accounts/${receipt.walletId}`}>
							View {receipt.walletName}
						</gok-button>
						<gok-button variant="secondary" href="/activity">Activity</gok-button>
						<gok-button variant="ghost" {@attach on('click', topUpAgain)}>Top up again</gok-button>
					</div>
				</gok-empty-state>
			</section>
		{:else}
			<!-- Pending (bank / open-banking): genuinely processing. The amount is NOT in
			     the balance yet — held separate, shown honestly. -->
			<section class="outcome">
				<gok-empty-state>
					<span slot="media" class="mark mark-pending" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
							<circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="2" />
							<path
								d="M12 8v4.25l2.75 1.75"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>

					<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
						<span class="gok-tabular-nums">{formatMoney(receipt.amountMinor, receiptCurrency)}</span>
						on its way to {receipt.walletName}
					</h1>

					<gok-tag size="m" dot>Processing</gok-tag>

					<gok-alert status="info">
						Processing — usually within an hour. I'll see it land in my {receipt.walletName} wallet once
						it settles.
					</gok-alert>

					<dl class="ledger receipt">
						<div class="row">
							<dt>From</dt>
							<dd>{receipt.source.label} <span class="mono">· {receipt.source.maskedId}</span></dd>
						</div>
						<div class="row">
							<dt>Processing</dt>
							<dd class="gok-tabular-nums">{formatMoney(receipt.amountMinor, receiptCurrency)}</dd>
						</div>
						<div class="row total">
							<dt>In {receipt.walletName} now</dt>
							<dd class="gok-tabular-nums">
								{formatMoney(outcomeWallet?.availableMinor ?? 0, receiptCurrency)}
							</dd>
						</div>
					</dl>
					<p class="outcome-note">The top-up isn't in my balance yet — it lands when it settles.</p>

					<div slot="actions" class="outcome-actions">
						<gok-button variant="primary" href={`/accounts/${receipt.walletId}`}>
							View {receipt.walletName}
						</gok-button>
						<gok-button variant="secondary" href="/activity">Activity</gok-button>
						<gok-button variant="ghost" {@attach on('click', topUpAgain)}>Top up again</gok-button>
					</div>
				</gok-empty-state>
			</section>
		{/if}
	{:else}
		<header class="head">
			<gok-link href="/payments">&larr; Payments</gok-link>
			<p class="eyebrow gok-eyebrow">Payments</p>
			<h1 class="title gok-headline-2">Top up</h1>
			<p class="sub">Add money to one of my wallets.</p>
		</header>

		<!-- 1 · Amount + destination ------------------------------------------- -->
		<section class="section" aria-labelledby="amount-heading">
			<h2 id="amount-heading" class="section-title gok-headline-5">How much, and where</h2>
			<div class="amount-grid">
				<div class="field">
					<gok-select
						label="Add to"
						{@attach setProps({ value: topup.walletId })}
						{@attach on('change', onWalletChange)}
					>
						{#each topup.wallets() as w (w.id)}
							<gok-option value={w.id}>{w.name} · {w.currency}</gok-option>
						{/each}
					</gok-select>
				</div>

				<div class="field">
					<MoneyInput
						bind:value={amountValue}
						{currency}
						label="Amount"
						onchange={onAmountChange}
					/>
					<!-- Reserved reward-early line — polite, never shifts the layout. -->
					<p class="limit-msg" role="status" aria-live="polite">{limitMessage}</p>
				</div>
			</div>
		</section>

		<!-- 2 · Method ---------------------------------------------------------- -->
		<section class="section" aria-labelledby="method-heading">
			<h2 id="method-heading" class="section-title gok-headline-5">Where it comes from</h2>
			<gok-radio-group
				label="Funding source"
				orientation="vertical"
				{@attach setProps({ value: topup.sourceId })}
				{@attach on('change', onSourceChange)}
			>
				{#each topup.sources() as s (s.id)}
					<gok-radio class="method" class:is-selected={s.id === topup.sourceId} value={s.id}>
						<span class="method-label">
							<span class="method-top">
								<span class="method-name">{s.label}</span>
								<span class="method-id mono">{s.maskedId}</span>
							</span>
							<span class="method-meta">
								<span class="method-speed">{s.instant ? 'Instant' : 'Usually within an hour'}</span>
								<span class="method-dot" aria-hidden="true">·</span>
								<span class="method-fee">{s.feeMinor === 0 ? 'No fee' : formatMoney(s.feeMinor, currency)}</span>
							</span>
						</span>
					</gok-radio>
				{/each}
			</gok-radio-group>

			<!-- Quiet, disabled stub: managing sources lives in settings (not this phase). -->
			<span class="add-source">
				<gok-icon name="plus" size="s" aria-hidden="true"></gok-icon>
				Add a new source
				<gok-tag size="s">Soon</gok-tag>
			</span>
		</section>

		<!-- 3 · Review ---------------------------------------------------------- -->
		<section class="section" aria-labelledby="review-heading">
			<h2 id="review-heading" class="section-title gok-headline-5">Review</h2>
			<gok-card class="review">
				<dl class="ledger">
					<div class="row">
						<dt>From</dt>
						<dd>{source.label} <span class="mono">· {source.maskedId}</span></dd>
					</div>
					<div class="row">
						<dt>To</dt>
						<dd>{wallet?.name ?? '—'} · {currency}</dd>
					</div>
					<div class="row">
						<dt>Amount</dt>
						<dd class="gok-tabular-nums">{amountLabel}</dd>
					</div>
					<div class="row">
						<dt>Fee</dt>
						<dd class="row-inline">
							{feeLabel}
							{#if topup.feeMinor() === 0}
								<gok-badge variant="success" size="s">No fee</gok-badge>
							{/if}
						</dd>
					</div>
					<div class="row">
						<dt>Speed</dt>
						<dd>{speedLabel}</dd>
					</div>
				</dl>
			</gok-card>

			<div class="add-row">
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !topup.valid() })}
					{@attach on('click', onAdd)}
				>
					Add {amountLabel}
				</gok-button>
			</div>
		</section>
	{/if}
</div>

<!-- Step-up gate for a large top-up (≥ €5,000). Neutral tone — inbound money, no
     destructive consequence; it only proves it's me before a big move. -->
<StepUp
	open={stepUpOpen}
	title={`Add ${amountLabel}?`}
	consequence={`This is a large top-up of ${amountLabel}. A quick identity check keeps it mine before it lands in my ${wallet?.name ?? 'wallet'}.`}
	confirmLabel="Continue"
	onConfirm={onStepUpConfirm}
	onCancel={onStepUpCancel}
/>

<!-- Confirm: a plain gok-dialog (NOT danger) — this is money coming IN. It names the
     amount, destination, and the honest speed before the commit. -->
<gok-dialog
	size="s"
	heading="Add money"
	{@attach setProps({ open: confirmOpen })}
	{@attach on('gok-cancel', closeConfirm)}
	{@attach on('gok-close', closeConfirm)}
>
	<p class="confirm-body">
		Add <strong class="gok-tabular-nums">{amountLabel}</strong> to my {wallet?.name ?? 'wallet'} from
		{source.label}?
	</p>
	<p class="confirm-speed">
		{#if isInstant}
			It settles instantly — the money is there as soon as I confirm.
		{:else}
			It's processing — usually within an hour. It lands once it settles, not straight away.
		{/if}
	</p>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button variant="primary" {@attach on('click', confirmTopUp)}>Add {amountLabel}</gok-button>
	</div>
</gok-dialog>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* --- Header --- */
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

	.sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Sections --- */
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.section-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.amount-grid {
		display: grid;
		gap: var(--gok-space-400);
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		align-items: start;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	/* Reserved reward-early line: a fixed row keeps the field from shifting. */
	.limit-msg {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	/* --- Method radios as composed cards (we never restyle the radio itself) --- */
	.method {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.method:hover {
		border-color: var(--gok-color-border-strong);
	}

	.method.is-selected {
		border-color: var(--gok-color-text);
	}

	.method-label {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.method-top {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.method-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.method-id {
		color: var(--gok-color-text-muted);
	}

	.method-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.method-dot {
		color: var(--gok-color-border-strong);
	}

	.add-source {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Review card --- */
	.review {
		display: block;
	}

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

	.row dd .mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.row-inline {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
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

	.add-row {
		display: flex;
		justify-content: flex-end;
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

	.confirm-speed {
		margin: var(--gok-space-200) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Outcome (settled / processing) --- */
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

	.mark-settled {
		color: var(--gok-color-primary);
	}

	.mark-pending {
		color: var(--gok-color-text-muted);
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

	.outcome-note {
		margin: var(--gok-space-200) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 24rem;
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

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
