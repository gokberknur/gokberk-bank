<script lang="ts">
	// L05 Flow B · Credit-line management surface — the detail view for my one revolving
	// credit line. It opens on a calm summary ledger (the current balance is the hero
	// figure, with available credit, the limit, a utilisation read, the statement, the
	// minimum payment and the due date), then lists this month's statement in a gok-table,
	// and offers the single commitment action a credit line carries — a repayment, in the
	// CreditRepayDrawer. A quiet link to past statements closes it.
	//
	// The forest-green accent stays earned — it is only the single primary "Repay" action
	// and the utilisation fill. The numbers carry the page, in tabular figures. The
	// minimum-payment cost is stated plainly as fact, never as hype.
	//
	// All money is integer minor units; the APR is bps (÷100 for %). I read every figure
	// off `credit-line` and never recompute one here. Web-component interop is strictly
	// `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* element (the repay drawer
	// is an app composite, so its `bind:open` is fine).
	import { page } from '$app/state';
	import { creditLine as cl } from '$lib/state/credit-line.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import { TODAY } from '$lib/data/time';
	import type { CreditTxn } from '$lib/data/credit-line';
	import CreditRepayDrawer from '$lib/components/lending/CreditRepayDrawer.svelte';

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// ── The managed facility (re-flows on the revision bridge) ──
	const id = $derived(page.params.id ?? '');
	const f = $derived(cl.facilityById(id));

	// ── Summary reads (read straight off state — never recomputed here) ──
	const availableMinor = $derived(cl.availableMinor);
	// utilisation as a 0–1 fraction for the progress fill, and a rounded percent for the
	// text read-out beside it (status by number + words, never colour alone).
	const utilisationFraction = $derived(cl.utilisationBps / 10000);
	const utilisationPct = $derived(Math.round(cl.utilisationBps / 100));
	const minimumMinor = $derived(cl.minimumPaymentMinor);

	// Days until the payment is due — drives a plain "due soon" tag (rule + text, not
	// colour alone). Within ~three weeks of the seeded 30-day cycle reads as due soon.
	const daysUntilDue = $derived(
		f ? Math.round((new Date(f.dueDateIso).getTime() - TODAY.getTime()) / 86_400_000) : 0
	);
	const dueSoon = $derived(!!f && daysUntilDue >= 0 && daysUntilDue <= 21);

	// ── Statement table (string cells only — the grid can't host a node) ──
	interface Column {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: CreditTxn) => string;
	}

	const columns: Column[] = [
		{
			key: 'dateIso',
			label: 'Date',
			width: '9rem',
			format: (v) => formatDate(v as string)
		},
		{ key: 'merchant', label: 'Merchant', primary: true },
		{ key: 'amountMinor', label: 'Amount', numeric: true, format: (v) => eur(v as number) }
	];

	const getRowId = (row: CreditTxn) => row.id;

	// ── Repay drawer host ──
	let repayOpen = $state(false);

	function openRepay() {
		repayOpen = true;
	}
</script>

<svelte:head>
	<title>My credit line · gökberk bank</title>
</svelte:head>

{#if !f}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Credit line not found</p>
			<p class="missing-body">There's no credit line with that reference in my account.</p>
			<gok-link slot="actions" href="/lending">Back to lending</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/lending">&larr; Lending</gok-link>
			<p class="head-eyebrow gok-eyebrow">My credit line</p>
			<h1 class="head-title gok-headline-3">{f.name}</h1>
			<p class="head-caption">A flexible limit I draw on and repay.</p>
		</header>

		<!-- Summary ledger -->
		<section aria-labelledby="summary-heading">
			<h2 id="summary-heading" class="visually-hidden">Credit line summary</h2>
			<gok-card>
				<div class="summary">
					<div class="summary-top">
						<div class="hero">
							<p class="hero-eyebrow gok-eyebrow">Current balance</p>
							<p class="hero-balance gok-tabular-nums">{eur(f.balanceMinor)}</p>
						</div>
						{#if dueSoon}
							<gok-tag size="m" dot>Due in {daysUntilDue} days</gok-tag>
						{/if}
					</div>

					<dl class="facts">
						<div class="fact">
							<dt class="fact-label">Available credit</dt>
							<dd class="fact-value gok-tabular-nums">{eur(availableMinor)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Credit limit</dt>
							<dd class="fact-value gok-tabular-nums">{eur(f.limitMinor)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Statement balance</dt>
							<dd class="fact-value gok-tabular-nums">{eur(f.statementBalanceMinor)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Minimum payment</dt>
							<dd class="fact-value gok-tabular-nums">{eur(minimumMinor)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Payment due</dt>
							<dd class="fact-value gok-tabular-nums">{formatDate(f.dueDateIso)}</dd>
						</div>
					</dl>

					<div class="progress">
						<gok-progress
							size="s"
							format="percent"
							label={`Credit used — ${eur(f.balanceMinor)} of ${eur(f.limitMinor)}`}
							{@attach setProps({ value: utilisationFraction, max: 1 })}
						></gok-progress>
						<p class="progress-caption">
							I'm using <span class="gok-tabular-nums">{eur(f.balanceMinor)}</span> of my
							<span class="gok-tabular-nums">{eur(f.limitMinor)}</span> limit — about {utilisationPct}%.
						</p>
					</div>

					<p class="guidance">Pay my statement balance by the due date to avoid interest.</p>

					<div class="actions">
						<gok-button variant="primary" {@attach on('click', openRepay)}>Repay</gok-button>
					</div>
				</div>
			</gok-card>
		</section>

		<!-- Statement -->
		<section class="block" aria-labelledby="statement-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Statement</p>
				<h2 id="statement-heading" class="block-title gok-headline-5">This month's transactions</h2>
			</div>
			<gok-table
				class="statement"
				accessible-label="My credit line statement"
				{@attach setProps({
					columns,
					// gok-table compares `rows` by reference, so a fresh array is required after
					// any in-place mutation (its dev-warning is a no-op in the published prod build).
					rows: [...f.transactions],
					getRowId
				})}
			></gok-table>
			<p class="statement-note">
				Past statements live in my <gok-link href="/documents">documents vault</gok-link>.
			</p>
		</section>
	</div>

	<!-- Repay surface (owns its flow; the summary's balance + available credit update
	     live on commit). -->
	<CreditRepayDrawer bind:open={repayOpen} />
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 52rem;
	}

	.missing {
		max-inline-size: 36rem;
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: var(--gok-space-200) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
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
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.guidance {
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

	/* ── Statement table ── */
	.statement {
		display: block;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.statement-note {
		margin: 0;
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
