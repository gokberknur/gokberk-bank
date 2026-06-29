<script lang="ts">
	// P06 · SEPA Direct Debit mandates — manage. Every company I've authorised to pull
	// from my EUR wallet, in a gok-table (the same DOM-property + single-selection idiom
	// as the scheduled and payees grids), a leading upcoming-collections ledger, and a
	// row drawer carrying the identity, the collection history, and the two acts that
	// matter. Both acts are destructive and so forced decisions behind a danger dialog:
	// Cancel a mandate stops every future pull; Dispute a collection flags one pull as
	// under review. No-blame throughout — a creditor isn't accused, I simply act. Status
	// travels by the badge/chip's rule + a glyph + the word, never colour alone. rows is
	// spread fresh each revision so a cancel re-renders the table (dogfooding #36).
	//
	// This component backs both the index surface and the deep-linked [id] drawer — the
	// page passes `openId` and the matching row opens on mount.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { mandates } from '$lib/payments/mandates.svelte';
	import type { Mandate, Collection, DisputeReason } from '$lib/payments/mandates.svelte';
	import { WALLET_BLUEPRINTS } from '$lib/data/accounts';

	// Narrow string unions for the gok-badge / gok-icon attributes we set (the package
	// doesn't re-export these from the root; we only need the literal values).
	type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';
	type IconName = 'check' | 'circle-dot' | 'warning' | 'close';

	let { openId }: { openId?: string } = $props();

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
	};

	// Collection status by rule + glyph + word: the chip carries a neutral rule, a glyph
	// reinforces the state, the label carries the meaning. Never colour alone.
	const COLLECTION_META: Record<Collection['status'], { label: string; icon: IconName }> = {
		collected: { label: 'Collected', icon: 'check' },
		upcoming: { label: 'Upcoming', icon: 'circle-dot' },
		disputed: { label: 'Disputed', icon: 'warning' }
	};

	/** The wallet a mandate debits, named for display ("Main · EUR"). */
	function walletName(id: string): string {
		const w = WALLET_BLUEPRINTS.find((b) => b.id === id);
		return w ? `${w.name} · ${w.currency}` : '—';
	}

	/** The most recent settled pull — the "Last collected" column + drawer reads this. */
	function lastCollected(m: Mandate): Collection | undefined {
		return m.collections.find((c) => c.status === 'collected');
	}

	// ── Table · the active mandates. ──
	const columns: Column[] = [
		{ key: 'creditorName', label: 'Creditor', primary: true, sortable: true },
		{ key: 'lastCollected', label: 'Last collected', width: '11rem' },
		{ key: 'nextCollection', label: 'Next collection', width: '10rem' },
		{ key: 'status', label: 'Status', width: '8rem' }
	];

	const getRowId = (m: Mandate) => m.id;

	/** A span that holds tabular figures (amounts + dates line up column-to-column). */
	function tnum(text: string): HTMLElement {
		const s = document.createElement('span');
		s.textContent = text;
		s.style.fontVariantNumeric = 'tabular-nums';
		return s;
	}

	// The Creditor cell stacks the name over its masked reference; Last collected stacks
	// the amount over the date; Status renders a rule + glyph + word badge. Everything
	// else falls back to a plain string.
	function renderCell(column: Column, row: Mandate): Node | string {
		if (column.key === 'creditorName') {
			const wrap = document.createElement('div');
			wrap.style.display = 'flex';
			wrap.style.flexDirection = 'column';
			wrap.style.gap = 'var(--gok-space-100)';
			const name = document.createElement('span');
			name.textContent = row.creditorName;
			name.style.color = 'var(--gok-color-text)';
			const ref = document.createElement('span');
			ref.textContent = row.reference;
			ref.style.color = 'var(--gok-color-text-muted)';
			ref.style.fontFamily = 'var(--gok-font-family-mono)';
			ref.style.fontSize = 'var(--gok-type-body-small-size)';
			ref.style.lineHeight = 'var(--gok-type-body-small-line)';
			wrap.append(name, ref);
			return wrap;
		}
		if (column.key === 'lastCollected') {
			const c = lastCollected(row);
			if (!c) return '—';
			const wrap = document.createElement('div');
			wrap.style.display = 'flex';
			wrap.style.flexDirection = 'column';
			wrap.style.gap = 'var(--gok-space-100)';
			const amount = tnum(formatMoney(c.amountMinor, row.currency));
			amount.style.color = 'var(--gok-color-text)';
			const date = tnum(formatDate(c.dateIso));
			date.style.color = 'var(--gok-color-text-muted)';
			date.style.fontSize = 'var(--gok-type-body-small-size)';
			date.style.lineHeight = 'var(--gok-type-body-small-line)';
			wrap.append(amount, date);
			return wrap;
		}
		if (column.key === 'nextCollection') {
			return row.next ? tnum(formatDate(row.next.dateIso)) : '—';
		}
		if (column.key === 'status') {
			const badge = document.createElement('gok-badge');
			badge.setAttribute('variant', 'success' satisfies BadgeVariant);
			badge.setAttribute('size', 's');
			const icon = document.createElement('gok-icon');
			icon.setAttribute('name', 'circle-dot');
			icon.setAttribute('size', 's');
			icon.setAttribute('aria-hidden', 'true');
			icon.style.marginInlineEnd = 'var(--gok-space-100)';
			badge.append(icon, document.createTextNode('Active'));
			return badge;
		}
		return '';
	}

	// A fresh array per revision: the data layer replaces a mandate in place (the backing
	// array keeps its reference), so spreading hands gok-table a new `rows` reference to
	// detect — otherwise a cancel wouldn't re-render. (dogfooding #36)
	const items = $derived(mandates.active());
	const rows = $derived([...items]);
	const activeCount = $derived(items.length);

	// The leading ledger — the near-term outflow, made obvious.
	const upcoming = $derived(mandates.upcoming(30));
	const upcomingTotalMinor = $derived(mandates.upcomingTotalMinor(30));

	// ── Row → drawer. The table owns single selection; we mirror it so closing the
	// drawer clears it (and the same row can be reopened). A deep link seeds it once. ──
	const deepLinkId = untrack(() => (openId && mandates.get(openId) ? openId : undefined));
	let selectedIds = $state<string[]>(deepLinkId ? [deepLinkId] : []);
	let drawerOpen = $state(Boolean(deepLinkId));

	// Read off the current revision so a cancel/dispute reflows the open drawer.
	const selected = $derived(selectedIds[0] ? mandates.get(selectedIds[0]) : undefined);
	const selectedWallet = $derived(selected ? walletName(selected.walletId) : '—');
	// Collections I can still raise — anything not already disputed, newest first.
	const disputable = $derived(selected ? selected.collections.filter((c) => c.status !== 'disputed') : []);
	const hasDisputed = $derived(selected ? selected.collections.some((c) => c.status === 'disputed') : false);

	function handleSelection(event: Event) {
		const ids = (event as CustomEvent<{ ids: string[] }>).detail.ids ?? [];
		selectedIds = ids;
		resetDispute();
		if (ids[0]) drawerOpen = true;
	}

	function closeDrawer(e?: Event) {
		if (cancelOpen || disputeOpen) {
			e?.preventDefault();
			return;
		}
		drawerOpen = false;
		selectedIds = [];
		resetDispute();
	}

	// ── Cancel a mandate · destructive (stops every future pull), so a forced decision
	// behind a danger dialog. On confirm the mandate flips to cancelled, the next pull
	// drops, the row leaves the active table, and the drawer closes. ──
	let cancelOpen = $state(false);

	function askCancel() {
		cancelOpen = true;
	}
	function dismissCancel() {
		cancelOpen = false;
	}
	function confirmCancel() {
		if (selected) mandates.cancel(selected.id);
		cancelOpen = false;
		drawerOpen = false;
		selectedIds = [];
		resetDispute();
	}

	// ── Dispute a collection · pick the pull, pick a reason, then confirm. SEPA pulls
	// are refundable within 8 weeks; the confirm states plainly whether this one still
	// qualifies. Destructive, so the confirm is the same forced-decision danger dialog. ──
	let disputeCollectionId = $state('');
	let disputeReason = $state('');
	let disputeOpen = $state(false);

	const canDispute = $derived(disputeCollectionId !== '' && disputeReason !== '');
	const disputeTarget = $derived(
		disputeCollectionId ? disputable.find((c) => c.id === disputeCollectionId) : undefined
	);
	const disputeRefundable = $derived(
		disputeTarget ? mandates.withinRefundWindow(disputeTarget.dateIso) : false
	);
	const disputeReasonLabel = $derived(
		mandates.reasons().find((r) => r.id === disputeReason)?.label ?? ''
	);

	function resetDispute() {
		disputeCollectionId = '';
		disputeReason = '';
		disputeOpen = false;
	}

	function onDisputeCollectionChange(event: Event) {
		disputeCollectionId = (event.target as HTMLElement & { value?: string }).value ?? '';
	}
	function onDisputeReasonChange(event: Event) {
		disputeReason = (event.target as HTMLElement & { value?: string }).value ?? '';
	}

	function askDispute() {
		if (canDispute) disputeOpen = true;
	}
	function dismissDispute() {
		disputeOpen = false;
	}
	function confirmDispute() {
		if (selected && disputeCollectionId && disputeReason) {
			mandates.dispute(selected.id, disputeCollectionId, disputeReason as DisputeReason);
		}
		disputeCollectionId = '';
		disputeReason = '';
		disputeOpen = false;
	}
