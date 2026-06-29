<script lang="ts">
	// V04 · The orders blotter — the management half of the invest loop. The ticket
	// (V03) places orders; this lists and manages them. One gok-table whose
	// columns/rows/sort/selection are handed in as DOM **properties** (setProps) —
	// never attributes, never `bind:` on a gok-* element. Cells are formatted STRINGS
	// only (dogfooding #11/#23), so status reads as rule + mark + text inside the
	// string ("● Working" / "✓ Filled" / "✕ Cancelled") — never colour alone. A row
	// click opens a detail drawer with the full ledger; a working order can be
	// modified or cancelled from there. The cancel is a forced-decision dialog nested
	// inside the drawer.
	import { goto } from '$app/navigation';
	import { invest } from '$lib/state/invest.svelte';
	import {
		ORDER_KIND_LABELS,
		ORDER_STATUS_LABELS,
		type Order,
		type OrderKind,
		type OrderSide,
		type OrderStatus
	} from '$lib/data/market';
	import type { Currency } from '$lib/data/money';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatNumber, formatDate } from '$lib/format';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// The table's controlled-sort shape (mirrors the DS `GokTableSort`).
	type TableSort = { key: string; direction: 'asc' | 'desc' };

	// ── Status presentation: rule + mark + text (never hue alone) ──
	// A filled disc rests, a hollow clock waits in queue, a check settled, a cross was
	// pulled, a slashed disc was bounced. The word always follows the glyph.
	const STATUS_MARK: Record<OrderStatus, string> = {
		working: '●',
		queued: '◔',
		filled: '✓',
		cancelled: '✕',
		rejected: '⊘'
	};
	const STATUS_NOTE: Record<OrderStatus, string> = {
		working: 'Resting until it triggers or I cancel it.',
		queued: 'The market is closed — this runs at the next open.',
		filled: 'Executed against the market.',
		cancelled: 'Cancelled — nothing was bought or sold.',
		rejected: 'Rejected — nothing was bought or sold.'
	};
	function statusCell(status: OrderStatus): string {
		return `${STATUS_MARK[status]} ${ORDER_STATUS_LABELS[status]}`;
	}

	const TIF_LABELS: Record<Order['tif'], string> = {
		day: 'Day',
		gtc: 'Good till cancelled'
	};

	function sideLabel(side: OrderSide): string {
		return side === 'buy' ? 'Buy' : 'Sell';
	}

	function currencyOf(symbol: string): Currency {
		return invest.instrument(symbol)?.currency ?? 'EUR';
	}

	// ── Status filter (a radiogroup via gok-segmented) ──
	type StatusFilter = 'all' | 'working' | 'filled' | 'cancelled';
	let filter = $state<StatusFilter>('all');

	function onFilter(e: Event) {
		filter = (e.target as HTMLElement & { value: string }).value as StatusFilter;
	}

	const allOrders = $derived(invest.recentOrders);
	const hasOrders = $derived(allOrders.length > 0);

	// Working groups working + queued (both still live); Cancelled groups cancelled +
	// rejected (both terminal non-fills). The blotter filters in the route.
	const filtered = $derived.by(() => {
		switch (filter) {
			case 'working':
				return allOrders.filter((o) => o.status === 'working' || o.status === 'queued');
			case 'filled':
				return allOrders.filter((o) => o.status === 'filled');
			case 'cancelled':
				return allOrders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
			default:
				return allOrders;
		}
	});

	const emptyFilterLabel = $derived(
		filter === 'working'
			? 'working'
			: filter === 'filled'
				? 'filled'
				: filter === 'cancelled'
					? 'cancelled'
					: ''
	);

	// ── Table: columns + controlled sort ──
	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: Order) => string;
	};

	const columns: Column[] = [
		{ key: 'placedAt', label: 'Placed', sortable: true, width: '7.5rem', format: (v) => formatDate(v as string) },
		{ key: 'symbol', label: 'Symbol', primary: true, sortable: true, width: '6rem' },
		{ key: 'side', label: 'Side', width: '5rem', format: (v) => sideLabel(v as OrderSide) },
		{ key: 'kind', label: 'Type', width: '6rem', format: (v) => ORDER_KIND_LABELS[v as OrderKind] },
		{ key: 'quantity', label: 'Qty', numeric: true, width: '5.5rem', format: (v) => formatNumber(v as number) },
		{
			key: 'priceMinor',
			label: 'Limit',
			numeric: true,
			width: '8rem',
			format: (v, row) => (v == null ? '—' : formatMoney(v as number, currencyOf(row.symbol)))
		},
		{ key: 'status', label: 'Status', sortable: true, width: '8.5rem', format: (v) => statusCell(v as OrderStatus) }
	];

	const getRowId = (o: Order) => o.id;

	// Controlled sort lives in the route; the table reflects it in the header chevron
	// and orders the rows. `gok-sort` cycles asc → desc → unsorted (null direction).
	let sort = $state<TableSort | null>(null);

	function onSort(e: Event) {
		const detail = (e as CustomEvent<{ key: string | null; direction: 'asc' | 'desc' | null }>).detail;
		sort = detail.key && detail.direction ? { key: detail.key, direction: detail.direction } : null;
	}

	// ── Row → detail drawer ──
	// Capture the grid node (via an attachment, not `bind:this`) so focus can return
	// to it when the drawer closes — the row the drawer was opened from.
	let tableEl: HTMLElement | undefined;
	function captureTable(node: HTMLElement) {
		tableEl = node;
		return () => {
			tableEl = undefined;
		};
	}

	let selectedId = $state<string | null>(null);
	const selectedOrder = $derived<Order | null>(
		selectedId ? (allOrders.find((o) => o.id === selectedId) ?? null) : null
	);
	const drawerOpen = $derived(selectedOrder !== null);
	// A working order is the only state I can still manage.
	const isWorking = $derived(selectedOrder?.status === 'working');

	function onSelection(e: Event) {
		const id = (e as CustomEvent<{ ids: string[] }>).detail.ids?.[0];
		if (id) selectedId = id;
	}

	function closeDrawer() {
		selectedId = null;
		modifyMode = false;
		cancelOpen = false;
		// Return focus to the grid (the row the drawer was opened from).
		tableEl?.focus();
	}

	// ── Modify (working orders only) ──
	let modifyMode = $state(false);
	let modifyQty = $state(0);
	let modifyLimit = $state(0); // minor units, instrument currency
	let modifyError = $state('');

	function openModify() {
		const o = selectedOrder;
		if (!o) return;
		modifyQty = o.quantity;
		modifyLimit = o.priceMinor ?? 0;
		modifyError = '';
		modifyMode = true;
	}

	function cancelModify() {
		modifyMode = false;
		modifyError = '';
	}

	function onQtyInput(e: Event) {
		const n = Number((e.target as HTMLInputElement).value);
		modifyQty = Number.isFinite(n) && n > 0 ? n : 0;
		if (modifyError) modifyError = '';
	}

	function onLimitChange(minor: number) {
		modifyLimit = minor;
		if (modifyError) modifyError = '';
	}

	function saveModify() {
		const o = selectedOrder;
		if (!o) return;
		const priced = o.kind === 'limit' || o.kind === 'stop';
		if (modifyQty <= 0) {
			modifyError = 'I need a quantity above zero.';
			return;
		}
		if (priced && modifyLimit <= 0) {
			modifyError = 'I need a price above zero.';
			return;
		}
		const ok = invest.modifyOrder(o.id, {
			quantity: modifyQty,
			priceMinor: priced ? modifyLimit : undefined
		});
		if (!ok) {
			modifyError = "I couldn't update this order.";
			return;
		}
		modifyMode = false;
	}

	// ── Cancel (forced-decision dialog nested in the drawer) ──
	let cancelOpen = $state(false);

	function openCancel() {
		cancelOpen = true;
	}

	function closeCancel() {
		cancelOpen = false;
	}

	function confirmCancel() {
		const o = selectedOrder;
		if (!o) return;
		invest.cancelOrder(o.id);
		cancelOpen = false;
		// The drawer stays open: `selectedOrder` re-derives to the now-cancelled order,
		// the actions fall away, and the row moves to Cancelled live.
	}
