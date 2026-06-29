<script lang="ts">
	// P05 · Scheduled payments — manage. My standing orders and future-dated payments
	// in a gok-table (the same DOM-property + single-selection idiom as the payees and
	// requests grids), with a row drawer for the detail and the two controls that
	// matter: Pause and Cancel. Pause is *reversible* — a gok-switch, optimistic + a
	// toast, no dialog; Cancel is *final*, so it's gated behind a forced-decision
	// danger dialog. Status travels by the badge's rule + a glyph + the word, never
	// colour alone. rows is spread fresh each revision so a pause/cancel re-renders.
	//
	// This component backs both the index surface and the deep-linked [id] drawer —
	// the page passes `openId` and the matching row opens on mount.
	import { untrack } from 'svelte';
	import { schedule, type Frequency, type ScheduledItem } from '$lib/payments/schedule.svelte';
	import type { EffectiveStatus } from '$lib/payments/schedule.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';

	// Narrow string unions for the gok-badge / gok-icon attributes we set (the package
	// doesn't re-export these from the root; we only need the literal values).
	type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';
	type IconName = 'circle-dot' | 'minus' | 'check' | 'close';

	let { openId }: { openId?: string } = $props();

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
		format?: (value: unknown, row: ScheduledItem) => string;
	};

	// once → "One-off", weekly → "Weekly", monthly → "Monthly".
	const FREQUENCY_LABEL: Record<Frequency, string> = {
		once: 'One-off',
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	// Status by rule + glyph + word: the badge edge-rule maps to a status role, a
	// glyph reinforces it, the label carries the meaning. Never colour alone.
	const STATUS_META: Record<EffectiveStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
		scheduled: { label: 'Scheduled', variant: 'info', icon: 'circle-dot' },
		paused: { label: 'Paused', variant: 'neutral', icon: 'minus' },
		completed: { label: 'Completed', variant: 'success', icon: 'check' },
		cancelled: { label: 'Cancelled', variant: 'neutral', icon: 'close' }
	};

	/** The Next-run cell: "Paused" while held, a dash when nothing's left, else the date. */
	function nextRunLabel(item: ScheduledItem): string {
		if (schedule.isPaused(item)) return 'Paused';
		if (schedule.statusOf(item) === 'completed') return '—';
		return formatDate(schedule.nextRunIso(item));
	}

	/** The end rule in words — what the drawer reads under "Ends". */
	function endLabel(item: ScheduledItem): string {
		switch (item.end.kind) {
			case 'on-date':
				return `On ${formatDate(item.end.dateIso)}`;
			case 'after-count':
				return `After ${item.end.count} payment${item.end.count === 1 ? '' : 's'}`;
			default:
				return 'Until I cancel';
		}
	}

	const columns: Column[] = [
		{ key: 'payeeName', label: 'Payee', primary: true, sortable: true },
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '9rem',
			sortable: true,
			format: (_v, row) => formatMoney(row.amountMinor, row.currency)
		},
		{
			key: 'frequency',
			label: 'Frequency',
			width: '8rem',
			sortable: true,
			format: (v) => FREQUENCY_LABEL[v as Frequency]
		},
		{ key: 'nextRun', label: 'Next run', width: '10rem', format: (_v, row) => nextRunLabel(row) },
		{ key: 'status', label: 'Status', width: '9rem' }
	];

	const getRowId = (i: ScheduledItem) => i.id;

	// The Payee cell stacks the name over a quiet reference; the Status cell renders a
	// rule + glyph + word badge. Everything else falls back to the column's `format`.
	function renderCell(column: Column, row: ScheduledItem): Node | string {
		if (column.key === 'payeeName') {
			const wrap = document.createElement('div');
			wrap.style.display = 'flex';
			wrap.style.flexDirection = 'column';
			wrap.style.gap = 'var(--gok-space-50)';
			const name = document.createElement('span');
			name.textContent = row.payeeName;
			name.style.color = 'var(--gok-color-text)';
			const ref = document.createElement('span');
			ref.textContent = row.reference;
			ref.style.color = 'var(--gok-color-text-muted)';
			ref.style.fontSize = 'var(--gok-type-body-small-size)';
			ref.style.lineHeight = 'var(--gok-type-body-small-line)';
			wrap.append(name, ref);
			return wrap;
		}
		if (column.key === 'status') {
			const meta = STATUS_META[schedule.statusOf(row)];
			const badge = document.createElement('gok-badge');
			badge.setAttribute('variant', meta.variant);
			badge.setAttribute('size', 's');
			const icon = document.createElement('gok-icon');
			icon.setAttribute('name', meta.icon);
			icon.setAttribute('size', 's');
			icon.setAttribute('aria-hidden', 'true');
			icon.style.marginInlineEnd = 'var(--gok-space-100)';
			badge.append(icon, document.createTextNode(meta.label));
			return badge;
		}
		const raw = (row as unknown as Record<string, unknown>)[column.key];
		return column.format ? column.format(raw, row) : raw == null ? '' : String(raw);
	}

	// A fresh array per revision: the data layer replaces an item in place (the backing
	// array keeps its reference), so spreading gives gok-table a new `rows` reference to
	// detect — otherwise a pause or cancel wouldn't re-render the row. (dogfooding #36)
	const items = $derived(schedule.active());
	const rows = $derived([...items]);
	const activeCount = $derived(items.length);

	// ── Row → drawer. The table owns single selection; we mirror it so closing the
	// drawer clears it (and the same row can be reopened). A deep link seeds it. ──
	// Seed once from a deep link (initial value only — afterwards selection is purely
	// local to the table/drawer; `untrack` makes that intent explicit).
	const deepLinkId = untrack(() => (openId && schedule.get(openId) ? openId : undefined));
	let selectedIds = $state<string[]>(deepLinkId ? [deepLinkId] : []);
	let drawerOpen = $state(Boolean(deepLinkId));
	let confirmOpen = $state(false);

	const selected = $derived(selectedIds[0] ? schedule.get(selectedIds[0]) : undefined);
	const selectedWallet = $derived(selected ? schedule.walletFor(selected) : undefined);
	const selectedStatus = $derived(selected ? schedule.statusOf(selected) : 'scheduled');
	const selectedPaused = $derived(selected ? schedule.isPaused(selected) : false);
	const upcomingRuns = $derived(selected ? schedule.upcoming(selected, 4) : []);

	function handleSelection(event: Event) {
		const ids = (event as CustomEvent<{ ids: string[] }>).detail.ids ?? [];
		selectedIds = ids;
		if (ids[0]) drawerOpen = true;
	}

	function closeDrawer(e?: Event) {
		if (confirmOpen) {
			e?.preventDefault();
			return;
		}
		drawerOpen = false;
		selectedIds = [];
	}

	// ── Pause / Resume · reversible, optimistic + toast, NO dialog. Read the new state
	// straight off the switch's change event. The next-run line updates with it. ──
	function onPauseToggle(e: Event) {
		if (!selected) return;
		const paused = (e.target as HTMLElement & { checked: boolean }).checked;
		if (paused) schedule.pause(selected.id);
		else schedule.resume(selected.id);
	}

	// ── Cancel · final. Gated behind a forced-decision danger dialog; on confirm the
	// item is cancelled and the drawer closes, so the row leaves the active table. ──
	function askCancel() {
		confirmOpen = true;
	}
	function dismissCancel() {
		confirmOpen = false;
	}
	function confirmCancel() {
		if (selected) schedule.cancel(selected.id);
		confirmOpen = false;
		drawerOpen = false;
		selectedIds = [];
	}
