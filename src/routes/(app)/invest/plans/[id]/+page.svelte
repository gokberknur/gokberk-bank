<script lang="ts">
	// V10 · Savings-plan detail — the manage-one surface for a recurring plan. It reads
	// the plan by route id (the invest sub-nav rides above via the section layout), shows
	// its status + schedule as a dl "meta" block, lists every past run as a display-only
	// RecordList joined against the V03 orders, and carries the three controls that matter:
	// Edit (amount + cadence, in a side drawer), Pause (reversible — a gok-switch, optimistic
	// + a toast, no dialog) and Stop (final — a forced-decision danger dialog). Status reads
	// as rule + glyph + word, never colour alone. Money is integer minor units; the
	// projections are indicative. Not-found falls to an empty state.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { plans } from '$lib/invest/plans.svelte';
	import type { SavingsPlan, PlanStatus, PlanCadence } from '$lib/invest/plans.svelte';
	import { invest } from '$lib/state/invest.svelte';
	import { instrumentOf } from '$lib/data/portfolio';
	import { ORDER_STATUS_LABELS } from '$lib/data/market';
	import type { Order } from '$lib/data/market';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import { sheetPlacement } from '$lib/breakpoints';
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import IndicativeTag from '$lib/components/invest/IndicativeTag.svelte';

	// Narrow string unions for the gok-badge / gok-icon attributes (the package doesn't
	// re-export these from the root; we only need the literal values we set).
	type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';
	type IconName = 'circle-dot' | 'minus' | 'close';

	// Status by rule + glyph + word: the badge edge-rule maps to a status role, a glyph
	// reinforces it, the label carries the meaning. Never colour alone.
	const STATUS_META: Record<PlanStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
		active: { label: 'Active', variant: 'info', icon: 'circle-dot' },
		paused: { label: 'Paused', variant: 'neutral', icon: 'minus' },
		ended: { label: 'Ended', variant: 'neutral', icon: 'close' }
	};

	// weekly → "Weekly", monthly → "Monthly" (a plan never runs 'once').
	const CADENCE_LABEL: Record<PlanCadence, string> = {
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	// ── Reactive core: the plan by route id (re-reads on every revision bump). ──
	const id = $derived(page.params.id ?? '');
	const plan = $derived(plans.get(id));
	const effStatus = $derived<PlanStatus>(plan ? plans.statusOf(plan) : 'active');
	const firstRunDate = $derived(plan ? formatDate(plans.nextRunIso(plan)) : '');

	/** What the plan buys: a basket lists its legs; a single target shows its name. */
	function targetLabel(p: SavingsPlan): string {
		if (p.kind === 'basket') return `${p.legs.length} holdings (${p.legs.map((l) => l.symbol).join(', ')})`;
		return instrumentOf(p.symbol ?? '')?.name ?? p.symbol ?? '';
	}

	/** The end rule in words — what the meta reads under "Ends". */
	function endLabel(p: SavingsPlan): string {
		switch (p.end.kind) {
			case 'on-date':
				return `On ${formatDate(p.end.dateIso)}`;
			case 'after-count':
				return `After ${p.end.count} run(s)`;
			default:
				return 'Until I stop';
		}
	}

	// ── Contribution history: the plan's executed runs, joined against the V03 orders
	// (the seed merges PLAN_SEED_ORDERS in). Display-only — the blotter owns management. ──
	const history = $derived(
		plan
			? plan.runHistory.map((oid) => invest.orders.find((o) => o.id === oid)).filter((o): o is Order => !!o)
			: []
	);
	const totalInvestedMinor = $derived(history.reduce((s, o) => s + o.totalEurMinor, 0));

	type OrderColumn = {
		key: string;
		label: string;
		primary?: boolean;
		numeric?: boolean;
		format?: (value: unknown, row: Order) => string;
	};

	const historyColumns: OrderColumn[] = [
		{ key: 'placedAt', label: 'Date', primary: true, format: (_v, o) => formatDate(o.placedAt) },
		{ key: 'symbol', label: 'Holding', format: (_v, o) => o.symbol },
		{ key: 'quantity', label: 'Qty', numeric: true, format: (_v, o) => o.quantity.toFixed(4).replace(/\.?0+$/, '') },
		{ key: 'totalEurMinor', label: 'Amount', numeric: true, format: (_v, o) => formatMoney(o.totalEurMinor, 'EUR') },
		{ key: 'status', label: 'Status', format: (_v, o) => ORDER_STATUS_LABELS[o.status] }
	];
	const getOrderId = (o: Order) => o.id;

	// ── Controls · local state. editAmount/editCadence are seeded from the plan when the
	// edit drawer opens (an event handler, so no untrack needed). ──
	let editOpen = $state(false);
	let stopOpen = $state(false);
	let editAmount = $state(0);
	let editCadence = $state<'weekly' | 'monthly'>('monthly');

	function openEdit() {
		if (!plan) return;
		editAmount = plan.amountMinor;
		editCadence = plan.cadence;
		editOpen = true;
	}

	function onCadenceChange(e: Event) {
		editCadence = (e as CustomEvent<{ value: string }>).detail.value as PlanCadence;
	}

	function saveEdit() {
		if (!plan) return;
		plans.edit(plan.id, { amountMinor: editAmount, cadence: editCadence });
		editOpen = false;
	}

	// Pause / resume · reversible, optimistic + toast, NO dialog. Read the new state
	// straight off the switch's change event; the state layer toasts.
	function onPauseToggle(e: Event) {
		if (!plan) return;
		const paused = (e.target as HTMLElement & { checked: boolean }).checked;
		if (paused) plans.pause(plan.id);
		else plans.resume(plan.id);
	}

	// Stop · final. Gated behind a forced-decision danger dialog; on confirm the plan is
	// stopped and we return to the list.
	function confirmStop() {
		if (!plan) return;
		plans.stop(plan.id);
		goto('/invest/plans');
	}
</script>

<svelte:head>
	<title>{plan?.name ?? 'Plan'} · gökberk bank</title>
</svelte:head>

{#if !plan}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Plan not found</p>
			<p class="missing-body">This plan doesn’t exist or was removed.</p>
			<gok-link slot="actions" href="/invest/plans">
				<gok-button variant="secondary">Back to plans</gok-button>
			</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page-grid">
		<BackLink href="/invest/plans" label="Plans" />

		<PageHeader eyebrow="Savings plan" title={plan.name} />

		<!-- Status + schedule summary -->
		<section class="summary">
			<gok-badge variant={STATUS_META[effStatus].variant} size="s">
				<span class="badge-inner">
					<gok-icon name={STATUS_META[effStatus].icon} size="s" aria-hidden="true"></gok-icon>
					{STATUS_META[effStatus].label}
				</span>
			</gok-badge>

			<dl class="meta">
				<div class="meta-row">
					<dt>Target</dt>
					<dd>{targetLabel(plan)}</dd>
				</div>
				<div class="meta-row">
					<dt>Amount</dt>
					<dd class="gok-tabular-nums">{formatMoney(plan.amountMinor, plan.currency)}</dd>
				</div>
				<div class="meta-row">
					<dt>Cadence</dt>
					<dd>{CADENCE_LABEL[plan.cadence]}</dd>
				</div>
				<div class="meta-row">
					<dt>Next run</dt>
					<dd class="gok-tabular-nums">
						{effStatus === 'paused' ? 'Paused' : effStatus === 'ended' ? '—' : formatDate(plans.nextRunIso(plan))}
					</dd>
				</div>
				<div class="meta-row">
					<dt>Starts</dt>
					<dd class="gok-tabular-nums">{formatDate(plan.startIso)}</dd>
				</div>
				<div class="meta-row">
					<dt>Ends</dt>
					<dd>{endLabel(plan)}</dd>
				</div>
				<div class="meta-row">
					<dt>From</dt>
					<dd>{plans.walletFor(plan)?.name ?? '—'}</dd>
				</div>
				<div class="meta-row">
					<dt>Round-ups</dt>
					<dd>{plan.roundUpFunded ? 'On — spare change tops this up' : 'Off'}</dd>
				</div>
			</dl>

			<IndicativeTag detail="estimates only" />
		</section>

		<!-- Contribution history -->
		<section class="history">
			<div class="history-head">
				<p class="section-eyebrow gok-eyebrow">Contributions</p>
				<p class="history-total">
					<strong class="gok-tabular-nums">{formatMoney(totalInvestedMinor, 'EUR')}</strong> invested so far
				</p>
			</div>

			<RecordList
				columns={historyColumns}
				rows={history}
				getRowId={getOrderId}
				selectionMode="none"
				accessibleLabel="Contribution history"
			>
				{#snippet empty()}
					<p class="history-empty">No runs yet — the first runs on {firstRunDate}.</p>
				{/snippet}
			</RecordList>
		</section>

		<!-- Controls · Edit / Pause / Stop. Hidden once the plan has ended. -->
		{#if plan.status !== 'ended'}
			<section class="controls">
				<p class="section-eyebrow gok-eyebrow">Manage</p>

				<div class="control">
					<div class="control-text">
						<p class="control-title">Edit plan</p>
						<p class="hint">Change the per-run amount or how often it runs.</p>
					</div>
					<gok-button variant="secondary" {@attach on('click', openEdit)}>Edit</gok-button>
				</div>

				<div class="control">
					<div class="control-text">
						<gok-switch
							{@attach setProps({ checked: plan.status === 'paused' })}
							{@attach on('change', onPauseToggle)}
						>
							Pause this plan
						</gok-switch>
						<p class="hint">
							{plan.status === 'paused'
								? 'Paused — I can resume it whenever I like.'
								: 'Pause to hold it without losing the schedule.'}
						</p>
					</div>
				</div>

				<div class="control">
					<div class="control-text">
						<p class="control-title">Stop plan</p>
						<p class="hint">End it for good — nothing runs after that.</p>
					</div>
					<gok-button variant="secondary" {@attach on('click', () => (stopOpen = true))}>Stop</gok-button>
				</div>
			</section>
		{/if}

		<!-- Edit · a side drawer with the two things a plan can change: amount + cadence. -->
		<gok-drawer
			placement={sheetPlacement()}
			heading="Edit plan"
			{@attach setProps({ open: editOpen })}
			{@attach on('gok-close', () => (editOpen = false))}
			{@attach on('gok-cancel', () => (editOpen = false))}
		>
			<div class="edit-body">
				<MoneyInput
					value={editAmount}
					currency={plan.currency}
					label="Per-run amount"
					onchange={(m) => (editAmount = m)}
				/>

				<gok-segmented
					label="Cadence"
					{@attach setProps({ value: editCadence })}
					{@attach on('change', onCadenceChange)}
				>
					<gok-segmented-item value="weekly">Weekly</gok-segmented-item>
					<gok-segmented-item value="monthly">Monthly</gok-segmented-item>
				</gok-segmented>
			</div>

			<div slot="footer" class="drawer-footer">
				<gok-button variant="secondary" {@attach on('click', () => (editOpen = false))}>Cancel</gok-button>
				<gok-button variant="primary" {@attach on('click', saveEdit)}>Save changes</gok-button>
			</div>
		</gok-drawer>

		<!-- Stop confirm · final, so a forced decision: danger tone, no scrim dismiss.
		     Page-level (not nested in the drawer), so no teardown guard is needed. -->
		<gok-dialog
			tone="danger"
			size="s"
			heading="Stop this plan?"
			no-dismiss
			{@attach setProps({ open: stopOpen })}
		>
			<p class="confirm-body">
				Stop the {CADENCE_LABEL[plan.cadence].toLowerCase()} plan into <strong>{plan.name}</strong>? It won’t run
				again — I can start a new one anytime.
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', () => (stopOpen = false))}>Keep it</gok-button>
				<button type="button" class="danger-confirm" onclick={confirmStop}>Stop plan</button>
			</div>
		</gok-dialog>
	</div>
{/if}

<style>
	.page-grid {
		row-gap: var(--gok-space-section);
	}

	/* --- Status + schedule summary --- */
	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
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

	/* --- Contribution history --- */
	.history {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.history-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.section-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.history-total {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.history-total strong {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.history-empty {
		margin: 0;
		padding-block: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Controls --- */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.control {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.controls .section-eyebrow {
		margin-block-end: var(--gok-space-100);
	}

	.control-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.control-title {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Edit drawer --- */
	.edit-body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.drawer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* --- Stop confirm --- */
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

	/* --- Not found --- */
	.missing {
		padding-block: var(--gok-space-500);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
</style>
