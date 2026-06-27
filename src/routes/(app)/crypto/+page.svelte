<script lang="ts">
	// V07 · Crypto holdings — the wallet home. A calm read of "what crypto do I hold,
	// what's it worth, how's it moving?": a total-value header with an aggregate day
	// move, the Buy / Send / Receive primaries, the balances as gok-card rows (each a
	// link into its asset detail), and the on-chain-style activity ledger.
	//
	// Brand discipline: the ONE earned accent is the primary Buy CTA. Direction (the
	// aggregate + per-asset day change) is carried by an icon + an explicit sign + a
	// status role on the number — never hue alone. Send/Receive are navigation into
	// the transfer surface (owned elsewhere); this page only links to those routes.
	import { goto } from '$app/navigation';
	import { crypto } from '$lib/state/crypto.svelte';
	import { formatUnits } from '$lib/data/crypto-data';
	import type { CryptoSymbol } from '$lib/crypto/address';
	import { formatMoney, formatPercent } from '$lib/format';
	import { on } from '$lib/wc.svelte';
	import CryptoTicket from '$lib/components/crypto/CryptoTicket.svelte';
	import CryptoActivityTable from '$lib/components/crypto/CryptoActivityTable.svelte';

	type Sign = 'pos' | 'neg' | 'flat';
	function signOf(n: number): Sign {
		return n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat';
	}

	// ── Portfolio reads (all derived fresh from the seed) ──
	const balances = $derived(crypto.balances);
	const totalValue = $derived(formatMoney(crypto.totalValueMinor, 'EUR'));
	const hasBalances = $derived(balances.length > 0);
	const activity = $derived(crypto.activity);

	// Aggregate day move = the sum of each holding's value move today, as a ratio of
	// the prior session's total value.
	const dayChangeMinor = $derived(balances.reduce((sum, p) => sum + p.dayChangeMinor, 0));
	const priorTotalMinor = $derived(crypto.totalValueMinor - dayChangeMinor);
	const dayRatio = $derived(priorTotalMinor !== 0 ? dayChangeMinor / priorTotalMinor : 0);
	const daySign = $derived(signOf(dayChangeMinor));

	// ── Buy → the ticket, seeded with the largest holding (or BTC when empty) ──
	let ticketOpen = $state(false);
	const buySymbol = $derived<CryptoSymbol>(balances[0]?.symbol ?? 'BTC');

	function buy() {
		crypto.openTrade(buySymbol, 'buy');
		ticketOpen = true;
	}
</script>

<svelte:head>
	<title>Crypto · gökberk bank</title>
</svelte:head>

