<script lang="ts">
	// L04 Flow B · Mortgage-servicing surface — the detail view for the one mortgage I'm
	// servicing. It opens on a calm summary (the outstanding balance is the hero figure),
	// then windows the full forward amortization schedule in a virtualized gok-table, and
	// offers the two commitment actions a mortgage carries that a personal loan doesn't: an
	// overpayment (with its early-repayment-charge forced decision while I'm fixed) and a
	// rate switch. A quiet link to my documents vault closes it.
	//
	// The forest-green accent stays earned — it's the single primary "Overpay" action; the
	// rate-switch reviews are secondary, and the table spends no accent (no active sort or
	// selection). The numbers carry the page, in tabular figures.
	//
	// All money is integer minor units; rates are bps (÷100 for %). I read every figure off
	// `mortgage-servicing` and never recompute one here. Web-component interop is strictly
	// `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* element (the overpay drawer
	// and rate-switch dialog are app Svelte composites, so their `bind:open` is fine).
	import { page } from '$app/state';
	import { mortgageServicing as ms } from '$lib/state/mortgage-servicing.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import type { AmortRow } from '$lib/data/lending';
	import type { MortgageProduct } from '$lib/lending/mortgage';
	import MortgageOverpayDrawer from '$lib/components/lending/MortgageOverpayDrawer.svelte';
	import RateSwitchDialog from '$lib/components/lending/RateSwitchDialog.svelte';

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// bps → a two-decimal percent string (349 → "3.49%").
	const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;

	// ── The serviced mortgage (re-flows on the revision bridge) ──
	const id = $derived(page.params.id ?? '');
	const m = $derived(ms.byId(id));

	// ── Summary reads ──
	const rateTypeLabel = $derived(m?.rateType === 'variable' ? 'variable' : 'fixed');
	const termYears = $derived(m ? Math.round(m.termMonths / 12) : 0);

	// ── Amortization schedule (string cells only — the grid can't host a node) ──
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
		{
			key: 'date',
			label: 'Date',
			width: '9rem',
			format: (_v, row) => formatDate(ms.scheduleDateIso(row.month))
		},
		{ key: 'paymentMinor', label: 'Payment', numeric: true, format: (v) => eur(v as number) },
		{ key: 'principalMinor', label: 'Principal', numeric: true, format: (v) => eur(v as number) },
		{ key: 'interestMinor', label: 'Interest', numeric: true, format: (v) => eur(v as number) },
		{ key: 'balanceMinor', label: 'Balance', numeric: true, format: (v) => eur(v as number) }
	];

	const getRowId = (row: AmortRow) => String(row.month);

	// ── Action hosts ──
	let overpayOpen = $state(false);
	let switchOpen = $state(false);
	let selectedProduct = $state<MortgageProduct | null>(null);

	function openOverpay() {
		overpayOpen = true;
	}

	function reviewSwitch(product: MortgageProduct) {
		selectedProduct = product;
		switchOpen = true;
	}
</script>

<svelte:head>
	<title>My mortgage · gökberk bank</title>
</svelte:head>

