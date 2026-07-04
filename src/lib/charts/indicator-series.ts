// V08 · The indicator catalogue + the single source that turns an active-indicator set into
// plottable lines. The chart pane AND the View-data table both consume `overlayLines`, so a
// rendered line can never disagree with its table row (the gate's "every line has a table"
// rule, enforced structurally). Pure + deterministic; values stay in the input's minor units
// (the chart converts to major, the table formats). Oscillators (RSI/MACD, their own sub-pane)
// are catalogued here but built by a later slice.

import { sma, ema, bollinger, rsi, macd } from './indicators';

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

// ── Oscillators (RSI / MACD) ────────────────────────────────────────────────────────────────
// Unlike overlays, an oscillator is NOT a price — it can't share the price axis, so each opens
// its OWN sub-pane below the chart. RSI is a bounded 0–100 index (its own scale, with 30/70
// oversold/overbought guide levels); MACD is a price-spread momentum reading (a line, its signal
// line, and a zero-centred histogram). Same discipline as overlays: derived from the closes (never
// seeded), differentiated by dash + label + pane, never hue; the table shows every value.

/** How a value series formats in the View-data table. `money` = price minor units; `signed` =
 *  price minor units with a forced +/− (a spread that reads by sign, e.g. MACD); `index` = a
 *  ×100-scaled bounded index shown as two decimals (e.g. RSI 5254 → "52.54"). */
export type LineFormat = 'money' | 'signed' | 'index';

/** One line inside an oscillator pane (RSI line; MACD line + signal). Aligned to the closes,
 *  `null` where the window is insufficient. `valuesMinor` is ×100-scaled for an index line
 *  (RSI) and price minor units for a money/signed line (MACD). */
export interface OscillatorLine {
	id: string;
	label: string;
	valuesMinor: (number | null)[];
	dash: number[];
	inkStep: number;
	format: LineFormat;
}

/** The zero-centred histogram of an oscillator pane (MACD − signal). Neutral ink; direction
 *  reads by which side of the zero line a bar sits, never by hue. */
export interface OscillatorHistogram {
	id: string;
	label: string;
	valuesMinor: (number | null)[];
}

/** A flat guide level drawn across an oscillator pane (RSI 30/70, MACD zero). `valueScaled` is in
 *  the pane's native scaled units — ×100 for an index pane (30 → 3000), minor units for a money
 *  pane (zero → 0) — so the page converts it the same way it converts the pane's line values. */
export interface OscillatorReference {
	valueScaled: number;
	label: string;
}

/** One oscillator sub-pane. `format` is the pane's scale (`index` 0–100, or `money` spread). */
export interface OscillatorPane {
	key: IndicatorKey;
	label: string;
	format: LineFormat;
	lines: OscillatorLine[];
	histogram?: OscillatorHistogram;
	references: OscillatorReference[];
}

/** The oscillator catalogue keys (RSI, MACD) — the menu's second group. */
export const OSCILLATOR_KEYS: readonly IndicatorKey[] = INDICATORS.filter(
	(i) => i.group === 'oscillator'
).map((i) => i.key);

/**
 * The oscillator sub-panes for the active set, computed from the minor-unit closes. RSI yields a
 * single index line with 70/30 guide levels; MACD yields the MACD line, its signal line, and the
 * histogram, with a zero guide level. Catalogue order. Everything is DERIVED from the closes, so a
 * pane can never disagree with the bars above it — or with the View-data table.
 */
export function oscillatorPanes(closesMinor: number[], active: ReadonlySet<string>): OscillatorPane[] {
	const out: OscillatorPane[] = [];
	if (active.has('rsi')) {
		out.push({
			key: 'rsi',
			label: 'RSI 14',
			format: 'index',
			lines: [
				{ id: 'rsi', label: 'RSI 14', valuesMinor: rsi(closesMinor, 14), dash: [], inkStep: 0.15, format: 'index' }
			],
			references: [
				{ valueScaled: 7000, label: '70' },
				{ valueScaled: 3000, label: '30' }
			]
		});
	}
	if (active.has('macd')) {
		const pts = macd(closesMinor);
		out.push({
			key: 'macd',
			label: 'MACD',
			format: 'signed',
			lines: [
				{ id: 'macd', label: 'MACD', valuesMinor: pts.map((p) => p.macd), dash: [], inkStep: 0.15, format: 'signed' },
				{ id: 'macd-signal', label: 'Signal', valuesMinor: pts.map((p) => p.signal), dash: [6, 3], inkStep: 0.4, format: 'signed' }
			],
			histogram: { id: 'macd-hist', label: 'Histogram', valuesMinor: pts.map((p) => p.histogram) },
			references: [{ valueScaled: 0, label: '0' }]
		});
	}
	return out;
}

// ── The View-data table's column source ──────────────────────────────────────────────────────
// A value series the table renders as one numeric column, formatted per `format`. This is the
// SINGLE producer the table consumes, built from the very same overlayLines() + oscillatorPanes()
// the chart plots — so the table shows exactly the lines (and the MACD histogram) on the chart,
// each formatted honestly (price overlays as money, RSI as a 0–100 index, MACD as a signed spread).

export interface TableSeries {
	/** Column key = the plotted series' id, so table and chart share one identity. */
	id: string;
	label: string;
	valuesMinor: (number | null)[];
	format: LineFormat;
}

/** Flatten the active indicators into the table's value columns, in chart order: the price-pane
 *  overlays first (money), then each oscillator pane's lines and histogram (index / signed). */
export function chartTableSeries(closesMinor: number[], active: ReadonlySet<string>): TableSeries[] {
	const overlays: TableSeries[] = overlayLines(closesMinor, active).map((l) => ({
		id: l.id,
		label: l.label,
		valuesMinor: l.valuesMinor,
		format: 'money' as const
	}));
	const oscillators: TableSeries[] = oscillatorPanes(closesMinor, active).flatMap((pane) => [
		...pane.lines.map((l) => ({ id: l.id, label: l.label, valuesMinor: l.valuesMinor, format: l.format })),
		...(pane.histogram
			? [{ id: pane.histogram.id, label: pane.histogram.label, valuesMinor: pane.histogram.valuesMinor, format: 'signed' as const }]
			: [])
	]);
	return [...overlays, ...oscillators];
}
