<script lang="ts">
	// P07 · Requests — the track list. Every ask I've made, in a gok-table (the same
	// DOM-property + single-selection idiom as the payees grid): Note, Amount, Created,
	// a rule-led Status badge, and the Paid fraction where part-paid. Selecting a row
	// opens a gok-drawer with the shareable link + a real QR, the payer if known, the
	// paid progress, and — only while it's still Open — Cancel, which DOES take a
	// gok-dialog confirm (it withdraws a live link, so the deliberate act is guarded).
	// Status is carried by the badge's rule + word (never colour alone); the QR is
	// never the only path — the link text is always there to copy.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { requests } from '$lib/payments/requests.svelte';
	import type { PaymentRequest, RequestStatus } from '$lib/payments/requests.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import QrCode from '$lib/components/payments/QrCode.svelte';

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
		format?: (value: unknown, row: PaymentRequest) => string;
	};

	const STATUS_LABEL: Record<RequestStatus, string> = {
		open: 'Open',
		paid: 'Paid',
		expired: 'Expired',
		cancelled: 'Cancelled'
	};

	// Status by rule + word — the badge edge-rule maps to a status role, the label
	// carries the meaning. Never colour alone.
	const STATUS_VARIANT: Record<RequestStatus, string> = {
		open: 'info',
		paid: 'success',
		expired: 'warning',
		cancelled: 'neutral'
	};

	/** The Paid cell: the fraction where part-paid, the full amount where settled, else a dash. */
	function paidLabel(row: PaymentRequest): string {
		if (requests.isPartial(row)) {
			return `${formatMoney(row.paidMinor, row.currency)} of ${formatMoney(row.amountMinor, row.currency)}`;
		}
		if (row.status === 'paid') return formatMoney(row.paidMinor, row.currency);
		return '—';
	}

	const columns: Column[] = [
		{ key: 'note', label: 'Note', primary: true, sortable: true },
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '9rem',
			sortable: true,
			format: (_v, row) =>
				row.payerChoosesAmount ? 'They choose' : formatMoney(row.amountMinor, row.currency)
		},
		{
			key: 'createdIso',
			label: 'Created',
			width: '9rem',
			sortable: true,
			format: (v) => formatDate(v as string)
		},
		{ key: 'status', label: 'Status', width: '8rem' },
		{ key: 'paidMinor', label: 'Paid', width: '11rem', format: (_v, row) => paidLabel(row) }
	];

	const getRowId = (r: PaymentRequest) => r.id;

	// A status cell renders a gok-badge node (rule + word); everything else falls
	// back to the column's `format` (or the raw value). renderCell overrides the
	// default pipeline, so each column is handled here.
	function renderCell(column: Column, row: PaymentRequest): Node | string {
		if (column.key === 'status') {
			const badge = document.createElement('gok-badge');
			badge.setAttribute('variant', STATUS_VARIANT[row.status]);
			badge.setAttribute('size', 's');
			badge.textContent = STATUS_LABEL[row.status];
			return badge;
		}
		const raw = (row as unknown as Record<string, unknown>)[column.key];
		return column.format ? column.format(raw, row) : raw == null ? '' : String(raw);
	}

	// A fresh array per revision: the data layer replaces a request in place (the
	// backing array keeps its reference), so spreading gives gok-table a new `rows`
	// reference to detect — otherwise a cancel wouldn't re-render the Status cell.
	const rows = $derived([...requests.all()]);
	const openCount = $derived(requests.openCount());

	// ── Row → drawer. The table owns single selection; we mirror it so closing the
	// drawer clears it (and the same row can be reopened). ──
	let selectedIds = $state<string[]>([]);
	let drawerOpen = $state(false);
	let confirmOpen = $state(false);

	const selected = $derived(selectedIds[0] ? requests.get(selectedIds[0]) : undefined);
	const selectedLink = $derived(selected ? requests.link(selected) : '');
	const selectedAmount = $derived(
		selected
			? selected.payerChoosesAmount
				? 'They choose the amount'
				: formatMoney(selected.amountMinor, selected.currency)
			: ''
	);
	// A fixed-amount request shows a paid bar; an open-amount one only a received line.
	const showProgress = $derived(!!selected && !selected.payerChoosesAmount && selected.amountMinor > 0);

	function handleSelection(event: Event) {
		const ids = (event as CustomEvent<{ ids: string[] }>).detail.ids ?? [];
		selectedIds = ids;
		if (ids[0]) drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
		selectedIds = [];
	}

	async function copyLink() {
		if (!selected) return;
		try {
			await navigator.clipboard.writeText(requests.link(selected));
			toast('Link copied', { status: 'success' });
		} catch {
			toast('Couldn’t copy — select the link and copy it manually', { status: 'error' });
		}
	}

	// ── Cancel · withdraws a live link, so it's confirmed in a danger dialog. ──
	function askCancel() {
		confirmOpen = true;
	}
	function dismissCancel() {
		confirmOpen = false;
	}
	function confirmCancel() {
		if (selected) requests.cancel(selected.id);
		confirmOpen = false;
		closeDrawer();
	}
