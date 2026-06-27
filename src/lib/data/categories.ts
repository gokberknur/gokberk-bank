// The spend-category catalog — display labels + a stable display order, shared by
// the analytics (M01), the charts (F11 series), and any category picker. One place
// so a label or ordering only ever changes here.

import type { Category } from './types';

export const CATEGORY_LABELS: Record<Category, string> = {
	groceries: 'Groceries',
	dining: 'Dining',
	transport: 'Transport',
	shopping: 'Shopping',
	utilities: 'Utilities',
	housing: 'Housing',
	income: 'Income',
	transfers: 'Transfers',
	entertainment: 'Entertainment',
	health: 'Health',
	travel: 'Travel',
	subscriptions: 'Subscriptions',
	fees: 'Fees',
	cash: 'Cash'
};

/** Categories a user budgets/analyses against — spend categories, not income/transfers. */
export const SPEND_CATEGORIES: Category[] = [
	'groceries',
	'dining',
	'transport',
	'shopping',
	'utilities',
	'housing',
	'entertainment',
	'health',
	'travel',
	'subscriptions',
	'fees',
	'cash'
];

export function categoryLabel(c: Category): string {
	return CATEGORY_LABELS[c];
}
