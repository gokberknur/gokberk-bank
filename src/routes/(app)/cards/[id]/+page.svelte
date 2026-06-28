<script lang="ts">
	// C01 detail — one card, up close. The card-art hero leads; a quiet action row
	// (freeze · show number · settings) and a masked reveal panel sit under it, then
	// the per-card spend stream. Freeze is optimistic + reversible (a one-tap switch
	// + toast, no dialog). Revealing the number is a sensitive act, so it goes
	// through the step-up RevealDialog — never shown inline. The one earned accent
	// is the primary "Show card number" action; everything else stays ink.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { cards } from '$lib/state/cards.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { cardOrder } from '$lib/cards/order.svelte';
	import { cardSecurity, MOBILE_WALLET_LABELS } from '$lib/cards/security.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { DonutChart, categoryBreakdown } from '$lib/charts';
	import { formatMoney, formatDayMonth } from '$lib/format';
	import { TODAY, isoDate } from '$lib/data/time';
	import type { Currency } from '$lib/data/money';
	import type { Transaction } from '$lib/data/types';
	import StickyActionBar from '$lib/components/layout/StickyActionBar.svelte';
	import CardArt from '$lib/components/cards/CardArt.svelte';
	import RevealDialog from '$lib/components/cards/RevealDialog.svelte';
	import PinDialog from '$lib/components/cards/PinDialog.svelte';
	import AddToWalletDialog from '$lib/components/cards/AddToWalletDialog.svelte';

	const card = $derived(page.params.id ? cards.card(page.params.id) : undefined);
	const status = $derived(card ? cards.displayStatus(card) : 'Active');
	const cancelled = $derived(status === 'Cancelled');
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

	// This-month spend by category, for the F11 donut. One wallet → one currency,
	// so the raw-minor breakdown is already in the card's currency.
	const donutData = $derived(
		categoryBreakdown(
			spend.filter((t) => t.date.slice(0, 7) === monthKey && t.amountMinor < 0)
		)
	);
	const donutLabel = $derived(
		`Spent ${spentLabel} this month across ${donutData.length} ${donutData.length === 1 ? 'category' : 'categories'}.`
	);

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

	// --- PIN view/change (C04) + add-to-wallet (C05), each its own dialog. ---
	let pinOpen = $state(false);
	let walletOpen = $state(false);

	// Wallets this card is already in (reactive). When it's in one, the action
	// manages rather than adds, and a tag names where it lives.
	const wallets = $derived(card ? cardSecurity.walletsFor(card.id) : []);
	const inWallet = $derived(wallets.length > 0);
	const walletLabel = $derived(wallets.length > 0 ? MOBILE_WALLET_LABELS[wallets[0]] : '');

	// --- Replace: seed a like-for-like replace flow, then hand off to C02. The
	// old card is cancelled at the commit, so this is the lost/stolen path too.
	function replaceCard() {
		if (!card) return;
		cardOrder.startReplace(card.id);
		goto('/cards/order');
	}
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
				{#if !cancelled}
					<!-- PIN view / change (C04) — quiet, gated behind the step-up. -->
					<gok-button variant="secondary" {@attach on('click', () => (pinOpen = true))}>
						PIN
					</gok-button>
					<!-- Add to / manage wallet (Apple / Google Pay) — C05. -->
					<gok-button variant="secondary" {@attach on('click', () => (walletOpen = true))}>
						{inWallet ? 'Manage wallet' : 'Add to wallet'}
					</gok-button>
					{#if inWallet}
						<gok-tag size="s">In {walletLabel}</gok-tag>
					{/if}
				{/if}
			</div>
		</section>

		<section class="replace" aria-label="Replace or report this card">
			{#if cancelled}
				<p class="replace-note">This card was cancelled.</p>
			{:else}
				<gok-button variant="secondary" {@attach on('click', replaceCard)}>
					Replace card
				</gok-button>
				<p class="replace-note">
					Lost or stolen? I’ll cancel this card and ship a replacement.
				</p>
			{/if}
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
		</section>

		<section class="spend" aria-labelledby="spend-heading">
			<div class="spend-head">
				<h2 id="spend-heading" class="spend-title gok-headline-5">Spent this month</h2>
				<p class="spend-figure nums">{spentLabel}</p>
			</div>

			{#if spend.length === 0}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No spend yet</p>
					<p class="empty-body">When I use this card, the transactions show up here.</p>
				</gok-empty-state>
			{:else}
				<div class="spend-body">
					<div class="spend-chart">
						{#if donutData.length > 0}
							<DonutChart
								data={donutData}
								formatValue={(m) => formatMoney(m, currency)}
								centerTitle="Spent"
								centerValue={spentLabel}
								label={donutLabel}
							/>
						{:else}
							<gok-empty-state>
								<p class="empty-title gok-headline-6">Nothing this month</p>
								<p class="empty-body">No spend on this card yet this month — older activity is listed.</p>
							</gok-empty-state>
						{/if}
					</div>

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
				</div>
			{/if}
		</section>

		<StickyActionBar label="Card actions">
			{#snippet actions()}
				<gok-button variant="primary" {@attach on('click', () => (revealOpen = true))}>
					Show card number
				</gok-button>
				<gok-link href={`/cards/${card.id}/settings`}>
					<gok-button variant="secondary">Settings</gok-button>
				</gok-link>
			{/snippet}
		</StickyActionBar>
	</div>

	<RevealDialog {card} open={revealOpen} onClose={() => (revealOpen = false)} />
	<PinDialog {card} open={pinOpen} onClose={() => (pinOpen = false)} />
	<AddToWalletDialog {card} open={walletOpen} onClose={() => (walletOpen = false)} />
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

	/* --- Replace / report — the quiet, lost-or-stolen path. --- */
	.replace {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.replace-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
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

	/* Donut beside the transactions list: stacked on mobile, two columns from 48rem. */
	.spend-body {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
	}

	.spend-chart {
		min-inline-size: 0;
	}

	@media (min-width: 48rem) {
		.spend-body {
			grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
			align-items: start;
			gap: var(--gok-space-600);
		}

		.spend-chart {
			position: sticky;
			top: var(--gok-space-section);
		}
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