</script>

<svelte:head>
	<title>Requests · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div class="head-text">
			<p class="head-eyebrow gok-eyebrow">Payments</p>
			<h1 class="head-title gok-headline-2">Requests</h1>
			<p class="head-sub">
				Everyone I've asked to pay me. {openCount}
				{openCount === 1 ? 'request' : 'requests'} still open.
			</p>
		</div>
		<gok-link href="/payments/request/1" class="add-link">
			<gok-button variant="primary">New request</gok-button>
		</gok-link>
	</header>

	<gok-table
		selection-mode="single"
		accessible-label="My payment requests"
		{@attach setProps({ columns, rows, getRowId, renderCell, selection: selectedIds })}
		{@attach on('gok-selection-change', handleSelection)}
	>
		<div slot="caption" class="caption">
			<p class="caption-eyebrow gok-eyebrow">Track</p>
			<h2 class="caption-title gok-headline-5">My requests</h2>
		</div>

		<div slot="empty" class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No requests yet</p>
				<p class="empty-body">Ask for your first — I'll make a link and a QR I can share.</p>
				<gok-link slot="actions" href="/payments/request/1">
					<gok-button variant="primary">New request</gok-button>
				</gok-link>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<!-- Row detail · link + QR + payer + progress, and Cancel while still Open. -->
<gok-drawer
	placement="end"
	heading="Request"
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if selected}
		<div class="detail">
			<div class="detail-top">
				<h3 class="detail-note gok-headline-5">{selected.note}</h3>
				<p class="detail-amount gok-tabular-nums">{selectedAmount}</p>
				<gok-badge variant={STATUS_VARIANT[selected.status]} size="s">
					{STATUS_LABEL[selected.status]}
				</gok-badge>
			</div>

			<div class="link-block">
				<gok-input
					label="Shareable link"
					readonly
					{@attach setProps({ value: selectedLink })}
				></gok-input>
				<gok-button variant="secondary" {@attach on('click', copyLink)}>Copy link</gok-button>
			</div>

			<div class="qr-block">
				<QrCode value={selectedLink} label={`QR code for my request: ${selected.note}`} size="10rem" />
				<p class="qr-note">Scan to open the link. The link text above always works too.</p>
			</div>

			{#if showProgress}
				<div class="progress-block">
					<gok-progress
						format="percent"
						label="Paid"
						{@attach setProps({ value: selected.paidMinor, max: selected.amountMinor })}
					></gok-progress>
					<p class="progress-money gok-tabular-nums">
						{formatMoney(selected.paidMinor, selected.currency)} of
						{formatMoney(selected.amountMinor, selected.currency)}
					</p>
				</div>
			{:else if selected.paidMinor > 0}
				<p class="received gok-tabular-nums">
					Received {formatMoney(selected.paidMinor, selected.currency)} so far.
				</p>
			{/if}

			<dl class="meta">
				<div class="meta-row">
					<dt>Created</dt>
					<dd>{formatDate(selected.createdIso)}</dd>
				</div>
				{#if selected.expiryIso}
					<div class="meta-row">
						<dt>Expires</dt>
						<dd>{formatDate(selected.expiryIso)}</dd>
					</div>
				{/if}
				{#if selected.payer}
					<div class="meta-row">
						<dt>Payer</dt>
						<dd>{selected.payer}</dd>
					</div>
				{/if}
			</dl>
		</div>
	{/if}

	<div slot="footer" class="drawer-footer">
		{#if selected?.status === 'open'}
			<gok-button variant="secondary" {@attach on('click', askCancel)}>Cancel request</gok-button>
		{:else}
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Close</gok-button>
		{/if}
	</div>
</gok-drawer>

<!-- Cancel confirm · withdrawing a live link is the guarded act (danger, no scrim dismiss). -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Cancel this request?"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
	{@attach on('gok-cancel', dismissCancel)}
	{@attach on('gok-close', dismissCancel)}
>
	<p class="confirm-body">
		Cancel <strong>“{selected?.note ?? ''}”</strong>? The link stops working — anyone I've shared it
		with won't be able to pay.
	</p>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', dismissCancel)}>Keep it</gok-button>
		<button type="button" class="danger-confirm" onclick={confirmCancel}>Cancel request</button>
	</div>
</gok-dialog>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.head-text {
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

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

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

	/* --- Drawer detail --- */
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.detail-top {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.detail-note {
		margin: 0;
		color: var(--gok-color-text);
	}

	.detail-amount {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.link-block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.qr-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-200);
	}

	.qr-note {
		margin: 0;
		max-inline-size: 16rem;
		text-align: center;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.progress-block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.progress-money,
	.received {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.meta-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.meta-row:first-child {
		border-block-start: none;
	}

	.meta-row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.meta-row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.drawer-footer {
		display: flex;
		justify-content: flex-end;
		inline-size: 100%;
	}

	/* --- Cancel confirm --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* The destructive confirm: status-error outline/text, never a solid red fill. */
	.danger-confirm {
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
		transition: background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.danger-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.danger-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
