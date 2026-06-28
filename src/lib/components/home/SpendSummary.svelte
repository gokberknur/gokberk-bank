<script lang="ts">
	// X01 this-month spend — a calm total and the top categories as a quiet list
	// with a neutral proportion bar (the accent is spent in the hero, never here).
	// "See budgets" deep-links to the live budgets surface at /budgets (M01).
	import {
		thisMonthSpendEurMinor,
		topCategoriesThisMonth,
		type CategorySpend
	} from '$lib/home/insights';
	import { DonutChart, type NamedValue } from '$lib/charts';
	import { formatMoney } from '$lib/format';
	import type { Category } from '$lib/data/types';
	import { goto } from '$app/navigation';
	import { on } from '$lib/wc.svelte';

	function capitalize(category: Category): string {
		return category.charAt(0).toUpperCase() + category.slice(1);
	}

	// One source: every category this month (EUR), descending. The list shows the
	// top 4; the donut shows the top 6 + an "Other" remainder — so the two always
	// agree on the same underlying figures.
	let spend = $derived(formatMoney(thisMonthSpendEurMinor(), 'EUR'));
	let allCategories = $derived(topCategoriesThisMonth(Number.MAX_SAFE_INTEGER));
	let categories = $derived(allCategories.slice(0, 4));
	let maxAmount = $derived(Math.max(1, ...categories.map((c) => c.amountEurMinor)));
	let rows = $derived(
		categories.map((c) => ({
			category: c.category,
			label: capitalize(c.category),
			amount: formatMoney(c.amountEurMinor, 'EUR'),
			fraction: c.amountEurMinor / maxAmount
		}))
	);

	function buildDonut(cats: CategorySpend[]): NamedValue[] {
		const limit = 6;
		const mapped = cats.map((c) => ({ name: capitalize(c.category), value: c.amountEurMinor }));
		if (mapped.length <= limit) return mapped;
		const top = mapped.slice(0, limit - 1);
		const other = mapped.slice(limit - 1).reduce((s, x) => s + x.value, 0);
		return [...top, { name: 'Other', value: other }];
	}

	let donutData = $derived(buildDonut(allCategories));
	let donutLabel = $derived(
		`Spent ${spend} this month across ${donutData.length} ${donutData.length === 1 ? 'category' : 'categories'}.`
	);
</script>

<div class="block">
	<p class="total-figure gok-headline-3 gok-tabular-nums">{spend}</p>
	<p class="total-note">Spent this month</p>

	{#if rows.length > 0}
		<div class="summary">
			<div class="chart">
				<DonutChart
					data={donutData}
					formatValue={(m) => formatMoney(m, 'EUR')}
					label={donutLabel}
					height="11rem"
				/>
			</div>

			<ul class="list">
				{#each rows as row (row.category)}
					<li class="row">
						<div class="row-head">
							<span class="row-label">{row.label}</span>
							<span class="row-amount gok-tabular-nums">{row.amount}</span>
						</div>
						<div class="bar" aria-hidden="true">
							<div class="bar-fill" style="inline-size: {row.fraction * 100}%"></div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p class="empty">No spending recorded this month.</p>
	{/if}

	<div class="more">
		<gok-button variant="secondary" size="s" {@attach on('click', () => goto('/budgets'))}
			>See budgets</gok-button
		>
	</div>
</div>

<style>
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.total-figure {
		margin: 0;
		color: var(--gok-color-text);
	}

	.total-note {
		margin: 0;
		margin-block-start: calc(-1 * var(--gok-space-200));
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Donut + list as companions: stacked on mobile, side by side from 30rem. */
	.summary {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-400);
	}

	.chart {
		min-inline-size: 0;
	}

	@media (min-width: 30rem) {
		.summary {
			grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
			align-items: center;
			gap: var(--gok-space-500);
		}
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.row-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.row-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.bar {
		block-size: var(--gok-space-100);
		border-radius: var(--gok-radius-pill);
		background-color: var(--gok-color-surface-strong);
		overflow: hidden;
	}

	.bar-fill {
		block-size: 100%;
		border-radius: var(--gok-radius-pill);
		background-color: var(--gok-color-border-strong);
	}

	.empty {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.more {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}
</style>
