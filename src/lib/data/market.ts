// Investing market model (ADR-001: EUR-anchored, Nordnet-flavoured). A small,
// deterministic universe — instruments with key stats, the user's holdings, and a
// seeded daily price history per instrument so charts, sparklines, and the
// performance series are all reducible from one source. Prices are integer minor
// units in the INSTRUMENT's own currency; the portfolio math converts to EUR.

import { mulberry32 } from './prng';
import { TODAY, isoDate, daysBeforeToday } from './time';
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
// `working` = a resting limit/stop; `queued` = a market order placed while the
// market is shut; `cancelled`/`rejected` are terminal management/exchange outcomes.
export type OrderStatus = 'filled' | 'working' | 'queued' | 'cancelled' | 'rejected';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	filled: 'Filled',
	working: 'Working',
	queued: 'Queued',
	cancelled: 'Cancelled',
	rejected: 'Rejected'
};

export const ORDER_KIND_LABELS: Record<OrderKind, string> = {
	market: 'Market',
	limit: 'Limit',
	stop: 'Stop'
};

/** A working order can be managed (cancelled / modified); the rest are terminal. */
export function isOrderTerminal(status: OrderStatus): boolean {
	return status !== 'working' && status !== 'queued';
}

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
	/** Realized P/L on an executed SELL (EUR minor, average-cost basis) — V12's P/L
	 *  split reads this; absent on buys/working orders. Display-only, no lot engine. */
	realizedPlEurMinor?: number;
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
	{ symbol: 'BTC', name: 'Bitcoin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'Decentralised digital currency; the largest crypto asset by market cap.', lastPriceMinor: 5842000, priorCloseMinor: 5719000, high52wMinor: 9210000, low52wMinor: 4380000, peRatioX100: null, marketCapEurMinor: 115000000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'ETH', name: 'Ethereum', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'Programmable blockchain; the settlement layer for smart contracts and tokens.', lastPriceMinor: 240500, priorCloseMinor: 235100, high52wMinor: 372000, low52wMinor: 178000, peRatioX100: null, marketCapEurMinor: 28900000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'SOL', name: 'Solana', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'High-throughput blockchain favoured for low-fee, fast transactions.', lastPriceMinor: 14080, priorCloseMinor: 14620, high52wMinor: 24500, low52wMinor: 8900, peRatioX100: null, marketCapEurMinor: 6700000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true },
	{ symbol: 'USDC', name: 'USD Coin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', sector: 'Digital asset', region: 'Global', about: 'A fully-reserved stablecoin pegged to the US dollar.', lastPriceMinor: 92, priorCloseMinor: 92, high52wMinor: 95, low52wMinor: 90, peRatioX100: null, marketCapEurMinor: 3300000000000, dividendYieldBps: 0, betaX100: null, fractionalAllowed: true }
];

export const HOLDINGS: readonly Holding[] = [
	{ symbol: 'ASML', quantity: 1, avgCostMinor: 81200 },
	{ symbol: 'SAP', quantity: 7, avgCostMinor: 19850 },
	{ symbol: 'AAPL', quantity: 4, avgCostMinor: 18640 },
	{ symbol: 'NVDA', quantity: 8, avgCostMinor: 7420 },
	{ symbol: 'IWDA', quantity: 16, avgCostMinor: 8910 },
	{ symbol: 'VWCE', quantity: 5, avgCostMinor: 11240 },
	{ symbol: 'BTC', quantity: 0.04, avgCostMinor: 4910000 },
	{ symbol: 'ETH', quantity: 0.7, avgCostMinor: 198000 },
	{ symbol: 'SOL', quantity: 11, avgCostMinor: 11200 }
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

	// The walk's floor. Within a year, 0.6×52w-low keeps the series realistically
	// bounded; over the multi-year ranges (V08's 5Y/Max) that clamp would flatten the
	// deep past into a straight line, so a lower floor lets the walk descend naturally
	// into a plausible "years ago" base. Same value across a call → deterministic.
	const floor = Math.round(inst.low52wMinor * (days > 400 ? 0.15 : 0.6));

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
		closes[i] = Math.max(Math.round(next / (1 + shock)), floor);
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

/** Range presets → trailing session count. The finer V08 timeframes all serve from the
 *  same deterministic daily seed (more/fewer sessions); `Max` returns the full generated
 *  history. Intraday **1D** is deliberately absent here — it rides V08 Phase C alongside
 *  the live crypto klines + the intraday seed, so every range listed re-renders today. */
export const RANGES = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'Max'] as const;
export type Range = (typeof RANGES)[number];

