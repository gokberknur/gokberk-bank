// V14 · Crypto provider — Binance public REST (keyless, CORS-clean via
// data-api.binance.vision, verified browser-direct). Pure fetch → map into the seed's
// shape (EUR minor units + the `Candle` OHLC type); THROWS on any failure — the adapter
// alone owns fallback + provenance. Only the seed's EUR-quoted crypto symbols are mapped;
// anything else returns null so the adapter falls straight through to the seed.
// (WebSocket live-tick streaming is deferred to a follow-up.)

import type { Candle, Range } from '$lib/data/market';

const BASE = 'https://data-api.binance.vision/api/v3';

/** Seed crypto symbols → Binance EUR pairs (matches each instrument's `currency: 'EUR'`). */
const PAIR: Record<string, string> = { BTC: 'BTCEUR', ETH: 'ETHEUR', SOL: 'SOLEUR' };

/** The Binance pair for a seed symbol, or null when there's no usable live pair. */
export function binancePair(symbol: string): string | null {
	return PAIR[symbol] ?? null;
}

/** Crypto minor units = major × 100 (EUR, 2 decimals) — one integer round. */
function toMinor(major: string): number {
	return Math.round(parseFloat(major) * 100);
}

export async function binanceQuote(
	symbol: string,
	signal?: AbortSignal
): Promise<{ lastPriceMinor: number; priorCloseMinor: number }> {
	const pair = PAIR[symbol];
	if (!pair) throw new Error(`no binance pair for ${symbol}`);
	const r = await fetch(`${BASE}/ticker/24hr?symbol=${pair}`, { signal });
	if (!r.ok) throw new Error(`binance ${r.status}`);
	const j = await r.json();
	return { lastPriceMinor: toMinor(j.lastPrice), priorCloseMinor: toMinor(j.prevClosePrice) };
}

/** Daily klines to match the seed's daily series (parity with `priceHistory`). */
function klineLimit(range: Range): number {
	switch (range) {
		case '1W':
			return 7;
		case '1M':
			return 30;
		case '1Y':
		case 'Max':
			return 365;
	}
}

export async function binanceCandles(
	symbol: string,
	range: Range,
	signal?: AbortSignal
): Promise<Candle[]> {
	const pair = PAIR[symbol];
	if (!pair) throw new Error(`no binance pair for ${symbol}`);
	const limit = klineLimit(range);
	const r = await fetch(`${BASE}/klines?symbol=${pair}&interval=1d&limit=${limit}`, { signal });
	if (!r.ok) throw new Error(`binance ${r.status}`);
	const rows: unknown[][] = await r.json();
	// Each kline: [openTime, open, high, low, close, volume, closeTime, ...].
	return rows.map((k) => ({
		time: new Date(k[0] as number).toISOString().slice(0, 10),
		openMinor: toMinor(k[1] as string),
		highMinor: toMinor(k[2] as string),
		lowMinor: toMinor(k[3] as string),
		closeMinor: toMinor(k[4] as string),
		volume: Math.round(parseFloat(k[5] as string))
	}));
}
