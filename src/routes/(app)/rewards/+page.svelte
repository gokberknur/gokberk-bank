<script lang="ts">
	// M02 · The rewards hub — a calm, honest loyalty layer, not a gamified coupon
	// wall. Four quiet blocks: a balance ledger (cashback available is the hero;
	// pending reads lighter; points alongside), a flat `gok-card` grid of merchant
	// offers, and an earn/redeem history `gok-table`. One earned accent on the whole
	// surface: the primary Redeem button (plus the single featured offer's 2px rule).
	// No confetti, no hype — restraint over noise.
	//
	// The redeem flow is the one real money move: a `gok-drawer` that rides the
	// money spine (gather → review → forced-decision confirm → success), hosted here
	// and seeded by `rewards.openRedeem()`. Web-component interop is strictly
	// `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* element; the
	// history table's `columns`/`rows` are handed in as DOM properties.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatNumber, formatDayMonth } from '$lib/format';
	import { rewards } from '$lib/state/rewards.svelte';
	import OfferCard from '$lib/components/money/OfferCard.svelte';
	import RedeemFlow from '$lib/components/money/RedeemFlow.svelte';

	const balance = $derived(rewards.balance);
	const offers = $derived(rewards.offers);
	const canRedeem = $derived(balance.cashbackBalanceMinor > 0);

	// ── Redeem drawer ──
	let redeemOpen = $state(false);

	function openRedeem() {
		if (!canRedeem) return;
		redeemOpen = true;
	}

	// ── History table: cells are formatted STRINGS only (a gok-table limit), so
	// status reads as the word "Pending"/"Settled" rather than an embedded tag —
	// status by rule + word, the same idiom as the transactions ledger. ──
	type Column = { key: string; label: string; numeric?: boolean; primary?: boolean; width?: string };

	const columns: Column[] = [
		{ key: 'date', label: 'Date', width: '6.5rem' },
		{ key: 'source', label: 'Source', primary: true },
		{ key: 'type', label: 'Type', width: '7rem' },
		{ key: 'amount', label: 'Amount', numeric: true, width: '8.5rem' },
		{ key: 'status', label: 'Status', width: '7rem' }
	];

	const historyRows = $derived(
		rewards.history.map((h) => ({
			id: h.id,
			date: formatDayMonth(h.date),
			source: h.source,
			type: h.kind === 'earned' ? 'Earned' : 'Redeemed',
			amount:
				h.amountMinor != null
					? formatMoney(h.amountMinor, 'EUR')
					: h.points != null
						? `${formatNumber(h.points)} pts`
						: '—',
			status: h.status === 'pending' ? 'Pending' : 'Settled'
		}))
	);

	const getRowId = (r: { id: string }) => r.id;
</script>

<svelte:head>
	<title>Rewards · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Rewards</p>
		<h1 class="head-title gok-headline-2">My rewards</h1>
	</header>

	<!-- Balance ledger — cashback available is the hero; pending lighter; points. -->
	<section aria-labelledby="balance-heading">
		<h2 id="balance-heading" class="sr-only">My cashback</h2>
		<gok-card class="balance">
			<div class="balance-grid">
				<div class="balance-hero">
					<p class="balance-key gok-eyebrow">Cashback available</p>
					<p class="balance-figure gok-tabular-nums" aria-live="polite">
						{formatMoney(balance.cashbackBalanceMinor, 'EUR')}
					</p>
					{#if balance.pendingCashbackMinor > 0}
						<p class="balance-pending gok-tabular-nums">
							{formatMoney(balance.pendingCashbackMinor, 'EUR')} pending
						</p>
					{/if}
				</div>

				<div class="balance-points">
					<p class="balance-key gok-eyebrow">Points</p>
					<p class="balance-points-figure gok-tabular-nums">
						{formatNumber(balance.pointsBalance)}
					</p>
				</div>
			</div>

			<div class="balance-action">
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !canRedeem })}
					{@attach on('click', openRedeem)}
				>
					Redeem cashback
				</gok-button>
				{#if !canRedeem}
					<p class="balance-note">Earn cashback on an activated offer to redeem it here.</p>
				{/if}
			</div>
		</gok-card>
	</section>

	<!-- Offers grid — flat hairline cards; one featured offer earns a 2px accent rule. -->
	<section class="block" aria-labelledby="offers-heading">
		<h2 id="offers-heading" class="block-title gok-headline-4">Offers</h2>

		{#if offers.length === 0}
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No offers right now</p>
				<p class="empty-body">When new offers land, they show up here to activate.</p>
			</gok-empty-state>
		{:else}
			<ul class="offers" role="list">
				{#each offers as offer (offer.id)}
					<li class="offer-cell">
						<OfferCard {offer} />
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- History — earned + redeemed, newest first; status by rule + word. -->
	<section class="block" aria-labelledby="history-heading">
		<h2 id="history-heading" class="block-title gok-headline-4">History</h2>

		{#if historyRows.length === 0}
			<gok-empty-state>
				<p class="empty-title gok-headline-6">Nothing earned yet</p>
				<p class="empty-body">Activate an offer and your cashback and points will appear here.</p>
			</gok-empty-state>
		{:else}
			<gok-table
				accessible-label="Rewards history"
				{@attach setProps({ columns, rows: historyRows, getRowId })}
			></gok-table>
		{/if}
	</section>
</div>

<!-- The redeem flow: a right-side drawer riding the money spine, seeded on open. -->
<RedeemFlow bind:open={redeemOpen} />

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

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	/* --- Balance ledger --- */
	.balance {
		display: block;
	}

	.balance-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.balance-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.balance-figure {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-2-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		color: var(--gok-color-text);
	}

	/* Pending reads lighter than the settled available figure. */
	.balance-pending {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.balance-points {
		text-align: end;
	}

	.balance-points-figure {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		color: var(--gok-color-text);
	}

	.balance-action {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200) var(--gok-space-300);
		margin-block-start: var(--gok-space-400);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.balance-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Shared block chrome --- */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* --- Offers grid --- */
	.offers {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.offer-cell {
		display: flex;
	}

	.offer-cell :global(gok-card) {
		inline-size: 100%;
	}

	/* --- Empty states --- */
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
</style>
