<script lang="ts">
	// V06 · Funds & ETFs explorer — a research surface over the fixed fund universe.
	// Three calm filters (asset class, region, risk band) feed the funds state; a
	// sortable gok-table lists what's left (rows handed in as a FRESH array DOM
	// property — dogfooding #36, never bind: on a gok-* element); a row opens a
	// fact-sheet drawer with the objective, holdings, fee, risk and 1Y return, plus
	// the one earned accent: the Buy CTA (tradeable funds only). Risk is read by
	// rule + mark + text — bars + "Risk n of 7" — never colour alone. Fees and
	// past returns carry a plain disclosure. First-person, sentence-case throughout.
	import { goto } from '$app/navigation';
	import { funds, type FundSortKey } from '$lib/state/funds.svelte';
	import { ASSET_CLASSES, FUND_REGIONS } from '$lib/data/funds-data';
	import type { AssetClass, FundRegion } from '$lib/data/funds-data';
	import { formatNumber } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';

	// ── Presentation helpers (charges/returns are bps; fund size is EUR minor) ──

	/** Ongoing charge: bps ÷ 100 → percent, unsigned, two decimals, with the unit. */
	function chargePct(bps: number): string {
		return `${(bps / 100).toFixed(2)}%`;
	}

	/** 1Y return: bps ÷ 100 → signed percent (real minus sign), two decimals. */
	function returnPct(bps: number): string {
		const v = bps / 100;
		const sign = v > 0 ? '+' : v < 0 ? '−' : '';
		return `${sign}${Math.abs(v).toFixed(2)}%`;
	}

	/** Fund size: EUR minor → a compact figure, e.g. "€89.0bn", "€480m". */
	function fundSize(minor: number): string {
		const major = minor / 100;
		if (major >= 1e9) return `€${(major / 1e9).toFixed(1)}bn`;
		if (major >= 1e6) return `€${(major / 1e6).toFixed(0)}m`;
		return `€${formatNumber(Math.round(major))}`;
	}

	// Risk band reads by rule + mark + text: the bars are the mark, the words carry
	// the value (never colour alone). Filled vs hollow blocks scale 1–7.
	function riskBars(band: number): string {
		return '▰'.repeat(band) + '▱'.repeat(7 - band);
	}
	function riskLabel(band: number): string {
		return `Risk ${band} of 7`;
	}

	// ── Filters → the funds state ──
	const RISK_BANDS = [1, 2, 3, 4, 5, 6, 7];

	function onAssetClass(e: Event) {
		funds.assetClass = (e.target as HTMLElement & { value: string }).value as 'all' | AssetClass;
	}
	function onRegion(e: Event) {
		funds.region = (e.target as HTMLElement & { value: string }).value as 'all' | FundRegion;
	}
	function onRiskBand(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		funds.riskBand = value === 'all' ? 'all' : Number(value);
	}

	const isFiltered = $derived(funds.isFiltered);

	// ── Table: columns, fresh rows, controlled sort ──
	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: Fund) => string;
	};

	// The fact-sheet reads the same shape; alias it locally for the column formatters.
	type Fund = ReturnType<typeof funds.fund> extends infer F ? NonNullable<F> : never;

	const columns: Column[] = [
		{
			key: 'name',
			label: 'Name',
			primary: true,
			sortable: true,
			format: (_v, row) => `${row.name} · ${row.ticker}`
		},
		{ key: 'assetClass', label: 'Asset class', width: '8rem', format: (v) => v as string },
		{
			key: 'ongoingChargeBps',
			label: 'Ongoing charge',
			numeric: true,
			sortable: true,
			width: '9rem',
			format: (v) => chargePct(v as number)
		},
		{
			key: 'riskBand',
			label: 'Risk level',
			sortable: true,
			width: '11rem',
			// Text first so a screen reader hears the value, then the bar mark.
			format: (v) => `${riskLabel(v as number)} ${riskBars(v as number)}`
		},
		{
			key: 'oneYearReturnBps',
			label: '1Y return',
			numeric: true,
			sortable: true,
			width: '8rem',
			format: (v) => returnPct(v as number)
		},
		{
			key: 'fundSizeEurMinor',
			label: 'Fund size',
			numeric: true,
			sortable: true,
			width: '8rem',
			format: (v) => fundSize(v as number)
		}
	];

	const getRowId = (f: Fund) => f.ticker;

	// Rows: a FRESH array each time the filtered/sorted view changes (dogfooding #36).
	const rows = $derived([...funds.filtered]);

	// Controlled sort: the funds state owns it; the table reflects the chevron from
	// this prop and we route header clicks back through funds.toggleSort.
	const sort = $derived({ key: funds.sortKey, direction: funds.sortDir });

	function onSort(e: Event) {
		const detail = (e as CustomEvent<{ key: string | null }>).detail;
		if (detail.key) funds.toggleSort(detail.key as FundSortKey);
	}

	// ── Row → fact-sheet drawer ──
	// Capture the grid node (via an attachment) so focus returns to it on close.
	let tableEl: HTMLElement | undefined;
	function captureTable(node: HTMLElement) {
		tableEl = node;
		return () => {
			tableEl = undefined;
		};
	}

	let selectedTicker = $state<string | null>(null);
	const selectedFund = $derived(selectedTicker ? (funds.fund(selectedTicker) ?? null) : null);
	const drawerOpen = $derived(selectedFund !== null);
	const tradeable = $derived(selectedFund ? funds.tradeable(selectedFund.ticker) : false);

	function onSelection(e: Event) {
		const id = (e as CustomEvent<{ ids: string[] }>).detail.ids?.[0];
		if (id) selectedTicker = id;
	}

	function closeDrawer() {
		selectedTicker = null;
		tableEl?.focus();
	}

	function buy() {
		if (selectedFund) goto(`/invest/instrument/${selectedFund.ticker}`);
	}
