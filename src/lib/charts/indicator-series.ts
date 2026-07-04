// V08 · The indicator catalogue + the single source that turns an active-indicator set into
// plottable lines. The chart pane AND the View-data table both consume `overlayLines`, so a
// rendered line can never disagree with its table row (the gate's "every line has a table"
// rule, enforced structurally). Pure + deterministic; values stay in the input's minor units
// (the chart converts to major, the table formats). Oscillators (RSI/MACD, their own sub-pane)
// are catalogued here but built by a later slice.

import { sma, ema, bollinger } from './indicators';

export type IndicatorKey = 'sma20' | 'sma50' | 'sma200' | 'ema12' | 'ema26' | 'bollinger' | 'rsi' | 'macd';

export interface IndicatorMeta {
	key: IndicatorKey;
	label: string;
	/** `overlay` draws on the price pane; `oscillator` opens its own sub-pane. */
	group: 'overlay' | 'oscillator';
}

/** The curated set — four families, done well (SMA/EMA are the moving-average family). The
 *  menu renders these; the order here is the order shown. */
export const INDICATORS: readonly IndicatorMeta[] = [
	{ key: 'sma20', label: 'SMA 20', group: 'overlay' },
	{ key: 'sma50', label: 'SMA 50', group: 'overlay' },
	{ key: 'sma200', label: 'SMA 200', group: 'overlay' },
	{ key: 'ema12', label: 'EMA 12', group: 'overlay' },
	{ key: 'ema26', label: 'EMA 26', group: 'overlay' },
	{ key: 'bollinger', label: 'Bollinger', group: 'overlay' },
	{ key: 'rsi', label: 'RSI 14', group: 'oscillator' },
	{ key: 'macd', label: 'MACD', group: 'oscillator' }
];

export const OVERLAY_KEYS: readonly IndicatorKey[] = INDICATORS.filter((i) => i.group === 'overlay').map(
	(i) => i.key
);

/** One plottable line derived from an active indicator (an indicator can yield several — e.g.
 *  Bollinger's three bands). `dash` differentiates lines by pattern (never hue); `inkStep` is a
 *  0–1 position along the neutral ink ramp so lines recede without a rainbow. */
export interface IndicatorLine {
	/** Stable line id (`sma20`, `bb-upper`, …) — the chart series key + the table column key. */
	id: string;
	/** The parent indicator key (so a toggle can add/remove all of its lines together). */
	key: IndicatorKey;
	label: string;
	group: 'overlay';
	/** Aligned to the input closes, `null` where the window is insufficient (table shows "—"). */
	valuesMinor: (number | null)[];
	/** Line dash pattern; `[]` = solid. */
	dash: number[];
	/** 0 (darkest ink) → 1 (lightest) position on the neutral ramp. */
	inkStep: number;
}

/**
 * The plottable overlay lines for the active set, computed from the minor-unit closes. Order is
 * the catalogue order. Bollinger expands to upper/middle/lower. Everything is derived from the
 * closes (never seeded), so the lines always agree with the bars — and with the table.
 */
export function overlayLines(closesMinor: number[], active: ReadonlySet<string>): IndicatorLine[] {
	const out: IndicatorLine[] = [];
	const line = (id: string, key: IndicatorKey, label: string, values: (number | null)[], dash: number[], inkStep: number) =>
		out.push({ id, key, label, group: 'overlay', valuesMinor: values, dash, inkStep });

	if (active.has('sma20')) line('sma20', 'sma20', 'SMA 20', sma(closesMinor, 20), [], 0.1);
	if (active.has('sma50')) line('sma50', 'sma50', 'SMA 50', sma(closesMinor, 50), [6, 3], 0.3);
	if (active.has('sma200')) line('sma200', 'sma200', 'SMA 200', sma(closesMinor, 200), [2, 3], 0.5);
	if (active.has('ema12')) line('ema12', 'ema12', 'EMA 12', ema(closesMinor, 12), [], 0.25);
	if (active.has('ema26')) line('ema26', 'ema26', 'EMA 26', ema(closesMinor, 26), [6, 3], 0.45);
	if (active.has('bollinger')) {
		const bb = bollinger(closesMinor, 20, 2);
		line('bb-upper', 'bollinger', 'Bollinger upper', bb.map((b) => b.upper), [2, 2], 0.6);
		line('bb-mid', 'bollinger', 'Bollinger middle', bb.map((b) => b.middle), [], 0.4);
		line('bb-lower', 'bollinger', 'Bollinger lower', bb.map((b) => b.lower), [2, 2], 0.6);
	}
	return out;
}
