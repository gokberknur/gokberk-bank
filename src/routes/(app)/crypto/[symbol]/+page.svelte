<script lang="ts">
	// V07 · Crypto asset detail — the deep read for one asset, modelled on the V02
	// instrument page: a ranged price chart, key facts, my position (when held), and
	// a persistent Buy / Sell / Send / Receive action bar. Buy/Sell open the V07
	// ticket; Send/Receive navigate into the transfer surface (owned elsewhere).
	//
	// Brand discipline: the ONE earned accent is the primary Buy CTA + the active
	// range segment. Day change + P&L direction is carried by an icon + an explicit
	// sign + a status role on the number — never hue alone.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { crypto } from '$lib/state/crypto.svelte';
	import { formatUnits } from '$lib/data/crypto-data';
	import type { CryptoSymbol } from '$lib/crypto/address';
	import { INSTRUMENTS, priceHistory, rangeDays, RANGES, type Range } from '$lib/data/market';
	import { formatMoney, formatPercent } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import { PriceChart } from '$lib/charts';
	import CryptoTicket from '$lib/components/crypto/CryptoTicket.svelte';
	import StickyActionBar from '$lib/components/layout/StickyActionBar.svelte';
	// V14 · live market-data overlay (ADR-006). The adapter calls NEVER throw — they
	// return the seed on any error/offline — so the seed path is automatic and the
	// page degrades silently. `candles` is aliased to avoid the local `candles` const.
	import { quote, candles as fetchCandles } from '$lib/market/adapter';
	import type { Quote, CandleResult } from '$lib/market/types';
	import { labelFor } from '$lib/market/labels';
	import IndicativeTag from '$lib/components/invest/IndicativeTag.svelte';

	type Sign = 'pos' | 'neg' | 'flat';
	function signOf(n: number): Sign {
		return n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat';
	}

	// ── The asset + its market record (deterministic from the seed) ──
	const symbol = $derived((page.params.symbol ?? '') as CryptoSymbol);
	const asset = $derived(crypto.asset(symbol));
	const inst = $derived(INSTRUMENTS.find((i) => i.symbol === symbol && i.type === 'crypto'));

	// Prices are quoted in EUR minor units (cents); the chart reads MAJOR units, so
	// the page owns the minor → major conversion (÷100) and the scale formatter.
	const MINOR_PER_MAJOR = 100;

	// ── Live overlay (V14 · ADR-006) ──────────────────────────────────────────
	// The seed above is the system of record and paints synchronously; live data
	// hydrates AFTER mount (via the effects further down, once `range` exists) and
	// merely overlays it. These start null; on any miss the adapter returns a `seed`
	// provenance, so the derivations below transparently fall back to the seed asset.
	let liveQuote = $state<Quote | null>(null);
	let liveCandles = $state<CandleResult | null>(null);

	// Prefer the adapter's figure ONLY when it actually went live/delayed; a `seed`
	// provenance (USDC, offline, unknown pair, still hydrating) uses the seed asset.
	const lastPriceMinor = $derived(
		liveQuote && liveQuote.source !== 'seed'
			? liveQuote.lastPriceMinor
			: (asset?.lastPriceMinor ?? 0)
	);
	const priorCloseMinor = $derived(
		liveQuote && liveQuote.source !== 'seed'
			? liveQuote.priorCloseMinor
			: (asset?.priorCloseMinor ?? 0)
	);
	// The one shared indicative affordance — shown only on the live/delayed path.
	const priceLabel = $derived(labelFor(liveQuote?.source ?? 'seed', liveQuote?.asOf ?? null));

	// ── Day change (rule + sign + icon + status role on the number) ──
	// Derived from the live-preferred price/close, so the header + key-facts day
	// change track live when available and fall back to the seed otherwise.
	const priceDeltaMinor = $derived(lastPriceMinor - priorCloseMinor);
	const dayBps = $derived(
		priorCloseMinor > 0 ? Math.round((priceDeltaMinor / priorCloseMinor) * 10000) : 0
	);
	const daySign = $derived(signOf(dayBps));

	// ── My position (valued at the live-preferred price) ──
	const heldUnits = $derived(crypto.balanceUnits(symbol));
	const positionValueMinor = $derived(Math.round(heldUnits * lastPriceMinor));
	const positionDayMinor = $derived(Math.round(heldUnits * priceDeltaMinor));

	// ── Chart range (the active segment is the earned accent) ──
	let range = $state<Range>('1M');

	// Prefer the live candle series when the adapter served one; else the seed
	// history. Both share the seed `Candle` shape (minor units) → the same ÷100
	// major-unit mapping the chart wants, so only the source array differs.
	const candles = $derived(
		(liveCandles && liveCandles.source !== 'seed'
			? liveCandles.candles
			: priceHistory(symbol, rangeDays(range))
		).map((c) => ({
			time: c.time,
			open: c.openMinor / MINOR_PER_MAJOR,
			high: c.highMinor / MINOR_PER_MAJOR,
			low: c.lowMinor / MINOR_PER_MAJOR,
			close: c.closeMinor / MINOR_PER_MAJOR
		}))
	);
	const chartLabel = $derived(
		asset
			? `${asset.name} ${range} price — last ${formatMoney(lastPriceMinor, 'EUR')}.`
			: 'Price chart'
	);
	const formatScale = (v: number) => formatMoney(Math.round(v * MINOR_PER_MAJOR), 'EUR');

	function onRange(e: Event) {
		range = (e as CustomEvent<{ value: string }>).detail.value as Range;
	}

	// ── Live fetches — one-shot per key, stale-guarded ────────────────────────
	// Quote hydrates on symbol change. Reset to null first so a superseded asset's
	// price never lingers; the `cancelled` flag drops a response that resolves after
	// this effect was torn down or re-keyed (e.g. navigating to another asset), so a
	// stale quote never lands on the wrong page.
	$effect(() => {
		const sym = symbol;
		liveQuote = null;
		let cancelled = false;
		quote(sym).then((q) => {
			if (!cancelled) liveQuote = q;
		});
		return () => {
			cancelled = true;
		};
	});

	// Candles hydrate on symbol OR range change. Same guard; reset to null so a stale
	// series never renders for the wrong asset/range while the new one is in flight.
	$effect(() => {
		const sym = symbol;
		const rng = range;
		liveCandles = null;
		let cancelled = false;
		fetchCandles(sym, rng).then((c) => {
			if (!cancelled) liveCandles = c;
		});
		return () => {
			cancelled = true;
		};
	});

	// 52-week range, from the (chart) history extremes — a deterministic read.
	const yearLow = $derived(Math.min(...priceHistory(symbol, 365).map((c) => c.lowMinor)));
	const yearHigh = $derived(Math.max(...priceHistory(symbol, 365).map((c) => c.highMinor)));

	// Compact EUR for the (large, indicative) market cap, e.g. "€1.32T".
	const compactEur = new Intl.NumberFormat('en-IE', {
		style: 'currency',
		currency: 'EUR',
		notation: 'compact',
		maximumFractionDigits: 2
	});

	// ── Buy / Sell → the ticket; Send / Receive → the transfer surface ──
	let ticketOpen = $state(false);
	function trade(side: 'buy' | 'sell') {
		crypto.openTrade(symbol, side);
		ticketOpen = true;
	}
