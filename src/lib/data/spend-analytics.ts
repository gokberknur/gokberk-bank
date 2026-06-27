// Spend analytics (M01) — honest insight reduced from the F03 transactions spine.
// Everything is computed in EUR (each row converted via `toEur`) so a multi-currency
// wallet set reads as one coherent picture. Pure functions only; no separate seed —
// the numbers are whatever the transactions say. Amounts are integer minor units.

import { getTransactions } from './index';
import { toEur } from './money';
import { TODAY, isoDate } from './time';
import { CATEGORY_LABELS } from './categories';
import type { Category, Transaction } from './types';

/** This month's key, e.g. "2026-06". */
export const THIS_MONTH = isoDate(TODAY).slice(0, 7);

/** EUR minor value of a row (signed: negative = outflow). */
function eurOf(t: Transaction): number {
	return toEur(t.amountMinor, t.currency);
}

/** Shift a "YYYY-MM" key by `delta` months. */
export function shiftMonth(monthKey: string, delta: number): string {
	const [y, m] = monthKey.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + delta, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** A readable month label, e.g. "June 2026" / short "Jun". */
export function monthLabel(monthKey: string, short = false): string {
	const [y, m] = monthKey.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1, 1));
	return d.toLocaleDateString('en-IE', {
		month: short ? 'short' : 'long',
		year: short ? undefined : 'numeric',
		timeZone: 'UTC'
	});
}

/** Distinct months present in the data, newest first. */
export function availableMonths(): string[] {
	const set = new Set<string>();
	for (const t of getTransactions()) set.add(t.date.slice(0, 7));
	return [...set].sort((a, b) => (a < b ? 1 : -1));
}

// Categories that are real "spend" (exclude income + internal transfers).
function isSpend(t: Transaction): boolean {
	return t.amountMinor < 0 && t.category !== 'income' && t.category !== 'transfers';
}

export interface CategorySpend {
	category: Category;
	label: string;
	amountMinor: number;
}

/** Outflow by category for a month, EUR minor, biggest first. */
export function spendByCategory(monthKey: string): CategorySpend[] {
	const byCat = new Map<Category, number>();
	for (const t of getTransactions()) {
		if (!isSpend(t) || t.date.slice(0, 7) !== monthKey) continue;
		byCat.set(t.category, (byCat.get(t.category) ?? 0) - eurOf(t));
	}
	return [...byCat.entries()]
		.map(([category, amountMinor]) => ({ category, label: CATEGORY_LABELS[category], amountMinor }))
		.sort((a, b) => b.amountMinor - a.amountMinor);
}

/** Total spend (EUR minor) for a month. */
export function totalSpend(monthKey: string): number {
	return spendByCategory(monthKey).reduce((s, c) => s + c.amountMinor, 0);
}

export interface IncomeExpense {
	inMinor: number;
	outMinor: number;
	netMinor: number;
	/** net ÷ income, basis points (can be negative). */
	savingsRateBps: number;
}

/** Income vs expense + savings rate for a month, EUR minor. */
export function incomeVsExpense(monthKey: string): IncomeExpense {
	let inMinor = 0;
	let outMinor = 0;
	for (const t of getTransactions()) {
		if (t.date.slice(0, 7) !== monthKey || t.category === 'transfers') continue;
		const v = eurOf(t);
		if (v > 0) inMinor += v;
		else outMinor += -v;
	}
	const netMinor = inMinor - outMinor;
	return {
		inMinor,
		outMinor,
		netMinor,
		savingsRateBps: inMinor > 0 ? Math.round((netMinor / inMinor) * 10000) : 0
	};
}

export interface MerchantSpend {
	merchant: string;
	amountMinor: number;
	count: number;
}

/** Top merchants by spend for a month, EUR minor. */
export function topMerchants(monthKey: string, limit = 6): MerchantSpend[] {
	const byMerchant = new Map<string, { amountMinor: number; count: number }>();
	for (const t of getTransactions()) {
		if (!isSpend(t) || t.date.slice(0, 7) !== monthKey) continue;
		const cur = byMerchant.get(t.merchant) ?? { amountMinor: 0, count: 0 };
		cur.amountMinor += -eurOf(t);
		cur.count += 1;
		byMerchant.set(t.merchant, cur);
	}
	return [...byMerchant.entries()]
		.map(([merchant, v]) => ({ merchant, ...v }))
		.sort((a, b) => b.amountMinor - a.amountMinor)
		.slice(0, limit);
}

export interface TrendSeries {
	/** Month keys, oldest → newest (the x-axis). */
	months: string[];
	monthLabels: string[];
	/** One stack per category; `values[i]` aligns with `months[i]`, EUR minor. */
	series: { category: Category | 'other'; label: string; values: number[] }[];
}

