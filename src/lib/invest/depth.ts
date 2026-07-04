// V09 · Simulated order-book depth ladder — explicitly NOT a live book. Deterministic
// bid/ask levels around the last price from a seeded spread; sizes are seeded integer
// lot counts. Bids sit below the mid, asks above, symmetric N levels per side. Money is
// integer minor units (instrument currency). Stable per symbol across runs.

import { mulberry32 } from '../data/prng';
import type { Instrument } from '../data/market';

export interface DepthLevel {
	side: 'bid' | 'ask';
	/** Price at this level, minor units (instrument currency). */
	priceMinor: number;
	/** Resting size at this level — integer lots. */
	size: number;
}

export interface Depth {
	bids: DepthLevel[];
	asks: DepthLevel[];
	/** Best-ask − best-bid, minor units. */
	spreadMinor: number;
	/** The mid price the ladder is built around, minor units. */
	midMinor: number;
}

function seedOf(symbol: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < symbol.length; i++) {
		h ^= symbol.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * A two-sided ladder of `levels` per side around the last price. The tick is a small
 * seeded fraction of the price (~0.03%–0.1%); level 0 is the best bid/ask straddling the
 * mid, each further level steps one tick out. Sizes shrink as you move away from the top
 * of book (deeper levels rest smaller), with a seeded jitter so it doesn't look uniform.
 */
export function buildDepth(inst: Instrument, levels = 5): Depth {
	const rng = mulberry32(seedOf(inst.symbol));
	const mid = inst.lastPriceMinor;
	// Tick: 0.03%–0.10% of the mid, at least 1 minor unit.
	const tick = Math.max(1, Math.round(mid * (0.0003 + rng() * 0.0007)));

	const bids: DepthLevel[] = [];
	const asks: DepthLevel[] = [];
	for (let l = 0; l < levels; l++) {
		// Top of book is half a tick off the mid; deeper levels step a full tick each.
		const offset = Math.round(tick * (l + 0.5));
		// Base size larger near the top, tapering with depth, plus a seeded jitter.
		const base = Math.round((levels - l) * 40 * (0.7 + rng() * 0.6)) + 5;
		bids.push({ side: 'bid', priceMinor: mid - offset, size: base });
		const baseAsk = Math.round((levels - l) * 40 * (0.7 + rng() * 0.6)) + 5;
		asks.push({ side: 'ask', priceMinor: mid + offset, size: baseAsk });
	}

	return {
		bids,
		asks,
		spreadMinor: asks[0].priceMinor - bids[0].priceMinor,
		midMinor: mid
	};
}
