// V08 · Pure technical indicators, computed from an OHLCV close series (integer minor
// units). Nothing here is seeded — every indicator is DERIVED from the bars, so a line can
// never disagree with the candles under it. Each function returns an array the SAME length
// as the input, `null`-padded where the window is insufficient (the table renders "—", the
// chart draws nothing — never a wrong value). Deterministic: no Date.now(), no Math.random().
//
// Units: SMA / EMA / MACD / Bollinger are in the input's minor units (integer), so they
// overlay the price directly. RSI isn't a price — it's returned as a ×100 scaled integer
// (0–10000 = 0.00–100.00) so the table can show two honest decimals without float carry.
// Smoothing (EMA/RSI) keeps its running value in float internally and rounds only the OUTPUT,
// so rounding never accumulates into drift.
//
// Fixtures (hand-verifiable): sma([2,4,6,8,10], 3) === [null, null, 4, 6, 8];
// ema([1,2,3,10], 2) === [null, 2, 3, 8].

/** The curated default parameters (an "ask-first" call, ratified by the council). */
export const INDICATOR_DEFAULTS = {
	sma: [20, 50, 200],
	ema: [12, 26],
	rsi: { period: 14, low: 30, high: 70 },
	macd: { fast: 12, slow: 26, signal: 9 },
	bollinger: { period: 20, k: 2 }
} as const;

/** Simple moving average over a trailing `period` window (integer minor units). */
export function sma(values: number[], period: number): (number | null)[] {
	const out: (number | null)[] = new Array(values.length).fill(null);
	if (period <= 0) return out;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
		if (i >= period) sum -= values[i - period];
		if (i >= period - 1) out[i] = Math.round(sum / period);
	}
	return out;
}

/** Exponential moving average, seeded from the first `period`'s SMA. `k = 2/(period+1)`;
 *  the running value stays float, only the output rounds — so no drift accumulates. */
export function ema(values: number[], period: number): (number | null)[] {
	const out: (number | null)[] = new Array(values.length).fill(null);
	if (period <= 0 || values.length < period) return out;
	const k = 2 / (period + 1);
	let seed = 0;
	for (let i = 0; i < period; i++) seed += values[i];
	let prev = seed / period;
	out[period - 1] = Math.round(prev);
	for (let i = period; i < values.length; i++) {
		prev = values[i] * k + prev * (1 - k);
		out[i] = Math.round(prev);
	}
	return out;
}

/** RSI (Wilder smoothing), ×100 scaled integer (0–10000). First value at index `period`;
 *  an all-gains window reads 100.00, an all-losses window 0.00. */
export function rsi(values: number[], period = INDICATOR_DEFAULTS.rsi.period): (number | null)[] {
	const out: (number | null)[] = new Array(values.length).fill(null);
	if (values.length <= period) return out;
	let gain = 0;
	let loss = 0;
	for (let i = 1; i <= period; i++) {
		const ch = values[i] - values[i - 1];
		if (ch >= 0) gain += ch;
		else loss -= ch;
	}
	let avgGain = gain / period;
	let avgLoss = loss / period;
	out[period] = rsiFrom(avgGain, avgLoss);
	for (let i = period + 1; i < values.length; i++) {
		const ch = values[i] - values[i - 1];
		const g = ch > 0 ? ch : 0;
		const l = ch < 0 ? -ch : 0;
		avgGain = (avgGain * (period - 1) + g) / period;
		avgLoss = (avgLoss * (period - 1) + l) / period;
		out[i] = rsiFrom(avgGain, avgLoss);
	}
	return out;
}

function rsiFrom(avgGain: number, avgLoss: number): number {
	if (avgLoss === 0) return avgGain === 0 ? 5000 : 10000; // flat → 50.00, all gains → 100.00
	const rs = avgGain / avgLoss;
	return Math.round((100 - 100 / (1 + rs)) * 100);
}

export interface MacdPoint {
	/** EMA(fast) − EMA(slow), minor units. */
	macd: number | null;
	/** EMA(signal) of the MACD line, minor units. */
	signal: number | null;
	/** MACD − signal, minor units. */
	histogram: number | null;
}

/** MACD: the fast/slow EMA spread, its signal EMA, and the histogram — all minor units. */
export function macd(
	values: number[],
	fast = INDICATOR_DEFAULTS.macd.fast,
	slow = INDICATOR_DEFAULTS.macd.slow,
	signalPeriod = INDICATOR_DEFAULTS.macd.signal
): MacdPoint[] {
	const emaFast = ema(values, fast);
	const emaSlow = ema(values, slow);
	const macdLine: (number | null)[] = values.map((_, i) =>
		emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null
	);

	// Signal EMA runs over the CONTIGUOUS valid MACD tail, then is mapped back by index.
	const firstValid = macdLine.findIndex((v) => v !== null);
	const signalLine: (number | null)[] = new Array(values.length).fill(null);
	if (firstValid !== -1) {
		const seq = macdLine.slice(firstValid).map((v) => v as number);
		const sig = ema(seq, signalPeriod);
		for (let j = 0; j < sig.length; j++) signalLine[firstValid + j] = sig[j];
	}

	return values.map((_, i) => {
		const m = macdLine[i];
		const s = signalLine[i];
		return { macd: m, signal: s, histogram: m !== null && s !== null ? m - s : null };
	});
}

export interface BollingerPoint {
	upper: number | null;
	middle: number | null;
	lower: number | null;
}

/** Bollinger bands: the SMA middle ± `k` population standard deviations (minor units). */
export function bollinger(
	values: number[],
	period = INDICATOR_DEFAULTS.bollinger.period,
	k = INDICATOR_DEFAULTS.bollinger.k
): BollingerPoint[] {
	const mid = sma(values, period);
	return values.map((_, i) => {
		const m = mid[i];
		if (m === null) return { upper: null, middle: null, lower: null };
		let sumSq = 0;
		for (let j = i - period + 1; j <= i; j++) {
			const d = values[j] - m;
			sumSq += d * d;
		}
		const sd = Math.sqrt(sumSq / period);
		return { upper: Math.round(m + k * sd), middle: m, lower: Math.round(m - k * sd) };
	});
}