</script>

<div class="page">
	<header class="head">
		<div class="head-text">
			<p class="head-eyebrow gok-eyebrow">Payments</p>
			<h1 class="head-title gok-headline-2">Scheduled</h1>
			<p class="head-sub">
				My standing orders and future-dated payments. {activeCount}
				{activeCount === 1 ? 'payment' : 'payments'} active.
			</p>
		</div>
		<gok-link href="/payments/scheduled/new" class="add-link">
			<gok-button variant="primary">Schedule a payment</gok-button>
		</gok-link>
	</header>

	<gok-table
		selection-mode="single"
		accessible-label="My scheduled payments"
		{@attach setProps({ columns, rows, getRowId, renderCell, selection: selectedIds })}
		{@attach on('gok-selection-change', handleSelection)}
	>
		<div slot="caption" class="caption">
			<p class="caption-eyebrow gok-eyebrow">Standing orders</p>
			<h2 class="caption-title gok-headline-5">My schedule</h2>
		</div>

		<div slot="empty" class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No scheduled payments</p>
				<p class="empty-body">Set one up and it’ll run on its own — I can pause or cancel anytime.</p>
				<gok-link slot="actions" href="/payments/scheduled/new">
					<gok-button variant="primary">Schedule a payment</gok-button>
				</gok-link>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<!-- Row detail · the schedule, the next few runs, and the two controls. -->
