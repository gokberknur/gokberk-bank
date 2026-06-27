// Investing market model (ADR-001: EUR-anchored, Nordnet-flavoured). A small,
// deterministic universe — instruments with key stats, the user's holdings, and a
// seeded daily price history per instrument so charts, sparklines, and the
// performance series are all reducible from one source. Prices are integer minor
// units in the INSTRUMENT's own currency; the portfolio math converts to EUR.

import { mulberry32 } from './prng';
import { TODAY, isoDate } from './time';
import type { Currency } from './money';

export type InstrumentType = 'stock' | 'etf' | 'crypto';

export interface Instrument {
	symbol: string;
	name: string;
	exchange: string;
	currency: Currency;
	type: InstrumentType;
	sector: string;
	region: string;
	about: string;
	/** Latest price, minor units, instrument currency. */
	lastPriceMinor: number;
	/** Prior session close, minor units — day change is derived, never stored. */
	priorCloseMinor: number;
	/** 52-week range, minor units. */
	high52wMinor: number;
	low52wMinor: number;
	/** P/E ×100 (e.g. 3120 = 31.2), or null for ETFs/crypto. */
	peRatioX100: number | null;
	/** Market cap in EUR minor units (indicative). */
	marketCapEurMinor: number;
	/** Dividend yield in basis points (e.g. 145 = 1.45%), 0 if none. */
	dividendYieldBps: number;
	/** Beta ×100 (e.g. 112 = 1.12), or null. */
	betaX100: number | null;
	/** Whether fractional quantities are allowed (ETFs/crypto yes, some stocks no). */
	fractionalAllowed: boolean;
}

