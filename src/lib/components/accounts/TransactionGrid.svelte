<script lang="ts">
	// A clickable ledger over the wallet's transactions, via RecordList: a real
	// <gok-table> on desktop (>=40rem) and a stacked record-card list on mobile.
	// A full-row click or Enter opens the detail drawer through gok-table's
	// row-activate event → onselect (rows stay keyboard-accessible); there is no
	// selection checkbox column — the table runs selection-mode="none". The
	// running-balance column reads true only in the seed's canonical date-desc
	// order, so it blanks to an em dash for pending rows and whenever the table is
	// sorted off that order (see displayRows below). `columns`/`rows`/`getRowId`
	// are handed in as DOM **properties**; cells render formatted **strings** only.
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import { formatMoney, formatDayMonth } from '$lib/format';
	import type { Currency } from '$lib/data/money';
	import type { Transaction, TxnType } from '$lib/data/types';

	let {
		rows,
		currency,
		total,
		scopedTotal,
		selectedId = null,
		onselect
	}: {
		rows: Transaction[];
		currency: Currency;
		total: number;
		scopedTotal: number;
		selectedId?: string | null;
		onselect: (txn: Transaction) => void;
	} = $props();

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: Transaction) => string;
	};

	/** "groceries" → "Groceries". */
	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	const TYPE_LABELS: Record<TxnType, string> = {
		card: 'Card',
		sepa: 'SEPA',
		swift: 'SWIFT',
		transfer: 'Transfer',
		fee: 'Fee',
		topup: 'Top-up',
		fx: 'Exchange'
	};

	function typeLabel(t: TxnType): string {
		return TYPE_LABELS[t];
	}

	// Columns close over `currency`, so they re-derive if the wallet's currency
	// changes while the component stays mounted (e.g. navigating between wallets).
	const columns = $derived<Column[]>([
		{ key: 'date', label: 'Date', sortable: true, width: '6.5rem', format: (v) => formatDayMonth(v as string) },
		{ key: 'merchant', label: 'Description', primary: true, sortable: true },
		{ key: 'category', label: 'Category', width: '8rem', format: (v) => capitalize(v as string) },
		{ key: 'type', label: 'Type', width: '6rem', format: (v) => typeLabel(v as TxnType) },
		{ key: 'status', label: 'Status', width: '7rem', format: (v) => (v === 'pending' ? 'Pending' : 'Settled') },
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			sortable: true,
			width: '8.5rem',
			format: (v) => formatMoney(v as number, currency, { signDisplay: true })
		},
		{ key: 'runningBalanceMinor', label: 'Balance', numeric: true, width: '8.5rem', format: (v) => (Number.isNaN(v as number) ? '—' : formatMoney(v as number, currency)) }
	]);

	// Tracks gok-table's current sort, forwarded by RecordList; null when unsorted.
	let sort = $state<{ key: string; direction: 'asc' | 'desc' } | null>(null);

	// A running balance is a settled-ledger concept that only reads true in the seed's default
	// date-desc order. Blank it for pending rows (ACC-Q-02) AND whenever the table is sorted off
	// that canonical order — NaN is the sentinel the Balance column's format renders as an em dash.
	const canonical = $derived(sort === null || (sort.key === 'date' && sort.direction === 'desc'));
	const displayRows = $derived(
		rows.map((r) =>
			canonical && r.status === 'settled' ? r : { ...r, runningBalanceMinor: Number.NaN }
		)
	);

	const getRowId = (r: Transaction) => r.id;

	function handleActivate(row: Transaction) {
		const t = rows.find((r) => r.id === row.id);
		if (t) onselect(t);
	}
</script>

<RecordList
	columns={columns}
	rows={displayRows}
	getRowId={getRowId}
	selectionMode="none"
	selectedId={selectedId}
	onselect={handleActivate}
	onsort={(s) => (sort = s)}
	paginated
	pageSize={25}
	accessibleLabel="Transactions"
>
	{#snippet caption()}
		<div class="caption">
			<p class="caption-eyebrow gok-eyebrow">Ledger</p>
			<h2 class="caption-title gok-headline-5">Transactions</h2>
			<p class="caption-count gok-tabular-nums">Showing {total} of {scopedTotal}</p>
		</div>
	{/snippet}
	{#snippet empty()}
		<div class="empty">
			{#if scopedTotal === 0}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No transactions yet</p>
					<p class="empty-body">When money moves in this wallet, it shows up here.</p>
				</gok-empty-state>
			{:else}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No matching transactions</p>
					<p class="empty-body">
						No rows match your search and filters. Clear them above to see the full ledger again.
					</p>
				</gok-empty-state>
			{/if}
		</div>
	{/snippet}
</RecordList>

<style>
	.caption {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.caption-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.caption-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.caption-count {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.empty {
		padding-block: var(--gok-space-500);
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
</style>
