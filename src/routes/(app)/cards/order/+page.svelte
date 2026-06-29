<script lang="ts">
	// C02 · Order / replace a card — a calm, consequence-first wizard on the cards
	// spine, handling BOTH a fresh order and a like-for-like replacement on the same
	// route (`cardOrder.replacingId` distinguishes them). Four steps (card type →
	// design + funding wallet → delivery [physical only] → review) ride the F05 wizard
	// composite: `cardOrder.wizard.data` IS the $state draft, the physical-only delivery
	// step is auto-skipped by the store for an instant (virtual/disposable) card, and
	// the live fee/ETA derivations live in the state module — so this surface only
	// renders the fields that write into the draft and lets the shell gate movement.
	//
	// The whole tone is first-person singular: I'm ordering MY card, every consequence
	// (the fee, and — when replacing — that my current card stops working) is stated
	// in plain words before I commit. The terminal is consequence-gated: a fresh order
	// is a forced-decision danger dialog; a replacement cancels a working card, so it's
	// gated by the F12 step-up (re-auth), not just a confirm. Status is carried by rule
	// + text, never colour alone (the selected design firms its hairline to ink — the
	// earned green stays on the radio dot, one accent per context).
	//
	// Interop is strictly `setProps`/`on` — never `bind:` on a gok-* host; fields write
	// into the draft through `patch` (an immutable patch so persistence + reactivity
	// both flow), and gok-* values are read off the event.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import {
		cardOrder,
		CARD_TYPES,
		CARD_DESIGNS,
		DELIVERY_OPTIONS
	} from '$lib/cards/order.svelte';
	import type { CardType, CardDesign } from '$lib/cards/order.svelte';
	import type { Card } from '$lib/data';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	// ── Reads off the card-order state (the wizard draft + the live derivations). ──
	const replacing = $derived(cardOrder.replacingId !== null);
	const replacedCard = $derived(cardOrder.replacingCard());
	const type = $derived(cardOrder.wizard.data.type);
	const design = $derived(cardOrder.wizard.data.design);
	const walletId = $derived(cardOrder.wizard.data.walletId);
	const delivery = $derived(cardOrder.wizard.data.delivery);
	const selectedType = $derived(cardOrder.selectedType());
	const selectedDelivery = $derived(cardOrder.selectedDelivery());
	const physical = $derived(cardOrder.isPhysical());
	const etaIso = $derived(cardOrder.eta());
	const fee = $derived(cardOrder.feeMinor());
	const wallets = $derived(cardOrder.wallets());
	const designLabel = $derived(CARD_DESIGNS.find((d) => d.design === design)?.label ?? design);

	/** A free fee reads as the word "Free", never "€0.00". */
	function feeLabel(minor: number): string {
		return minor === 0 ? 'Free' : formatMoney(minor, 'EUR');
	}

	/** Patch the wizard draft immutably so persistence + reactivity both flow. */
	function patch(part: Partial<typeof cardOrder.wizard.data>) {
		cardOrder.wizard.data = { ...cardOrder.wizard.data, ...part };
	}

	// ── Field writes — every gok-* value is read off its event, never bound. ──
	function onTypeChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ type: value as CardType });
	}
	function onDesignChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ design: value as CardDesign });
	}
	function onWalletChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ walletId: value });
	}
	function onDeliveryChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ delivery: value as 'standard' | 'tracked' });
	}

	// ── Review · each row edits back to its step (type=0, design=1, delivery=2). ──
	function editStep(index: number) {
		cardOrder.wizard.goTo(index);
	}

	// ── Terminal · consequence-gated commits, then the success panel. ──
	// `placed` holds the freshly-minted card; its presence swaps the page to success.
	// The ETA is captured *before* the commit (the commit resets the draft, so
	// `cardOrder.eta()` would no longer reflect this order afterwards).
	let placed = $state<Card | null>(null);
	let placedEta = $state<string | null>(null);
	// Whether this commit was a replacement — captured here because `placeReplacement`
	// clears `replacingId`, so the live `replacing` flag is false by the success render.
	let placedReplacement = $state(false);
	let orderOpen = $state(false);
	let stepUpOpen = $state(false);

	const isInstant = $derived(placed ? placed.type !== 'physical' : false);
	// The success copy must read the *placed* card, not the live draft — `placeOrder`
	// resets the draft (back to the physical default), so `selectedType` no longer
	// reflects what was just ordered.
	const placedTypeLabel = $derived.by(() => {
		const c = placed;
		if (!c) return '';
		return CARD_TYPES.find((t) => t.type === c.type)?.label ?? c.type;
	});

	const stepUpConsequence = $derived(
		replacedCard
			? `My current card •• ${replacedCard.last4} stops working the moment I confirm.`
			: 'My current card stops working the moment I confirm.'
	);

	function onReviewComplete() {
		if (cardOrder.replacingId !== null) stepUpOpen = true;
		else orderOpen = true;
	}

	function closeOrder() {
		orderOpen = false;
	}
	function confirmOrder() {
		if (placed) return; // guard a double-fire — one confirm mints exactly one card
		placedEta = cardOrder.eta();
		placed = cardOrder.placeOrder();
		orderOpen = false;
	}

	function cancelStepUp() {
		stepUpOpen = false;
	}
	function confirmReplacement() {
		if (placed) return; // guard a double-fire — one confirm mints exactly one card
		placedEta = cardOrder.eta();
		placedReplacement = true;
		placed = cardOrder.placeReplacement();
		stepUpOpen = false;
	}
