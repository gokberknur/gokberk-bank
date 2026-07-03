<script lang="ts">
	// V12 · Per-position contribution to total return. A ranked list of each holding's share of
	// the portfolio's unrealized return (bps of cost), biggest drivers and drags first. Built on
	// the shared RecordList composite (CV-LAY-5): a real gok-table on desktop, stacked
	// record-cards below ~40rem so nothing clips on a phone. Cells are formatted STRINGS only —
	// so direction is carried by a leading ▲/▼ glyph + the explicit +/− in the value (rule +
	// sign + icon), never colour alone; RecordList cells can't host colour and that's intentional.
	// A row opens the instrument. The host page owns the section heading/eyebrow; this owns the list.
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import type { PositionContribution } from '$lib/data/portfolio';
	import { formatMoney, formatPercent } from '$lib/format';
	import { goto } from '$app/navigation';

	let { items }: { items: PositionContribution[] } = $props();

	// Mirrors RecordList's own Column shape (not exported), with the row bound to
	// PositionContribution so the format callbacks read fields off a typed row.
	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: PositionContribution) => string;
	};

	const columns: Column[] = [
		{ key: 'symbol', label: 'Holding', primary: true },
		{ key: 'name', label: 'Name' },
		{
			key: 'contributionBps',
			label: 'Contribution',
			numeric: true,
			sortable: true,
			format: (_v, r) => `${r.contributionBps >= 0 ? '▲' : '▼'} ${formatPercent(r.contributionBps / 10000)}`
		},
		{
			key: 'plEurMinor',
			label: 'P/L',
			numeric: true,
			sortable: true,
			format: (_v, r) =>
				`${r.plEurMinor >= 0 ? '▲' : '▼'} ${formatMoney(r.plEurMinor, 'EUR', { signDisplay: true })}`
		}
	];
</script>

<RecordList
	{columns}
	rows={items}
	getRowId={(r) => r.symbol}
	selectionMode="none"
	onselect={(r) => goto(`/invest/instrument/${r.symbol}`)}
	accessibleLabel="Contribution to total return by holding"
>
	{#snippet empty()}
		<gok-empty-state>
			<p class="empty-title gok-headline-6">No contributions yet</p>
			<p class="empty-body">Once you hold and trade, contributions appear here.</p>
		</gok-empty-state>
	{/snippet}
</RecordList>

<style>
	.empty-title {
		margin-block-end: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.empty-body {
		color: var(--gok-color-text-muted);
	}
</style>
