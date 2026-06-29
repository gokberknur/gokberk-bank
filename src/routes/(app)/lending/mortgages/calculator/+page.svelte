<script lang="ts">
	// L03 mortgage calculator — a public, no-commitment modelling tool. Enter a
	// property value, deposit, term, and rate type and the monthly payment, total
	// interest, total repayable, and LTV recompute live; an amortization line shows
	// the balance falling and a stacked bar shows the front-loaded interest split.
	// Every figure is honest and labelled an estimate, never a quote. The inputs
	// serialize to URL params so a result can be shared or bookmarked and reopened
	// exactly. The forest-green accent is spent once — on the active rate segment and
	// the slider — and the "Copy link" primary. Works fully logged-out: it reads only
	// the seeded mortgage math, no session.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState, goto } from '$app/navigation';
	import { lending } from '$lib/state/lending.svelte';
	import { MORTGAGE_BOUNDS } from '$lib/data/lending';
	import { formatMoney } from '$lib/format';
	import { LineChart, StackedBar } from '$lib/charts';
	import { setProps, on } from '$lib/wc.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// Live reads — all re-flow on every `setMortgage`.
	const m = $derived(lending.mortgage);
	const results = $derived(lending.mortgageResults());
	const amort = $derived(lending.mortgageAmortYearly());

	// The two reward-early invalid flags gate every misleading number.
	const valid = $derived(!results.belowMinDeposit && !results.depositGteValue);

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// Rates can carry two decimals (3.49%, 6.90%) — never round them away.
	const rate = (bps: number) =>
		`${(bps / 100).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
	// LTV / deposit share read cleaner at one decimal (80%, 14.3%).
	const pct1 = (bps: number) => `${(bps / 100).toLocaleString('en-IE', { maximumFractionDigits: 1 })}%`;

	const rateTypeLabel = $derived(m.rateType === 'fixed' ? 'Fixed' : 'Variable');

	// LTV band hint — TEXT, never colour. The bands mirror `mortgageRateBps`.
	const ltvHint = $derived.by(() => {
		const ltv = results.ltvBps;
		if (ltv <= 6000) return "You're in the ≤60% band — my lowest rate.";
		if (ltv <= 8000) return '≤80% LTV unlocks a lower rate.';
		if (ltv <= 9000) return "You're in the ≤90% band.";
		return 'Above 90% LTV — a bigger deposit unlocks a lower rate.';
	});

	// The minimum-deposit rule, for the reward-early message.
	const minDepositPctLabel = `${MORTGAGE_BOUNDS.minDepositBps / 100}%`;
	const minDepositMinor = $derived(
		Math.round((m.propertyMinor * MORTGAGE_BOUNDS.minDepositBps) / 10000)
	);

	// ── Charts ──
	// Each amortization year maps to a synthetic 1-Jan date counting from this year,
	// so the x-axis reads as a timeline. A leading year-0 point seeds the line at the
	// full loan so it visibly falls to zero.
	const baseYear = new Date().getFullYear();

	const balanceData = $derived([
		{ date: `${baseYear}-01-01`, value: results.loanAmountMinor },
		...amort.map((row) => ({ date: `${baseYear + row.year}-01-01`, value: row.balanceMinor }))
	]);

	const splitCategories = $derived(amort.map((row) => String(row.year)));
	const splitSeries = $derived([
		{ name: 'Principal', values: amort.map((row) => row.principalMinor) },
		{ name: 'Interest', values: amort.map((row) => row.interestMinor) }
	]);

	const balanceLabel = $derived(
		`Remaining mortgage balance falling from ${eur(results.loanAmountMinor)} to zero over ${m.termYears} years.`
	);
	const splitLabel = $derived(
		`Principal and interest paid each year across ${m.termYears} years; interest is heaviest in the early years.`
	);
	const chartSummary = $derived(
		`Over ${m.termYears} years I'd repay ${eur(results.totalRepayableMinor)}, of which ${eur(results.totalInterestMinor)} is interest.`
	);

	// ── URL hydration ──
	// Restore every field from the share link on mount, then bump `hydrated` so the
	// money inputs (which seed their display once) remount with the restored values.
	let hydrated = $state(0);

	onMount(() => {
		lending.mortgageFromQuery(page.url.searchParams);
		hydrated += 1;
	});

	// ── Input handlers (each updates the shared state live) ──
	function onProperty(minor: number) {
		lending.setMortgage({ propertyMinor: minor });
	}
	function onDeposit(minor: number) {
		lending.setMortgage({ depositMinor: minor });
	}
	function onTerm(event: Event) {
		lending.setMortgage({ termYears: Number((event.currentTarget as HTMLInputElement).value) });
	}
	function onRateType(event: Event) {
		const value = (event as CustomEvent<{ value: string }>).detail.value;
		if (value === 'fixed' || value === 'variable') lending.setMortgage({ rateType: value });
	}

	// ── Share ──
	// Build the share path from the current inputs, copy the absolute URL, and update
	// the address bar in place (no navigation) so the link is live and bookmarkable.
	async function copyLink() {
		const path = `${page.url.pathname}?${lending.mortgageToQuery()}`;
		const absolute = `${page.url.origin}${path}`;
		replaceState(path, page.state);
		try {
			await navigator.clipboard.writeText(absolute);
			toast('Link copied — my figures are in the URL.', { status: 'success' });
		} catch {
			toast("Couldn't copy, but the address bar now holds my figures.", { status: 'warning' });
		}
	}

	// ── Apply ──
	// Carry the current figures into the full L04 application (Flow A). Term is held in
	// years here, but the application works in months — so it's scaled on the way over.
	function applyNow() {
		const termMonths = m.termYears * 12;
		goto(
			`/lending/mortgages/apply?value=${m.propertyMinor}&deposit=${m.depositMinor}&term=${termMonths}`
		);
	}