</script>

<svelte:head>
	<title>{replacing ? 'Replace my card' : 'Order a card'} · gökberk bank</title>
</svelte:head>

{#if placed}
	<!-- Success · the wizard is swapped for a calm confirmation + status tag. -->
	<section class="page" aria-label="Card ordered">
		<gok-empty-state tone="success">
			<span slot="media" class="success-glyph" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
					<path
						d="M5 12.5l4.5 4.5L19 6.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>

			<p class="success-title gok-headline-4">
				{placedReplacement ? 'Replacement ordered' : 'Card ordered'}
			</p>

			<gok-tag variant="readonly" size="m">{isInstant ? 'Ready to use' : 'On its way'}</gok-tag>

			{#if isInstant}
				<p class="success-body">
					My new {placedTypeLabel.toLowerCase()} card is issued instantly — I can use it right away.
				</p>
			{:else}
				<p class="success-body">
					My new {placedTypeLabel.toLowerCase()} card is on its way.
					{#if placedEta}Arriving by <span class="gok-tabular-nums">{formatDate(placedEta)}</span>.{/if}
				</p>
			{/if}

			<div slot="actions" class="success-actions">
				<gok-link href={`/cards/${placed.id}`}>
					<gok-button variant="primary">View my card</gok-button>
				</gok-link>
				<gok-link href="/cards">
					<gok-button variant="secondary">Back to cards</gok-button>
				</gok-link>
			</div>
		</gok-empty-state>
	</section>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/cards">&larr; Cards</gok-link>
			<p class="eyebrow gok-eyebrow">Card</p>
			<h1 class="title gok-headline-2">{replacing ? 'Replace my card' : 'Order a card'}</h1>
			<p class="lead">
				{#if replacing}
					I'll set up a new card to replace this one. My current card keeps working until I confirm
					the replacement.
				{:else}
					I'll pick a card, choose how it looks, and have it ready. I'll see every detail before I
					confirm.
				{/if}
			</p>
		</header>

		<Wizard wizard={cardOrder.wizard} submitLabel="Review order" onComplete={onReviewComplete}>
			{#if cardOrder.wizard.current.id === 'type'}
				<!-- Step 1 · card type — a radio-card list, each with a fee badge. -->
				<section class="step" aria-label="Card type">
					{#if replacing}
						<gok-alert status="info">
							A replacement keeps the same card type by default — I can change it here.
						</gok-alert>
					{/if}

					<gok-radio-group
						label="What kind of card do I want?"
						orientation="vertical"
						{@attach setProps({ value: type })}
						{@attach on('change', onTypeChange)}
					>
						{#each CARD_TYPES as option (option.type)}
							<gok-radio
								class="choice"
								class:is-selected={option.type === type}
								value={option.type}
							>
								<span class="choice-label">
									<span class="choice-head">
										<span class="choice-title">{option.label}</span>
										{#if option.feeMinor === 0}
											<gok-badge variant="success" size="s">Free</gok-badge>
										{:else}
											<gok-badge variant="neutral" size="s">
												{formatMoney(option.feeMinor, 'EUR')}
											</gok-badge>
										{/if}
									</span>
									<span class="choice-note">{option.description}</span>
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>
				</section>
			{/if}

			{#if cardOrder.wizard.current.id === 'design'}
				<!-- Step 2 · design (a radio group of card-art treatments) + funding wallet. -->
				<section class="step fields" aria-label="Design and funding">
					<gok-radio-group
						label="How should my card look?"
						orientation="vertical"
						{@attach setProps({ value: design })}
						{@attach on('change', onDesignChange)}
					>
						{#each CARD_DESIGNS as option (option.design)}
							<gok-radio
								class="choice"
								class:is-selected={option.design === design}
								value={option.design}
							>
								<span class="choice-label">
									<span class="choice-title">{option.label}</span>
									<span class="choice-note">{option.note}</span>
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>

					<gok-select
						label="Which wallet funds this card?"
						{@attach setProps({ value: walletId })}
						{@attach on('change', onWalletChange)}
					>
						{#each wallets as wallet (wallet.id)}
							<gok-option value={wallet.id}>{cardOrder.walletLabel(wallet.id)}</gok-option>
						{/each}
					</gok-select>
				</section>
			{/if}

			{#if cardOrder.wizard.current.id === 'delivery'}
				<!-- Step 3 · delivery — physical only (the store skips it otherwise). -->
				<section class="step" aria-label="Delivery">
					<gok-segmented
						label="How should it arrive?"
						{@attach setProps({ value: delivery })}
						{@attach on('change', onDeliveryChange)}
					>
						{#each DELIVERY_OPTIONS as option (option.id)}
							<gok-segmented-item value={option.id}>{option.label}</gok-segmented-item>
						{/each}
					</gok-segmented>

					<div class="cover" aria-live="polite">
						<p class="cover-eyebrow gok-eyebrow">{selectedDelivery.label} delivery</p>
						<dl class="ledger">
							<div class="row">
								<dt>Note</dt>
								<dd>{selectedDelivery.note}</dd>
							</div>
							<div class="row">
								<dt>Fee</dt>
								<dd>{feeLabel(selectedDelivery.feeMinor)}</dd>
							</div>
							<div class="row">
								<dt>Arrives by</dt>
								<dd class="gok-tabular-nums">{etaIso ? formatDate(etaIso) : '—'}</dd>
							</div>
						</dl>
					</div>
				</section>
			{/if}

			{#if cardOrder.wizard.current.id === 'review'}
				<!-- Step 4 · review — a read-only ledger, each row editable in place. -->
				<section class="step" aria-label="Review order">
					<gok-card class="review-card">
						<dl class="ledger">
							<div class="row review-row">
								<div class="review-cell">
									<dt>Card type</dt>
									<dd>{selectedType.label}</dd>
								</div>
								<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(0))}>
									Edit<span class="sr-only"> card type</span>
								</gok-button>
							</div>

							<div class="row review-row">
								<div class="review-cell">
									<dt>Design</dt>
									<dd>{designLabel}</dd>
								</div>
								<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
									Edit<span class="sr-only"> design</span>
								</gok-button>
							</div>

							<div class="row review-row">
								<div class="review-cell">
									<dt>Funding wallet</dt>
									<dd>{cardOrder.walletLabel(walletId)}</dd>
								</div>
								<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
									Edit<span class="sr-only"> funding wallet</span>
								</gok-button>
							</div>

							<div class="row review-row">
								<div class="review-cell">
									<dt>Fee</dt>
									<dd>{feeLabel(fee)}</dd>
								</div>
							</div>

							{#if physical}
								<div class="row review-row">
									<div class="review-cell">
										<dt>Delivery</dt>
										<dd>
											{selectedDelivery.label}
											{#if etaIso}
												<span class="review-sub gok-tabular-nums">
													Arrives by {formatDate(etaIso)}
												</span>
											{/if}
										</dd>
									</div>
									<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(2))}>
										Edit<span class="sr-only"> delivery</span>
									</gok-button>
								</div>
							{:else}
								<div class="row review-row">
									<div class="review-cell">
										<dt>Availability</dt>
										<dd>Issued instantly</dd>
									</div>
								</div>
							{/if}
						</dl>
					</gok-card>

					{#if replacing && replacedCard}
						<!-- The replacement consequence, stated plainly before I commit. -->
						<gok-alert status="warning">
							This replaces my current card •• {replacedCard.last4}, which stops working when I
							confirm.
						</gok-alert>
					{/if}
				</section>
			{/if}
		</Wizard>
	</div>

	<!-- Fresh order · a forced-decision danger confirm (committing to issue the card). -->
	<gok-dialog
		size="s"
		tone="danger"
		heading="Order this card"
		no-dismiss
		{@attach setProps({ open: orderOpen })}
		{@attach on('gok-cancel', closeOrder)}
		{@attach on('gok-close', closeOrder)}
	>
		<p class="confirm-body">
			I'm ordering a <strong>{selectedType.label.toLowerCase()}</strong> card{#if fee > 0}
				for <strong>{feeLabel(fee)}</strong>{/if}.
		</p>

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', closeOrder)}>Back</gok-button>
			<gok-button variant="primary" {@attach on('click', confirmOrder)}>Order card</gok-button>
		</div>
	</gok-dialog>

	<!-- Replace · gated by the F12 step-up (re-auth) — it cancels a working card. -->
	<StepUp
		open={stepUpOpen}
		title="Replace my card?"
		consequence={stepUpConsequence}
		confirmLabel="Replace card"
		tone="danger"
		onConfirm={confirmReplacement}
		onCancel={cancelStepUp}
	/>
{/if}

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

	/* --- Radio-cards (type + design) ---
	 * Card chrome wraps the host gok-radio — we compose layout around the control,
	 * never restyle the radio's own visuals. The selected card firms its hairline to
	 * ink (the earned green stays on the radio dot — one accent per context). */
	.choice {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.choice:hover {
		border-color: var(--gok-color-border-strong);
	}

	.choice.is-selected {
		border-color: var(--gok-color-text);
		box-shadow: inset 0 0 0 var(--gok-border-width-hairline) var(--gok-color-text);
	}

	.choice-label {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.choice-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-100) var(--gok-space-200);
	}

	.choice-title {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.choice-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Delivery summary ledger --- */
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
		gap: var(--gok-space-100);
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

	/* --- Success --- */
	.success-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-status-success);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-success);
	}

	.success-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.success-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.success-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	/* --- Shared --- */
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
