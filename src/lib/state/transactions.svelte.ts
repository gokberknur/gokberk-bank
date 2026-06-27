// The transactions view-state for the A02 grid. The full set is read **once**
// from F03 (newest-first across all wallets) and held as a private, non-reactive
// seed; the reactive surface is the `view` (filter / search / sort) plus an
// optional wallet scope. `rows` re-derives on demand via the pure `applyView`.
// The view is session-ephemeral and kept in memory only.

import { getTransactions } from '$lib/data';
import type { Transaction } from '$lib/data';
import {
	DEFAULT_VIEW,
	applyView,
	hasActiveFilters,
	type TxnView,
	type TxnSortKey,
	type SortDir,
	type TxnDirection
} from '$lib/accounts/txn-filter';
import type { TxnType, TxnStatus, Category } from '$lib/data/types';

class TransactionsState {
	// Full set, all wallets, newest-first — a fixed seed, not reactive.
	readonly #all: Transaction[] = getTransactions();

	/** The active filter / search / sort. */
	view = $state<TxnView>({ ...DEFAULT_VIEW });
	/** When set, scope the grid to a single wallet. */
	walletId = $state<string | null>(null);

	// The wallet-scoped slice the view is applied over.
	get #scoped(): Transaction[] {
		return this.walletId ? this.#all.filter((t) => t.walletId === this.walletId) : this.#all;
	}

	/** The filtered + sorted rows the grid renders. */
	get rows(): Transaction[] {
		return applyView(this.#scoped, this.view);
	}

	/** Rows after filtering — the "X" in "showing X of Y". */
	get total(): number {
		return this.rows.length;
	}

	/** Rows before filtering (within the current scope) — the "Y". */
	get scopedTotal(): number {
		return this.#scoped.length;
	}

	/** Whether any filter is active (drives the "clear filters" affordance). */
	get hasFilters(): boolean {
		return hasActiveFilters(this.view);
	}

	/** Scope to one wallet, or `null` for all wallets. */
	scopeTo(walletId: string | null) {
		this.walletId = walletId;
	}

	/** Set the free-text search. */
	setSearch(q: string) {
		this.view = { ...this.view, search: q };
	}

	/** Set the sort key + direction. */
	setSort(key: TxnSortKey, dir: SortDir) {
		this.view = { ...this.view, sortKey: key, sortDir: dir };
	}

	/** Toggle a transaction type in/out of the filter. */
	toggleType(t: TxnType) {
		this.view = { ...this.view, types: toggle(this.view.types, t) };
	}

	/** Toggle a status in/out of the filter. */
	toggleStatus(s: TxnStatus) {
		this.view = { ...this.view, statuses: toggle(this.view.statuses, s) };
	}

	/** Toggle a category in/out of the filter. */
	toggleCategory(c: Category) {
		this.view = { ...this.view, categories: toggle(this.view.categories, c) };
	}

	/** Set the in/out direction filter. */
	setDirection(d: TxnDirection) {
		this.view = { ...this.view, direction: d };
	}

	/** Reset filters + search to default, keeping the current sort and scope. */
	clearFilters() {
		this.view = {
			...DEFAULT_VIEW,
			sortKey: this.view.sortKey,
			sortDir: this.view.sortDir
		};
	}

	// TODO: persist view per F04 if desired
}

/** Add `value` to `list` if absent, remove it if present — returns a new array. */
function toggle<T>(list: T[], value: T): T[] {
	return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const transactions = new TransactionsState();
