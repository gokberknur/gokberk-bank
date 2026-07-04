<script lang="ts">
	// V02/V09 · Instrument detail — the deep-read research surface for one instrument.
	// A price chart (candlestick/line, range tabs), a Fundamentals section (the key-stats
	// ledger + the type-branched fundamentals), the news strip, a simulated depth ladder,
	// dividend history, an about blurb, the held position (when held), and a hairline strip
	// of related names — all anchored by a persistent Buy / Sell CTA that opens the V03
	// order ticket, and made navigable by an in-page jump-nav (CV-LAY-6).
	//
	// Brand discipline: the ONE earned accent is the primary Buy CTA + the active
	// range/type segment. Direction (day change, candles, P&L) is carried by an
	// icon + an explicit sign + a status role on the number — never hue alone.
	//
	// V08 Phase A wraps the research content in an Overview / Fundamentals gok-tabs sub-nav
	// with ?tab= URL sync (deep-linkable, back-button clean); the sticky Buy/Sell CTA lives
	// above the tabs so it survives both. The V11 "Set alert" affordance (needs F13) and the
	// V14 live-price overlay are still deferred.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
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
	import { overlayLines } from '$lib/charts/indicator-series';
	import { chartPrefs } from '$lib/invest/chart-prefs.svelte';
	import OrderTicket from '$lib/components/invest/OrderTicket.svelte';
	import StickyActionBar from '$lib/components/layout/StickyActionBar.svelte';
	import NewsStrip from '$lib/components/invest/NewsStrip.svelte';
	import Fundamentals from '$lib/components/invest/Fundamentals.svelte';
	import DepthLadder from '$lib/components/invest/DepthLadder.svelte';
	import DividendHistory from '$lib/components/invest/DividendHistory.svelte';
	import ChartDataTable from '$lib/components/invest/ChartDataTable.svelte';
	import IndicatorMenu from '$lib/components/invest/IndicatorMenu.svelte';
	import { getNews } from '$lib/invest/news';

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

	// One price-history read for the selected range (raw minor-unit candles WITH volume) feeds BOTH
	// consumers: the chart's major-unit series below, and the "View data" fallback table (raw minor).
	const rawCandles = $derived(priceHistory(symbol, rangeDays(range)));

	// The candle series for the chart, converted minor → MAJOR units (it reads major; the page owns
	// the conversion + the scale formatter). Mapped from rawCandles — same shape PriceChart expects.
	const candles = $derived(
		rawCandles.map((c) => ({
			time: c.time,
			open: c.openMinor / minorPerMajor,
			high: c.highMinor / minorPerMajor,
			low: c.lowMinor / minorPerMajor,
			close: c.closeMinor / minorPerMajor,
			volume: c.volume
		}))
	);
	const chartLabel = $derived(
		inst
			? `${inst.name} ${range} ${chartKind} price — last ${formatMoney(inst.lastPriceMinor, currency)}.`
			: 'Price chart'
	);
	const formatScale = (v: number) => formatMoney(Math.round(v * minorPerMajor), currency);

	// ── Technical indicators (V08 Phase C) — ONE derivation feeds BOTH consumers so a chart line can
	//    never disagree with its table column. `indicatorLines` is the active set turned into plottable
	//    lines (minor units); the chart gets them as major-unit overlays (null points dropped), the
	//    "View data" table gets them raw as `lines`. Reacts to chartPrefs.active (the persisted set). ──
	const closesMinor = $derived(rawCandles.map((c) => c.closeMinor));
	const indicatorLines = $derived(overlayLines(closesMinor, chartPrefs.active));
	// Overlay line data for the chart, in MAJOR units, null points filtered out.
	const overlays = $derived(
		indicatorLines.map((l) => ({
			id: l.id,
			dash: l.dash,
			inkStep: l.inkStep,
			data: rawCandles
				.map((c, i) => ({ time: c.time, value: l.valuesMinor[i] }))
				.filter((p) => p.value !== null)
				.map((p) => ({ time: p.time, value: (p.value as number) / minorPerMajor }))
		}))
	);

	const marketOpen = isMarketOpen();

	function onKind(e: Event) {
		const v = (e as CustomEvent<{ value: string }>).detail.value;
		chartKind = v === 'line' ? 'line' : 'candlestick';
	}
	function onRange(e: Event) {
		range = (e as CustomEvent<{ value: string }>).detail.value as Range;
	}

	// ── Overview / Fundamentals tab-rail, synced to the URL (V09) ──
	// Active tab from the URL (?tab=fundamentals), defaulting to Overview. Deep-links + back-button clean.
	const activeTab = $derived(
		page.url.searchParams.get('tab') === 'fundamentals' ? 'fundamentals' : 'overview'
	);

	function selectTab(e: Event) {
		// gok-tabs dispatches a PLAIN Event on itself (no detail) — the newly selected tab is
		// its own `value`, read off currentTarget. The chart-type/range gok-segmented also fire
		// `change` that bubbles up to this same listener; `e.target !== e.currentTarget` filters
		// those out (their target is the segmented, not the tabs), so a range switch never navigates.
		if (e.target !== e.currentTarget) return;
		const value = (e.currentTarget as HTMLElement & { value?: string }).value;
		if (value !== 'overview' && value !== 'fundamentals') return;
		if (value === activeTab) return; // no redundant history entry
		const url = new URL(page.url);
		if (value === 'fundamentals') url.searchParams.set('tab', 'fundamentals');
		else url.searchParams.delete('tab'); // keep the canonical Overview URL clean
		goto(url, { noScroll: true, keepFocus: true });
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

	// ── Seeded per-instrument headlines for the News section (NewsStrip owns its own
	//    "view source" placeholder). Empty until an instrument resolves. ──
	const news = $derived(inst ? getNews(inst) : []);

	// ── Buy / Sell → the V03 order ticket ──
	let ticketOpen = $state(false);
	function trade(side: 'buy' | 'sell') {
		invest.openTicket(symbol, side);
		ticketOpen = true;
	}

	// Pre-targeted savings plan → the V10 wizard, already pointed at this instrument
	// (skips its target step). Secondary only — the Buy CTA keeps the earned accent.
	function startPlan() {
		goto(`/invest/plans/new?target=${symbol}&kind=instrument`);
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

			<!-- Quiet, pre-targeted plan entry point (secondary only — the primary Buy
			     CTA in the sticky bar keeps the page's single earned accent). -->
			<div class="head-plan">
				<gok-button variant="secondary" {@attach on('click', startPlan)}>Set up a savings plan</gok-button>
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

		<!-- V11: "Set alert" affordance mounts here once F13 notifications land -->

		<!-- Overview / Fundamentals sub-nav (V09). The sticky trade bar above stays outside the
		     tabs so it survives both; the jump-nav lives inside the Overview panel since it targets
		     Overview sections. Manual activation: arrow keys move focus, Enter/Space/click selects,
		     so arrowing the rail doesn't spam history. -->
		<gok-tabs
			label="Instrument sections"
			activation="manual"
			{@attach setProps({ value: activeTab })}
			{@attach on('change', selectTab)}
		>
			<gok-tab slot="tab" value="overview">Overview</gok-tab>
			<gok-tab slot="tab" value="fundamentals">Fundamentals</gok-tab>

			<gok-tab-panel value="overview">
				<div class="tab-body">
					<!-- In-page jump-nav (CV-LAY-6): calm, mono rail to the Overview research sections,
					     in on-page order. Real anchors; the Related anchor only when there are related names. -->
					<nav class="jump-nav" aria-label="On this page">
						<ul class="jump-list">
							<li><a class="jump-link" href="#chart">Chart</a></li>
							<li><a class="jump-link" href="#keystats">Key stats</a></li>
							<li><a class="jump-link" href="#news">News</a></li>
							<li><a class="jump-link" href="#depth">Depth</a></li>
							<li><a class="jump-link" href="#dividends">Dividends</a></li>
							{#if related.length > 0}
								<li><a class="jump-link" href="#related">Related</a></li>
							{/if}
						</ul>
					</nav>

					<!-- Price chart -->
					<section id="chart" class="block" aria-labelledby="chart-heading">
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
								<!-- Toggleable technical indicators — sits with the other chart controls in the
								     thumb zone; writes chartPrefs, which re-derives the overlays + table columns. -->
								<IndicatorMenu />
							</div>
						</div>

						{#if !marketOpen}
							<p class="market-note">Market closed — showing the last close.</p>
						{/if}

						<PriceChart {candles} kind={chartKind} height="22rem" label={chartLabel} formatValue={formatScale} {overlays} />

						<!-- V08 Phase B/C: the honest "View data" fallback — the price series plus one column per
						     active indicator, from the SAME lines the chart draws (so they can never disagree). -->
						<ChartDataTable candles={rawCandles} {currency} lines={indicatorLines} />
					</section>

					<!-- Key statistics — the shallow key-stats ledger. The deep, type-branched
					     fundamentals now live in their own tab panel. -->
					<section id="keystats" class="block" aria-labelledby="keystats-heading">
						<div class="block-head">
							<p class="block-eyebrow gok-eyebrow">Snapshot</p>
							<h2 id="keystats-heading" class="block-title gok-headline-5">Key statistics</h2>
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

					<!-- News -->
					<section id="news" class="block" aria-labelledby="news-heading">
						<div class="block-head">
							<p class="block-eyebrow gok-eyebrow">News</p>
							<h2 id="news-heading" class="block-title gok-headline-5">Latest headlines</h2>
						</div>
						<NewsStrip items={news} />
					</section>

					<!-- Depth (simulated order book) -->
					<section id="depth" class="block" aria-labelledby="depth-heading">
						<div class="block-head">
							<p class="block-eyebrow gok-eyebrow">Order book</p>
							<h2 id="depth-heading" class="block-title gok-headline-5">Simulated depth</h2>
						</div>
						<DepthLadder {inst} {marketOpen} />
					</section>

					<!-- Dividends -->
					<section id="dividends" class="block" aria-labelledby="dividends-heading">
						<div class="block-head">
							<p class="block-eyebrow gok-eyebrow">Income</p>
							<h2 id="dividends-heading" class="block-title gok-headline-5">Dividend history</h2>
						</div>
						<DividendHistory {symbol} />
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
						<section id="related" class="block" aria-labelledby="related-heading">
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
			</gok-tab-panel>

			<gok-tab-panel value="fundamentals">
				<div class="tab-body">
					<!-- Fundamentals — the deep, type-branched company fundamentals. -->
					<section class="block" aria-labelledby="fundamentals-heading">
						<div class="block-head">
							<p class="block-eyebrow gok-eyebrow">Fundamentals</p>
							<h2 id="fundamentals-heading" class="block-title gok-headline-5">Company fundamentals</h2>
						</div>
						<Fundamentals {inst} />
					</section>
				</div>
			</gok-tab-panel>
		</gok-tabs>
	</div>

	<OrderTicket {symbol} bind:open={ticketOpen} />
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* Each tab panel's content column. Carries the inter-section rhythm that .page's gap
	   used to provide, now that the research sections live inside the tab panels. */
	.tab-body {
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

	/* Keep the secondary plan action at content width, not stretched to the header. */
	.head-plan {
		display: flex;
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

	/* --- In-page jump-nav (CV-LAY-6) --- */
	/* Calm + mono, sentence-case (the eyebrow owns the one uppercase); a hairline rule below
	   separates it from the sections. It's the first child of the Overview panel, so the panel's
	   own top padding + the .tab-body gap already sit it calmly under the tablist — no negative
	   margin needed now that it no longer tucks under the sticky trade bar. */
	.jump-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-400);
		margin: 0;
		padding: 0;
		padding-block-end: var(--gok-space-300);
		list-style: none;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.jump-link {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		color: var(--gok-color-text-muted);
		text-decoration: none;
	}

	.jump-link:hover {
		color: var(--gok-color-text);
	}

	.jump-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	/* Each anchored section lands clear of the top when jumped to. */
	.block[id] {
		scroll-margin-block-start: var(--gok-space-600);
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

	/* Smooth jump-scroll only when the user hasn't asked for reduced motion. */
	@media (prefers-reduced-motion: no-preference) {
		:global(html) {
			scroll-behavior: smooth;
		}
	}
</style>
