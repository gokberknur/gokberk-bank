<script lang="ts">
	// V06 (part 2) · The dividend calendar & history — the income half of the invest
	// loop. An Upcoming / History toggle (a gok-segmented radiogroup) swaps which
	// gok-table is shown: Upcoming lists the next payment per held payer (ex/pay dates,
	// per-share, cash amount, yield-on-cost); History lists what I've been paid,
	// most-recent-first, with a headline total received. Both grids take their
	// columns/rows as DOM **properties** (setProps) — never attributes, never `bind:`
	// on a gok-* element — and rows are handed in fresh (dogfooding #36). Cells are
	// formatted STRINGS only; yield-on-cost reads as a value ("—" when not held).
	import { dividends } from '$lib/state/dividends.svelte';
	import type { DividendView } from '$lib/data/dividends-data';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';

	// ── Toggle: Upcoming / History (a radiogroup via gok-segmented) ──
	function onView(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		dividends.view = value === 'history' ? 'history' : 'upcoming';
	}

	const isHistory = $derived(dividends.view === 'history');

	// ── Cells (formatted strings only) ──
	const instrumentCell = (row: DividendView) => `${row.name} · ${row.symbol}`;

	// Yield on annual cost, read as a value. "—" when the position isn't held, so the
	// cell never lies about a yield I'm not earning.
	function yieldCell(row: DividendView): string {
		if (row.yieldOnCostBps == null) return '—';
		return `${(row.yieldOnCostBps / 100).toFixed(2)}%`;
	}

	// ── Tables: columns (rows handed in fresh per render) ──
	type Column = {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: DividendView) => string;
	};

	const upcomingColumns: Column[] = [
		{ key: 'exDateIso', label: 'Ex-date', width: '7.5rem', format: (v) => formatDate(v as string) },
		{ key: 'payDateIso', label: 'Pay-date', width: '7.5rem', format: (v) => formatDate(v as string) },
		{ key: 'name', label: 'Instrument', primary: true, format: (_v, row) => instrumentCell(row) },
		{
			key: 'perShareMinor',
			label: 'Per share',
			numeric: true,
			width: '7rem',
			format: (v, row) => formatMoney(v as number, row.currency)
		},
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '8rem',
			format: (v, row) => formatMoney(v as number, row.currency)
		},
		{ key: 'yieldOnCostBps', label: 'Yield on cost', numeric: true, width: '7.5rem', format: (_v, row) => yieldCell(row) }
	];

	const historyColumns: Column[] = [
		{ key: 'payDateIso', label: 'Pay-date', width: '7.5rem', format: (v) => formatDate(v as string) },
		{ key: 'name', label: 'Instrument', primary: true, format: (_v, row) => instrumentCell(row) },
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '8rem',
			format: (v, row) => formatMoney(v as number, row.currency)
		},
		{ key: 'yieldOnCostBps', label: 'Yield on cost', numeric: true, width: '7.5rem', format: (_v, row) => yieldCell(row) }
	];

	const getRowId = (d: DividendView) => d.id;

	// Fresh arrays each render — the table re-renders off a new reference (dogfooding #36).
	const upcomingRows = $derived([...dividends.upcoming]);
	const historyRows = $derived([...dividends.history]);

	const receivedTotal = $derived(formatMoney(dividends.receivedEurMinor, 'EUR'));
</script>

<svelte:head>
	<title>Dividends · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/invest">&larr; Investments</gok-link>
		<p class="head-eyebrow gok-eyebrow">Dividends</p>
		<h1 class="head-title gok-headline-2">Dividends</h1>
		<p class="head-caption">
			{isHistory
				? "What I've been paid — every dividend that's landed, most recent first."
				: "Dividends I'm due — the next payment from each holding that pays one."}
		</p>

		{#if isHistory}
			<div class="total">
				<p class="total-label gok-eyebrow">Total received</p>
				<p class="total-value gok-headline-3 gok-tabular-nums">{receivedTotal}</p>
			</div>
		{/if}
	</header>

	<section class="toggle" aria-label="Switch between upcoming and paid dividends">
		<gok-segmented
			label="View"
			{@attach setProps({ value: dividends.view })}
			{@attach on('change', onView)}
		>
			<gok-segmented-item value="upcoming">Upcoming</gok-segmented-item>
			<gok-segmented-item value="history">History</gok-segmented-item>
		</gok-segmented>
	</section>

	{#if isHistory}
		<gok-table
			accessible-label="Dividends I've been paid"
			{@attach setProps({ columns: historyColumns, rows: historyRows, getRowId })}
		>
			<div slot="empty" class="table-empty">
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No dividends paid yet</p>
					<p class="empty-body">No dividends have landed yet. They'll show here once the first one pays.</p>
				</gok-empty-state>
			</div>
		</gok-table>
	{:else}
		<gok-table
			accessible-label="Dividends I'm due"
			{@attach setProps({ columns: upcomingColumns, rows: upcomingRows, getRowId })}
		>
			<div slot="empty" class="table-empty">
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No upcoming dividends</p>
					<p class="empty-body">Nothing I hold is scheduled to pay a dividend right now.</p>
				</gok-empty-state>
			</div>
		</gok-table>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 60rem;
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
		max-inline-size: 50ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── History headline total ── */
	.total {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin-block-start: var(--gok-space-400);
	}

	.total-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.total-value {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* ── Toggle ── */
	.toggle {
		display: flex;
	}

	/* ── Empty state ── */
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
</style>
