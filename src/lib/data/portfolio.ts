// Portfolio derivations (pure). Market value, P&L, day change, weights, allocation
// and the performance series are all REDUCED from the market seed + FX — never
// stored pre-rounded. Everything resolves to EUR minor units (the home currency).

import { INSTRUMENTS, HOLDINGS, priceHistory, rangeDays, benchmarkHistory } from './market';
import type { Instrument, Range, Order } from './market';
import { toEur } from './money';

export interface Position {
	instrument: Instrument;
	quantity: number;
	avgCostMinor: number;
	/** All EUR minor units. */
	marketValueEurMinor: number;
	costEurMinor: number;
	unrealizedPlEurMinor: number;
	dayChangeEurMinor: number;
	/** Share of the portfolio, basis points (0–10000). */
	weightBps: number;
}

export interface PortfolioSummary {
	totalValueEurMinor: number;
	totalCostEurMinor: number;
	totalPlEurMinor: number;
	dayChangeEurMinor: number;
	/** (value − cost) / cost, basis points. */
	totalReturnBps: number;
}

export function instrumentOf(symbol: string): Instrument | undefined {
	return INSTRUMENTS.find((i) => i.symbol === symbol);
}

export function getPositions(): Position[] {
	const total = HOLDINGS.reduce((s, h) => {
		const i = instrumentOf(h.symbol);
		return i ? s + toEur(Math.round(h.quantity * i.lastPriceMinor), i.currency) : s;
	}, 0);

	return HOLDINGS.map((h) => {
		const i = instrumentOf(h.symbol)!;
		const marketValueEurMinor = toEur(Math.round(h.quantity * i.lastPriceMinor), i.currency);
		const costEurMinor = toEur(Math.round(h.quantity * h.avgCostMinor), i.currency);
		const dayChangeEurMinor = toEur(
			Math.round(h.quantity * (i.lastPriceMinor - i.priorCloseMinor)),
			i.currency
		);
		return {
			instrument: i,
			quantity: h.quantity,
			avgCostMinor: h.avgCostMinor,
			marketValueEurMinor,
			costEurMinor,
			unrealizedPlEurMinor: marketValueEurMinor - costEurMinor,
			dayChangeEurMinor,
			weightBps: total ? Math.round((marketValueEurMinor / total) * 10000) : 0
		};
	}).sort((a, b) => b.marketValueEurMinor - a.marketValueEurMinor);
}

export function getPortfolioSummary(): PortfolioSummary {
	const pos = getPositions();
	const totalValueEurMinor = pos.reduce((s, p) => s + p.marketValueEurMinor, 0);
	const totalCostEurMinor = pos.reduce((s, p) => s + p.costEurMinor, 0);
	const dayChangeEurMinor = pos.reduce((s, p) => s + p.dayChangeEurMinor, 0);
	return {
		totalValueEurMinor,
		totalCostEurMinor,
		totalPlEurMinor: totalValueEurMinor - totalCostEurMinor,
		dayChangeEurMinor,
		totalReturnBps: totalCostEurMinor
			? Math.round(((totalValueEurMinor - totalCostEurMinor) / totalCostEurMinor) * 10000)
			: 0
	};
}

export interface NamedValue {
	name: string;
	value: number;
}

