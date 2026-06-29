<script lang="ts">
	// M01 budgets & spend-analytics dashboard — the money-management surface. A calm
	// editorial read of "where my money went": spend by category (donut + legend),
	// a monthly trend (stacked bar), per-category budgets with progress, the income
	// vs expense ledger, top merchants, detected subscriptions, and a month-over-month
	// comparison. Every number derives from the F03 transactions spine via the pure
	// analytics behind `budgets`; this page only reads and lays them out. One accent
	// (the single primary "Set budget"); over-budget and deltas read by rule + icon +
	// word + the status role on the figure only — never a colour fill.
	import { budgets, THIS_MONTH, shiftMonth, monthLabel } from '$lib/state/budgets.svelte';
	import { SPEND_CATEGORIES, CATEGORY_LABELS } from '$lib/data/categories';
	import type { Category } from '$lib/data/types';
	import { formatMoney, formatDayMonth } from '$lib/format';
	import { DonutChart, StackedBar } from '$lib/charts';
	import { setProps, on } from '$lib/wc.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// ── Period: two segments (custom range out of scope — F06 date-range, deferred) ──
	const LAST_MONTH = shiftMonth(THIS_MONTH, -1);
	const PERIODS = [
		{ value: THIS_MONTH, label: 'This month' },
		{ value: LAST_MONTH, label: 'Last month' }
	];

	function onPeriod(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		budgets.setMonth(value);
	}

	// ── Analytics reads (all re-flow when the period changes) ──
	const spend = $derived(budgets.spend);
	const total = $derived(budgets.total);
	const trend = $derived(budgets.trend);
	const ledger = $derived(budgets.incomeExpense);
	const merchants = $derived(budgets.merchants);
	const mom = $derived(budgets.mom);
	const subscriptions = $derived(budgets.subscriptions);
	const list = $derived(budgets.list);
	const hasSpend = $derived(spend.length > 0);

	// Chart inputs: minor units stay minor; the charts format at the edge.
	const donutData = $derived(spend.map((s) => ({ name: s.label, value: s.amountMinor })));
	const trendSeries = $derived(trend.series.map((s) => ({ name: s.label, values: s.values })));
	const eur = (m: number) => formatMoney(m, 'EUR');

	const donutLabel = $derived(
		`${monthLabel(budgets.month)} spending across ${spend.length} categories, ${eur(total)} in total.`
	);
	const trendLabel = $derived(
		`Spending by category across the last ${trend.months.length} months, in euros.`
	);

	// Whole-percent share/rate text — neutral, unsigned (deltas use signed formatPercent).
	const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

	// The sign bucket that drives the status role + icon + screen-reader word.
	function signOf(n: number): 'pos' | 'neg' | 'flat' {
		return n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat';
	}

	// ── Set-budget form (the one primary action) ──
	let newCategory = $state<Category>(SPEND_CATEGORIES[0]);
	let newLimitMinor = $state(0);
	// MoneyInput seeds its display once; remount it to clear after a successful set.
	let moneyKey = $state(0);

	function onCategory(e: Event) {
		newCategory = (e.target as HTMLElement & { value: string }).value as Category;
	}

	function setBudget() {
		if (newLimitMinor <= 0) return;
		budgets.setBudget(newCategory, newLimitMinor);
		newLimitMinor = 0;
		moneyKey += 1;
	}
</script>

<svelte:head>
	<title>Budgets · gökberk bank</title>
</svelte:head>