{#if !m}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Mortgage not found</p>
			<p class="missing-body">There's no mortgage with that reference in my account.</p>
			<gok-link slot="actions" href="/lending">Back to lending</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/lending">&larr; Lending</gok-link>
			<p class="head-eyebrow gok-eyebrow">My mortgage</p>
			<h1 class="head-title gok-headline-3">My home mortgage</h1>
			<p class="head-caption">
				Borrowed {eur(m.originalPrincipalMinor)} · {termYears}-year term
			</p>
		</header>

		<!-- Summary -->
		<section aria-labelledby="summary-heading">
			<h2 id="summary-heading" class="visually-hidden">Mortgage summary</h2>
			<gok-card>
				<div class="summary">
					<div class="summary-top">
						<div class="hero">
							<p class="hero-eyebrow gok-eyebrow">Outstanding balance</p>
							<p class="hero-balance gok-tabular-nums">{eur(m.balanceMinor)}</p>
						</div>
						<gok-tag size="m" dot>{rateTypeLabel === 'fixed' ? 'Fixed rate' : 'Variable rate'}</gok-tag>
					</div>

					<dl class="facts">
						<div class="fact">
							<dt class="fact-label">Rate</dt>
							<dd class="fact-value gok-tabular-nums">{pct(m.aprBps)} {rateTypeLabel}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Monthly payment</dt>
							<dd class="fact-value gok-tabular-nums">{eur(m.monthlyMinor)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Loan-to-value now</dt>
							<dd class="fact-value gok-tabular-nums">{pct(ms.ltvNowBps)}</dd>
						</div>
						<div class="fact">
							<dt class="fact-label">Fixed period</dt>
							<dd class="fact-value">
								{#if ms.inFixedPeriod}
									Fixed until {formatDate(m.fixedEndIso)}
								{:else}
									Ended — now on the variable rate
								{/if}
							</dd>
						</div>
					</dl>

					<div class="progress">
						<gok-progress
							size="s"
							format="percent"
							label={`Mortgage term — ${m.monthsElapsed} of ${m.termMonths} payments made`}
							{@attach setProps({ value: ms.paidFraction, max: 1 })}
						></gok-progress>
						<p class="progress-caption gok-tabular-nums">
							{m.monthsElapsed} of {m.termMonths} payments
						</p>
					</div>

					<div class="actions">
						<gok-button variant="primary" {@attach on('click', openOverpay)}>
							Overpay
						</gok-button>
					</div>
				</div>
			</gok-card>
		</section>

		<!-- Amortization -->
		<section class="block" aria-labelledby="schedule-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Schedule</p>
				<h2 id="schedule-heading" class="block-title gok-headline-5">My amortization schedule</h2>
			</div>
			<gok-table
				class="schedule"
				accessible-label="My amortization schedule"
				{@attach setProps({
					columns,
					// gok-table compares `rows` by reference, so a fresh array is required after
					// any in-place mutation (its dev-warning is a no-op in the published prod build).
					rows: [...ms.schedule],
					getRowId,
					virtualized: true,
					rowHeight: 50
				})}
			></gok-table>
			<p class="schedule-note">
				My forward schedule for the remaining {ms.remainingMonths} payments, on today's rate. Each row is
				one monthly payment split into principal and interest, with the balance running down to zero.
			</p>
		</section>

		<!-- Rate switch -->
		<section class="block" aria-labelledby="switch-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Rate switch</p>
				<h2 id="switch-heading" class="block-title gok-headline-5">Switch my deal</h2>
			</div>
			<ul class="switch-grid">
				{#each ms.rateSwitchProducts as product (product.id)}
					<li class="switch-cell">
						<gok-card>
							<div class="switch">
								<h3 class="switch-label gok-headline-6">{product.label}</h3>
								<dl class="switch-meta">
									<div class="switch-row">
										<dt>Rate</dt>
										<dd class="gok-tabular-nums">{pct(product.aprBps)} · {pct(product.aprcBps)} APRC</dd>
									</div>
									<div class="switch-row">
										<dt>Fees</dt>
										<dd class="gok-tabular-nums">{eur(product.fees.totalMinor)}</dd>
									</div>
									<div class="switch-row">
										<dt>New monthly</dt>
										<dd class="gok-tabular-nums">{eur(product.monthlyMinor)}</dd>
									</div>
								</dl>
								<gok-button variant="secondary" {@attach on('click', () => reviewSwitch(product))}>
									Review switch
								</gok-button>
							</div>
						</gok-card>
					</li>
				{/each}
			</ul>
			<p class="switch-note">
				Each deal is priced on my balance today, my remaining term and my current loan-to-value. The
				APRC folds the fees into the rate, so I can compare like for like.
			</p>
		</section>

		<!-- Documents -->
		<section class="block" aria-labelledby="documents-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Documents</p>
				<h2 id="documents-heading" class="block-title gok-headline-5">My mortgage documents</h2>
			</div>
			<ul class="doc-list">
				<li class="doc-row">
					<gok-link href="/documents">Mortgage offer</gok-link>
					<span class="doc-note">The terms I signed.</span>
				</li>
				<li class="doc-row">
					<gok-link href="/documents">Annual statements</gok-link>
					<span class="doc-note">My yearly mortgage statements.</span>
				</li>
			</ul>
		</section>
	</div>

	<!-- Action surfaces (own their flows; the summary + schedule update live on commit). -->
	<MortgageOverpayDrawer bind:open={overpayOpen} />
	<RateSwitchDialog bind:open={switchOpen} product={selectedProduct} />
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
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
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

	/* ── Schedule table ── */
	.schedule {
		/* A fixed height + virtualization (set via setProps) windows the ~264 rows. */
		display: block;
		block-size: 32rem;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.schedule-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Rate-switch grid ── */
	.switch-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.switch-cell {
		display: flex;
	}

	.switch-cell :global(gok-card) {
		inline-size: 100%;
	}

	.switch {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.switch-label {
		margin: 0;
		color: var(--gok-color-text);
	}

	.switch-meta {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.switch-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.switch-row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.switch-row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.switch-note {
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
