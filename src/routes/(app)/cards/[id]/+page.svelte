<script lang="ts">
	// C01 detail — one card, up close. The card-art hero leads; a quiet action row
	// (freeze · show number · settings) and a masked reveal panel sit under it, then
	// the per-card spend stream. Freeze is optimistic + reversible (a one-tap switch
	// + toast, no dialog). Revealing the number is a sensitive act, so it goes
	// through the step-up RevealDialog — never shown inline. The one earned accent
	// is the primary "Show card number" action; everything else stays ink.
	import { page } from '$app/state';
	import { cards } from '$lib/state/cards.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDayMonth } from '$lib/format';
	import { TODAY, isoDate } from '$lib/data/time';
	import type { Currency } from '$lib/data/money';
	import type { Transaction } from '$lib/data/types';
	import CardArt from '$lib/components/cards/CardArt.svelte';
	import RevealDialog from '$lib/components/cards/RevealDialog.svelte';

	const card = $derived(page.params.id ? cards.card(page.params.id) : undefined);
	const status = $derived(card ? cards.displayStatus(card) : 'Active');
	const frozen = $derived(card?.controls.frozen ?? false);
	const currency = $derived<Currency>(
		card ? (accounts.wallet(card.walletId)?.currency ?? 'EUR') : 'EUR'
	);

	// The card's spend stream + this-month total (outflows only).
	const spend = $derived(card ? cards.spend(card.id) : []);
	const monthKey = isoDate(TODAY).slice(0, 7);
	const spentMinor = $derived(
		spend.reduce(
			(sum, t) => sum + (t.date.slice(0, 7) === monthKey && t.amountMinor < 0 ? -t.amountMinor : 0),
			0
		)
	);
	const spentLabel = $derived(formatMoney(spentMinor, currency));

	// gok-table cells are formatted strings only (dogfooding #11) — format in each
	// column, never pass rich nodes.
	type Column = {
		key: string;
		label: string;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
		format?: (value: unknown, row: Transaction) => string;
	};

	const columns = $derived<Column[]>([
		{ key: 'date', label: 'Date', width: '6.5rem', format: (v) => formatDayMonth(v as string) },
		{ key: 'merchant', label: 'Merchant', primary: true },
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '8.5rem',
			format: (v) => formatMoney(v as number, currency, { signDisplay: true })
		}
	]);

	const getRowId = (r: Transaction) => r.id;

	// --- Freeze: optimistic + reversible, no dialog. ---
	function onFreezeChange() {
		if (!card) return;
		const isFrozen = cards.toggleFreeze(card.id);
		toast(isFrozen ? 'Card frozen — unfreeze anytime' : 'Card unfrozen', { status: 'info' });
	}

	// --- Reveal: gated behind the step-up dialog. ---
	let revealOpen = $state(false);
</script>

<svelte:head>
	<title>{card ? `${card.holder} ·· ${card.last4}` : 'Card'} · gökberk bank</title>
</svelte:head>

{#if !card}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Card not found</p>
			<p class="missing-body">This card doesn’t exist, or it has been closed.</p>
			<gok-link slot="actions" href="/cards">Back to cards</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/cards">&larr; Cards</gok-link>
		</header>

		<section class="hero">
			<div class="hero-art">
				<CardArt {card} size="hero" />
			</div>

			<div class="hero-meta">
				<p class="hero-eyebrow gok-eyebrow">
					{card.type === 'physical'
						? 'Physical'
						: card.type === 'virtual'
							? 'Virtual'
							: 'Single-use'} card
				</p>
				<gok-tag size="m">
					<span class="status">
						{#if status === 'Frozen'}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
								<path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
								<rect x="5.25" y="10" width="13.5" height="9.5" rx="2" stroke="currentColor" stroke-width="1.75" />
							</svg>
						{:else if status === 'Expired'}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
								<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
								<path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						{:else}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
								<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						{/if}
						{status}
					</span>
				</gok-tag>
			</div>
		</section>

		<section class="actions" aria-label="Card actions">
			<div class="freeze">
				<gok-switch
					{@attach setProps({ checked: frozen })}
					{@attach on('change', onFreezeChange)}
				>
					Freeze card
				</gok-switch>
				<p class="freeze-hint">
					{frozen ? 'Frozen — no payments will go through.' : 'Tap to pause all payments instantly.'}
				</p>
			</div>

			<div class="action-buttons">
				<gok-button variant="primary" {@attach on('click', () => (revealOpen = true))}>
					Show card number
				</gok-button>
				<!-- Card settings (controls / limits / regions) — C03. -->
				<gok-link href={`/cards/${card.id}/settings`}>Settings</gok-link>
				<!-- Add to wallet (Apple / Google Pay) — C05, deferred. -->
				<gok-button variant="secondary" disabled>Add to wallet</gok-button>
				<gok-tag size="s">Soon</gok-tag>
			</div>
		</section>

		<section class="reveal" aria-label="Card number">
			<dl class="fields">
				<div class="field">
					<dt class="field-label gok-eyebrow">Card number</dt>
					<dd class="field-value nums">•••• •••• •••• {card.last4}</dd>
				</div>
				<div class="field">
					<dt class="field-label gok-eyebrow">Expiry</dt>
					<dd class="field-value nums">{card.expiry}</dd>
				</div>
				<div class="field">
					<dt class="field-label gok-eyebrow">CVV</dt>
					<dd class="field-value nums">•••</dd>
				</div>
			</dl>
			<gok-button variant="secondary" size="s" {@attach on('click', () => (revealOpen = true))}>
				Show card number
			</gok-button>
		</section>

		<section class="spend" aria-labelledby="spend-heading">
			<div class="spend-head">
				<h2 id="spend-heading" class="spend-title gok-headline-5">Spent this month</h2>
				<p class="spend-figure nums">{spentLabel}</p>
			</div>

			<!-- TODO: F11 spend donut -->

			{#if spend.length === 0}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No spend yet</p>
					<p class="empty-body">When I use this card, the transactions show up here.</p>
				</gok-empty-state>
			{:else}
				<gok-table
					accessible-label="Card transactions"
					paginated
					page-size={10}
					{@attach setProps({ columns, rows: spend, getRowId })}
				>
					<div slot="caption" class="caption">
						<p class="caption-eyebrow gok-eyebrow">Activity</p>
						<h3 class="caption-title gok-headline-6">Recent transactions</h3>
					</div>
				</gok-table>
			{/if}
		</section>
	</div>

	<RevealDialog {card} open={revealOpen} onClose={() => (revealOpen = false)} />
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
		gap: var(--gok-space-200);
	}

	/* Hero: the card-art leads; meta sits beside it on wide, stacks under on mobile. */
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--gok-space-500);
	}

	.hero-art {
		flex: 1 1 22rem;
		max-inline-size: 27rem;
	}

	.hero-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.hero-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	/* --- Action row --- */
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.freeze {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.freeze-hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* --- Masked reveal panel --- */
	.reveal {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.fields {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-600);
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.field-value {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		letter-spacing: 0.04em;
		color: var(--gok-color-text);
	}

	/* --- Spend stream --- */
	.spend {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.spend-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.spend-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.spend-figure {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		letter-spacing: var(--gok-type-headline-5-tracking);
		color: var(--gok-color-text);
	}

	.caption {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.caption-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.caption-title {
		margin: 0;
		color: var(--gok-color-text);
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

	.nums {
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 24.375rem) {
		.actions,
		.reveal {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
