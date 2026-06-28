<script lang="ts">
	// L-series lending hub — the calm front door to borrowing. It opens on what I'm
	// already servicing — a personal loan, a mortgage, and a revolving credit line
	// (each with its outstanding/current balance as the hero figure) — then lays out
	// what I can borrow next as a small grid of product cards (the personal-loan and
	// credit-line applications, and the public mortgage calculator). The forest-green
	// accent stays unspent here — ink on paper — so the numbers carry the page. A quiet
	// compliance footnote closes it. Each servicing card links through to its detail
	// surface ("Manage loan" → L02, "Manage mortgage" → L04, "Manage credit line" → L05).
	import { lending } from '$lib/state/lending.svelte';
	import { mortgageServicing } from '$lib/state/mortgage-servicing.svelte';
	import { creditLine } from '$lib/state/credit-line.svelte';
	import { LOAN_PURPOSES, personalLoanAprBps } from '$lib/data/lending';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps } from '$lib/wc.svelte';

	const loan = $derived(lending.activeLoan);
	const status = $derived(lending.activeLoanStatus);

	// The one mortgage I'm servicing — its outstanding balance is the card's hero figure,
	// linking through to the L04 servicing surface.
	const mortgage = $derived(mortgageServicing.mortgage);

	// My revolving credit line — its current balance is the card's hero figure, with the
	// available credit and limit beneath, linking to the L05 management surface.
	const credit = $derived(creditLine.facility);
	const creditAvailableMinor = $derived(creditLine.availableMinor);

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	const purposeLabel = $derived(
		LOAN_PURPOSES.find((p) => p.value === loan.purpose)?.label ?? 'Personal loan'
	);

	// The term-elapsed fraction the progress bar reads (0–1).
	const progressFraction = $derived(status.progressBps / 10000);

	// The representative APR for the personal-loan product blurb — the regulated
	// €10,000 / 36-month reference loan, shown as a "From …" figure. Two decimals so
	// a banded rate (e.g. 6.90%) reads honestly.
	const repAprBps = personalLoanAprBps(1_000_000, 36);
	const rate = (bps: number) =>
		`${(bps / 100).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

	interface Product {
		label: string;
		desc: string;
		href: string;
		ready: boolean;
	}

	const products: Product[] = [
		{
			label: 'Personal loan',
			desc: `From ${rate(repAprBps)} APR representative`,
			href: '/lending/loans/apply',
			ready: true
		},
		{
			label: 'Mortgage calculator',
			desc: 'Model it, then apply',
			href: '/lending/mortgages/calculator',
			ready: true
		},
		// L05 — a flexible draw-down limit, now live.
		{
			label: 'Credit line',
			desc: 'A flexible limit to draw on',
			href: '/lending/credit-line/apply',
			ready: true
		}
	];
</script>

<svelte:head>
	<title>Lending · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Lending</p>
		<h1 class="head-title gok-headline-2">Borrow with a clear head</h1>
		<p class="head-sub">My loan at a glance, and a calm place to model the next one.</p>
	</header>

	<!-- Active loan — the servicing summary for the one loan I hold. -->
	<section class="block" aria-labelledby="loan-heading">
		<h2 id="loan-heading" class="visually-hidden">My active loan</h2>
		<gok-card>
			<div class="loan">
				<div class="loan-top">
					<div class="loan-id">
						<p class="loan-eyebrow gok-eyebrow">My loan</p>
						<p class="loan-purpose gok-headline-6">{purposeLabel}</p>
						<p class="loan-original gok-tabular-nums">Borrowed {eur(loan.principalMinor)}</p>
					</div>
					<div class="loan-cta">
						<!-- L02 servicing — the live loan-detail surface. -->
						<gok-link href="/lending/loans/{loan.id}">Manage loan</gok-link>
					</div>
				</div>

				<div class="loan-hero">
					<p class="loan-eyebrow gok-eyebrow">Outstanding balance</p>
					<p class="loan-balance gok-tabular-nums">{eur(status.balanceMinor)}</p>
				</div>

				<dl class="loan-meta">
					<div class="loan-meta-row">
						<dt class="loan-meta-label">Next payment</dt>
						<dd class="loan-meta-value gok-tabular-nums">
							{eur(status.nextPaymentMinor)} on {formatDate(status.nextPaymentDate)}
						</dd>
					</div>
				</dl>

				<div class="loan-progress">
					<gok-progress
						size="s"
						format="percent"
						label={`Loan term — ${status.paidMonths} of ${loan.termMonths} months paid`}
						{@attach setProps({ value: progressFraction, max: 1 })}
					></gok-progress>
					<p class="loan-progress-caption gok-tabular-nums">
						{status.paidMonths} of {loan.termMonths} months
					</p>
				</div>
			</div>
		</gok-card>
	</section>

	<!-- My mortgage — the servicing summary for the one mortgage I hold. -->
	<section class="block" aria-labelledby="mortgage-heading">
		<h2 id="mortgage-heading" class="visually-hidden">My mortgage</h2>
		<gok-card>
			<div class="loan">
				<div class="loan-top">
					<div class="loan-id">
						<p class="loan-eyebrow gok-eyebrow">My mortgage</p>
						<p class="loan-purpose gok-headline-6">My home mortgage</p>
						<p class="loan-original gok-tabular-nums">Borrowed {eur(mortgage.originalPrincipalMinor)}</p>
					</div>
					<div class="loan-cta">
						<!-- L04 servicing — the live mortgage-detail surface. -->
						<gok-link href="/lending/mortgages/{mortgage.id}">Manage mortgage</gok-link>
					</div>
				</div>

				<div class="loan-hero">
					<p class="loan-eyebrow gok-eyebrow">Outstanding balance</p>
					<p class="loan-balance gok-tabular-nums">{eur(mortgage.balanceMinor)}</p>
				</div>

				<dl class="loan-meta">
					<div class="loan-meta-row">
						<dt class="loan-meta-label">Rate</dt>
						<dd class="loan-meta-value gok-tabular-nums">
							{rate(mortgage.aprBps)} {mortgage.rateType}
						</dd>
					</div>
					<div class="loan-meta-row">
						<dt class="loan-meta-label">Monthly payment</dt>
						<dd class="loan-meta-value gok-tabular-nums">{eur(mortgage.monthlyMinor)}</dd>
					</div>
				</dl>
			</div>
		</gok-card>
	</section>

	<!-- My credit line — the management summary for the one revolving line I hold. -->
	<section class="block" aria-labelledby="credit-heading">
		<h2 id="credit-heading" class="visually-hidden">My credit line</h2>
		<gok-card>
			<div class="loan">
				<div class="loan-top">
					<div class="loan-id">
						<p class="loan-eyebrow gok-eyebrow">My credit line</p>
						<p class="loan-purpose gok-headline-6">{credit.name}</p>
						<p class="loan-original gok-tabular-nums">Limit {eur(credit.limitMinor)}</p>
					</div>
					<div class="loan-cta">
						<!-- L05 management — the live credit-line surface. -->
						<gok-link href="/lending/credit-line/{credit.id}">Manage credit line</gok-link>
					</div>
				</div>

				<div class="loan-hero">
					<p class="loan-eyebrow gok-eyebrow">Current balance</p>
					<p class="loan-balance gok-tabular-nums">{eur(credit.balanceMinor)}</p>
				</div>

				<dl class="loan-meta">
					<div class="loan-meta-row">
						<dt class="loan-meta-label">Available credit</dt>
						<dd class="loan-meta-value gok-tabular-nums">{eur(creditAvailableMinor)}</dd>
					</div>
					<div class="loan-meta-row">
						<dt class="loan-meta-label">Credit limit</dt>
						<dd class="loan-meta-value gok-tabular-nums">{eur(credit.limitMinor)}</dd>
					</div>
				</dl>
			</div>
		</gok-card>
	</section>

	<!-- Products — what I can borrow next. -->
	<section class="block" aria-labelledby="products-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">Products</p>
			<h2 id="products-heading" class="block-title gok-headline-5">What I can borrow</h2>
		</div>

		<ul class="product-grid">
			{#each products as product (product.label)}
				<li class="product-cell">
					{#if product.ready}
						<gok-card interactive style="position: relative">
							<a class="stretched" href={product.href} aria-label={product.label}></a>
							<div class="product">
								<h3 class="product-label gok-headline-6">{product.label}</h3>
								<p class="product-desc">{product.desc}</p>
							</div>
						</gok-card>
					{:else}
						<gok-card class="is-soon">
							<div class="product">
								<div class="product-head">
									<h3 class="product-label gok-headline-6">{product.label}</h3>
									<gok-tag size="s">Soon</gok-tag>
								</div>
								<p class="product-desc">{product.desc}</p>
							</div>
						</gok-card>
					{/if}
				</li>
			{/each}
		</ul>

		<p class="apply-link">
			Already modelled it? <gok-link href="/lending/mortgages/apply">Apply for a mortgage</gok-link>,
			or <gok-link href="/lending/credit-line/apply">apply for a credit line</gok-link>.
		</p>
	</section>

	<p class="footnote">
		Lending is subject to status and affordability. Representative example shown on application.
	</p>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── Header ── */
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

	/* ── Active loan card ── */
	.loan {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.loan-top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.loan-id {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.loan-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.loan-purpose {
		margin: 0;
		color: var(--gok-color-text);
	}

	.loan-original {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.loan-cta {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.loan-hero {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block: var(--gok-space-300);
		border-block: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.loan-balance {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-3-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-3-line);
		letter-spacing: var(--gok-type-headline-3-tracking);
		color: var(--gok-color-text);
	}

	.loan-meta {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.loan-meta-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.loan-meta-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.loan-meta-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.loan-progress {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.loan-progress-caption {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Products grid ── */
	.product-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.product-cell {
		display: flex;
	}

	.product-cell :global(gok-card) {
		inline-size: 100%;
	}

	.product {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.product-head {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.product-label {
		margin: 0;
		color: var(--gok-color-text);
	}

	.product-desc {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.is-soon .product-label {
		color: var(--gok-color-text-muted);
	}

	/* The whole card is one click target via a stretched, focusable overlay. The
	   card MUST be position: relative (set inline) so this overlay is bounded. */
	.stretched {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: var(--gok-radius-m);
		cursor: pointer;
	}

	.stretched:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	.apply-link {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Footnote ── */
	.footnote {
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