</script>

<svelte:head>
	<title>Funds &amp; ETFs · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/invest">&larr; Investments</gok-link>
		<p class="head-eyebrow gok-eyebrow">Funds &amp; ETFs</p>
		<h1 class="head-title gok-headline-2">Funds I can buy</h1>
		<p class="head-caption">
			The funds and ETFs on the platform, before I decide. Prices and returns indicative.
		</p>
	</header>

	<!-- Filter bar -->
	<section class="filters" aria-label="Filter funds">
		<div class="field">
			<gok-select
				label="Asset class"
				{@attach setProps({ value: funds.assetClass })}
				{@attach on('change', onAssetClass)}
			>
				<gok-option value="all">All</gok-option>
				{#each ASSET_CLASSES as cls (cls)}
					<gok-option value={cls}>{cls}</gok-option>
				{/each}
			</gok-select>
		</div>

		<div class="field">
			<gok-select
				label="Region"
				{@attach setProps({ value: funds.region })}
				{@attach on('change', onRegion)}
			>
				<gok-option value="all">All</gok-option>
				{#each FUND_REGIONS as region (region)}
					<gok-option value={region}>{region}</gok-option>
				{/each}
			</gok-select>
		</div>

		<div class="field">
			<gok-select
				label="Risk level"
				{@attach setProps({ value: funds.riskBand === 'all' ? 'all' : String(funds.riskBand) })}
				{@attach on('change', onRiskBand)}
			>
				<gok-option value="all">All</gok-option>
				{#each RISK_BANDS as band (band)}
					<gok-option value={String(band)}>{riskLabel(band)}</gok-option>
				{/each}
			</gok-select>
		</div>

		{#if isFiltered}
			<button type="button" class="clear" {@attach on('click', () => funds.clearFilters())}>
				Clear filters
			</button>
		{/if}
	</section>

	<!-- The fund table -->
	<gok-table
		selection-mode="single"
		accessible-label="Funds I can buy"
		{@attach captureTable}
		{@attach setProps({
			columns,
			rows,
			getRowId,
			sort,
			selection: selectedTicker ? [selectedTicker] : []
		})}
		{@attach on('gok-sort', onSort)}
		{@attach on('gok-selection-change', onSelection)}
	>
		<div slot="empty" class="table-empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No funds match these filters</p>
				<p class="empty-body">Nothing fits this combination right now.</p>
				<gok-button
					slot="actions"
					variant="secondary"
					{@attach on('click', () => funds.clearFilters())}
				>
					Clear filters
				</gok-button>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<!-- Fact sheet — the objective, holdings, fee, risk, 1Y return, and the Buy CTA. -->
<gok-drawer
	placement="end"
	heading={selectedFund ? selectedFund.name : 'Fund'}
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if selectedFund}
		{@const fund = selectedFund}
		<div class="sheet">
			<div class="sheet-id">
				<span class="sheet-ticker">{fund.ticker}</span>
				<span class="sheet-meta">{fund.assetClass} · {fund.region}</span>
			</div>

			<p class="sheet-objective">{fund.objective}</p>

			<dl class="facts">
				<div class="fact">
					<dt>Ongoing charge</dt>
					<dd class="gok-tabular-nums">{chargePct(fund.ongoingChargeBps)} a year</dd>
				</div>
				<div class="fact">
					<dt>1Y return</dt>
					<dd class="gok-tabular-nums">{returnPct(fund.oneYearReturnBps)}</dd>
				</div>
				<div class="fact">
					<dt>Risk level</dt>
					<dd class="risk">
						<span class="risk-bars" aria-hidden="true">{riskBars(fund.riskBand)}</span>
						<span class="risk-text">{riskLabel(fund.riskBand)}</span>
					</dd>
				</div>
				<div class="fact">
					<dt>Fund size</dt>
					<dd class="gok-tabular-nums">{fundSize(fund.fundSizeEurMinor)}</dd>
				</div>
			</dl>

			<div class="holdings">
				<p class="holdings-label gok-eyebrow">Top holdings</p>
				<ul class="holdings-list">
					{#each fund.topHoldings as holding (holding)}
						<li class="holdings-item">{holding}</li>
					{/each}
				</ul>
			</div>

			<p class="disclosure">
				Fees reduce returns. Past performance doesn't predict future returns.
			</p>

			{#if !tradeable}
				<p class="research-note">Research only on the platform — I can't buy this one here.</p>
			{/if}
		</div>

		{#if tradeable}
			<div slot="footer" class="drawer-actions">
				<gok-button variant="primary" {@attach on('click', buy)}>Buy {fund.ticker}</gok-button>
			</div>
		{/if}
	{/if}
</gok-drawer>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 64rem;
	}

	/* ── Header ── */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: var(--gok-space-200) 0 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-caption {
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Filters ── */
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--gok-space-300);
	}

	.field {
		display: flex;
		flex-direction: column;
		min-inline-size: 11rem;
	}

	/* A quiet text button — the clear control carries no fill. */
	.clear {
		display: inline-flex;
		align-items: center;
		min-block-size: 2.5rem;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.clear:hover {
		color: var(--gok-color-text);
	}

	.clear:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus, var(--gok-color-primary));
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* ── Table empty state ── */
	.table-empty {
		padding-block: var(--gok-space-500);
	}

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

	/* ── Fact sheet ── */
	.sheet {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.sheet-id {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50);
	}

	.sheet-ticker {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-large-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sheet-meta {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.sheet-objective {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.fact {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.fact dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.fact dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* Risk: bars (mark) + words (value) — never colour alone. */
	.risk {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.risk-bars {
		font-family: var(--gok-font-family-mono);
		letter-spacing: 0.05em;
		color: var(--gok-color-text);
	}

	.risk-text {
		font-variant-numeric: tabular-nums;
	}

	/* ── Top holdings ── */
	.holdings {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.holdings-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.holdings-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-100) var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.holdings-item {
		padding: var(--gok-space-50) var(--gok-space-200);
		border: var(--gok-border-width-thin, 1px) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	/* ── Disclosure + research-only note ── */
	.disclosure,
	.research-note {
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	.research-note {
		padding-block-start: 0;
		border-block-start: 0;
		color: var(--gok-color-text);
	}

	/* ── Drawer footer ── */
	.drawer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}
</style>
