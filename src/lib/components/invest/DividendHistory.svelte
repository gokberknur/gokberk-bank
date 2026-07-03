<script lang="ts">
	// V09 · Per-instrument dividend history — the income record an investor reads on the detail
	// page before they trade. Reuses the V06 dividend dataset (getDividendHistoryForSymbol) joined
	// to the portfolio cost basis for yield-on-cost, so nothing here is fabricated. Built on the
	// shared RecordList composite (CV-LAY-5): a real gok-table on desktop, stacked record-cards
	// below ~40rem so nothing clips on a phone. Display-only (no onselect — rows are inert). Cells
	// are formatted STRINGS only; yield-on-cost reads "—" when the position isn't held, so the cell
	// never lies about a yield I'm not earning. A non-payer (crypto, growth stock, un-held name)
	// falls through to a quiet inline "has not paid a dividend" line. The host page owns the section
	// heading; this owns the table + the running total received.
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import {
		getDividendHistoryForSymbol,
		getDividendsReceivedForSymbolEurMinor
	} from '$lib/data/dividends-data';
	import type { DividendView } from '$lib/data/dividends-data';
	import { formatMoney, formatPercent, formatDate } from '$lib/format';

	let { symbol }: { symbol: string } = $props();

	const rows = $derived(getDividendHistoryForSymbol(symbol));
	const receivedEurMinor = $derived(getDividendsReceivedForSymbolEurMinor(symbol));

	// Mirrors RecordList's own (non-exported) Column shape, bound to DividendView so the
	// format callbacks read fields off a typed row.
	type Column = {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: DividendView) => string;
	};

	const columns: Column[] = [
		{ key: 'exDateIso', label: 'Ex-date', primary: true, format: (_v, r) => formatDate(r.exDateIso) },
		{ key: 'payDateIso', label: 'Pay date', format: (_v, r) => formatDate(r.payDateIso) },
		{
			key: 'amountEurMinor',
			label: 'Amount',
			numeric: true,
			format: (_v, r) => formatMoney(r.amountEurMinor, 'EUR')
		},
		{
			key: 'yieldOnCostBps',
			label: 'Yield on cost',
			numeric: true,
			format: (_v, r) => (r.yieldOnCostBps == null ? '—' : formatPercent(r.yieldOnCostBps / 10000))
		}
	];

	const getRowId = (r: DividendView) => r.exDateIso + r.payDateIso;
</script>

{#if rows.length === 0}
	<p class="empty-line">This instrument has not paid a dividend.</p>
{:else}
	<RecordList {columns} {rows} {getRowId} accessibleLabel="Dividend history" />
	<p class="total-line">
		Total received <span class="total-value gok-tabular-nums">{formatMoney(receivedEurMinor, 'EUR')}</span>
	</p>
{/if}

<style>
	/* Quiet inline empty — a muted line, not a big empty card (per spec). */
	.empty-line {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Quiet running total — a mono/muted caption below the table. */
	.total-line {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	.total-value {
		color: var(--gok-color-text);
	}
</style>