export interface Holding {
	symbol: string;
	/** Fractional allowed. */
	quantity: number;
	/** Average cost per share, minor units, instrument currency. */
	avgCostMinor: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderKind = 'market' | 'limit' | 'stop';
export type OrderTif = 'day' | 'gtc';
export type OrderStatus = 'filled' | 'working' | 'queued';

export interface Order {
	id: string;
	symbol: string;
	side: OrderSide;
	kind: OrderKind;
	quantity: number;
	/** Limit/stop price, minor units (instrument ccy), or null for market. */
	priceMinor: number | null;
	tif: OrderTif;
	status: OrderStatus;
	/** Estimated/filled total in the funding wallet currency (EUR), minor units. */
	totalEurMinor: number;
	/** ISO date placed. */
	placedAt: string;
}

export const INSTRUMENTS: readonly Instrument[] = [
	{ symbol: 'ASML', name: 'ASML Holding', exchange: 'AEX', currency: 'EUR', type: 'stock', sector: 'Technology', region: 'Europe', about: 'Dutch maker of photolithography systems essential to advanced semiconductor manufacturing.', lastPriceMinor: 92050, priorCloseMinor: 91240, high52wMinor: 105420, low52wMinor: 68830, peRatioX100: 3640, marketCapEurMinor: 36200000000000, dividendYieldBps: 95, betaX100: 118, fractionalAllowed: false },
	{ symbol: 'SAP', name: 'SAP SE', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Technology', region: 'Europe', about: 'European enterprise software group; ERP, cloud, and business applications.', lastPriceMinor: 24530, priorCloseMinor: 24710, high52wMinor: 26090, low52wMinor: 16640, peRatioX100: 4480, marketCapEurMinor: 28600000000000, dividendYieldBps: 105, betaX100: 96, fractionalAllowed: false },
	{ symbol: 'MC', name: 'LVMH Moët Hennessy', exchange: 'Euronext Paris', currency: 'EUR', type: 'stock', sector: 'Consumer', region: 'Europe', about: 'Luxury goods conglomerate — fashion, wines & spirits, jewellery, retail.', lastPriceMinor: 68120, priorCloseMinor: 68940, high52wMinor: 81560, low52wMinor: 57010, peRatioX100: 2210, marketCapEurMinor: 34100000000000, dividendYieldBps: 195, betaX100: 104, fractionalAllowed: false },
	{ symbol: 'SIE', name: 'Siemens AG', exchange: 'XETRA', currency: 'EUR', type: 'stock', sector: 'Industrials', region: 'Europe', about: 'Industrial automation, digital industries, smart infrastructure and mobility.', lastPriceMinor: 18540, priorCloseMinor: 18420, high52wMinor: 19920, low52wMinor: 13180, peRatioX100: 1920, marketCapEurMinor: 14800000000000, dividendYieldBps: 250, betaX100: 110, fractionalAllowed: false },
	{ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'Designs iPhone, Mac, iPad and wearables; growing services business.', lastPriceMinor: 21380, priorCloseMinor: 21155, high52wMinor: 23740, low52wMinor: 16410, peRatioX100: 3320, marketCapEurMinor: 300000000000000, dividendYieldBps: 45, betaX100: 121, fractionalAllowed: true },
	{ symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'Cloud (Azure), productivity software, Windows, and AI platforms.', lastPriceMinor: 44820, priorCloseMinor: 44510, high52wMinor: 46850, low52wMinor: 36210, peRatioX100: 3680, marketCapEurMinor: 310000000000000, dividendYieldBps: 70, betaX100: 92, fractionalAllowed: true },
	{ symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', sector: 'Technology', region: 'United States', about: 'GPUs and accelerated computing for AI, data centres, and graphics.', lastPriceMinor: 12790, priorCloseMinor: 12410, high52wMinor: 14090, low52wMinor: 6190, peRatioX100: 6420, marketCapEurMinor: 290000000000000, dividendYieldBps: 3, betaX100: 168, fractionalAllowed: true },
	{ symbol: 'IWDA', name: 'iShares Core MSCI World', exchange: 'AEX', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed-market equities worldwide.', lastPriceMinor: 9842, priorCloseMinor: 9818, high52wMinor: 10120, low52wMinor: 7960, peRatioX100: null, marketCapEurMinor: 8900000000000, dividendYieldBps: 0, betaX100: 100, fractionalAllowed: true },
	{ symbol: 'VWCE', name: 'Vanguard FTSE All-World', exchange: 'XETRA', currency: 'EUR', type: 'etf', sector: 'Global equity', region: 'Global', about: 'Accumulating UCITS ETF tracking developed + emerging market equities.', lastPriceMinor: 12810, priorCloseMinor: 12772, high52wMinor: 13180, low52wMinor: 10240, peRatioX100: null, marketCapEurMinor: 1640000000000, dividendYieldBps: 0, betaX100: 101, fractionalAllowed: true },
	{ symbol: 'BTC', name: 'Bitcoin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'Decentralised digital currency; the largest crypto asset by market cap.', lastPriceMinor: 5842000, priorCloseMinor: 5719000, high52wMinor: 9210000, low52wMinor: 4380000, peRatioX100: null, marketCapEurMinor: 115000000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true }
];

export const HOLDINGS: readonly Holding[] = [
	{ symbol: 'ASML', quantity: 3, avgCostMinor: 81200 },
	{ symbol: 'SAP', quantity: 14, avgCostMinor: 19850 },
	{ symbol: 'AAPL', quantity: 9, avgCostMinor: 18640 },
	{ symbol: 'NVDA', quantity: 16, avgCostMinor: 7420 },
	{ symbol: 'IWDA', quantity: 32, avgCostMinor: 8910 },
	{ symbol: 'VWCE', quantity: 11, avgCostMinor: 11240 },
	{ symbol: 'BTC', quantity: 0.08, avgCostMinor: 4910000 }
];

export interface Candle {
	/** ISO date (YYYY-MM-DD). */
	time: string;
	openMinor: number;
	highMinor: number;
	lowMinor: number;
	closeMinor: number;
	volume: number;
}

function symbolSeed(symbol: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < symbol.length; i++) {
		h ^= symbol.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * A deterministic daily OHLC history of `days` sessions ending TODAY, walked
 * BACKWARD from the instrument's last price (so the final close is exactly
 * `lastPriceMinor` and the penultimate is `priorCloseMinor`). Crypto/high-beta
 * names get a wider step. Stable per symbol across runs.
 */
export function priceHistory(symbol: string, days = 365): Candle[] {
	const inst = INSTRUMENTS.find((i) => i.symbol === symbol);
	if (!inst) return [];
	const rng = mulberry32(symbolSeed(symbol));
	const vol = inst.type === 'crypto' ? 0.035 : (inst.betaX100 ?? 100) > 130 ? 0.022 : 0.013;

	// Walk closes backward from last → prior → random walk into the past.
	const closes: number[] = new Array(days);
	closes[days - 1] = inst.lastPriceMinor;
	if (days >= 2) closes[days - 2] = inst.priorCloseMinor;
	for (let i = days - 3; i >= 0; i--) {
		const next = closes[i + 1];
		// Walk into the past. A positive drift means earlier prices sit BELOW today's
		// (markets trend up over the year), so the forward-read series rises toward
		// the last price — consistent with positions being up vs cost.
		const shock = (rng() - 0.5) * 2 * vol + 0.0006;
		closes[i] = Math.max(Math.round(next / (1 + shock)), Math.round(inst.low52wMinor * 0.6));
	}

	const candles: Candle[] = [];
	for (let i = 0; i < days; i++) {
		const close = closes[i];
		const open = i === 0 ? Math.round(close * (1 + (rng() - 0.5) * vol)) : closes[i - 1];
		const hi = Math.max(open, close);
		const lo = Math.min(open, close);
		const high = Math.round(hi * (1 + rng() * vol * 0.6));
		const low = Math.round(lo * (1 - rng() * vol * 0.6));
		const d = new Date(TODAY);
		d.setDate(d.getDate() - (days - 1 - i));
		candles.push({
			time: isoDate(d),
			openMinor: open,
			highMinor: high,
			lowMinor: low,
			closeMinor: close,
			volume: Math.round(100000 + rng() * 900000)
		});
	}
	return candles;
}

/** Range presets → trailing session count. `max` returns the full history. */
export const RANGES = ['1W', '1M', '1Y', 'Max'] as const;
export type Range = (typeof RANGES)[number];

export function rangeDays(range: Range): number {
	switch (range) {
		case '1W':
			return 7;
		case '1M':
			return 30;
		case '1Y':
			return 365;
		case 'Max':
			return 365;
	}
}

/**
 * Market open state, derived from the fixed TODAY anchor: closed on weekends and
 * outside 09:00–17:30 CET. When closed, market orders queue for the next open.
 */
export function isMarketOpen(): boolean {
	const day = TODAY.getDay(); // 0 Sun … 6 Sat
	if (day === 0 || day === 6) return false;
	const h = TODAY.getHours();
	return h >= 9 && h < 18;
}