/** Stacked spend-by-category across the last `count` months (incl. the current),
 *  collapsed to the top `topN` categories overall + an "Other" stack. */
export function categoryTrend(monthKey: string, count = 6, topN = 5): TrendSeries {
	const months: string[] = [];
	for (let i = count - 1; i >= 0; i--) months.push(shiftMonth(monthKey, -i));

	// Rank categories by total spend across the window.
	const totals = new Map<Category, number>();
	for (const m of months) {
		for (const c of spendByCategory(m)) totals.set(c.category, (totals.get(c.category) ?? 0) + c.amountMinor);
	}
	const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
	const top = ranked.slice(0, topN);
	const rest = new Set(ranked.slice(topN));

	const perMonth = months.map((m) => {
		const map = new Map<Category, number>();
		for (const c of spendByCategory(m)) map.set(c.category, c.amountMinor);
		return map;
	});

	const series: TrendSeries['series'] = top.map((category) => ({
		category,
		label: CATEGORY_LABELS[category],
		values: perMonth.map((map) => map.get(category) ?? 0)
	}));
	if (rest.size) {
		series.push({
			category: 'other',
			label: 'Other',
			values: perMonth.map((map) => {
				let sum = 0;
				for (const c of rest) sum += map.get(c) ?? 0;
				return sum;
			})
		});
	}
	return { months, monthLabels: months.map((m) => monthLabel(m, true)), series };
}

export interface CategoryDelta {
	category: Category;
	label: string;
	currentMinor: number;
	priorMinor: number;
	deltaMinor: number;
	/** Change vs prior month, basis points (null when prior was 0). */
	deltaBps: number | null;
}

/** Per-category month-over-month change (current vs the prior month). */
export function monthOverMonth(monthKey: string): CategoryDelta[] {
	const prior = shiftMonth(monthKey, -1);
	const cur = new Map(spendByCategory(monthKey).map((c) => [c.category, c.amountMinor]));
	const prev = new Map(spendByCategory(prior).map((c) => [c.category, c.amountMinor]));
	const cats = new Set<Category>([...cur.keys(), ...prev.keys()]);
	return [...cats]
		.map((category) => {
			const currentMinor = cur.get(category) ?? 0;
			const priorMinor = prev.get(category) ?? 0;
			return {
				category,
				label: CATEGORY_LABELS[category],
				currentMinor,
				priorMinor,
				deltaMinor: currentMinor - priorMinor,
				deltaBps: priorMinor > 0 ? Math.round(((currentMinor - priorMinor) / priorMinor) * 10000) : null
			};
		})
		.sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor));
}

export interface Subscription {
	merchant: string;
	category: Category;
	/** Typical charge, EUR minor (median of observed). */
	amountMinor: number;
	cadence: 'monthly';
	lastDate: string;
	/** Estimated next charge date (ISO). */
	nextDate: string;
	/** How many charges were observed. */
	count: number;
}

/**
 * Recurring charges, detected by heuristic over the whole history: a merchant
 * charged in ≥ 2 distinct months with a stable amount (spread ≤ 20% of the
 * median), OR anything tagged `subscriptions`. The next date is the last charge
 * shifted a month. Sorted by amount, biggest first.
 */
export function detectSubscriptions(): Subscription[] {
	const byMerchant = new Map<string, Transaction[]>();
	for (const t of getTransactions()) {
		if (!isSpend(t)) continue;
		(byMerchant.get(t.merchant) ?? byMerchant.set(t.merchant, []).get(t.merchant)!).push(t);
	}

	const out: Subscription[] = [];
	for (const [merchant, txns] of byMerchant) {
		const months = new Set(txns.map((t) => t.date.slice(0, 7)));
		const amounts = txns.map((t) => -eurOf(t)).sort((a, b) => a - b);
		const median = amounts[Math.floor(amounts.length / 2)];
		const spread = amounts.length ? (amounts[amounts.length - 1] - amounts[0]) / Math.max(median, 1) : 1;
		const tagged = txns.some((t) => t.category === 'subscriptions');
		const recurring = (months.size >= 2 && spread <= 0.2) || tagged;
		if (!recurring) continue;

		const lastDate = txns.map((t) => t.date).sort().at(-1)!;
		const [y, m, d] = lastDate.split('-').map(Number);
		const next = new Date(Date.UTC(y, m, d)); // m (1-based) → next month, same day
		out.push({
			merchant,
			category: txns[0].category,
			amountMinor: Math.round(median),
			cadence: 'monthly',
			lastDate,
			nextDate: isoDate(next),
			count: txns.length
		});
	}
	return out.sort((a, b) => b.amountMinor - a.amountMinor);
}