</script>

<svelte:head>
	<title>My orders · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/invest">&larr; Investments</gok-link>
		<p class="head-eyebrow gok-eyebrow">Orders</p>
		<h1 class="head-title gok-headline-2">My orders</h1>
		<p class="head-caption">Every order I've placed — working, filled, or pulled.</p>
	</header>

	{#if !hasOrders}
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No orders yet</p>
				<p class="empty-body">No orders yet. I can place one from any instrument.</p>
				<gok-button slot="actions" variant="primary" {@attach on('click', () => goto('/invest'))}>
					Go to investments
				</gok-button>
			</gok-empty-state>
		</section>
	{:else}
		<section class="filter" aria-label="Filter orders by status">
			<gok-segmented
				label="Status"
				{@attach setProps({ value: filter })}
				{@attach on('change', onFilter)}
			>
				<gok-segmented-item value="all">All</gok-segmented-item>
				<gok-segmented-item value="working">Working</gok-segmented-item>
				<gok-segmented-item value="filled">Filled</gok-segmented-item>
				<gok-segmented-item value="cancelled">Cancelled</gok-segmented-item>
			</gok-segmented>
		</section>

		<gok-table
			selection-mode="single"
			accessible-label="My orders"
			{@attach captureTable}
			{@attach setProps({
				columns,
				rows: filtered,
				getRowId,
				sort,
				selection: selectedId ? [selectedId] : []
			})}
			{@attach on('gok-sort', onSort)}
			{@attach on('gok-selection-change', onSelection)}
		>
			<div slot="empty" class="table-empty">
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No {emptyFilterLabel} orders</p>
					<p class="empty-body">Nothing matches this filter right now.</p>
					<gok-button
						slot="actions"
						variant="secondary"
						{@attach on('click', () => (filter = 'all'))}
					>
						Show all orders
					</gok-button>
				</gok-empty-state>
			</div>
		</gok-table>
	{/if}
</div>

<!-- Detail drawer — the full order ledger; a working order can be modified or cancelled. -->
<gok-drawer
	placement="end"
	heading={selectedOrder ? `${selectedOrder.symbol} order` : 'Order'}
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if selectedOrder}
		{@const o = selectedOrder}
		{@const priced = o.kind === 'limit' || o.kind === 'stop'}

		{#if modifyMode}
			<!-- Modify · amend the resting price and/or quantity, then re-validate. -->
			<form class="modify" onsubmit={(e) => e.preventDefault()}>
				<p class="modify-lead">
					Amend my {sideLabel(o.side).toLowerCase()} of {o.symbol}. It keeps resting until it triggers
					or I cancel it.
				</p>

				<div class="field">
					<gok-input
						type="number"
						inputmode="decimal"
						label="Quantity"
						min="0"
						step={invest.instrument(o.symbol)?.fractionalAllowed ? 'any' : '1'}
						reserve-message
						{@attach setProps({ value: String(modifyQty) })}
						{@attach on('input', onQtyInput)}
						{@attach on('change', onQtyInput)}
					></gok-input>
				</div>

				{#if priced}
					<div class="field">
						<MoneyInput
							bind:value={modifyLimit}
							currency={currencyOf(o.symbol)}
							label={o.kind === 'limit' ? 'Limit price' : 'Stop price'}
							onchange={onLimitChange}
						/>
					</div>
				{/if}

				<p class="form-message" role="alert" aria-live="polite">{modifyError}</p>
			</form>

			<div slot="footer" class="drawer-actions">
				<gok-button variant="secondary" {@attach on('click', cancelModify)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', saveModify)}>Save changes</gok-button>
			</div>
		{:else}
			<!-- Ledger · the full order, read-only. -->
			<div class="ledger-wrap">
				<div class="status" data-status={o.status}>
					<span class="status-line">
						<span class="status-mark" aria-hidden="true">{STATUS_MARK[o.status]}</span>
						<span class="status-word">{ORDER_STATUS_LABELS[o.status]}</span>
					</span>
					<span class="status-note">{STATUS_NOTE[o.status]}</span>
				</div>

				<dl class="ledger">
					<div class="row">
						<dt>Instrument</dt>
						<dd>
							<span class="sym">{o.symbol}</span>
							<span class="sym-name">{invest.instrument(o.symbol)?.name ?? o.symbol}</span>
						</dd>
					</div>
					<div class="row">
						<dt>Side</dt>
						<dd>{sideLabel(o.side)}</dd>
					</div>
					<div class="row">
						<dt>Type</dt>
						<dd>{ORDER_KIND_LABELS[o.kind]}</dd>
					</div>
					<div class="row">
						<dt>Quantity</dt>
						<dd class="gok-tabular-nums">{formatNumber(o.quantity)}</dd>
					</div>
					<div class="row">
						<dt>{o.kind === 'stop' ? 'Stop price' : 'Limit price'}</dt>
						<dd class="gok-tabular-nums">
							{o.priceMinor == null ? '—' : formatMoney(o.priceMinor, currencyOf(o.symbol))}
						</dd>
					</div>
					<div class="row">
						<dt>Time in force</dt>
						<dd>{TIF_LABELS[o.tif]}</dd>
					</div>
					<div class="row total">
						<dt>Estimated total</dt>
						<dd class="gok-tabular-nums">{formatMoney(o.totalEurMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Placed</dt>
						<dd>{formatDate(o.placedAt)}</dd>
					</div>
				</dl>
			</div>

			{#if isWorking}
				<div slot="footer" class="drawer-actions">
					<button type="button" class="status-cancel" onclick={openCancel}>Cancel order</button>
					<gok-button variant="primary" {@attach on('click', openModify)}>Modify</gok-button>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Forced decision · cancelling an order. Nested in the drawer (see closeDrawer guard). -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Cancel my order?"
		no-dismiss
		{@attach setProps({ open: cancelOpen })}
		{@attach on('gok-cancel', closeCancel)}
		{@attach on('gok-close', closeCancel)}
	>
		{#if selectedOrder}
			<p class="confirm-body">
				This pulls my {selectedOrder.symbol}
				{sideLabel(selectedOrder.side).toLowerCase()} order. It won't execute.
			</p>
		{/if}

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', closeCancel)}>Keep order</gok-button>
			<!-- Destructive confirm: outline/text in the status colour, never a solid red fill
			     (the .status-confirm idiom from PayoffDialog). App-local <button>. -->
			<button type="button" class="status-confirm" onclick={confirmCancel}>Cancel order</button>
		</div>
	</gok-dialog>
</gok-drawer>

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
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Filter ── */
	.filter {
		display: flex;
	}

	/* ── Empty states ── */
	.empty {
		padding-block: var(--gok-space-700);
	}

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

	/* ── Drawer: status block ── */
	.ledger-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.status {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.status-line {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.status-mark {
		font-size: 0.8em;
	}

	/* The status role lands on the mark+word only — the glyph + word already carry it
	   (rule + mark + text), so colour is reinforcement, never the sole signal. */
	.status[data-status='working'] .status-line,
	.status[data-status='filled'] .status-line {
		color: var(--gok-color-status-success);
	}

	.status[data-status='cancelled'] .status-line,
	.status[data-status='rejected'] .status-line {
		color: var(--gok-color-text-muted);
	}

	.status-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Drawer: ledger ── */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row.total {
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row.total dt,
	.row.total dd {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sym {
		font-family: var(--gok-font-family-mono);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sym-name {
		font-size: var(--gok-font-size-50);
		color: var(--gok-color-text-muted);
	}

	/* ── Drawer: modify form ── */
	.modify {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.modify-lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	/* Reserved message line so a validation error never reflows the form. */
	.form-message {
		min-block-size: var(--gok-type-caption-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-status-error);
	}

	/* ── Drawer + dialog action rows ── */
	.drawer-actions,
	.confirm-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* Destructive confirm/cancel — outline/text in the status colour, transparent fill,
	   never a solid red fill (the PayoffDialog idiom). App-local <button> so the rule
	   holds without restyling a DS component. */
	.status-confirm,
	.status-cancel {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.5rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-error);
		border-radius: var(--gok-radius-s);
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		transition:
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.status-confirm:hover,
	.status-cancel:hover {
		background: var(--gok-color-surface-strong);
	}

	.status-confirm:focus-visible,
	.status-cancel:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
