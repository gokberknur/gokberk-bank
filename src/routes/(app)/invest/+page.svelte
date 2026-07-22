<script lang="ts">
	// V01 portfolio overview — the investing home. A single calm read-only surface
	// answering "what do I own, what's it worth, how is it doing?": a summary header
	// (total value + today + all time), a performance line with a range switch, an
	// allocation donut beside a text legend, and the dense holdings grid. The grid is
	// HAND-BUILT (not gok-table) because each row embeds a live Sparkline node and
	// gok-table cells are formatted strings only (dogfooding #8/#11). The one accent
	// is spent on the primary "Place order" and the selected range segment — never on
	// a gain. Gains/losses read by rule + ▲/▼ + sign + the status role on the number.
	import { goto } from '$app/navigation';
	import { invest } from '$lib/state/invest.svelte';
	import {
		dayChangeBps,
		priceSparkline,
		twrBps,
		benchmarkSeries,
		rebaseTo100,
		positionContributions,
		realizedPlEurMinor
	} from '$lib/data/portfolio';
	import type { Position } from '$lib/data/portfolio';
	import { RANGES, BENCHMARK } from '$lib/data/market';
	import type { Range } from '$lib/data/market';
	import { formatMoney, formatPercent, formatDate } from '$lib/format';
	import { LineChart, DonutChart, Sparkline } from '$lib/charts';
	import { setProps, on } from '$lib/wc.svelte';
	import OrderTicket from '$lib/components/invest/OrderTicket.svelte';
	import PlSplitCard from '$lib/components/invest/PlSplitCard.svelte';
	import ContributionList from '$lib/components/invest/ContributionList.svelte';
	import ProjectionCalculator from '$lib/components/invest/ProjectionCalculator.svelte';
	import StickyActionBar from '$lib/components/layout/StickyActionBar.svelte';

	// ── Portfolio reads (all derived fresh from the seed) ──
	const summary = $derived(invest.summary);
	const positions = $derived(invest.positions);
	const allocation = $derived(invest.allocation);
	const hasPositions = $derived(positions.length > 0);

	const totalValue = $derived(formatMoney(summary.totalValueEurMinor, 'EUR'));

	// Today's move as a ratio of the prior session value (value − today's change).
	const dayPriorValue = $derived(summary.totalValueEurMinor - summary.dayChangeEurMinor);
	const dayRatio = $derived(dayPriorValue !== 0 ? summary.dayChangeEurMinor / dayPriorValue : 0);
	// All-time return: bps → ratio.
	const allTimeRatio = $derived(summary.totalReturnBps / 10000);

	// ── Performance chart + range switch ──
	const performance = $derived(invest.performance(invest.range));
	const perfLabel = $derived(
		`Portfolio value over ${invest.range}, now ${totalValue}.`
	);

	function onRange(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		invest.setRange(value as Range);
	}

	// ── Benchmark overlay (V12): compare the portfolio to a seeded index. Availability
	//    is guarded even though the seed always resolves — a future live feed could
	//    return an empty series, in which case the switch disables with a neutral note. ──
	let comparing = $state(false);

	const benchmark = $derived(benchmarkSeries(invest.range));
	const benchmarkAvailable = $derived(benchmark.length > 0);
	// Only overlay when the user asked AND a benchmark exists for the range.
	const showCompare = $derived(comparing && benchmarkAvailable);

	// Rebased display transforms (first point = 100) so the two series share a scale —
	// used by the overlay chart, the text legend and the data-table fallback. Never stored.
	const rebasedPortfolio = $derived(rebaseTo100(performance));
	const rebasedBenchmark = $derived(rebaseTo100(benchmark));
	const latestPortfolioRebased = $derived(rebasedPortfolio.at(-1)?.value ?? 100);
	const latestBenchmarkRebased = $derived(rebasedBenchmark.at(-1)?.value ?? 100);

	// The plotted series as accessible table rows — Date + Portfolio, plus a Benchmark
	// column (rebased) when comparing. Satisfies "every chart carries a data-table
	// fallback"; the visible chart itself stays decorative (role="img").
	const perfTableRows = $derived.by(() =>
		showCompare
			? rebasedPortfolio.map((pt, idx) => ({
					date: pt.date,
					portfolio: pt.value.toFixed(1),
					benchmark: rebasedBenchmark[idx] ? rebasedBenchmark[idx].value.toFixed(1) : '—'
				}))
			: performance.map((pt) => ({
					date: pt.date,
					portfolio: formatMoney(pt.value, 'EUR'),
					benchmark: ''
				}))
	);

	function onCompareToggle(e: Event) {
		comparing = (e.target as HTMLElement & { checked: boolean }).checked;
	}

	// ── Return figures (V12): simple vs time-weighted return over the active range.
	//    `allTimeRatio` above is the total (vs-cost) return; TWR removes the timing of
	//    contributions. Neither figure spends the accent (status role on the number only). ──
	const twrRatio = $derived(twrBps(invest.range) / 10000);

	// ── Allocation legend (text + value + weight; never colour-only) ──
	const allocTotal = $derived(allocation.reduce((sum, a) => sum + a.value, 0));

	// ── Holdings grid: app-local sort state (gok-table can't host the Sparkline) ──
	type SortKey = 'instrument' | 'last' | 'day' | 'value' | 'pl' | 'weight';
	let sortKey = $state<SortKey>('weight');
	let sortDir = $state<'asc' | 'desc'>('desc');

	function sortValue(p: Position, key: SortKey): number | string {
		switch (key) {
			case 'instrument':
				return p.instrument.symbol;
			case 'last':
				return p.instrument.lastPriceMinor;
			case 'day':
				return dayChangeBps(p.instrument);
			case 'value':
				return p.marketValueEurMinor;
			case 'pl':
				return p.unrealizedPlEurMinor;
			case 'weight':
				return p.weightBps;
		}
	}

	const sortedPositions = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...positions].sort((a, b) => {
			const av = sortValue(a, sortKey);
			const bv = sortValue(b, sortKey);
			if (typeof av === 'string' && typeof bv === 'string') {
				return av.localeCompare(bv) * dir;
			}
			return ((av as number) - (bv as number)) * dir;
		});
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			// Text column sorts A→Z first; numeric columns lead with the largest.
			sortDir = key === 'instrument' ? 'asc' : 'desc';
		}
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	// The sign bucket that drives the status role + icon + screen-reader word.
	function signOf(n: number): 'pos' | 'neg' | 'flat' {
		return n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat';
	}

	function openInstrument(symbol: string) {
		goto(`/invest/instrument/${symbol}`);
	}

	// ── Quick actions: the order ticket, seeded with the largest holding ──
	let ticketOpen = $state(false);
	const largestSymbol = $derived(positions[0]?.instrument.symbol ?? '');

	function placeOrder() {
		if (!largestSymbol) return;
		invest.openTicket(largestSymbol);
		ticketOpen = true;
	}
