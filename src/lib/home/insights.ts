// Read-only dashboard derivations. Everything is a pure function of the F03
// transactions spine + the mock FX rates, converted to the home currency (EUR)
// so the dashboard can sum across wallets. Money stays in integer minor units;
// no formatting here (the UI formats via format.ts).

import { getTransactions } from '$lib/data';
import { toEur, type Currency } from '$lib/data/money';
import { TODAY } from '$lib/data/time';
import type { Category, Transaction } from '$lib/data/types';

/** Whether an ISO date falls in TODAY's calendar month. */
function inCurrentMonth(iso: string): boolean {
	const d = new Date(iso);
	return d.getUTCFullYear() === TODAY.getUTCFullYear() && d.getUTCMonth() === TODAY.getUTCMonth();
}

const eur = (t: Transaction) => toEur(t.amountMinor, t.currency as Currency);

/** Total spent (outflows) this calendar month, in EUR minor units (positive). */
export function thisMonthSpendEurMinor(): number {
	return getTransactions()
		.filter((t) => inCurrentMonth(t.date) && t.amountMinor < 0)
		.reduce((s, t) => s - eur(t), 0);
}

/** Net flow (in − out) this calendar month, in EUR minor units (signed). */
export function thisMonthNetEurMinor(): number {
	return getTransactions()
		.filter((t) => inCurrentMonth(t.date))
		.reduce((s, t) => s + eur(t), 0);
}

export interface CategorySpend {
	category: Category;
	amountEurMinor: number;
}

/** Top spend categories this month (EUR minor units), descending. */
export function topCategoriesThisMonth(limit = 4): CategorySpend[] {
	const totals = new Map<Category, number>();
	for (const t of getTransactions()) {
		if (!inCurrentMonth(t.date) || t.amountMinor >= 0) continue;
		totals.set(t.category, (totals.get(t.category) ?? 0) - eur(t));
	}
	return [...totals.entries()]
		.map(([category, amountEurMinor]) => ({ category, amountEurMinor }))
		.sort((a, b) => b.amountEurMinor - a.amountEurMinor)
		.slice(0, limit);
}

/** The latest `limit` transactions across all wallets (already newest-first). */
export function recentActivity(limit = 5): Transaction[] {
	return getTransactions().slice(0, limit);
}
