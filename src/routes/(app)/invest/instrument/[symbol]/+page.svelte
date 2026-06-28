<script lang="ts">
	// V02 · Instrument detail — the deep-read research surface for one instrument.
	// A price chart (candlestick/line, range tabs), key statistics, an about blurb,
	// the held position (when held), and a hairline strip of related names — all
	// anchored by a persistent Buy / Sell CTA that opens the V03 order ticket.
	//
	// Brand discipline: the ONE earned accent is the primary Buy CTA + the active
	// range/type segment. Direction (day change, candles, P&L) is carried by an
	// icon + an explicit sign + a status role on the number — never hue alone.
	//
	// V02 deferreds (not this slice): the depth / order-book ladder, the news feed,
	// and the dividend-history table. Header, chart, stats, about, position, and
	// related ship now; the rest land in a later pass.
	import { page } from '$app/state';
	import { invest } from '$lib/state/invest.svelte';
	import { dayChangeBps } from '$lib/data/portfolio';
	import {
		priceHistory,
		rangeDays,
		isMarketOpen,
		RANGES,
		INSTRUMENTS,
		type Range
	} from '$lib/data/market';
	import { DECIMALS } from '$lib/data/money';
	import { formatMoney, formatNumber, formatPercent } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import { PriceChart } from '$lib/charts';
	import OrderTicket from '$lib/components/invest/OrderTicket.svelte';
	import StickyActionBar from '$lib/components/layout/StickyActionBar.svelte';

	// ── The instrument + its held position (both deterministic from the seed) ──
	const symbol = $derived(page.params.symbol ?? '');
	const inst = $derived(invest.instrument(symbol));
	const position = $derived(invest.position(symbol));
	const currency = $derived(inst?.currency ?? 'EUR');
	// Minor → major divisor for THIS instrument's currency (all 2-decimal here, but
	// derived for honesty rather than hardcoded).
	const minorPerMajor = $derived(10 ** DECIMALS[currency]);

	// ── Day change (rule + sign + icon + status role on the number) ──
	const dayBps = $derived(inst ? dayChangeBps(inst) : 0);
	const priceDeltaMinor = $derived(inst ? inst.lastPriceMinor - inst.priorCloseMinor : 0);
	const dayDir = $derived<Direction>(dayBps > 0 ? 'up' : dayBps < 0 ? 'down' : 'flat');

	type Direction = 'up' | 'down' | 'flat';

	// ── Chart controls (both local $state; the active segment is the earned accent) ──
	let chartKind = $state<'candlestick' | 'line'>('candlestick');
	let range = $state<Range>('1M');

	// The candle series for the selected range, converted minor → MAJOR units for
	// the chart (it reads major; the page owns the conversion + the scale formatter).
	const candles = $derived(
		priceHistory(symbol, rangeDays(range)).map((c) => ({
			time: c.time,
			open: c.openMinor / minorPerMajor,
			high: c.highMinor / minorPerMajor,
			low: c.lowMinor / minorPerMajor,
			close: c.closeMinor / minorPerMajor
		}))
	);
	const chartLabel = $derived(
		inst
			? `${inst.name} ${range} ${chartKind} price — last ${formatMoney(inst.lastPriceMinor, currency)}.`
			: 'Price chart'
	);
	const formatScale = (v: number) => formatMoney(Math.round(v * minorPerMajor), currency);

	const marketOpen = isMarketOpen();

	function onKind(e: Event) {
		const v = (e.target as HTMLElement & { value: string }).value;
		chartKind = v === 'line' ? 'line' : 'candlestick';
	}
	function onRange(e: Event) {
		range = (e.target as HTMLElement & { value: string }).value as Range;
	}

	// ── Today's session range (low/high), independent of the chart range ──
	const todayCandle = $derived(priceHistory(symbol, 2).at(-1));
	const dayLowMinor = $derived(todayCandle?.lowMinor ?? inst?.priorCloseMinor ?? 0);
	const dayHighMinor = $derived(todayCandle?.highMinor ?? inst?.lastPriceMinor ?? 0);

	// ── Key statistics (each value tabular; "—" when not applicable) ──
	// Compact EUR for the (large, indicative) market cap, e.g. "€3.62T".
	const compactEur = new Intl.NumberFormat('en-IE', {
		style: 'currency',
		currency: 'EUR',
		notation: 'compact',
		maximumFractionDigits: 2
	});
	function compactMarketCap(minor: number): string {
		return compactEur.format(minor / 100);
	}

	// ── Related: same sector first, then fill from the rest of the universe ──
	const related = $derived.by(() => {
		if (!inst) return [];
		const sameSector = INSTRUMENTS.filter((i) => i.symbol !== symbol && i.sector === inst.sector);
		const others = INSTRUMENTS.filter((i) => i.symbol !== symbol && i.sector !== inst.sector);
		return [...sameSector, ...others].slice(0, 4);
	});

	// ── Buy / Sell → the V03 order ticket ──
	let ticketOpen = $state(false);
	function trade(side: 'buy' | 'sell') {
		invest.openTicket(symbol, side);
		ticketOpen = true;
	}
