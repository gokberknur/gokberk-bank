// Watchlists state (V05) — the reactive bridge over the watchlists store. Reads
// touch the shared `revision` signal; mutations (create / rename / delete a list,
// add / remove a symbol) bump it so every surface re-flows. Each list row is a
// view-model reduced from the instrument seed (last price, day change, a recent
// close series for the sparkline). Mirrors the `cards` / `security` state idiom.

import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';
import {
	getWatchlists,
	getWatchlist,
	instrumentUniverse,
	createWatchlist,
	renameWatchlist,
	deleteWatchlist,
	addSymbols,
	removeSymbol,
	dayChange,
	sparklineValues,
	type Watchlist,
	type DayChange
} from '$lib/data/watchlists-data';
import { INSTRUMENTS } from '$lib/data/market';
import type { Instrument, InstrumentType } from '$lib/data/market';

type Currency = Instrument['currency'];

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

export interface WatchRow {
	symbol: string;
	name: string;
	type: InstrumentType;
	currency: Currency;
	lastPriceMinor: number;
	change: DayChange;
	/** Recent close series (minor units) for the row sparkline. */
	spark: number[];
}

function toRow(symbol: string): WatchRow | null {
	const inst = BY_SYMBOL.get(symbol);
	if (!inst) return null;
	return {
		symbol: inst.symbol,
		name: inst.name,
		type: inst.type,
		currency: inst.currency,
		lastPriceMinor: inst.lastPriceMinor,
		change: dayChange(inst),
		spark: sparklineValues(symbol)
	};
}

class WatchlistsState {
	/** The id of the active list; defaults to the first on first read. */
	activeId = $state<string | null>(null);

	all(): Watchlist[] {
		revision.value;
		return getWatchlists();
	}

	list(id: string): Watchlist | undefined {
		revision.value;
		return getWatchlist(id);
	}

	/** The active list — the selected one, or the first available. */
	active(): Watchlist | undefined {
		revision.value;
		const lists = getWatchlists();
		const sel = this.activeId ? lists.find((w) => w.id === this.activeId) : undefined;
		return sel ?? lists[0];
	}

	setActive(id: string): void {
		this.activeId = id;
	}

	/** The active list's rows as view-models (reduced from the instrument seed). */
	rows(): WatchRow[] {
		revision.value;
		const list = this.active();
		if (!list) return [];
		return list.symbols.map(toRow).filter((r): r is WatchRow => r !== null);
	}

	/** Instruments NOT already in the active list — for the add picker. */
	addable(): Instrument[] {
		revision.value;
		const inList = new Set(this.active()?.symbols ?? []);
		return instrumentUniverse().filter((i) => !inList.has(i.symbol));
	}

	// ── List mutations ─────────────────────────────────────────────────────────
	create(name: string): void {
		const list = createWatchlist(name);
		this.activeId = list.id;
		revision.bump();
		toast(`Created ${list.name}`, { status: 'success' });
	}

	rename(id: string, name: string): void {
		renameWatchlist(id, name);
		revision.bump();
	}

	remove(id: string): void {
		const removed = getWatchlist(id);
		deleteWatchlist(id);
		if (this.activeId === id) this.activeId = getWatchlists()[0]?.id ?? null;
		revision.bump();
		toast(removed ? `Deleted ${removed.name}` : 'List deleted', { status: 'neutral' });
	}

	// ── Symbol mutations (on the active list) ────────────────────────────────────
	addToActive(symbols: string[]): void {
		const list = this.active();
		if (!list || symbols.length === 0) return;
		addSymbols(list.id, symbols);
		revision.bump();
		const label = symbols.length === 1 ? symbols[0] : `${symbols.length} instruments`;
		toast(`Added ${label}`, { status: 'success' });
	}

	removeFromActive(symbol: string): void {
		const list = this.active();
		if (!list) return;
		const listId = list.id;
		removeSymbol(listId, symbol);
		revision.bump();
		toast(`Removed ${symbol}`, {
			status: 'neutral',
			action: {
				label: 'Undo',
				onClick: () => {
					// Restore silently via the low-level add — not addToActive, which
					// would fire a second "Added" toast.
					addSymbols(listId, [symbol]);
					revision.bump();
				}
			}
		});
	}
}

export const watchlists = new WatchlistsState();
export type { Watchlist, DayChange } from '$lib/data/watchlists-data';
