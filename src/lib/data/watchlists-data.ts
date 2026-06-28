// Watchlists (V05) — named lists of instruments I track but may not own. Each is
// just an ordered set of symbols over the F03 instrument universe; the quotes,
// day-change, and sparkline series are all REDUCED from the market seed (never
// stored here). Mutable store (create / rename / delete a list, add / remove a
// symbol); the state layer bumps the revision. Deterministic — ids are seeded +
// counted, no Math.random. Mock.

import { INSTRUMENTS, priceHistory } from './market';
import type { Instrument } from './market';

export interface Watchlist {
	id: string;
	name: string;
	/** Ordered instrument symbols. */
	symbols: string[];
}

const KNOWN = new Set(INSTRUMENTS.map((i) => i.symbol));
function valid(symbols: string[]): string[] {
	// keep only real symbols, de-duped, order preserved
	const seen = new Set<string>();
	return symbols.filter((s) => KNOWN.has(s) && !seen.has(s) && (seen.add(s), true));
}

let watchlists: Watchlist[] = [
	{ id: 'wl-tech', name: 'Tech', symbols: valid(['AAPL', 'MSFT', 'NVDA', 'ASML', 'SAP']) },
	{ id: 'wl-funds', name: 'Funds & blue chips', symbols: valid(['IWDA', 'VWCE', 'SIE', 'MC']) }
];

let seq = 0;
function nextId(): string {
	seq += 1;
	return `wl-${seq}`;
}

export function getWatchlists(): Watchlist[] {
	return watchlists;
}

export function getWatchlist(id: string): Watchlist | undefined {
	return watchlists.find((w) => w.id === id);
}

/** The whole instrument universe (for the add-instrument picker). */
export function instrumentUniverse(): Instrument[] {
	return [...INSTRUMENTS];
}

export function createWatchlist(name: string): Watchlist {
	const list: Watchlist = { id: nextId(), name: name.trim() || 'New list', symbols: [] };
	watchlists = [...watchlists, list];
	return list;
}

export function renameWatchlist(id: string, name: string): void {
	const n = name.trim();
	if (!n) return;
	watchlists = watchlists.map((w) => (w.id === id ? { ...w, name: n } : w));
}

export function deleteWatchlist(id: string): void {
	watchlists = watchlists.filter((w) => w.id !== id);
}

/** Append symbols to a list (real + not-already-present, order preserved). */
export function addSymbols(id: string, symbols: string[]): void {
	watchlists = watchlists.map((w) =>
		w.id === id ? { ...w, symbols: valid([...w.symbols, ...symbols]) } : w
	);
}

export function removeSymbol(id: string, symbol: string): void {
	watchlists = watchlists.map((w) =>
		w.id === id ? { ...w, symbols: w.symbols.filter((s) => s !== symbol) } : w
	);
}

// ─── Derived quote helpers (reduced from the seed) ────────────────────────────

export type ChangeDir = 'up' | 'down' | 'flat';

export interface DayChange {
	/** Signed change vs prior close, minor units. */
	absMinor: number;
	/** Signed percent change ×100 (e.g. 142 = +1.42%). */
	pctX100: number;
	dir: ChangeDir;
}

/** Day change of an instrument, derived from last price vs prior close. */
export function dayChange(inst: Instrument): DayChange {
	const absMinor = inst.lastPriceMinor - inst.priorCloseMinor;
	const pctX100 = inst.priorCloseMinor === 0 ? 0 : Math.round((absMinor / inst.priorCloseMinor) * 10000);
	const dir: ChangeDir = absMinor > 0 ? 'up' : absMinor < 0 ? 'down' : 'flat';
	return { absMinor, pctX100, dir };
}

/** Recent close series for an instrument's sparkline (minor units). */
export function sparklineValues(symbol: string, days = 30): number[] {
	return priceHistory(symbol, days).map((c) => c.closeMinor);
}