</script>

<svelte:head>
	<title>{inst ? `${inst.name} (${symbol})` : 'Instrument'} · gökberk bank</title>
</svelte:head>

{#snippet delta(dir: Direction, label: string)}
	<span class="delta delta-{dir} gok-tabular-nums">
		<span class="delta-icon" aria-hidden="true">{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'}</span>
		{label}
	</span>
{/snippet}

{#snippet stat(term: string, value: string)}
	<div class="stat">
		<dt class="stat-term">{term}</dt>
		<dd class="stat-value gok-tabular-nums">{value}</dd>
	</div>
{/snippet}

{#if !inst}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Instrument not found</p>
			<p class="missing-body">
				There's no instrument with the symbol “{symbol}”, or it isn't in this universe.
			</p>
			<gok-link slot="actions" href="/invest">Back to investing</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/invest">&larr; Investing</gok-link>

			<div class="head-main">
				<div class="head-id">
					<p class="head-eyebrow gok-eyebrow">{inst.exchange} · {symbol}</p>
					<h1 class="head-name gok-headline-3">{inst.name}</h1>
				</div>

				<div class="head-price">
					<p class="price gok-headline-4 gok-tabular-nums">
						{formatMoney(inst.lastPriceMinor, currency)}
					</p>
					<p class="price-change">
						{@render delta(
							dayDir,
							`${formatPercent(dayBps / 10000)} · ${formatMoney(priceDeltaMinor, currency, { signDisplay: true })}`
						)}
						<span class="price-window">today</span>
					</p>
				</div>
			</div>

			<div class="head-meta">
				<gok-tag size="s" readonly>{currency}</gok-tag>
				<gok-tag size="s" readonly>{inst.type === 'etf' ? 'ETF' : inst.type === 'crypto' ? 'Crypto' : 'Stock'}</gok-tag>
				<p class="caption">Prices indicative. Past performance doesn't predict future returns.</p>
			</div>
		</header>

		<!-- Persistent Buy / Sell — sticky so it stays reachable down the long page.
		     The primary Buy is the page's single earned accent. -->
		<StickyActionBar label="Trade {symbol}">
			{#snippet context()}
				<span class="cta-symbol gok-tabular-nums">{symbol}</span>
				<span class="cta-price gok-tabular-nums">{formatMoney(inst.lastPriceMinor, currency)}</span>
			{/snippet}
			{#snippet actions()}
				<gok-button variant="primary" {@attach on('click', () => trade('buy'))}>Buy</gok-button>
				<gok-button variant="secondary" {@attach on('click', () => trade('sell'))}>Sell</gok-button>
			{/snippet}
		</StickyActionBar>

		<!-- Price chart -->
		<section class="block" aria-labelledby="chart-heading">
			<div class="block-head chart-head">
				<div>
					<p class="block-eyebrow gok-eyebrow">Price</p>
					<h2 id="chart-heading" class="block-title gok-headline-5">Price history</h2>
				</div>
				<div class="chart-controls">
					<gok-segmented
						label="Chart type"
						size="s"
						{@attach setProps({ value: chartKind })}
						{@attach on('change', onKind)}
					>
						<gok-segmented-item value="candlestick">Candlestick</gok-segmented-item>
						<gok-segmented-item value="line">Line</gok-segmented-item>
					</gok-segmented>
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
			</div>

			{#if !marketOpen}
				<p class="market-note">Market closed — showing the last close.</p>
			{/if}

			<PriceChart {candles} kind={chartKind} height="22rem" label={chartLabel} formatValue={formatScale} />
		</section>

		<!-- Key statistics -->
		<section class="block" aria-labelledby="stats-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">Fundamentals</p>
				<h2 id="stats-heading" class="block-title gok-headline-5">Key statistics</h2>
			</div>
			<gok-card>
				<dl class="stats">
					{@render stat('P/E ratio', inst.peRatioX100 !== null ? formatNumber(inst.peRatioX100 / 100) : '—')}
					{@render stat('Market cap', compactMarketCap(inst.marketCapEurMinor))}
					{@render stat(
						'Dividend yield',
						inst.dividendYieldBps > 0 ? `${formatNumber(inst.dividendYieldBps / 100)}%` : '—'
					)}
					{@render stat(
						'52-week range',
						`${formatMoney(inst.low52wMinor, currency)} – ${formatMoney(inst.high52wMinor, currency)}`
					)}
					{@render stat('Beta', inst.betaX100 !== null ? formatNumber(inst.betaX100 / 100) : '—')}
					{@render stat(
						'Day range',
						`${formatMoney(dayLowMinor, currency)} – ${formatMoney(dayHighMinor, currency)}`
					)}
				</dl>
			</gok-card>
		</section>

		<!-- About -->
		<section class="block" aria-labelledby="about-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">About</p>
				<h2 id="about-heading" class="block-title gok-headline-5">{inst.name}</h2>
			</div>
			<p class="about-body">{inst.about}</p>
			<div class="about-tags">
				<gok-tag size="s" readonly>{inst.sector}</gok-tag>
				<gok-tag size="s" readonly>{inst.region}</gok-tag>
			</div>
		</section>

		<!-- My position (only when held) -->
		{#if position}
			<section class="block" aria-labelledby="position-heading">
				<div class="block-head">
					<p class="block-eyebrow gok-eyebrow">Holding</p>
					<h2 id="position-heading" class="block-title gok-headline-5">My position</h2>
				</div>
				<gok-card>
					<dl class="stats">
						{@render stat('Quantity', formatNumber(position.quantity))}
						{@render stat('Average cost', formatMoney(position.avgCostMinor, currency))}
						{@render stat('Market value', formatMoney(position.marketValueEurMinor, 'EUR'))}
						<div class="stat">
							<dt class="stat-term">Unrealised P&amp;L</dt>
							<dd class="stat-value">
								{@render delta(
									position.unrealizedPlEurMinor > 0
										? 'up'
										: position.unrealizedPlEurMinor < 0
											? 'down'
											: 'flat',
									formatMoney(position.unrealizedPlEurMinor, 'EUR', { signDisplay: true })
								)}
							</dd>
						</div>
					</dl>
				</gok-card>
			</section>
		{/if}

		<!-- Related (a quiet hairline strip → each instrument's own detail page) -->
		{#if related.length > 0}
			<section class="block" aria-labelledby="related-heading">
				<div class="block-head">
					<p class="block-eyebrow gok-eyebrow">More to explore</p>
					<h2 id="related-heading" class="block-title gok-headline-5">Related instruments</h2>
				</div>
				<ul class="related">
					{#each related as r (r.symbol)}
						{@const rBps = dayChangeBps(r)}
						<li class="related-row">
							<a class="related-link" href="/invest/instrument/{r.symbol}">
								<span class="related-id">
									<span class="related-symbol gok-tabular-nums">{r.symbol}</span>
									<span class="related-name">{r.name}</span>
								</span>
								<span class="related-figures">
									<span class="related-price gok-tabular-nums">
										{formatMoney(r.lastPriceMinor, r.currency)}
									</span>
									{@render delta(
										rBps > 0 ? 'up' : rBps < 0 ? 'down' : 'flat',
										formatPercent(rBps / 10000)
									)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<OrderTicket {symbol} bind:open={ticketOpen} />
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

	.head-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.caption {
		margin: 0;
		flex: 1 1 14rem;
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
		font-variant-numeric: tabular-nums;
	}

	.delta-icon {
		font-size: 0.8em;
	}

	.delta-up {
		color: var(--gok-color-status-success);
	}

	.delta-down {
		color: var(--gok-color-status-error);
	}

	.delta-flat {
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

	.chart-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.market-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
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

	/* --- About --- */
	.about-body {
		margin: 0;
		max-inline-size: 60ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.about-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	/* --- Related strip --- */
	.related {
		list-style: none;
		margin: 0;
		padding: 0;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.related-row {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.related-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		text-decoration: none;
		color: inherit;
	}

	.related-link:hover .related-name,
	.related-link:hover .related-symbol {
		color: var(--gok-color-link);
	}

	.related-link:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
		border-radius: var(--gok-radius-s);
	}

	.related-id {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.related-symbol {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.related-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.related-figures {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		flex: none;
	}

	.related-price {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
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