</script>

<svelte:head>
	<title>Mortgage calculator · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Mortgages</p>
		<h1 class="head-title gok-headline-2">Mortgage calculator</h1>
		<p class="head-sub">Model a monthly payment and the real cost over the term.</p>
	</header>

	<!-- The estimate disclosure — announced (gok-alert), never buried. -->
	<gok-alert status="info">This is an estimate — not a quote or an offer.</gok-alert>

	<div class="layout">
		<!-- Mobile-only sticky readout: the headline number stays in view while I adjust the
		     figures below; on desktop the results column already sits beside the inputs (LEND-U-02).
		     aria-hidden — it mirrors the accessible results ledger, so don't double-announce it. -->
		<aside class="calc-summary" aria-hidden="true">
			<span class="calc-summary-label gok-eyebrow">Monthly payment</span>
			<span class="calc-summary-value gok-tabular-nums">{eur(results.monthlyMinor)}</span>
		</aside>

		<!-- ── Inputs ── -->
		<section class="inputs" aria-labelledby="inputs-heading">
			<h2 id="inputs-heading" class="section-title gok-headline-5">My figures</h2>

			{#key hydrated}
				<div class="field">
					<MoneyInput
						currency="EUR"
						label="Property value"
						value={m.propertyMinor}
						onchange={onProperty}
					/>
				</div>

				<div class="field">
					<MoneyInput currency="EUR" label="Deposit" value={m.depositMinor} onchange={onDeposit} />
					<p class="field-readout gok-tabular-nums">
						{pct1(results.depositPctBps)} of the property value
					</p>
				</div>
			{/key}

			<div class="field">
				<label class="range-label" for="term">
					<span>Term</span>
					<span class="range-value gok-tabular-nums">{m.termYears} years</span>
				</label>
				<input
					id="term"
					class="range"
					type="range"
					min={MORTGAGE_BOUNDS.minTermYears}
					max={MORTGAGE_BOUNDS.maxTermYears}
					step="1"
					value={m.termYears}
					oninput={onTerm}
				/>
				<div class="range-scale gok-tabular-nums" aria-hidden="true">
					<span>{MORTGAGE_BOUNDS.minTermYears}</span>
					<span>{MORTGAGE_BOUNDS.maxTermYears} years</span>
				</div>
			</div>

			<div class="field">
				<gok-segmented
					label="Rate type"
					{@attach setProps({ value: m.rateType })}
					{@attach on('change', onRateType)}
				>
					<gok-segmented-item value="fixed">Fixed</gok-segmented-item>
					<gok-segmented-item value="variable">Variable</gok-segmented-item>
				</gok-segmented>
			</div>
		</section>

		<!-- ── Results ledger ── -->
		<section class="results" aria-labelledby="results-heading">
			<h2 id="results-heading" class="section-title gok-headline-5">The numbers</h2>

			{#if !valid}
				<gok-alert status="warning">
					{#if results.depositGteValue}
						My deposit can't be the whole property value — lower it so there's something to borrow.
					{:else}
						I'll need at least a {minDepositPctLabel} deposit ({eur(minDepositMinor)}) on this
						property. Add a little more to see the numbers.
					{/if}
				</gok-alert>
			{:else}
				<gok-card>
					<div class="ledger" aria-live="polite">
						<div class="ledger-hero">
							<p class="ledger-eyebrow gok-eyebrow">Monthly payment</p>
							<p class="ledger-monthly gok-tabular-nums">{eur(results.monthlyMinor)}</p>
						</div>

						<dl class="ledger-rows">
							<div class="ledger-row">
								<dt class="ledger-label">Total interest</dt>
								<dd class="ledger-value gok-tabular-nums">{eur(results.totalInterestMinor)}</dd>
							</div>
							<div class="ledger-row">
								<dt class="ledger-label">Total repayable</dt>
								<dd class="ledger-value gok-tabular-nums">{eur(results.totalRepayableMinor)}</dd>
							</div>
							<div class="ledger-row">
								<dt class="ledger-label">Borrowing</dt>
								<dd class="ledger-value gok-tabular-nums">{eur(results.loanAmountMinor)}</dd>
							</div>
						</dl>
					</div>

					<gok-divider></gok-divider>

					<dl class="ledger-rows">
						<div class="ledger-row">
							<dt class="ledger-label">Loan-to-value</dt>
							<dd class="ledger-value gok-tabular-nums">{pct1(results.ltvBps)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Indicative rate</dt>
							<dd class="ledger-value gok-tabular-nums">{rate(results.aprBps)} · {rateTypeLabel}</dd>
						</div>
					</dl>
					<p class="ledger-hint">{ltvHint}</p>
				</gok-card>
			{/if}

			<div class="share">
				<gok-button variant="secondary" {@attach on('click', copyLink)}>Copy link</gok-button>
				<p class="share-note">My figures travel in the link — share or bookmark it.</p>
			</div>
		</section>
	</div>

	<!-- ── Amortization charts ── -->
	{#if valid && amort.length > 0}
		<section class="charts" aria-labelledby="charts-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Over the term</p>
				<h2 id="charts-heading" class="block-title gok-headline-5">How the balance falls</h2>
			</div>

			<p class="chart-summary gok-tabular-nums">{chartSummary}</p>

			<div class="chart-grid">
				<div class="chart">
					<p class="chart-caption gok-eyebrow">Remaining balance</p>
					<LineChart data={balanceData} formatValue={eur} label={balanceLabel} height="18rem" area />
				</div>
				<div class="chart">
					<p class="chart-caption gok-eyebrow">Principal vs interest, per year</p>
					<StackedBar
						categories={splitCategories}
						series={splitSeries}
						formatValue={eur}
						label={splitLabel}
						height="18rem"
					/>
				</div>
			</div>
		</section>
	{/if}

	<!-- Next step — carry these figures into the full L04 application. The earned accent
	     on this page: the forward action that turns a model into an application. -->
	<section class="next" aria-labelledby="apply-heading">
		<div class="next-copy">
			<h2 id="apply-heading" class="next-title gok-headline-6">Ready to apply?</h2>
			<p class="next-text">
				I'll carry these figures into a full application — a decision in principle, then the offer in
				full with every fee and the total cost.
			</p>
		</div>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !valid })}
			{@attach on('click', applyNow)}
		>
			Apply for this mortgage
		</gok-button>
		{#if !valid}
			<p class="next-note">I'll sort the deposit first — then I can apply.</p>
		{/if}
	</section>
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

	/* Mobile-only sticky monthly-payment readout (LEND-U-02). */
	.calc-summary {
		position: sticky;
		inset-block-start: var(--gok-space-300);
		z-index: var(--gok-z-sticky);
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
		background: var(--gok-color-surface-translucent);
		backdrop-filter: blur(var(--gok-blur-chrome));
	}

	.calc-summary-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.calc-summary-value {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	/* ── Two-column layout (collapses below 48rem) ── */
	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-section);
		align-items: start;
	}

	.section-title {
		margin: 0;
		margin-block-end: var(--gok-space-400);
		color: var(--gok-color-text);
	}

	/* ── Inputs ── */
	.inputs {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.field-readout {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Term slider — native range, the active accent control ── */
	.range-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.range-value {
		font-family: var(--gok-font-family-mono);
		color: var(--gok-color-text-muted);
	}

	.range {
		inline-size: 100%;
		margin: 0;
		/* The slider earns the one accent — thumb + active track in primary. */
		accent-color: var(--gok-color-primary);
		cursor: pointer;
	}

	.range:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: var(--gok-space-100);
		border-radius: var(--gok-radius-s);
	}

	.range-scale {
		display: flex;
		justify-content: space-between;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Results ledger ── */
	.results {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.ledger-hero {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.ledger-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.ledger-monthly {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-2-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		color: var(--gok-color-text);
	}

	.ledger-rows {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.ledger-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ledger-row:last-child {
		border-block-end: 0;
	}

	.ledger-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.ledger-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.ledger-hint {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Share ── */
	.share {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.share-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Charts ── */
	.charts {
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

	.chart-summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.chart-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
	}

	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	.chart-caption {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* ── Next step ── */
	.next {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-300);
		max-inline-size: 46rem;
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.next-copy {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.next-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.next-text {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.next-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Responsive ── */
	@media (min-width: 48rem) {
		.calc-summary {
			display: none;
		}

		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}

		.chart-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--gok-space-700);
		}
	}
</style>
