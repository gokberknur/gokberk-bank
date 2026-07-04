// V14 · Live market-data adapter — shared shapes (ADR-006). Everything here MIRRORS the
// deterministic seed (`src/lib/data/market.ts` + `money.ts`) so every consumer stays
// provider-agnostic: integer minor units, the seed's `Candle` OHLC type, and scaled-int
// FX (EUR-per-unit ×1e6). A figure's `source` says where it came from — `seed` carries NO
// indicative tag (it IS the mock); `live`/`delayed` wear the "indicative" label.

import type { Candle } from '$lib/data/market';
import type { Currency } from '$lib/data/money';

export type { Candle };

/** Where a figure came from. Drives the indicative label (seed → no tag). */
export type Provenance = 'live' | 'delayed' | 'seed';

/** Asset class the adapter routes on. Our universe is crypto + equity(stock/etf); funds
 *  are a placeholder (no free source → always seed). */
export type AssetClass = 'crypto' | 'equity' | 'fund';

/** FX scale — MUST equal money.ts's RATE_SCALE (EUR-per-unit ×1e6). */
export const RATE_SCALE = 1_000_000;

export interface Quote {
	symbol: string;
	/** Last price, integer minor units, instrument currency (seed shape). */
	lastPriceMinor: number;
	/** Prior session close, minor units. */
	priorCloseMinor: number;
	currency: Currency;
	source: Provenance;
	/** ISO timestamp of the live figure; null on the seed path. */
	asOf: string | null;
	/** True when served from the 15-min cache (no network hit). */
	cached: boolean;
}

export interface CandleResult {
	symbol: string;
	candles: Candle[];
	source: Provenance;
	asOf: string | null;
	cached: boolean;
}

export interface FxRate {
	from: Currency;
	to: Currency;
	/** `to` per 1 `from`, scaled ×RATE_SCALE (integer — never a float rate). */
	rateScaled: number;
	source: Provenance;
	asOf: string | null;
	cached: boolean;
}