</script>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Payments</p>
		<h1 class="head-title gok-headline-2">Direct debits</h1>
		<p class="head-sub">Every company I've authorised to pull from my account.</p>
	</header>

	<!-- Upcoming collections · the near-term outflow, soonest first, with the 30-day total. -->
	<gok-card class="upcoming-card">
		<div class="upcoming">
			<div class="upcoming-head">
				<p class="upcoming-eyebrow gok-eyebrow">Upcoming collections</p>
				<p class="upcoming-total gok-tabular-nums">
					{formatMoney(upcomingTotalMinor, 'EUR')}
					<span class="upcoming-total-sub">over the next 30 days</span>
				</p>
			</div>

			{#if upcoming.length > 0}
				<ul class="ledger" aria-label="Collections due in the next 30 days">
					{#each upcoming as collection (collection.mandateId)}
						<li class="ledger-row">
							<span class="ledger-name">{collection.creditorName}</span>
							<span class="ledger-date gok-tabular-nums">{formatDate(collection.dateIso)}</span>
							<span class="ledger-amount gok-tabular-nums">
								{formatMoney(collection.amountMinor, 'EUR')}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="upcoming-empty">Nothing due in the next 30 days.</p>
			{/if}
		</div>
	</gok-card>

	<!-- The mandates themselves — a labelled, keyboard-reachable grid. -->
	<gok-table
		selection-mode="single"
		accessible-label="My direct-debit mandates"
		{@attach setProps({ columns, rows, getRowId, renderCell, selection: selectedIds })}
		{@attach on('gok-selection-change', handleSelection)}
	>
		<div slot="caption" class="caption">
			<p class="caption-eyebrow gok-eyebrow">Mandates</p>
			<h2 class="caption-title gok-headline-5">
				{activeCount}
				{activeCount === 1 ? 'company can debit me' : 'companies can debit me'}
			</h2>
		</div>

		<div slot="empty" class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No direct debits set up</p>
				<p class="empty-body">
					When a company sets up a mandate to pull from my account, it'll show up here — and I can
					cancel it anytime.
				</p>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<!-- Row detail · the creditor's identity, the collection history, and the two acts. -->
<gok-drawer
	placement="end"
	heading="Direct debit"
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if selected}
		<div class="detail">
			<div class="detail-top">
				<h3 class="detail-name gok-headline-5">{selected.creditorName}</h3>
				<gok-tag size="s">
					<span class="tag-inner">
						<gok-icon
							name={selected.status === 'active' ? 'circle-dot' : 'close'}
							size="s"
							aria-hidden="true"
						></gok-icon>
						{selected.status === 'active' ? 'Active' : 'Cancelled'}
					</span>
				</gok-tag>
			</div>

			<dl class="meta">
				<div class="meta-row">
					<dt>Creditor ID</dt>
					<dd class="mono">{selected.creditorId}</dd>
				</div>
				<div class="meta-row">
					<dt>Mandate reference</dt>
					<dd class="mono">{selected.reference}</dd>
				</div>
				<div class="meta-row">
					<dt>Debits</dt>
					<dd>{selectedWallet}</dd>
				</div>
			</dl>

			<!-- The next pull — what's coming, or nothing once cancelled. -->
			<div class="block">
				<p class="block-label gok-eyebrow">Upcoming collection</p>
				{#if selected.next}
					<div class="upcoming-line">
						<span class="upcoming-line-date gok-tabular-nums">
							{formatDate(selected.next.dateIso)}
						</span>
						<span class="upcoming-line-amount gok-tabular-nums">
							{formatMoney(selected.next.amountMinor, selected.currency)}
						</span>
					</div>
				{:else}
					<p class="quiet">No collection scheduled.</p>
				{/if}
			</div>

			<!-- Collection history — every pull, each with a rule + glyph + word chip. -->
			<div class="block">
				<p class="block-label gok-eyebrow">Collection history</p>
				<ul class="history" aria-label="Collection history">
					{#each selected.collections as collection (collection.id)}
						<li class="history-row">
							<span class="history-date gok-tabular-nums">{formatDate(collection.dateIso)}</span>
							<span class="history-amount gok-tabular-nums">
								{formatMoney(collection.amountMinor, selected.currency)}
							</span>
							<gok-tag size="s">
								<span class="tag-inner">
									<gok-icon
										name={COLLECTION_META[collection.status].icon}
										size="s"
										aria-hidden="true"
									></gok-icon>
									{COLLECTION_META[collection.status].label}
								</span>
							</gok-tag>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Dispute a collection — only while the mandate is active and a pull is open. -->
			{#if selected.status === 'active' && disputable.length > 0}
				<div class="block dispute">
					<p class="block-label gok-eyebrow">Dispute a collection</p>
					<p class="quiet">
						If a pull looks wrong, I can raise it — a SEPA collection is refundable within 8 weeks.
					</p>

					<gok-radio-group
						label="Which collection?"
						orientation="vertical"
						{@attach setProps({ value: disputeCollectionId })}
						{@attach on('change', onDisputeCollectionChange)}
					>
						{#each disputable as collection (collection.id)}
							<gok-radio
								class="choice"
								class:is-selected={collection.id === disputeCollectionId}
								value={collection.id}
							>
								<span class="choice-label">
									<span class="choice-amount gok-tabular-nums">
										{formatMoney(collection.amountMinor, selected.currency)}
									</span>
									<span class="choice-date gok-tabular-nums">{formatDate(collection.dateIso)}</span>
									<span class="choice-status">{COLLECTION_META[collection.status].label}</span>
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>

					<gok-radio-group
						label="What's wrong with it?"
						orientation="vertical"
						{@attach setProps({ value: disputeReason })}
						{@attach on('change', onDisputeReasonChange)}
					>
						{#each mandates.reasons() as reason (reason.id)}
							<gok-radio
								class="choice"
								class:is-selected={reason.id === disputeReason}
								value={reason.id}
							>
								<span class="choice-reason">{reason.label}</span>
							</gok-radio>
						{/each}
					</gok-radio-group>

					<div class="dispute-action">
						<gok-button
							variant="secondary"
							{@attach setProps({ disabled: !canDispute })}
							{@attach on('click', askDispute)}
						>
							Dispute this collection
						</gok-button>
					</div>

					{#if hasDisputed}
						<p class="under-review">
							A collection is under review.
							<gok-link href="/support">Track it under my disputes</gok-link>
						</p>
					{/if}
				</div>
			{:else if hasDisputed}
				<div class="block dispute">
					<p class="under-review">
						A collection is under review.
						<gok-link href="/support">Track it under my disputes</gok-link>
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<div slot="footer" class="drawer-footer">
		<gok-button variant="secondary" {@attach on('click', () => closeDrawer())}>Close</gok-button>
		{#if selected && selected.status === 'active'}
			<gok-button variant="secondary" {@attach on('click', askCancel)}>Cancel mandate</gok-button>
		{/if}
	</div>

	<!-- Cancel confirm · destructive, so a forced decision: danger tone, no scrim dismiss.
	     Nested inside the drawer so it shares the drawer's top layer and stays clickable. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Cancel the {selected?.creditorName ?? ''} mandate?"
		no-dismiss
		{@attach setProps({ open: cancelOpen })}
	>
		<p class="confirm-body">
			This stops future collections. <strong>{selected?.creditorName ?? 'The company'}</strong> may
			contact me to arrange another way to pay.
		</p>

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', () => dismissCancel())}>Keep it</gok-button>
			<button type="button" class="danger-confirm" onclick={confirmCancel}>Cancel mandate</button>
		</div>
	</gok-dialog>

	<!-- Dispute confirm · destructive, same forced-decision danger dialog; states the window.
	     Nested inside the drawer so it shares the drawer's top layer and stays clickable. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Dispute this collection?"
		no-dismiss
		{@attach setProps({ open: disputeOpen })}
	>
		<p class="confirm-body">
			I'm raising the
			{#if disputeTarget && selected}<strong
					>{formatMoney(disputeTarget.amountMinor, selected.currency)}</strong
				>
				pull from {formatDate(disputeTarget.dateIso)}{/if}
			{#if disputeReasonLabel}— {disputeReasonLabel.toLowerCase()}{/if}. A SEPA collection is
			refundable within 8 weeks.
		</p>
		<p class="confirm-window">
			{#if disputeRefundable}
				This one is still inside the 8-week window, so it qualifies for a refund.
			{:else}
				This one falls outside the 8-week window, so a refund isn't guaranteed — the bank will still
				look into it.
			{/if}
		</p>

		<div slot="footer" class="confirm-actions">
			<gok-button variant="secondary" {@attach on('click', () => dismissDispute())}>Back</gok-button>
			<button type="button" class="danger-confirm" onclick={confirmDispute}>Dispute collection</button>
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

	/* --- Upcoming collections ledger --- */
	.upcoming-card {
		display: block;
	}

	.upcoming {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.upcoming-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.upcoming-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.upcoming-total {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.upcoming-total-sub {
		font-weight: var(--gok-font-weight-regular);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ledger-row {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ledger-row:first-child {
		border-block-start: none;
	}

	.ledger-name {
		flex: 1 1 auto;
		min-inline-size: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.ledger-date {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ledger-amount {
		flex: none;
		min-inline-size: 6rem;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.upcoming-empty {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Table caption + empty --- */
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
		max-inline-size: 32rem;
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

	.tag-inner {
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

	/* --- Drawer blocks (upcoming, history, dispute) --- */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.block-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.upcoming-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.upcoming-line-date {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.upcoming-line-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.history {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.history-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.history-row:first-child {
		border-block-start: none;
	}

	.history-date {
		flex: none;
		min-inline-size: 7rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.history-amount {
		flex: 1 1 auto;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Dispute choices (radio-cards) --- */
	.dispute {
		gap: var(--gok-space-300);
	}

	.choice {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.choice:hover {
		border-color: var(--gok-color-border-strong);
	}

	.choice.is-selected {
		border-color: var(--gok-color-text);
	}

	.choice-label {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.choice-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.choice-date {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.choice-status {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--gok-color-text-muted);
	}

	.choice-reason {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.dispute-action {
		display: flex;
	}

	.under-review {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Footer --- */
	.drawer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* --- Confirm dialogs --- */
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

	.confirm-window {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
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

	.mono {
		font-family: var(--gok-font-family-mono);
	}
</style>