export function rangeDays(range: Range): number {
	switch (range) {
		case '1W':
			return 7;
		case '1M':
			return 30;
		case '3M':
			return 90;
		case '6M':
			return 182;
		case 'YTD': {
			// Sessions since Jan 1 of TODAY's year (deterministic; ≥2 so a chart always draws).
			const jan1 = new Date(TODAY.getFullYear(), 0, 1);
			const days = Math.round((TODAY.getTime() - jan1.getTime()) / 86_400_000) + 1;
			return Math.max(2, days);
		}
		case '1Y':
			return 365;
		case '5Y':
			return 1825;
		case 'Max':
			return 3650;
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

// ── V12 · Portfolio analytics depth ─────────────────────────────────────────────

/** The seeded reference index the V12 benchmark overlay rebases against. Broad
 *  European equity (net-return), EUR-denominated — no live feed (V14 may later
 *  overlay it; until then it's seeded and degrades to "unavailable"). */
export interface BenchmarkMeta {
	symbol: string;
	name: string;
}

export const BENCHMARK: BenchmarkMeta = { symbol: 'SXXR', name: 'STOXX Europe 600 (net return)' };

/**
 * A deterministic daily close history for {@link BENCHMARK} — the SAME backward walk
 * and date scheme as {@link priceHistory} (levels end TODAY, walk into the past from a
 * base level), so it aligns by index to `performanceSeries` for a rebased overlay.
 * Levels are index points ×100 (minor units), EUR — no FX. A gentle long-run uptrend
 * so a rebased comparison reads meaningfully. Stable across runs.
 */
export function benchmarkHistory(days = 365): { time: string; closeMinor: number }[] {
	const rng = mulberry32(symbolSeed(BENCHMARK.symbol));
	const lastMinor = 52340; // 523.40 pts
	const priorMinor = 52210;
	const vol = 0.008;

	const closes: number[] = new Array(days);
	closes[days - 1] = lastMinor;
	if (days >= 2) closes[days - 2] = priorMinor;
	for (let i = days - 3; i >= 0; i--) {
		// Positive drift means earlier levels sit below today's → the forward series rises.
		const shock = (rng() - 0.5) * 2 * vol + 0.0005;
		closes[i] = Math.max(Math.round(closes[i + 1] / (1 + shock)), 1);
	}

	const out: { time: string; closeMinor: number }[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(TODAY);
		d.setDate(d.getDate() - (days - 1 - i));
		out.push({ time: isoDate(d), closeMinor: closes[i] });
	}
	return out;
}

/**
 * Executed SELL orders that realized a P/L — merged into the orders seed so V12's
 * realized figure is backed by real V04 blotter rows, never fabricated. Two closed
 * trades: a SAP trim taken at a gain, and a fully-exited LVMH (MC) position closed at
 * a loss (MC isn't in HOLDINGS, so it reads as a closed-out name). `realizedPlEurMinor`
 * is the average-cost realized result (display-only; no lot reconstruction). Ids
 * namespaced `ord-seed-sell-*` so a freshly placed `ord-<n>` can't collide.
 */
export const REALIZED_SEED_ORDERS: Order[] = [
	{ id: 'ord-seed-sell-1', symbol: 'SAP', side: 'sell', kind: 'market', quantity: 3, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 73_590, placedAt: isoDate(daysBeforeToday(26)), realizedPlEurMinor: 12_180 },
	{ id: 'ord-seed-sell-2', symbol: 'MC', side: 'sell', kind: 'market', quantity: 1, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 68_120, placedAt: isoDate(daysBeforeToday(40)), realizedPlEurMinor: -4_300 }
];
