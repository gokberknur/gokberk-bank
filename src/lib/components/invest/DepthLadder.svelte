<script lang="ts">
	// V09 · Simulated order-book depth. A two-sided bid/ask ladder of deterministic levels around the
	// last price, explicitly labelled "Simulated depth — not a live order book." — it never pretends to
	// be a live book. Built on the shared RecordList composite (CV-LAY-5): a real gok-table at >=40rem,
	// stacked inert record-cards below, so nothing clips on a phone. It is DISPLAY-ONLY — no onselect,
	// so there is no row navigation and no selection checkboxes; on mobile the rows render as inert
	// cards. Rows are ordered outward from the mid: the asks nearest the mid first (price ascending),
	// then the bids nearest the mid first (price descending). Direction is a WORD ("Ask"/"Bid"), never
	// colour alone. The host page owns the section heading; this owns the caption + ladder.
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import { buildDepth, type DepthLevel } from '$lib/invest/depth';
	import type { Instrument } from '$lib/data/market';
	import { formatMoney, formatNumber } from '$lib/format';

	let { inst, marketOpen }: { inst: Instrument; marketOpen: boolean } = $props();

	const depth = $derived(buildDepth(inst));

	// The book reads outward from the mid: asks nearest the mid first (price ascending, i.e. best ask
	// leading), then bids nearest the mid first (price descending, i.e. best bid leading). buildDepth
	// already returns each side in that near-to-far order, so a plain concat is the display order.
	const rows = $derived<DepthLevel[]>([...depth.asks, ...depth.bids]);

	// Mirrors RecordList's own (non-exported) Column shape, with the row bound to DepthLevel so the
	// format callbacks read fields off a typed row. Cells are formatted STRINGS only — direction is a
	// word, prices/sizes are tabular numerals; RecordList cells can't host colour and that's intentional.
	type Column = {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		format?: (value: unknown, row: DepthLevel) => string;
	};

	const columns = $derived<Column[]>([
		{ key: 'side', label: 'Side', primary: true, format: (_v, r) => (r.side === 'ask' ? 'Ask' : 'Bid') },
		{
			key: 'priceMinor',
			label: 'Price',
			numeric: true,
			format: (_v, r) => formatMoney(r.priceMinor, inst.currency)
		},
		{ key: 'size', label: 'Size', numeric: true, format: (_v, r) => formatNumber(r.size) }
	]);
</script>

<RecordList
	{columns}
	{rows}
	getRowId={(r) => r.side + '-' + r.priceMinor}
	accessibleLabel="Simulated order-book depth"
>
	{#snippet caption()}
		<p class="sim-note">Simulated depth — not a live order book.</p>
		<p class="depth-meta gok-tabular-nums">
			<span>Spread {formatMoney(depth.spreadMinor, inst.currency)}</span>
			<span>Mid {formatMoney(depth.midMinor, inst.currency)}</span>
		</p>
		{#if !marketOpen}
			<p class="closed-note">Market closed — showing levels around the last close.</p>
		{/if}
	{/snippet}
</RecordList>

<style>
	.sim-note {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.depth-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-100) var(--gok-space-400);
		margin-block-start: var(--gok-space-100);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.closed-note {
		margin-block-start: var(--gok-space-100);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