{#snippet delta(sign: Sign, label: string)}
	<span class="delta gok-tabular-nums" data-sign={sign}>
		<span class="delta-icon" aria-hidden="true"
			>{sign === 'pos' ? '▲' : sign === 'neg' ? '▼' : '—'}</span
		>
		<span class="visually-hidden">{sign === 'pos' ? 'up' : sign === 'neg' ? 'down' : 'flat'}</span>
		{label}
	</span>
{/snippet}

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Crypto</p>
		<h1 class="head-title gok-headline-1 gok-tabular-nums">{totalValue}</h1>
		{#if hasBalances}
			<p class="head-delta">
				{@render delta(
					daySign,
					`${formatMoney(dayChangeMinor, 'EUR', { signDisplay: true })} (${formatPercent(dayRatio)})`
				)}
				<span class="head-window">today</span>
			</p>
		{/if}
		<p class="head-caption">Prices are indicative; crypto is volatile — I can lose money.</p>
	</header>

	<!-- Primaries: Buy opens the ticket (the one accent); Send/Receive navigate into
	     the transfer surface. -->
	<section class="actions" aria-label="Crypto actions">
		<gok-button variant="primary" {@attach on('click', buy)}>Buy</gok-button>
		<gok-button
			variant="secondary"
			{@attach on('click', () => goto('/crypto/transfer?mode=send'))}
		>
			Send
		</gok-button>
		<gok-button
			variant="secondary"
			{@attach on('click', () => goto('/crypto/transfer?mode=receive'))}
		>
			Receive
		</gok-button>
	</section>

	<!-- Balances -->
	<section class="block" aria-labelledby="balances-heading">
		<div class="block-head">
			<p class="block-eyebrow gok-eyebrow">Balances</p>
			<h2 id="balances-heading" class="block-title gok-headline-5">What I hold</h2>
		</div>

		{#if !hasBalances}
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No crypto yet</p>
				<p class="empty-body">When I buy my first, it shows up here with its value and day move.</p>
				<gok-button slot="actions" variant="primary" {@attach on('click', buy)}>
					Buy my first
				</gok-button>
			</gok-empty-state>
		{:else}
			<ul class="balances">
				{#each balances as p (p.symbol)}
					{@const sign = signOf(p.dayChangeBps)}
					<li>
						<a class="bal" href="/crypto/{p.symbol}">
							<span class="bal-id">
								<span class="bal-name">{p.name}</span>
								<span class="bal-symbol">{p.symbol}</span>
							</span>
							<span class="bal-units gok-tabular-nums">
								{formatUnits(p.symbol, p.units)}
								{p.symbol}
							</span>
							<span class="bal-price gok-tabular-nums">
								{formatMoney(p.lastPriceMinor, 'EUR')}
							</span>
							<span class="bal-day">
								{@render delta(sign, formatPercent(p.dayChangeBps / 10000))}
							</span>
							<span class="bal-value gok-tabular-nums">{formatMoney(p.valueMinor, 'EUR')}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Activity -->
	<section class="block" aria-labelledby="activity-heading">
		<div class="block-head">
			<p class="block-eyebrow gok-eyebrow">Activity</p>
			<h2 id="activity-heading" class="block-title gok-headline-5">On-chain ledger</h2>
		</div>
		<CryptoActivityTable rows={activity} label="My crypto activity" />
	</section>
</div>

<CryptoTicket symbol={buySymbol} bind:open={ticketOpen} />

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── Summary header ── */
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

	.head-delta {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
	}

	.head-window {
		font-size: var(--gok-type-body-small-size);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text-muted);
	}

	.head-caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Direction delta (rule + icon + sign; status role on the number) ── */
	.delta {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.delta[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	.delta[data-sign='neg'] {
		color: var(--gok-color-status-error);
	}

	.delta[data-sign='flat'] {
		color: var(--gok-color-text-muted);
	}

	.delta-icon {
		font-size: 0.7em;
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-300);
	}

	/* ── Blocks ── */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.block-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.block-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* ── Balances list ── */
	.balances {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.bal {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			'id value'
			'units day'
			'price day';
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
		padding: var(--gok-space-300) var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
		background: var(--gok-color-surface);
		text-decoration: none;
		color: inherit;
	}

	.bal:hover {
		background: var(--gok-color-surface-strong);
	}

	.bal:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	.bal-id {
		grid-area: id;
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	.bal-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bal-symbol {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		flex: none;
	}

	.bal-units {
		grid-area: units;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.bal-price {
		grid-area: price;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.bal-value {
		grid-area: value;
		justify-self: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.bal-day {
		grid-area: day;
		justify-self: end;
		align-self: center;
		font-size: var(--gok-type-body-small-size);
	}

	/* ── Empty ── */
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		max-inline-size: 40ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}

	/* ── Desktop: a single dense row per balance ── */
	@media (min-width: 40rem) {
		.bal {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto minmax(0, 1fr);
			grid-template-areas: 'id units price day value';
			align-items: center;
			gap: var(--gok-space-400);
		}

		.bal-units,
		.bal-price {
			text-align: end;
		}

		.bal-day {
			align-self: center;
		}
	}
</style>