<gok-drawer
	placement="end"
	heading="Scheduled payment"
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if selected}
		<div class="detail">
			<div class="detail-top">
				<h3 class="detail-name gok-headline-5">{selected.payeeName}</h3>
				<p class="detail-amount gok-tabular-nums">
					{formatMoney(selected.amountMinor, selected.currency)}
				</p>
				<gok-badge variant={STATUS_META[selectedStatus].variant} size="s">
					<span class="badge-inner">
						<gok-icon name={STATUS_META[selectedStatus].icon} size="s" aria-hidden="true"></gok-icon>
						{STATUS_META[selectedStatus].label}
					</span>
				</gok-badge>
			</div>

			<dl class="meta">
				<div class="meta-row">
					<dt>Reference</dt>
					<dd>{selected.reference}</dd>
				</div>
				<div class="meta-row">
					<dt>Frequency</dt>
					<dd>{FREQUENCY_LABEL[selected.frequency]}</dd>
				</div>
				<div class="meta-row">
					<dt>From</dt>
					<dd>{selectedWallet?.name ?? '—'}</dd>
				</div>
				<div class="meta-row">
					<dt>Starts</dt>
					<dd class="gok-tabular-nums">{formatDate(selected.startIso)}</dd>
				</div>
				<div class="meta-row">
					<dt>Ends</dt>
					<dd>{endLabel(selected)}</dd>
				</div>
			</dl>

			<div class="runs">
				<p class="runs-label gok-eyebrow">Next runs</p>
				{#if selectedPaused}
					<p class="runs-paused">Paused — nothing runs until I resume it.</p>
				{:else if upcomingRuns.length > 0}
					<ul class="runs-list">
						{#each upcomingRuns as run (run)}
							<li class="runs-item gok-tabular-nums">{formatDate(run)}</li>
						{/each}
					</ul>
				{:else}
					<p class="runs-paused">Nothing left to run.</p>
				{/if}
			</div>

			<div class="pause">
				<gok-switch
					{@attach setProps({ checked: selectedPaused })}
					{@attach on('change', onPauseToggle)}
				>
					Pause this payment
				</gok-switch>
				<p class="pause-hint">
					{selectedPaused
						? 'Paused — I can resume it whenever I like.'
						: 'Pause to hold it without losing the schedule.'}
				</p>
			</div>
		</div>
	{/if}

	<div slot="footer" class="drawer-footer">
		<gok-button variant="secondary" {@attach on('click', () => closeDrawer())}>Close</gok-button>
		{#if selected}
			<gok-button variant="secondary" {@attach on('click', askCancel)}>Cancel payment</gok-button>
		{/if}
	</div>

	<!-- Cancel confirm · final, so it's a forced decision: danger tone, no scrim dismiss.
	     Nested inside the drawer so it shares the drawer's top layer and stays clickable. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Cancel this payment?"
		no-dismiss
		{@attach setProps({ open: confirmOpen })}
	>
		<p class="confirm-body">
			Cancel the {selected ? FREQUENCY_LABEL[selected.frequency].toLowerCase() : ''} payment to
			<strong>{selected?.payeeName ?? ''}</strong>? It won’t run again.
		</p>

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', dismissCancel)}>Keep it</gok-button>
			<button type="button" class="danger-confirm" onclick={confirmCancel}>Cancel payment</button>
		</div>
	</gok-dialog>
</gok-drawer>

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

	.detail-name {
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

	.badge-inner {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
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

	/* --- Next runs --- */
	.runs {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.runs-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.runs-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.runs-item {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.runs-paused {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Pause control --- */
	.pause {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.pause-hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.drawer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-200);
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