/** Allocation by asset class (sector for stocks; Funds & ETFs / Crypto grouped). */
export function getAllocation(): NamedValue[] {
	const byClass = new Map<string, number>();
	for (const p of getPositions()) {
		const key =
			p.instrument.type === 'etf'
				? 'Funds & ETFs'
				: p.instrument.type === 'crypto'
					? 'Crypto'
					: p.instrument.sector;
		byClass.set(key, (byClass.get(key) ?? 0) + p.marketValueEurMinor);
	}
	return [...byClass.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export interface SeriesPoint {
	date: string;
	value: number;
}

/** Portfolio value (EUR minor) per session across the range — each holding's close
 *  × quantity, converted to EUR, summed. Aligned by index (all symbols share dates). */
export function performanceSeries(range: Range): SeriesPoint[] {
	const days = rangeDays(range);
	const histories = HOLDINGS.map((h) => ({
		h,
		i: instrumentOf(h.symbol)!,
		candles: priceHistory(h.symbol, days)
	}));
	const len = histories[0]?.candles.length ?? 0;
	const out: SeriesPoint[] = [];
	for (let t = 0; t < len; t++) {
		let value = 0;
		let date = '';
		for (const { h, i, candles } of histories) {
			const c = candles[t];
			if (!c) continue;
			date = c.time;
			value += toEur(Math.round(h.quantity * c.closeMinor), i.currency);
		}
		out.push({ date, value });
	}
	return out;
}

/** Day change for an instrument in basis points (signed). */
export function dayChangeBps(i: Instrument): number {
	return i.priorCloseMinor
		? Math.round(((i.lastPriceMinor - i.priorCloseMinor) / i.priorCloseMinor) * 10000)
		: 0;
}

/** Closing prices (instrument-ccy minor) over the last `days` for a row sparkline. */
export function priceSparkline(symbol: string, days = 30): number[] {
	return priceHistory(symbol, days).map((c) => c.closeMinor);
}

// ── V12 · Portfolio analytics depth (pure, on top of the derivations above) ──────

/**
 * Realized P/L (EUR minor) — summed from executed SELL orders' seeded average-cost
 * realized figures. Display-only; never reconstructs lots, never fabricates a figure
 * (only sells that actually carry a realized result count). Reads the live orders list
 * so it re-flows as the blotter grows.
 */
export function realizedPlEurMinor(orders: Order[]): number {
	return orders
		.filter((o) => o.side === 'sell' && o.status === 'filled' && typeof o.realizedPlEurMinor === 'number')
		.reduce((sum, o) => sum + (o.realizedPlEurMinor ?? 0), 0);
}

/**
 * Time-weighted return over the range, basis points — a geometric chain of the
 * performance series' per-session returns. Splitting at cash-flow markers would remove
 * the effect of deposits; the seed carries no flow markers, so it reduces exactly to
 * the series' cumulative return (last ÷ first − 1). Differs from the simple vs-cost
 * return, which is the point of showing it alongside.
 */
export function twrBps(range: Range): number {
	const s = performanceSeries(range);
	if (s.length < 2 || s[0].value <= 0) return 0;
	let factor = 1;
	for (let t = 1; t < s.length; t++) {
		const prev = s[t - 1].value;
		if (prev > 0) factor *= s[t].value / prev;
	}
	return Math.round((factor - 1) * 10000);
}

/** The seeded benchmark index over the range, aligned by date to `performanceSeries`
 *  (both walk back from TODAY over the same session count). Values are index points. */
export function benchmarkSeries(range: Range): SeriesPoint[] {
	return benchmarkHistory(rangeDays(range)).map((c) => ({ date: c.time, value: c.closeMinor }));
}

/** Rebase a series so its first point reads 100 — a pure display transform for the
 *  overlay compare, never stored (each point ÷ start × 100). A zero/empty start
 *  collapses to a flat 100 line. */
export function rebaseTo100(series: SeriesPoint[]): SeriesPoint[] {
	const base = series[0]?.value ?? 0;
	if (!base) return series.map((p) => ({ date: p.date, value: 100 }));
	return series.map((p) => ({ date: p.date, value: (p.value / base) * 100 }));
}

export interface PositionContribution {
	symbol: string;
	name: string;
	/** Contribution to total return, basis points of total cost (signed). */
	contributionBps: number;
	plEurMinor: number;
}

/**
 * Each holding's contribution to the portfolio's unrealized return, in basis points of
 * total cost — the shares sum to the portfolio's total-return bps. Sorted by magnitude
 * (biggest drivers and drags first). A row opens the instrument.
 */
export function positionContributions(): PositionContribution[] {
	const pos = getPositions();
	const totalCost = pos.reduce((s, p) => s + p.costEurMinor, 0);
	return pos
		.map((p) => ({
			symbol: p.instrument.symbol,
			name: p.instrument.name,
			contributionBps: totalCost ? Math.round((p.unrealizedPlEurMinor / totalCost) * 10000) : 0,
			plEurMinor: p.unrealizedPlEurMinor
		}))
		.sort((a, b) => Math.abs(b.contributionBps) - Math.abs(a.contributionBps));
}
