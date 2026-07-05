// V13 · Movers — a pure, market-context derivation: each instrument's day-change from integer minor
// units (never a float-drift compare), and the biggest gainers / losers ranked by |Δ| MAGNITUDE
// only. That magnitude sort is a factual ordering of a derived number — NOT an engagement signal.
// There is no "trending", no "most bought", no volume-of-interest, no leaderboard: movers reports
// what moved, symmetric (gainers AND losers), and gets out of the way. Deterministic.

import { INSTRUMENTS, type Instrument } from '$lib/data/market';

export type MoveDir = 'up' | 'down' | 'flat';

/** Day-change percent ×100 (e.g. +306 = +3.06%) from integer minor units. prior 0 → 0. */
export function dayChangePctX100(inst: Instrument): number {
	if (inst.priorCloseMinor === 0) return 0;
	return Math.round(((inst.lastPriceMinor - inst.priorCloseMinor) / inst.priorCloseMinor) * 10000);
}

/** The signed day-change amount, minor units of the instrument's currency (integer, no float). */
export function dayChangeMinor(inst: Instrument): number {
	return inst.lastPriceMinor - inst.priorCloseMinor;
}

/** Direction by rule (sign), never colour: up / down / flat. */
export function moveDir(inst: Instrument): MoveDir {
	const d = dayChangeMinor(inst);
	return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
}

/**
 * The top `n` gainers and losers by |day-change|, each sorted by magnitude (biggest move first).
 * Flat names (no move) appear in neither — a mover has to have moved. Market-context, not a
 * leaderboard: both sides are returned so the surface reads as symmetric context, never a buy-list.
 */
export function movers(n = 5): { gainers: Instrument[]; losers: Instrument[] } {
	const scored = INSTRUMENTS.map((inst) => ({ inst, pct: dayChangePctX100(inst) }));
	const gainers = scored
		.filter((m) => m.pct > 0)
		.sort((a, b) => b.pct - a.pct)
		.slice(0, n)
		.map((m) => m.inst);
	const losers = scored
		.filter((m) => m.pct < 0)
		.sort((a, b) => a.pct - b.pct)
		.slice(0, n)
		.map((m) => m.inst);
	return { gainers, losers };
}
