// V14 · The provider-agnostic facade (ADR-006). Consumers import ONLY this. Each method
// resolves the asset class → checks flags → the 15-min cache → the class provider (with a
// timeout) → and on ANY error/timeout/CORS/429 returns the seed SILENTLY. The seed is the
// system of record; live merely overlays it. Live figures are stamped `live`/`delayed`
// + an `asOf`; the seed path is `seed` with no timestamp. Nothing here blocks first paint —
// consumers render the seed synchronously, then await these to hydrate.

import { INSTRUMENTS } from '$lib/data/market';
import type { Range } from '$lib/data/market';
import type { Currency } from '$lib/data/money';
import { classLive, flags } from './flags';
import * as cache from './cache';
import { quoteSeed, candlesSeed, fxSeed } from './seed';
import { binanceQuote, binanceCandles, binancePair } from './providers/binance';
import { frankfurterRate } from './providers/frankfurter';
import type { Quote, CandleResult, FxRate, AssetClass } from './types';

const FETCH_TIMEOUT_MS = 4000;
const COOLDOWN_429_MS = 60_000;

/** The asset class the adapter routes on (crypto vs equity; funds unused today). */
function classOf(symbol: string): AssetClass {
	const i = INSTRUMENTS.find((x) => x.symbol === symbol);
	return i?.type === 'crypto' ? 'crypto' : 'equity';
}

/** An AbortSignal that trips after the timeout, so a hung fetch degrades to the seed. */
function timeoutSignal(): AbortSignal {
	const c = new AbortController();
	setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
	return c.signal;
}

function is429(e: unknown): boolean {
	return e instanceof Error && /(^|\D)429(\D|$)/.test(e.message);
}

/** Live last-price/prior-close for a symbol, or the seed on any miss. Never throws. */
export async function quote(symbol: string): Promise<Quote> {
	const seed = quoteSeed(symbol);
	// Unknown symbol → a zeroed seed-shaped result keeps the contract (consumers pass
	// known symbols; this is a defensive floor, not a real path).
	if (!seed) {
		return { symbol, lastPriceMinor: 0, priorCloseMinor: 0, currency: 'EUR', source: 'seed', asOf: null, cached: false };
	}
	const cls = classOf(symbol);
	// Only crypto with a real Binance pair goes live today; everything else is the seed.
	if (cls !== 'crypto' || !classLive('crypto') || !binancePair(symbol)) return seed;

	const key = `q:${symbol}`;
	const hit = cache.getFresh<Quote>(key);
	if (hit) return { ...hit, cached: true };
	if (cache.inCooldown('binance')) return seed;

	try {
		const live = await binanceQuote(symbol, timeoutSignal());
		const q: Quote = {
			symbol,
			lastPriceMinor: live.lastPriceMinor,
			priorCloseMinor: live.priorCloseMinor,
			currency: seed.currency,
			source: 'live',
			asOf: new Date().toISOString(),
			cached: false
		};
		cache.put(key, q);
		return q;
	} catch (e) {
		if (is429(e)) cache.setCooldown('binance', COOLDOWN_429_MS);
		return seed; // silent
	}
}

/** Live candle series for a symbol + range, or the seed. Never throws. */
export async function candles(symbol: string, range: Range): Promise<CandleResult> {
	const seed = candlesSeed(symbol, range);
	const cls = classOf(symbol);
	if (cls !== 'crypto' || !classLive('crypto') || !binancePair(symbol)) return seed;

	const key = `c:${symbol}:${range}`;
	const hit = cache.getFresh<CandleResult>(key);
	if (hit) return { ...hit, cached: true };
	if (cache.inCooldown('binance')) return seed;

	try {
		const live = await binanceCandles(symbol, range, timeoutSignal());
		if (!live.length) return seed;
		const c: CandleResult = { symbol, candles: live, source: 'live', asOf: new Date().toISOString(), cached: false };
		cache.put(key, c);
		return c;
	} catch (e) {
		if (is429(e)) cache.setCooldown('binance', COOLDOWN_429_MS);
		return seed;
	}
}

/** Live FX rate (`to` per 1 `from`, scaled ×1e6), or the seed. Never throws. FX is EOD →
 *  `delayed` when live. */
export async function fxRate(from: Currency, to: Currency = 'EUR'): Promise<FxRate> {
	const seed = fxSeed(from, to);
	if (from === to || !flags.liveMaster || !flags.fxLive) return seed;

	const key = `fx:${from}:${to}`;
	const hit = cache.getFresh<FxRate>(key);
	if (hit) return { ...hit, cached: true };
	if (cache.inCooldown('frankfurter')) return seed;

	try {
		const live = await frankfurterRate(from, to, timeoutSignal());
		const fx: FxRate = { from, to, rateScaled: live.rateScaled, source: 'delayed', asOf: live.date ? `${live.date}T00:00:00Z` : new Date().toISOString(), cached: false };
		cache.put(key, fx);
		return fx;
	} catch (e) {
		if (is429(e)) cache.setCooldown('frankfurter', COOLDOWN_429_MS);
		return seed;
	}
}
