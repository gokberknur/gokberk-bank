<script lang="ts">
	// L02 · Loan-servicing surface — the detail view for the one loan I'm servicing.
	// It opens on a calm summary (the outstanding balance is the hero figure), lays out
	// the full contractual repayment schedule, links to the documents vault, and offers
	// two deliberate money-spine actions: overpay a lump sum, or pay off early. The
	// forest-green accent stays earned — it's the chart's after-action line and the
	// primary actions; the numbers carry the page. The route is `[id]`, but there's one
	// seeded active loan, so I render `lending.servicing()` directly (no per-id lookup).
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:`
	// on a gok-* element. The summary, schedule, and chart all re-flow live through the
	// reactive bridge after an overpayment or settlement (the state bumps the revision).
	import { lending } from '$lib/state/lending.svelte';
	import { LOAN_PURPOSES } from '$lib/data/lending';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import { PayoffChart } from '$lib/charts';
	import type { AmortRow } from '$lib/state/lending.svelte';
	import OverpayDrawer from '$lib/components/lending/OverpayDrawer.svelte';
	import PayoffDialog from '$lib/components/lending/PayoffDialog.svelte';

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// ── Live servicing reads (re-flow on the revision bridge) ──
	const servicing = $derived(lending.servicing());
	const schedule = $derived(lending.schedule());
	const glide = $derived(lending.payoffGlide());

	const loan = $derived(servicing.loan);
	const isActive = $derived(servicing.status === 'active');

	const purposeLabel = $derived(
		LOAN_PURPOSES.find((p) => p.value === loan.purpose)?.label ?? 'Personal loan'
	);

	// APR from basis points, two decimals (790 → "7.90%") — honest for a banded rate.
	const aprLabel = $derived(`${(servicing.aprBps / 100).toFixed(2)}%`);

	// The lifecycle tag — by rule + text, never colour alone. `settling` reads as
	// "Clearing" (held distinct from a closed loan until the money clears).
	const statusLabel = $derived(
		servicing.status === 'active' ? 'Active' : servicing.status === 'settling' ? 'Clearing' : 'Closed'
	);

	// The page glide preview is the natural balance path to term (both series share it,
	// so the accent line traces the balance gliding to zero).
	const pagePath = $derived(glide.original);
	const glideSummary = $derived(
		`My balance glides to zero over the remaining ${servicing.remainingMonths} payments.`
	);

	// ── Repayment schedule table (string cells only — the grid can't host a node) ──

	// Each scheduled payment falls on the 1st, `month` months after the drawdown.
	function dueDate(month: number): string {
		const d = new Date(loan.startDate);
		d.setMonth(d.getMonth() + month, 1);
		return formatDate(d);
	}

	// Status by rule + mark + text: a paid row is settled, the next-due row is marked,
	// the rest wait — never colour alone (the cell is a plain string).
	function statusCell(month: number): string {
		if (month <= servicing.paidMonths) return '✓ Paid';
		if (month === servicing.paidMonths + 1) return '→ Next';
		return '· Upcoming';
	}

	interface Column {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: AmortRow) => string;
	}

	const columns: Column[] = [
		{ key: 'month', label: '#', primary: true, width: '4rem' },
		{ key: 'due', label: 'Due date', width: '9rem', format: (_v, row) => dueDate(row.month) },
		{ key: 'paymentMinor', label: 'Payment', numeric: true, format: (v) => eur(v as number) },
		{ key: 'principalMinor', label: 'Principal', numeric: true, format: (v) => eur(v as number) },
		{ key: 'interestMinor', label: 'Interest', numeric: true, format: (v) => eur(v as number) },
		{ key: 'balanceMinor', label: 'Balance', numeric: true, format: (v) => eur(v as number) },
		{ key: 'status', label: 'Status', width: '8rem', format: (_v, row) => statusCell(row.month) }
	];

	const getRowId = (row: AmortRow) => row.month;

	// ── Action hosts ──
	let overpayOpen = $state(false);
	let payoffOpen = $state(false);

	function openOverpay() {
		overpayOpen = true;
	}

	function openPayoff() {
		payoffOpen = true;
	}

	// The closed-state note under the action cluster when servicing isn't active.
	const inactiveNote = $derived(
		servicing.status === 'settling'
			? 'My loan is clearing — there’s nothing more to pay.'
			: servicing.status === 'closed'
				? 'This loan is closed.'
				: ''
	);
</script>

<svelte:head>
	<title>My loan · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/lending">&larr; Lending</gok-link>
		<p class="head-eyebrow gok-eyebrow">My loan</p>
		<h1 class="head-title gok-headline-3">{purposeLabel}</h1>
		<p class="head-caption">Borrowed {eur(servicing.originalPrincipalMinor)} · {aprLabel} APR</p>
	</header>

	<!-- Summary -->
	<section aria-labelledby="summary-heading">
		<h2 id="summary-heading" class="visually-hidden">Loan summary</h2>
		<gok-card>
			<div class="summary">
				<div class="summary-top">
					<div class="hero">
						<p class="hero-eyebrow gok-eyebrow">Outstanding balance</p>
						<p class="hero-balance gok-tabular-nums">{eur(servicing.balanceMinor)}</p>
					</div>
					<gok-tag size="m" dot>{statusLabel}</gok-tag>
				</div>

				<dl class="facts">
					<div class="fact">
						<dt class="fact-label">Original amount</dt>
						<dd class="fact-value gok-tabular-nums">{eur(servicing.originalPrincipalMinor)}</dd>
					</div>
					<div class="fact">
						<dt class="fact-label">APR</dt>
						<dd class="fact-value gok-tabular-nums">{aprLabel}</dd>
					</div>
					<div class="fact">
						<dt class="fact-label">Monthly payment</dt>
						<dd class="fact-value gok-tabular-nums">{eur(servicing.monthlyMinor)}</dd>
					</div>
					<div class="fact">
						<dt class="fact-label">Next payment</dt>
						<dd class="fact-value gok-tabular-nums">
							{#if isActive && servicing.nextPaymentMinor > 0}
								{eur(servicing.nextPaymentMinor)} on {formatDate(servicing.nextPaymentDate)}
							{:else}
								—
							{/if}
						</dd>
					</div>
				</dl>

				<div class="progress">
					<gok-progress
						size="s"
						format="fraction"
						label={`Loan term — ${servicing.paidMonths} of ${servicing.totalMonths} months paid`}
						{@attach setProps({ value: servicing.paidMonths, max: servicing.totalMonths })}
					></gok-progress>
					<p class="progress-caption gok-tabular-nums">
						{servicing.paidMonths} of {servicing.totalMonths} months
					</p>
				</div>

				{#if servicing.aheadOfSchedule}
					<p class="ahead">
						I'm {eur(servicing.overpaidMinor)} ahead — {servicing.remainingMonths} payments left.
					</p>
				{/if}

				<div class="actions">
					<gok-button
						variant="primary"
						{@attach setProps({ disabled: !isActive })}
						{@attach on('click', openOverpay)}
					>
						Overpay
					</gok-button>
					<gok-button
						variant="secondary"
						{@attach setProps({ disabled: !isActive })}
						{@attach on('click', openPayoff)}
					>
						Pay off early
					</gok-button>
				</div>
				{#if inactiveNote}
					<p class="inactive-note">{inactiveNote}</p>
				{/if}
			</div>
		</gok-card>
	</section>

	<!-- Glide-path preview -->
	<section class="block" aria-labelledby="glide-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">Balance over time</p>
			<h2 id="glide-heading" class="block-title gok-headline-5">My glide to zero</h2>
		</div>
		<gok-card>
			<div class="chart">
				<PayoffChart original={pagePath} afterAction={pagePath} label={glideSummary} height="16rem" />
				<p class="chart-summary">{glideSummary}</p>
			</div>
		</gok-card>
	</section>

	<!-- Repayment schedule -->
	<section class="block" aria-labelledby="schedule-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">Schedule</p>
			<h2 id="schedule-heading" class="block-title gok-headline-5">My repayment schedule</h2>
		</div>
		<gok-table
			accessible-label="My repayment schedule"
			{@attach setProps({ columns, rows: schedule, getRowId })}
		></gok-table>
		<p class="schedule-note">
			The contractual schedule for the full term. Paid months are marked, and my next payment is
			flagged.
		</p>
	</section>

	<!-- Documents -->
	<section class="block" aria-labelledby="documents-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">Documents</p>
			<h2 id="documents-heading" class="block-title gok-headline-5">My loan documents</h2>
		</div>
		<ul class="doc-list">
			<li class="doc-row">
				<gok-link href="/documents">Credit agreement</gok-link>
				<span class="doc-note">The terms I signed.</span>
			</li>
			<li class="doc-row">
				<gok-link href="/documents">Statements</gok-link>
				<span class="doc-note">My monthly loan statements.</span>
			</li>
			{#if !isActive}
				<li class="doc-row">
					<gok-link href="/documents">Settlement letter</gok-link>
					<span class="doc-note">Confirms my loan is settled.</span>
				</li>
			{/if}
		</ul>
	</section>
</div>

<!-- Action surfaces (own their flows; the summary updates live on commit). -->
<OverpayDrawer bind:open={overpayOpen} />
<PayoffDialog bind:open={payoffOpen} />

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 52rem;
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

	/* ── Summary ── */
	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.summary-top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.hero {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.hero-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.hero-balance {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-2-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		color: var(--gok-color-text);
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: var(--gok-space-300);
		margin: 0;
		padding-block: var(--gok-space-400);
		border-block: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.fact {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.fact-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.fact-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.progress {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.progress-caption {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.ahead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.inactive-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Blocks ── */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.block-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.block-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* ── Chart ── */
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.chart-summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.schedule-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Documents ── */
	.doc-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.doc-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-200) var(--gok-space-300);
	}

	.doc-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}
</style>