</script>

<svelte:head>
	<title>Investments · gökberk bank</title>
</svelte:head>

<!-- A delta line for the summary header: rule + ▲/▼ icon + signed amount + percent,
     with the status role on the number only (never colour alone). -->
{#snippet deltaLine(label: string, amountMinor: number, ratio: number)}
	{@const sign = signOf(amountMinor)}
	<p class="delta-line">
		<span class="delta-label">{label}</span>
		<span class="delta-value gok-tabular-nums" data-sign={sign}>
			<span class="delta-icon" aria-hidden="true"
				>{sign === 'pos' ? '▲' : sign === 'neg' ? '▼' : '—'}</span
			>
			<span class="visually-hidden">{sign === 'pos' ? 'up' : sign === 'neg' ? 'down' : 'flat'}</span>
			{formatMoney(amountMinor, 'EUR', { signDisplay: true })}
			<span class="delta-pct">({formatPercent(ratio)})</span>
		</span>
	</p>
{/snippet}

<!-- A compact delta for a grid cell: ▲/▼ icon + already-formatted signed text. -->
{#snippet deltaCell(text: string, sign: 'pos' | 'neg' | 'flat')}
	<span class="cell-delta" data-sign={sign}>
		<span class="delta-icon" aria-hidden="true"
			>{sign === 'pos' ? '▲' : sign === 'neg' ? '▼' : '—'}</span
		>
		<span class="visually-hidden">{sign === 'pos' ? 'up' : sign === 'neg' ? 'down' : 'flat'}</span>
		{text}
	</span>
{/snippet}

<!-- A percent return figure carried by rule + ▲/▼ + sign, with the status role on the
     number only. Reuses .delta-value so the return pair reads like the header deltas. -->
{#snippet returnFigure(ratio: number)}
	{@const sign = signOf(ratio)}
	<span class="delta-value gok-tabular-nums" data-sign={sign}>
		<span class="delta-icon" aria-hidden="true"
			>{sign === 'pos' ? '▲' : sign === 'neg' ? '▼' : '—'}</span
		>
		<span class="visually-hidden">{sign === 'pos' ? 'up' : sign === 'neg' ? 'down' : 'flat'}</span>
		{formatPercent(ratio)}
	</span>
{/snippet}

<div class="page">
	<header class="head">
		<h1 id="portfolio-heading" class="visually-hidden">Portfolio</h1>
		<p class="head-eyebrow gok-eyebrow">Portfolio</p>
		<h2 class="head-title gok-headline-1 gok-tabular-nums">{totalValue}</h2>
		{#if hasPositions}
			<div class="head-deltas">
				{@render deltaLine('Today', summary.dayChangeEurMinor, dayRatio)}
				{@render deltaLine('All time', summary.totalPlEurMinor, allTimeRatio)}
			</div>
		{/if}
		<p class="head-caption">Prices indicative, for information only.</p>
	</header>

	{#if !hasPositions}
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-5">No investments yet</p>
				<p class="empty-body">
					When I buy my first instrument, it shows up here with its value and how it's doing.
				</p>
			</gok-empty-state>
		</section>
	{:else}
		<!-- In-page jump-nav (CV-LAY-6): calm, mono, secondary to the V16 sub-nav above.
		     Real anchors to the analytics sections, in on-page order. -->
		<nav class="jump-nav" aria-label="On this page">
			<ul class="jump-list">
				<li><a class="jump-link" href="#benchmark">Performance</a></li>
				<li><a class="jump-link" href="#return">Return</a></li>
				<li><a class="jump-link" href="#pl">P/L</a></li>
				<li><a class="jump-link" href="#contribution">Contribution</a></li>
				<li><a class="jump-link" href="#projection">Projection</a></li>
			</ul>
		</nav>

		<!-- Performance (with the V12 benchmark overlay) -->
		<section id="benchmark" class="block" aria-labelledby="perf-heading">
			<div class="block-head">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Performance</p>
					<h2 id="perf-heading" class="block-title gok-headline-5">How it's doing</h2>
				</div>
				<div class="perf-controls">
					<gok-segmented
						label="Performance range"
						{@attach setProps({ value: invest.range })}
						{@attach on('change', onRange)}
					>
						{#each RANGES as range (range)}
							<gok-segmented-item value={range}>{range}</gok-segmented-item>
						{/each}
					</gok-segmented>
					<div class="compare-control">
						<gok-switch
							{@attach setProps({ checked: comparing, disabled: !benchmarkAvailable })}
							{@attach on('change', onCompareToggle)}
						>
							Compare to index
						</gok-switch>
						{#if !benchmarkAvailable}
							<p class="compare-note">Benchmark unavailable</p>
						{/if}
					</div>
				</div>
			</div>

			{#if showCompare}
				<LineChart
					data={rebasedPortfolio}
					compare={rebasedBenchmark}
					compareLabel={BENCHMARK.name}
					formatValue={(v) => v.toFixed(1)}
					label={perfLabel}
					height="18rem"
				/>
				<!-- Text legend — never colour-only: the line STYLE is named in words and each
				     row carries its latest rebased value. -->
				<ul class="chart-legend">
					<li class="chart-legend-row">
						<span class="chart-legend-swatch chart-legend-swatch-solid" aria-hidden="true"></span>
						<span class="chart-legend-label">Portfolio · rebased 100 (solid line)</span>
						<span class="chart-legend-value gok-tabular-nums">{latestPortfolioRebased.toFixed(1)}</span>
					</li>
					<li class="chart-legend-row">
						<span class="chart-legend-swatch chart-legend-swatch-dashed" aria-hidden="true"></span>
						<span class="chart-legend-label">{BENCHMARK.name} · rebased 100 (dashed line)</span>
						<span class="chart-legend-value gok-tabular-nums">{latestBenchmarkRebased.toFixed(1)}</span>
					</li>
				</ul>
			{:else}
				<LineChart
					data={performance}
					formatValue={(m) => formatMoney(m, 'EUR')}
					label={perfLabel}
					area
					height="18rem"
				/>
			{/if}

			<!-- Data-table fallback for the chart (visually hidden). -->
			<table class="visually-hidden">
				<caption>
					{showCompare
						? `Portfolio and ${BENCHMARK.name}, rebased to 100, across ${invest.range}.`
						: `Portfolio value across ${invest.range}.`}
				</caption>
				<thead>
					<tr>
						<th scope="col">Date</th>
						<th scope="col">{showCompare ? 'Portfolio (rebased 100)' : 'Portfolio value'}</th>
						{#if showCompare}
							<th scope="col">{BENCHMARK.name} (rebased 100)</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each perfTableRows as row (row.date)}
						<tr>
							<th scope="row">{formatDate(row.date)}</th>
							<td>{row.portfolio}</td>
							{#if showCompare}
								<td>{row.benchmark}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<!-- Return pair (V12): total vs time-weighted return -->
		<section id="return" class="block" aria-labelledby="return-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Return</p>
				<h2 id="return-heading" class="block-title gok-headline-5">How the money did</h2>
			</div>
			<div class="return-pair">
				<div class="return-item">
					<span class="delta-label">Total return</span>
					{@render returnFigure(allTimeRatio)}
				</div>
				<div class="return-item">
					<span class="delta-label return-label-tip">
						Time-weighted return
						<gok-tooltip>
							<button type="button" class="info-btn" aria-label="What time-weighted return means">
								<span aria-hidden="true">i</span>
							</button>
							<span slot="content"
								>Time-weighted — removes the effect of when you added money.</span
							>
						</gok-tooltip>
					</span>
					{@render returnFigure(twrRatio)}
				</div>
			</div>
		</section>

		<!-- P/L split (V12): realised vs unrealised -->
		<section id="pl" class="block" aria-labelledby="pl-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Profit &amp; loss</p>
				<h2 id="pl-heading" class="block-title gok-headline-5">Realised and unrealised</h2>
			</div>
			<PlSplitCard
				unrealizedMinor={summary.totalPlEurMinor}
				realizedMinor={realizedPlEurMinor(invest.orders)}
			/>
		</section>

		<!-- Allocation -->
		<section class="block" aria-labelledby="alloc-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Allocation</p>
				<h2 id="alloc-heading" class="block-title gok-headline-5">How it's split</h2>
			</div>
			<div class="alloc-layout">
				<div class="alloc-chart">
					<DonutChart
						data={allocation}
						formatValue={(m) => formatMoney(m, 'EUR')}
						label={`Allocation across ${allocation.length} asset classes.`}
						centerTitle="Total"
						centerValue={totalValue}
						height="16rem"
					/>
				</div>
				<ul class="legend">
					{#each allocation as slice (slice.name)}
						{@const weight = allocTotal !== 0 ? slice.value / allocTotal : 0}
						<li class="legend-row">
							<span class="legend-name">{slice.name}</span>
							<span class="legend-figures gok-tabular-nums">
								<span class="legend-value">{formatMoney(slice.value, 'EUR')}</span>
								<span class="legend-weight">{formatPercent(weight)}</span>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- Holdings grid (app-local accessible table — see dogfooding #8/#11) -->
		<section class="block" aria-labelledby="holdings-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Holdings</p>
				<h2 id="holdings-heading" class="block-title gok-headline-5">What I own</h2>
			</div>
			<div class="grid-scroll">
				<table class="grid">
					<caption class="visually-hidden">
						My holdings — last price, day change, market value, unrealised profit and loss, and
						weight. Sortable by column.
					</caption>
					<thead>
						<tr>
							<th scope="col" aria-sort={ariaSort('instrument')} class="col-instrument">
								<button type="button" class="sort-btn" onclick={() => toggleSort('instrument')}>
									Instrument
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'instrument' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
							<th scope="col" class="col-spark">30 days</th>
							<th scope="col" aria-sort={ariaSort('last')} class="col-num">
								<button type="button" class="sort-btn" onclick={() => toggleSort('last')}>
									Last
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'last' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
							<th scope="col" aria-sort={ariaSort('day')} class="col-num">
								<button type="button" class="sort-btn" onclick={() => toggleSort('day')}>
									Day
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'day' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
							<th scope="col" aria-sort={ariaSort('value')} class="col-num">
								<button type="button" class="sort-btn" onclick={() => toggleSort('value')}>
									Market value
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'value' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
							<th scope="col" aria-sort={ariaSort('pl')} class="col-num">
								<button type="button" class="sort-btn" onclick={() => toggleSort('pl')}>
									P&amp;L
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'pl' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
							<th scope="col" aria-sort={ariaSort('weight')} class="col-num">
								<button type="button" class="sort-btn" onclick={() => toggleSort('weight')}>
									Weight
									<span class="sort-mark" aria-hidden="true"
										>{sortKey === 'weight' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedPositions as position (position.instrument.symbol)}
							{@const inst = position.instrument}
							{@const daySign = signOf(dayChangeBps(inst))}
							{@const plSign = signOf(position.unrealizedPlEurMinor)}
							<!-- Row is a click-shortcut only — the nested .sym-link below is the intentional
							     keyboard-equivalent path (WCAG 2.1.1 satisfied via that link). Don't add
							     tabindex/role="button" here; that'd nest a duplicate interactive element. -->
							<tr class="row" onclick={() => openInstrument(inst.symbol)}>
								<th scope="row" class="col-instrument">
									<a
										class="sym-link"
										href={`/invest/instrument/${inst.symbol}`}
										onclick={(e) => e.stopPropagation()}
									>
										<span class="sym">{inst.symbol}</span>
										<span class="sym-name">{inst.name}</span>
									</a>
								</th>
								<td class="col-spark">
									<Sparkline
										values={priceSparkline(inst.symbol, 30)}
										trend="auto"
										label={`${inst.symbol} price, last 30 days.`}
										height="2rem"
									/>
								</td>
								<td class="col-num gok-tabular-nums">
									{formatMoney(inst.lastPriceMinor, inst.currency)}
								</td>
								<td class="col-num gok-tabular-nums">
									{@render deltaCell(formatPercent(dayChangeBps(inst) / 10000), daySign)}
								</td>
								<td class="col-num gok-tabular-nums">
									{formatMoney(position.marketValueEurMinor, 'EUR')}
								</td>
								<td class="col-num gok-tabular-nums">
									{@render deltaCell(
										formatMoney(position.unrealizedPlEurMinor, 'EUR', { signDisplay: true }),
										plSign
									)}
								</td>
								<td class="col-num gok-tabular-nums">{formatPercent(position.weightBps / 10000)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Contribution (V12): what drove the return, per holding -->
		<section id="contribution" class="block" aria-labelledby="contribution-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Analytics</p>
				<h2 id="contribution-heading" class="block-title gok-headline-5">What drove it</h2>
			</div>
			<ContributionList items={positionContributions()} />
		</section>

		<!-- Projection (V12): a neutral what-if illustration -->
		<section id="projection" class="block" aria-labelledby="projection-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Illustration</p>
				<h2 id="projection-heading" class="block-title gok-headline-5">
					What a plan could look like
				</h2>
			</div>
			<ProjectionCalculator startMinor={summary.totalValueEurMinor} />
		</section>

		<!-- Quick actions -->
		<section class="block actions" aria-labelledby="actions-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Quick actions</p>
				<h2 id="actions-heading" class="block-title gok-headline-5">Make a move</h2>
			</div>
			<div class="action-row">
				<!-- Orders (V04) and watchlists (V05) are both live. -->
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/orders'))}>
					My orders
				</gok-button>
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/watchlists'))}>
					Watchlists
				</gok-button>
				<!-- V06 · Funds & ETFs explorer and the dividends surface (built alongside). -->
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/funds'))}>
					Funds &amp; ETFs
				</gok-button>
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/dividends'))}>
					Dividends
				</gok-button>
			</div>
		</section>
	{/if}

	{#if hasPositions}
		<StickyActionBar label="Invest">
			{#snippet actions()}
				<gok-button variant="primary" {@attach on('click', placeOrder)}>Place order</gok-button>
			{/snippet}
		</StickyActionBar>
	{/if}
</div>

{#if hasPositions}
	<OrderTicket symbol={largestSymbol} bind:open={ticketOpen} />
{/if}

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

	.head-deltas {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-600);
		margin-block-start: var(--gok-space-100);
	}

	.delta-line {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin: 0;
	}

	.delta-label {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--gok-color-text-muted);
	}

	.delta-value {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	/* The status role lands on the number only — rule + icon + sign carry it too. */
	.delta-value[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	.delta-value[data-sign='neg'] {
		color: var(--gok-color-status-error);
	}

	.delta-icon {
		font-size: 0.7em;
	}

	.delta-pct {
		font-size: var(--gok-type-body-small-size);
	}

	.head-caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Blocks ── */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.block-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.block-titles {
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

	/* ── Allocation ── */
	.alloc-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
		align-items: center;
	}

	.alloc-chart {
		min-inline-size: 0;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.legend-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.legend-row:first-child {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.legend-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.legend-figures {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
	}

	.legend-value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.legend-weight {
		min-inline-size: 4rem;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		text-align: end;
		color: var(--gok-color-text-muted);
	}

	/* ── Holdings grid ── */
	.grid-scroll {
		inline-size: 100%;
		overflow-x: auto;
	}

	.grid {
		inline-size: 100%;
		border-collapse: collapse;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
	}

	.grid th,
	.grid td {
		padding: var(--gok-space-200) var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		white-space: nowrap;
		vertical-align: middle;
	}

	.grid thead th {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		font-weight: var(--gok-font-weight-regular);
		text-align: start;
		color: var(--gok-color-text-muted);
	}

	.col-num {
		text-align: end;
	}

	/* The header sort buttons inherit alignment from the cell. */
	.col-num .sort-btn {
		justify-content: flex-end;
		margin-inline-start: auto;
	}

	.sort-btn {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		cursor: pointer;
	}

	.sort-btn:hover {
		color: var(--gok-color-text);
	}

	.sort-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.sort-mark {
		font-size: 0.8em;
		color: var(--gok-color-text);
	}

	.col-spark {
		inline-size: 5rem;
	}

	.row {
		cursor: pointer;
	}

	.row:hover {
		background: var(--gok-color-surface-strong);
	}

	.row:focus-within {
		background: var(--gok-color-surface-strong);
	}

	.sym-link {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		text-decoration: none;
		color: inherit;
	}

	.sym-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.sym {
		font-family: var(--gok-font-family-mono);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sym-name {
		font-size: var(--gok-type-footnote-size);
		color: var(--gok-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		max-inline-size: 12rem;
	}

	.cell-delta {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		justify-content: flex-end;
	}

	.cell-delta[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	.cell-delta[data-sign='neg'] {
		color: var(--gok-color-status-error);
	}

	.cell-delta .delta-icon {
		font-size: 0.7em;
	}

	/* ── Quick actions ── */
	.action-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-300);
	}

	/* ── Empty ── */
	.empty {
		padding-block: var(--gok-space-700);
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

	/* ── In-page jump-nav (CV-LAY-6) ── */
	.jump-nav {
		/* Calm + mono, sentence-case (the eyebrow owns the one uppercase), hairline rule
		   below so it reads lighter than the V16 sub-nav above and doesn't compete. */
		margin-block-start: calc(-1 * var(--gok-space-300));
	}

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

	/* ── Performance controls (range + compare switch) ── */
	.perf-controls {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-300);
	}

	.compare-control {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.compare-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Benchmark legend (text carries meaning; swatch is decorative style-only ink) ── */
	.chart-legend {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chart-legend-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.chart-legend-swatch {
		flex: none;
		inline-size: 1.5rem;
		block-size: 0;
	}

	.chart-legend-swatch-solid {
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-text);
	}

	.chart-legend-swatch-dashed {
		border-block-start: var(--gok-border-width-strong) dashed var(--gok-color-text-muted);
	}

	.chart-legend-label {
		flex: 1 1 auto;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.chart-legend-value {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Return pair ── */
	.return-pair {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-400) var(--gok-space-700);
	}

	.return-item {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.return-label-tip {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.info-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.1rem;
		block-size: 1.1rem;
		padding: 0;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		background: none;
		color: var(--gok-color-text-muted);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: 1;
		cursor: pointer;
	}

	.info-btn:hover {
		color: var(--gok-color-text);
		border-color: var(--gok-color-border-strong);
	}

	.info-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
	}

	/* Each analytics anchor lands clear of the top when jumped to. */
	.block[id] {
		scroll-margin-block-start: var(--gok-space-600);
	}

	/* ── Two-column allocation + breathing room at desktop ── */
	@media (min-width: 48rem) {
		.alloc-layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--gok-space-700);
		}

		.perf-controls {
			align-items: flex-end;
		}
	}

	/* Smooth jump-scroll only when the user hasn't asked for reduced motion. */
	@media (prefers-reduced-motion: no-preference) {
		:global(html) {
			scroll-behavior: smooth;
		}
	}
</style>
