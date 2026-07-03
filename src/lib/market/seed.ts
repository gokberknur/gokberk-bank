// V14 · The seed bridge — the system of record and the silent fallback (ADR-006 rule 1).
// Thin wrappers over `data/market.ts` + `money.ts` that return the adapter's shapes with
// `source: 'seed'`. Byte-identical to what every consumer already reads, so with the
// network off the app is fully green. Deterministic — no Date.now(), no Math.random() here.

import { INSTRUMENTS, priceHistory, rangeDays } from '$lib/data/market';
import type { Range } from '$lib/data/market';
import { midRateEur } from '$lib/data/money';
import type { Currency } from '$lib/data/money';
import { RATE_SCALE } from './types';
import type { Quote, CandleResult, FxRate } from './types';

/** The seeded quote for a symbol, or null when it isn't in the universe. */
export function quoteSeed(symbol: string): Quote | null {
	const i = INSTRUMENTS.find((x) => x.symbol === symbol);
	if (!i) return null;
	return {
		symbol,
		lastPriceMinor: i.lastPriceMinor,
		priorCloseMinor: i.priorCloseMinor,
		currency: i.currency,
		source: 'seed',
		asOf: null,
		cached: false
	};
}

/** The seeded candle series for a symbol + range (daily bars, TODAY-anchored). */
export function candlesSeed(symbol: string, range: Range): CandleResult {
	return {
		symbol,
		candles: priceHistory(symbol, rangeDays(range)),
		source: 'seed',
		asOf: null,
		cached: false
	};
}

/** The seeded FX rate — `to` per 1 `from`, scaled ×RATE_SCALE. The seed anchors on EUR,
 *  so a non-EUR `to` crosses via EUR. Integer-safe (round once). */
export function fxSeed(from: Currency, to: Currency = 'EUR'): FxRate {
	const rateScaled =
		to === 'EUR'
			? Math.round(midRateEur(from) * RATE_SCALE)
			: Math.round((midRateEur(from) / midRateEur(to)) * RATE_SCALE);
	return { from, to, rateScaled, source: 'seed', asOf: null, cached: false };
}
