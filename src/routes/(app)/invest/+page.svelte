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
	import { dayChangeBps, priceSparkline } from '$lib/data/portfolio';
	import type { Position } from '$lib/data/portfolio';
	import { RANGES } from '$lib/data/market';
	import type { Range } from '$lib/data/market';
	import { formatMoney, formatPercent } from '$lib/format';
	import { LineChart, DonutChart, Sparkline } from '$lib/charts';
	import { setProps, on } from '$lib/wc.svelte';
	import OrderTicket from '$lib/components/invest/OrderTicket.svelte';

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
		const value = (e.target as HTMLElement & { value: string }).value;
		invest.setRange(value as Range);
	}

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

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Portfolio</p>
		<h1 class="head-title gok-headline-1 gok-tabular-nums">{totalValue}</h1>
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
		<!-- Performance -->
		<section class="block" aria-labelledby="perf-heading">
			<div class="block-head">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Performance</p>
					<h2 id="perf-heading" class="block-title gok-headline-5">How it's doing</h2>
				</div>
				<gok-segmented
					label="Performance range"
					{@attach setProps({ value: invest.range })}
					{@attach on('change', onRange)}
				>
					{#each RANGES as range (range)}
						<gok-segmented-item value={range}>{range}</gok-segmented-item>
					{/each}
				</gok-segmented>
			</div>
			<LineChart
				data={performance}
				formatValue={(m) => formatMoney(m, 'EUR')}
				label={perfLabel}
				area
				height="18rem"
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

		<!-- Quick actions -->
		<section class="block actions" aria-labelledby="actions-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Quick actions</p>
				<h2 id="actions-heading" class="block-title gok-headline-5">Make a move</h2>
			</div>
			<div class="action-row">
				<gok-button variant="primary" {@attach on('click', placeOrder)}>Place order</gok-button>
				<!-- Orders (V04) and watchlists (V05) are both live. -->
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/orders'))}>
					My orders
				</gok-button>
				<gok-button variant="secondary" {@attach on('click', () => goto('/invest/watchlists'))}>
					Watchlists
				</gok-button>
			</div>
		</section>
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
		gap: var(--gok-space-50);
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
		border-block-end: var(--gok-border-width-thin, 1px) solid var(--gok-color-border-strong);
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
		outline: var(--gok-border-width-thin, 2px) solid var(--gok-color-focus, var(--gok-color-primary));
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
		background: var(--gok-color-surface-subtle, var(--gok-color-surface-strong));
	}

	.row:focus-within {
		background: var(--gok-color-surface-subtle, var(--gok-color-surface-strong));
	}

	.sym-link {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50);
		text-decoration: none;
		color: inherit;
	}

	.sym-link:focus-visible {
		outline: var(--gok-border-width-thin, 2px) solid var(--gok-color-focus, var(--gok-color-primary));
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
		gap: var(--gok-space-50);
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

	/* ── Two-column allocation + breathing room at desktop ── */
	@media (min-width: 48rem) {
		.alloc-layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--gok-space-700);
		}
	}
</style>
