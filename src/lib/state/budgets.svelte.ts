// Budgets + spend insight (M01) runtime state. The analytics are **pure** and
// already live in `$lib/data/spend-analytics` (reduced from the F03 transactions
// spine, in EUR minor units) — this singleton only re-exposes them and tracks the
// two pieces of runtime UI state: the selected `month` and the user's category
// budgets. It never recomputes a number; it forwards to the pure functions.
//
// The only mutable, user-set thing here is the budget list. It IS the rune
// `$state` array, so direct mutation is already reactive — no `revision` plumbing
// is needed (unlike the cards/payments spines, which mutate the data layer in
// place). Spend is static per seed, so the pass-through getters depend only on
// `this.month` and re-flow when the period changes.

import {
	THIS_MONTH,
	shiftMonth,
	monthLabel,
	availableMonths,
	spendByCategory,
	totalSpend,
	incomeVsExpense,
	topMerchants,
	categoryTrend,
	monthOverMonth,
	detectSubscriptions
} from '$lib/data/spend-analytics';
import type {
	CategorySpend,
	IncomeExpense,
	MerchantSpend,
	TrendSeries,
	CategoryDelta,
	Subscription
} from '$lib/data/spend-analytics';
import { CATEGORY_LABELS } from '$lib/data/categories';
import type { Category } from '$lib/data/types';

// Re-expose the pure analytics surface so screens import everything budget-related
// from one place (the state layer), never reaching into the data layer directly.
export {
	THIS_MONTH,
	shiftMonth,
	monthLabel,
	availableMonths,
	spendByCategory,
	totalSpend,
	incomeVsExpense,
	topMerchants,
	categoryTrend,
	monthOverMonth,
	detectSubscriptions,
	CATEGORY_LABELS
};
export type { CategorySpend, IncomeExpense, MerchantSpend, TrendSeries, CategoryDelta, Subscription };

/** A user-set monthly cap for one spend category (the only persisted-feeling bit). */
export interface Budget {
	category: Category;
	limitMinor: number;
}

/** Where a category sits against its cap — drives the rule + tag, never colour alone. */
export type BudgetState = 'under' | 'near' | 'over';

/** A category's standing against its budget for the selected month. */
export interface BudgetProgress {
	limitMinor: number;
	spentMinor: number;
	/** spent ÷ limit (raw; the UI clamps the bar to 100%). 0 when there's no cap. */
	fraction: number;
	state: BudgetState;
}

/** Roll-up across budgeted categories — header figures for the budgets page. */
export interface BudgetSummary {
	totalBudgetedMinor: number;
	totalSpentMinor: number;
	overCount: number;
}

/** Sensible starting caps (EUR minor units): groceries €450, dining €250,
 *  shopping €300, transport €120. */
const SEED_BUDGETS: Budget[] = [
	{ category: 'groceries', limitMinor: 45000 },
	{ category: 'dining', limitMinor: 25000 },
	{ category: 'shopping', limitMinor: 30000 },
	{ category: 'transport', limitMinor: 12000 }
];

const NEAR_THRESHOLD = 0.8; // ≥ 80% spent → "near"

class BudgetsState {
	/** The period every analytics getter reads — change it and the page re-flows. */
	month = $state<string>(THIS_MONTH);

	/** My category caps. This array IS the `$state`, so edits are reactive directly. */
	items = $state<Budget[]>([...SEED_BUDGETS]);

	/** Switch the selected month (drives all the pass-through getters below). */
	setMonth(m: string) {
		this.month = m;
	}

	/** Months present in the data, newest first — options for the period selector. */
	get monthOptions(): string[] {
		return availableMonths();
	}

	/** The current budget list. */
	get list(): Budget[] {
		return this.items;
	}

	/** Set (or update) the cap for a category — upsert, mutating the rune array. */
	setBudget(category: Category, limitMinor: number) {
		const limit = Math.max(0, Math.round(limitMinor));
		const i = this.items.findIndex((b) => b.category === category);
		if (i === -1) this.items.push({ category, limitMinor: limit });
		else this.items[i] = { category, limitMinor: limit };
	}

	/** Drop a category's cap. */
	removeBudget(category: Category) {
		this.items = this.items.filter((b) => b.category !== category);
	}

	/** This month's EUR-minor spend for a category (0 when none). */
	#spentFor(category: Category): number {
		const row = spendByCategory(this.month).find((c) => c.category === category);
		return row?.amountMinor ?? 0;
	}

	/**
	 * A category's standing for the selected month: its cap, what I've spent, the
	 * raw fraction, and the rule state. `near` ≥ 80%, `over` > 100%.
	 */
	progress(category: Category): BudgetProgress {
		const budget = this.items.find((b) => b.category === category);
		const limitMinor = budget?.limitMinor ?? 0;
		const spentMinor = this.#spentFor(category);
		const fraction = limitMinor > 0 ? spentMinor / limitMinor : 0;
		const state: BudgetState = fraction > 1 ? 'over' : fraction >= NEAR_THRESHOLD ? 'near' : 'under';
		return { limitMinor, spentMinor, fraction, state };
	}

	/** Totals across budgeted categories: total budgeted, total spent against them,
	 *  and how many are over their cap. */
	get budgetSummary(): BudgetSummary {
		let totalBudgetedMinor = 0;
		let totalSpentMinor = 0;
		let overCount = 0;
		for (const b of this.items) {
			const p = this.progress(b.category);
			totalBudgetedMinor += b.limitMinor;
			totalSpentMinor += p.spentMinor;
			if (p.state === 'over') overCount += 1;
		}
		return { totalBudgetedMinor, totalSpentMinor, overCount };
	}

	// ---- Pass-through analytics for the selected month -----------------------
	// Each reads `this.month`, so the page re-flows when the period changes.

	/** Outflow by category, biggest first. */
	get spend(): CategorySpend[] {
		return spendByCategory(this.month);
	}

	/** Total spend (EUR minor). */
	get total(): number {
		return totalSpend(this.month);
	}

	/** Income vs expense + savings rate. */
	get incomeExpense(): IncomeExpense {
		return incomeVsExpense(this.month);
	}

	/** Top merchants by spend. */
	get merchants(): MerchantSpend[] {
		return topMerchants(this.month);
	}

	/** Stacked spend-by-category trend across recent months. */
	get trend(): TrendSeries {
		return categoryTrend(this.month);
	}

	/** Per-category month-over-month change. */
	get mom(): CategoryDelta[] {
		return monthOverMonth(this.month);
	}

	/** Detected recurring charges (over the whole history). */
	get subscriptions(): Subscription[] {
		return detectSubscriptions();
	}
}

export const budgets = new BudgetsState();
