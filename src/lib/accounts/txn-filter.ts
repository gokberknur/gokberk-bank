// Pure filter / search / sort over the transactions array. No Svelte, no DOM —
// the transactions state singleton (F04) holds a TxnView and calls applyView to
// derive the rows the grid renders. Pagination is left to gok-table.

import type { Category, Transaction, TxnStatus, TxnType } from '$lib/data/types';

export type TxnDirection = 'all' | 'in' | 'out';
export type TxnSortKey = 'date' | 'amount' | 'merchant' | 'category' | 'status';
export type SortDir = 'asc' | 'desc';

export interface TxnView {
	/** Free-text over merchant + reference (case-insensitive). */
	search: string;
	/** Selected types; empty = all. */
	types: TxnType[];
	/** Selected statuses; empty = all. */
	statuses: TxnStatus[];
	/** Selected categories; empty = all. */
	categories: Category[];
	/** In/out filter by amount sign. */
	direction: TxnDirection;
	sortKey: TxnSortKey;
	sortDir: SortDir;
}

export const DEFAULT_VIEW: TxnView = {
	search: '',
	types: [],
	statuses: [],
	categories: [],
	direction: 'all',
	sortKey: 'date',
	sortDir: 'desc'
};

/** True when the view has any active filter (drives the "clear filters" affordance). */
export function hasActiveFilters(view: TxnView): boolean {
	return (
		view.search.trim() !== '' ||
		view.types.length > 0 ||
		view.statuses.length > 0 ||
		view.categories.length > 0 ||
		view.direction !== 'all'
	);
}

function matches(t: Transaction, view: TxnView): boolean {
	if (view.types.length && !view.types.includes(t.type)) return false;
	if (view.statuses.length && !view.statuses.includes(t.status)) return false;
	if (view.categories.length && !view.categories.includes(t.category)) return false;
	if (view.direction === 'in' && t.amountMinor < 0) return false;
	if (view.direction === 'out' && t.amountMinor >= 0) return false;
	const q = view.search.trim().toLowerCase();
	if (q) {
		const hay = `${t.merchant} ${t.reference}`.toLowerCase();
		if (!hay.includes(q)) return false;
	}
	return true;
}

function compare(a: Transaction, b: Transaction, key: TxnSortKey): number {
	switch (key) {
		case 'date':
			return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
		case 'amount':
			return a.amountMinor - b.amountMinor;
		case 'merchant':
			return a.merchant.localeCompare(b.merchant);
		case 'category':
			return a.category.localeCompare(b.category);
		case 'status':
			return a.status.localeCompare(b.status);
	}
}

/** Filter, search, and sort `txns` according to `view`. Returns a new array. */
export function applyView(txns: readonly Transaction[], view: TxnView): Transaction[] {
	const filtered = txns.filter((t) => matches(t, view));
	const dir = view.sortDir === 'asc' ? 1 : -1;
	filtered.sort((a, b) => {
		const primary = compare(a, b, view.sortKey) * dir;
		if (primary !== 0) return primary;
		// Tiebreak on id FOLLOWING the sort direction. The seed assigns runningBalanceMinor
		// in ascending (date, id) settlement order, so a date-sorted ledger only reads as a
		// coherent running balance when same-day rows stay in strict settlement sequence (asc)
		// or its exact reverse (desc); a direction-independent tiebreak scrambled the column
		// at same-day boundaries (ACC-Q-02).
		return (a.id < b.id ? -1 : 1) * dir;
	});
	return filtered;
}
