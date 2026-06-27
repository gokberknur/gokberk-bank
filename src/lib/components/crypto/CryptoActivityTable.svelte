<script lang="ts">
	// V07 · On-chain-style activity ledger. One gok-table whose columns/rows are handed
	// in as DOM properties (setProps) — never attributes, because objects/arrays can't
	// survive attribute stringification. Cells are formatted STRINGS only (dogfooding
	// #11): the table can't host a node, so status reads as rule + mark + text inside
	// the string ("● Confirmed" / "◐ Confirming" / "○ Pending" / "⊘ Failed"), and the
	// amount carries its own sign — never colour alone. When + Type sort (the table
	// owns sorting). Newest-first as the data layer returns it.
	import {
		CRYPTO_TX_TYPE_LABELS,
		CRYPTO_TX_STATUS_LABELS,
		formatUnits,
		type CryptoTx,
		type CryptoTxStatus,
		type CryptoTxType
	} from '$lib/data/crypto-data';
	import { truncate } from '$lib/crypto/address';
	import { setProps } from '$lib/wc.svelte';
	import { formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';

	interface Props {
		/** The activity rows to render (newest-first, as the state returns them). */
		rows: CryptoTx[];
		/** The table's accessible label. */
		label?: string;
	}

	let { rows, label = 'Crypto activity' }: Props = $props();

	// Status as rule + mark + text — never colour alone (cells are strings only). A
	// filled disc settles, a half disc is mid-flight, a hollow disc waits, a slashed
	// disc failed; the word follows so the mark is never the only signal.
	const STATUS_MARK: Record<CryptoTxStatus, string> = {
		confirmed: '●',
		confirming: '◐',
		pending: '○',
		failed: '⊘'
	};
	function statusCell(status: CryptoTxStatus): string {
		return `${STATUS_MARK[status]} ${CRYPTO_TX_STATUS_LABELS[status]}`;
	}

	// Amount: magnitude + asset, signed by direction. Buy/receive add (+); sell/send
	// remove (−). The sign carries direction so the column needs no hue.
	function amountCell(tx: CryptoTx): string {
		const sign = tx.type === 'buy' || tx.type === 'receive' ? '+' : '−';
		return `${sign}${formatUnits(tx.symbol, tx.units)} ${tx.symbol}`;
	}

	// Tx: a truncated hash + the confirmation count, e.g. "0x1a2b…9f3c · 6 conf".
	function txCell(tx: CryptoTx): string {
		return `${truncate(tx.hash)} · ${tx.confirmations} conf`;
	}

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: CryptoTx) => string;
	};

	const columns: Column[] = [
		{
			key: 'at',
			label: 'When',
			sortable: true,
			width: '8rem',
			format: (v) => formatRelative(v as string, TODAY)
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			width: '7rem',
			format: (v) => CRYPTO_TX_TYPE_LABELS[v as CryptoTxType]
		},
		{ key: 'symbol', label: 'Asset', primary: true, width: '6rem' },
		{ key: 'units', label: 'Amount', numeric: true, format: (_v, row) => amountCell(row) },
		{
			key: 'status',
			label: 'Status',
			width: '9rem',
			format: (v) => statusCell(v as CryptoTxStatus)
		},
		{ key: 'hash', label: 'Tx', width: '12rem', format: (_v, row) => txCell(row) }
	];

	const getRowId = (tx: CryptoTx) => tx.id;
</script>

<gok-table accessible-label={label} {@attach setProps({ columns, rows, getRowId })}>
	<div slot="empty" class="empty">
		<gok-empty-state>
			<p class="empty-title gok-headline-6">No activity yet</p>
			<p class="empty-body">
				My buys, sells, sends, and receives land here — with their status, a tx hash, and
				confirmations.
			</p>
		</gok-empty-state>
	</div>
</gok-table>

<style>
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
		max-inline-size: 40ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
</style>