</script>

<svelte:head>
	<title>{asset ? `${asset.name} (${symbol})` : 'Crypto asset'} · gökberk bank</title>
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

{#snippet stat(term: string, value: string)}
	<div class="stat">
		<dt class="stat-term">{term}</dt>
		<dd class="stat-value gok-tabular-nums">{value}</dd>
	</div>
{/snippet}

{#if !asset}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Asset not found</p>
			<p class="missing-body">
				There's no crypto asset with the symbol “{symbol}” in my wallet.
			</p>
			<gok-link slot="actions" href="/crypto">Back to crypto</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/crypto">&larr; Crypto</gok-link>

			<div class="head-main">
				<div class="head-id">
					<p class="head-eyebrow gok-eyebrow">{asset.networks.join(' · ')} · {symbol}</p>
					<h1 class="head-name gok-headline-3">{asset.name}</h1>
				</div>

				<div class="head-price">
					<p class="price gok-headline-4 gok-tabular-nums">
						{formatMoney(lastPriceMinor, 'EUR')}
					</p>
					<p class="price-change">
						{@render delta(
							daySign,
							`${formatPercent(dayBps / 10000)} · ${formatMoney(priceDeltaMinor, 'EUR', { signDisplay: true })}`
						)}
						<span class="price-window">today</span>
					</p>
					{#if priceLabel.show}
						<IndicativeTag label={priceLabel.text} detail={priceLabel.detail} />
					{/if}
				</div>
			</div>

			<p class="caption">Prices are indicative; crypto is volatile — I can lose money.</p>
		</header>

		<!-- Persistent Buy / Sell / Send / Receive. The primary Buy is the one accent. -->
		<StickyActionBar label="Trade {symbol}">
			{#snippet context()}
				<span class="cta-symbol gok-tabular-nums">{symbol}</span>
				<span class="cta-price gok-tabular-nums">{formatMoney(lastPriceMinor, 'EUR')}</span>
			{/snippet}
			{#snippet actions()}
				<gok-button variant="primary" {@attach on('click', () => trade('buy'))}>Buy</gok-button>
				<gok-button variant="secondary" {@attach on('click', () => trade('sell'))}>Sell</gok-button>
				<gok-button
					variant="secondary"
					{@attach on('click', () => goto(`/crypto/transfer?symbol=${symbol}&mode=send`))}
				>
					Send
				</gok-button>
				<gok-button
					variant="secondary"
					{@attach on('click', () => goto(`/crypto/transfer?symbol=${symbol}&mode=receive`))}
				>
					Receive
				</gok-button>
			{/snippet}
		</StickyActionBar>

		<!-- Price chart -->
		<section class="block" aria-labelledby="chart-heading">
			<div class="block-head chart-head">
				<div>
					<p class="block-eyebrow gok-eyebrow">Price</p>
					<h2 id="chart-heading" class="block-title gok-headline-5">Price history</h2>
				</div>
				<gok-segmented
					label="Range"
					size="s"
					{@attach setProps({ value: range })}
					{@attach on('change', onRange)}
				>
					{#each RANGES as r (r)}
						<gok-segmented-item value={r}>{r}</gok-segmented-item>
					{/each}
				</gok-segmented>
			</div>

			<PriceChart {candles} kind="line" height="22rem" label={chartLabel} formatValue={formatScale} />
		</section>

		<!-- Key facts -->
		<section class="block" aria-labelledby="facts-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">Fundamentals</p>
				<h2 id="facts-heading" class="block-title gok-headline-5">Key facts</h2>
			</div>
			<gok-card>
				<dl class="stats">
					{@render stat('Last price', formatMoney(lastPriceMinor, 'EUR'))}
					<div class="stat">
						<dt class="stat-term">Day change</dt>
						<dd class="stat-value">
							{@render delta(daySign, formatPercent(dayBps / 10000))}
						</dd>
					</div>
					{@render stat(
						'52-week range',
						`${formatMoney(yearLow, 'EUR')} – ${formatMoney(yearHigh, 'EUR')}`
					)}
					{@render stat(
						'Market cap',
						inst ? compactEur.format(inst.marketCapEurMinor / 100) : '—'
					)}
					{@render stat('Networks', asset.networks.join(', '))}
				</dl>
			</gok-card>
		</section>

		<!-- My position -->
		<section class="block" aria-labelledby="position-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">Holding</p>
				<h2 id="position-heading" class="block-title gok-headline-5">My position</h2>
			</div>
			<gok-card>
				{#if heldUnits > 0}
					<dl class="stats">
						{@render stat('Amount', `${formatUnits(symbol, heldUnits)} ${symbol}`)}
						{@render stat('Value', formatMoney(positionValueMinor, 'EUR'))}
						<div class="stat">
							<dt class="stat-term">Today</dt>
							<dd class="stat-value">
								{@render delta(
									signOf(positionDayMinor),
									formatMoney(positionDayMinor, 'EUR', { signDisplay: true })
								)}
							</dd>
						</div>
					</dl>
				{:else}
					<p class="no-position">
						I don't hold any {symbol} yet. Buy makes my first {asset.name} position.
					</p>
				{/if}
			</gok-card>
		</section>
	</div>

	<CryptoTicket {symbol} bind:open={ticketOpen} />
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* --- Not found --- */
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

	/* --- Header --- */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		/* Trim the sparse header→content gap to the standard ~32px (CRY-U-02). */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.head-main {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-name {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.head-price {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
	}

	.price {
		margin: 0;
		color: var(--gok-color-text);
	}

	.price-change {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
	}

	.price-window {
		color: var(--gok-color-text-muted);
	}

	.caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Status delta (icon + sign + status role on the number) --- */
	.delta {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.delta-icon {
		font-size: 0.8em;
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

	/* --- Sticky Buy / Sell bar context spans --- */
	.cta-symbol {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.cta-price {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	/* --- Content blocks --- */
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

	.chart-head {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	/* --- Key/value ledger grid --- */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
		gap: var(--gok-space-400) var(--gok-space-500);
		margin: 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.stat-term {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.stat-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.no-position {
		margin: 0;
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

	/* --- Mobile (390px): keep the sticky CTA above the bottom tab bar --- */
	@media (max-width: 39.999rem) {
		.head-main {
			align-items: flex-start;
		}

		.head-price {
			align-items: flex-start;
		}
	}
</style>
