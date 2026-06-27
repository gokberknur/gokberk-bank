<script lang="ts">
	// X01 this-month spend — a calm total and the top categories as a quiet list
	// with a neutral proportion bar (the accent is spent in the hero, never here).
	// Read-only: budgets (M01) aren't built, so "See budgets" is a disabled "Soon".
	import { thisMonthSpendEurMinor, topCategoriesThisMonth } from '$lib/home/insights';
	import { formatMoney } from '$lib/format';
	import type { Category } from '$lib/data/types';

	function capitalize(category: Category): string {
		return category.charAt(0).toUpperCase() + category.slice(1);
	}

	let spend = $derived(formatMoney(thisMonthSpendEurMinor(), 'EUR'));
	let categories = $derived(topCategoriesThisMonth(4));
	let maxAmount = $derived(Math.max(1, ...categories.map((c) => c.amountEurMinor)));
	let rows = $derived(
		categories.map((c) => ({
			category: c.category,
			label: capitalize(c.category),
			amount: formatMoney(c.amountEurMinor, 'EUR'),
			fraction: c.amountEurMinor / maxAmount
		}))
	);
</script>

<div class="block">
	<p class="total-figure gok-headline-3 gok-tabular-nums">{spend}</p>
	<p class="total-note">Spent this month</p>

	{#if rows.length > 0}
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
	{:else}
		<p class="empty">No spending recorded this month.</p>
	{/if}

	<div class="more">
		<gok-button variant="secondary" size="s" disabled>See budgets</gok-button>
		<gok-tag size="s">Soon</gok-tag>
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
