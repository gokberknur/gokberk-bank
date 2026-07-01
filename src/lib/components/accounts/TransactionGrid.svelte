<script lang="ts">
	// A clickable record-row ledger over the wallet's transactions, via RecordList
	// with `alwaysRows` — clicking anywhere on a row opens the detail drawer, and
	// rows are keyboard-accessible. It no longer uses gok-table on desktop because
	// gok-table has no row-activate event / full-row click target (design-system
	// gap, docs/dogfooding/findings.md #12). `columns`/`rows`/`getRowId` are still
	// handed in as DOM **properties**; cells render formatted **strings** only.
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

	// A running balance is a settled-ledger concept. Pending rows haven't posted (the seed
	// stamps them with the current settled balance), so blank their Balance cell — NaN is the
	// sentinel the Balance column's format renders as an em dash (ACC-Q-02).
	const displayRows = $derived(
		rows.map((r) => (r.status === 'settled' ? r : { ...r, runningBalanceMinor: Number.NaN }))
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
	alwaysRows
	selectedId={selectedId}
	onselect={handleActivate}
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