<!-- A compact signed delta: ▲/▼ icon + word + amount + percent, status role on the
     figure only. For spend, less than before is the good direction (success). -->
{#snippet spendDelta(deltaMinor: number, deltaBps: number | null)}
	{#if deltaBps === null}
		<span class="delta is-new">
			<span class="visually-hidden">New this month — </span>New
		</span>
	{:else}
		{@const up = deltaMinor > 0}
		{@const sign = deltaMinor === 0 ? 'flat' : up ? 'neg' : 'pos'}
		<span class="delta gok-tabular-nums" data-sign={sign}>
			<span class="delta-icon" aria-hidden="true">{deltaMinor === 0 ? '—' : up ? '▲' : '▼'}</span>
			<span class="visually-hidden">{deltaMinor === 0 ? 'no change' : up ? 'up' : 'down'}</span>
			{eur(Math.abs(deltaMinor))}
			<span class="delta-pct">({pct(Math.abs(deltaBps) / 10000)})</span>
		</span>
	{/if}
{/snippet}

<div class="page">
	<header class="head">
		<div class="head-titles">
			<p class="head-eyebrow gok-eyebrow">Budgets</p>
			<h1 class="head-title gok-headline-2">{monthLabel(budgets.month)}</h1>
			{#if hasSpend}
				<p class="head-caption gok-tabular-nums">I spent {eur(total)} this month.</p>
			{/if}
		</div>
		<gok-segmented
			label="Period"
			{@attach setProps({ value: budgets.month })}
			{@attach on('change', onPeriod)}
		>
			{#each PERIODS as period (period.value)}
				<gok-segmented-item value={period.value}>{period.label}</gok-segmented-item>
			{/each}
		</gok-segmented>
	</header>

	{#if !hasSpend}
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-5">No spending to analyse yet</p>
				<p class="empty-body">
					When money moves this period, I'll see where it went — by category, by merchant, and
					against my budgets.
				</p>
			</gok-empty-state>
		</section>
	{:else}
		<!-- 2 · Spend by category -->
		<section class="block" aria-labelledby="cat-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">By category</p>
				<h2 id="cat-heading" class="block-title gok-headline-5">Where my money went</h2>
			</div>
			<div class="cat-layout">
				<div class="cat-chart">
					<DonutChart
						data={donutData}
						formatValue={eur}
						label={donutLabel}
						centerTitle="Spent"
						centerValue={eur(total)}
						height="16rem"
					/>
				</div>
				<ul class="legend">
					{#each spend as row (row.category)}
						{@const share = total !== 0 ? row.amountMinor / total : 0}
						<li class="legend-row">
							<span class="legend-name">{row.label}</span>
							<span class="legend-figures gok-tabular-nums">
								<span class="legend-value">{eur(row.amountMinor)}</span>
								<span class="legend-share">{pct(share)}</span>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- 3 · Monthly trend -->
		<section class="block" aria-labelledby="trend-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Trend</p>
				<h2 id="trend-heading" class="block-title gok-headline-5">Spending over time</h2>
			</div>
			<StackedBar
				categories={trend.monthLabels}
				series={trendSeries}
				formatValue={eur}
				label={trendLabel}
				height="18rem"
			/>
		</section>

		<!-- 4 · Budgets -->
		<section class="block" aria-labelledby="budgets-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Budgets</p>
				<h2 id="budgets-heading" class="block-title gok-headline-5">My budgets</h2>
			</div>

			{#if list.length === 0}
				<p class="budgets-empty">
					I haven't set any budgets yet. Set one below to track a category against a monthly cap.
				</p>
			{:else}
				<ul class="budget-list">
					{#each list as budget (budget.category)}
						{@const p = budgets.progress(budget.category)}
						{@const frac = Math.min(1, Math.max(0, p.fraction))}
						{@const label = CATEGORY_LABELS[budget.category]}
						<li class="budget-row">
							<div class="budget-head">
								<span class="budget-label">{label}</span>
								{#if p.state !== 'under'}
									<span class="budget-flag" data-state={p.state}>
										<span class="flag-icon" aria-hidden="true">{p.state === 'over' ? '▲' : '⚠'}</span>
										<gok-tag size="s">{p.state === 'over' ? 'Over budget' : 'Near limit'}</gok-tag>
									</span>
								{/if}
							</div>
							<gok-progress
								size="s"
								format="percent"
								label={`${label} budget — ${eur(p.spentMinor)} of ${eur(p.limitMinor)} spent`}
								{@attach setProps({ value: frac, max: 1 })}
							></gok-progress>
							<div class="budget-foot">
								<span class="budget-figures gok-tabular-nums">
									{eur(p.spentMinor)} of {eur(p.limitMinor)}
								</span>
								<gok-button
									variant="secondary"
									size="s"
									{@attach on('click', () => budgets.removeBudget(budget.category))}
								>
									Remove
								</gok-button>
							</div>
							{#if p.state === 'near'}
								<gok-alert status="info">
									I'm close to my {label} budget — {eur(p.limitMinor - p.spentMinor)} left this month.
								</gok-alert>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<form class="set-budget" onsubmit={(e) => e.preventDefault()}>
				<p class="set-budget-title gok-eyebrow">Set a budget</p>
				<div class="set-budget-fields">
					<gok-select
						class="set-budget-cat"
						label="Category"
						{@attach setProps({ value: newCategory })}
						{@attach on('change', onCategory)}
					>
						{#each SPEND_CATEGORIES as category (category)}
							<gok-option value={category}>{CATEGORY_LABELS[category]}</gok-option>
						{/each}
					</gok-select>
					<div class="set-budget-amount">
						{#key moneyKey}
							<MoneyInput currency="EUR" label="Monthly limit" bind:value={newLimitMinor} />
						{/key}
					</div>
					<gok-button
						variant="primary"
						disabled={newLimitMinor <= 0}
						{@attach on('click', setBudget)}
					>
						Set budget
					</gok-button>
				</div>
			</form>
		</section>

		<!-- 5 · Income vs expense -->
		<section class="block" aria-labelledby="ledger-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Cashflow</p>
				<h2 id="ledger-heading" class="block-title gok-headline-5">Income and expense</h2>
			</div>
			<gok-card variant="outlined">
				<dl class="ledger">
					<div class="ledger-row">
						<dt class="ledger-label">In</dt>
						<dd class="ledger-value gok-tabular-nums">{eur(ledger.inMinor)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Out</dt>
						<dd class="ledger-value gok-tabular-nums">{eur(ledger.outMinor)}</dd>
					</div>
					<div class="ledger-row is-total">
						<dt class="ledger-label">Net</dt>
						<dd class="ledger-value gok-tabular-nums" data-sign={signOf(ledger.netMinor)}>
							<span class="delta-icon" aria-hidden="true"
								>{ledger.netMinor > 0 ? '▲' : ledger.netMinor < 0 ? '▼' : '—'}</span
							>
							<span class="visually-hidden"
								>{ledger.netMinor > 0 ? 'saved' : ledger.netMinor < 0 ? 'overspent' : 'flat'}</span
							>
							{formatMoney(ledger.netMinor, 'EUR', { signDisplay: true })}
						</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Savings rate</dt>
						<dd class="ledger-value gok-tabular-nums">{pct(ledger.savingsRateBps / 10000)}</dd>
					</div>
				</dl>
			</gok-card>
		</section>

		<!-- 6 · Top merchants -->
		<section class="block" aria-labelledby="merchants-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Merchants</p>
				<h2 id="merchants-heading" class="block-title gok-headline-5">Where I shopped most</h2>
			</div>
			<ol class="merchant-list">
				{#each merchants as merchant, i (merchant.merchant)}
					<li class="merchant-row">
						<span class="merchant-rank gok-tabular-nums" aria-hidden="true">{i + 1}</span>
						<span class="merchant-name">{merchant.merchant}</span>
						<span class="merchant-count gok-tabular-nums">
							{merchant.count}
							{merchant.count === 1 ? 'charge' : 'charges'}
						</span>
						<span class="merchant-amount gok-tabular-nums">{eur(merchant.amountMinor)}</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- 7 · Subscriptions -->
		<section class="block" aria-labelledby="subs-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Recurring</p>
				<h2 id="subs-heading" class="block-title gok-headline-5">My subscriptions</h2>
			</div>
			{#if subscriptions.length === 0}
				<p class="subs-empty">No recurring charges detected this period.</p>
			{:else}
				<ul class="subs-grid">
					{#each subscriptions as sub (sub.merchant)}
						<li class="sub-card">
							<span class="sub-merchant">{sub.merchant}</span>
							<span class="sub-cadence">Monthly</span>
							<span class="sub-amount gok-tabular-nums">{eur(sub.amountMinor)}</span>
							<span class="sub-next gok-tabular-nums">Next ~{formatDayMonth(sub.nextDate)}</span>
						</li>
					{/each}
				</ul>
				<p class="subs-caption">Detected from my recurring charges.</p>
			{/if}
		</section>

		<!-- 8 · Month over month -->
		{#if mom.length > 0}
			<section class="block" aria-labelledby="mom-heading">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Comparison</p>
					<h2 id="mom-heading" class="block-title gok-headline-5">Month over month</h2>
				</div>
				<ul class="mom-list">
					{#each mom.slice(0, 5) as delta (delta.category)}
						<li class="mom-row">
							<span class="mom-name">{delta.label}</span>
							<span class="mom-figures gok-tabular-nums">
								<span class="mom-current">{eur(delta.currentMinor)}</span>
								<span class="mom-prior">from {eur(delta.priorMinor)}</span>
							</span>
							{@render spendDelta(delta.deltaMinor, delta.deltaBps)}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
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
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.head-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-caption {
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

	/* ── Spend by category ── */
	.cat-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
		align-items: center;
	}

	.cat-chart {
		min-inline-size: 0;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.legend-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.legend-row:first-child {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.legend-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.legend-figures {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
	}

	.legend-value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.legend-share {
		min-inline-size: 3rem;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		text-align: end;
		color: var(--gok-color-text-muted);
	}

	/* ── Budgets ── */
	.budgets-empty,
	.subs-empty {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.budget-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.budget-row {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.budget-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.budget-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	/* The status role lands on the small icon only — rule + icon + word (the tag)
	   carry it too. Never a fill. */
	.budget-flag {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	.flag-icon {
		font-size: 0.8em;
	}

	.budget-flag[data-state='near'] .flag-icon {
		color: var(--gok-color-status-warning);
	}

	.budget-flag[data-state='over'] .flag-icon {
		color: var(--gok-color-status-error);
	}

	.budget-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.budget-figures {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.set-budget {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.set-budget-title {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.set-budget-fields {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--gok-space-300);
	}

	.set-budget-cat {
		min-inline-size: 12rem;
	}

	.set-budget-amount {
		min-inline-size: 10rem;
	}

	/* ── Ledger ── */
	.ledger {
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

	.ledger-row.is-total {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
	}

	.ledger-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.ledger-row.is-total .ledger-label {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.ledger-value {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.ledger-value[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	.ledger-value[data-sign='neg'] {
		color: var(--gok-color-status-error);
	}

	/* ── Merchants ── */
	.merchant-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.merchant-row {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.merchant-row:first-child {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.merchant-rank {
		min-inline-size: 1.5rem;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.merchant-name {
		flex: 1 1 auto;
		min-inline-size: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.merchant-count {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.merchant-amount {
		min-inline-size: 5rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		text-align: end;
		color: var(--gok-color-text);
	}

	/* ── Subscriptions ── */
	.subs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sub-card {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--gok-space-100) var(--gok-space-200);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.sub-merchant {
		grid-column: 1 / 2;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sub-amount {
		grid-column: 2 / 3;
		grid-row: 1 / 2;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		text-align: end;
		color: var(--gok-color-text);
	}

	.sub-cadence {
		grid-column: 1 / 2;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--gok-color-text-muted);
	}

	.sub-next {
		grid-column: 2 / 3;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		text-align: end;
		color: var(--gok-color-text-muted);
	}

	.subs-caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Month over month ── */
	.mom-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.mom-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.mom-row:first-child {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.mom-name {
		flex: 1 1 auto;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.mom-figures {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-200);
	}

	.mom-current {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.mom-prior {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Deltas (shared) ── */
	.delta {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		min-inline-size: 6rem;
		justify-content: flex-end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.delta[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	/* Spending more than before is a heads-up, not a loss — warning, never error red. */
	.delta[data-sign='neg'] {
		color: var(--gok-color-status-warning);
	}

	.delta-icon {
		font-size: 0.7em;
	}

	.delta-pct {
		font-size: var(--gok-type-footnote-size);
	}

	/* ── Empty ── */
	.empty {
		padding-block: var(--gok-space-700);
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

	/* ── Two-column category split + breathing room at desktop ── */
	@media (min-width: 48rem) {
		.cat-layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--gok-space-700);
		}
	}
</style>
