import { test, expect } from '@playwright/test';
import { sma, ema, rsi, macd, bollinger } from '../../src/lib/charts/indicators';
import { rebaseTo100Scaled, rebasePair } from '../../src/lib/charts/rebase';

/**
 * INV-V08 — regression guard for the pure chart-indicator + rebase math (V08 Phase B).
 *
 * These functions are the honest data layer behind the deepened chart: every indicator
 * line has this table of numbers behind it, so a wrong value here is a confident lie on a
 * finance surface. The functions are pure and dependency-free, so they're asserted directly
 * (no page needed) against hand-verifiable fixtures — the mechanical proof the council's
 * ship gate required before the numbers reach a customer.
 *
 * Conventions asserted: SMA/EMA/MACD/Bollinger in integer minor units; RSI ×100 scaled
 * (10000 = 100.00); rebase ×100 scaled (10000 = 100.00) with no float drift; every series
 * is null-padded across its insufficient window (the table renders "—", never a wrong line).
 */

test.describe('V08 chart indicators — fixture math', () => {
	test('SMA is the trailing mean, null-padded before the window fills', () => {
		expect(sma([2, 4, 6, 8, 10], 3)).toEqual([null, null, 4, 6, 8]);
		expect(sma([1, 2, 3, 4, 5], 2)).toEqual([null, 2, 3, 4, 5]);
		expect(sma([100], 3)).toEqual([null]); // window never fills
	});

	test('EMA seeds from the first window SMA and smooths without rounding drift', () => {
		// k = 2/3; seed = mean(1,2) = 1.5 → 2; then 3·k+1.5·(1−k)=2.5 → 3; 10·k+2.5·(1−k)=7.5 → 8
		expect(ema([1, 2, 3, 10], 2)).toEqual([null, 2, 3, 8]);
		expect(ema([1, 2], 3)).toEqual([null, null]); // fewer values than the period
	});

	test('RSI reads 100.00 on all gains, 0.00 on all losses, 50.00 when flat (×100 scaled)', () => {
		const rising = Array.from({ length: 15 }, (_, i) => i + 1);
		const rsiUp = rsi(rising, 14);
		expect(rsiUp.slice(0, 14).every((v) => v === null)).toBe(true); // first valid at index = period
		expect(rsiUp[14]).toBe(10000);

		const falling = Array.from({ length: 15 }, (_, i) => 15 - i);
		expect(rsi(falling, 14)[14]).toBe(0);

		const flat = new Array(15).fill(500);
		expect(rsi(flat, 14)[14]).toBe(5000);
	});

	test('MACD/signal/histogram null-pad correctly and align by index', () => {
		const series = Array.from({ length: 40 }, (_, i) => 10_000 + Math.round(Math.sin(i / 3) * 500) + i * 20);
		const m = macd(series); // 12/26/9 defaults
		// MACD line valid once the slow EMA(26) is (index 25); signal EMA(9) 8 more bars on (33).
		expect(m.findIndex((p) => p.macd !== null)).toBe(25);
		expect(m.findIndex((p) => p.signal !== null)).toBe(33);
		expect(m[24].macd).toBeNull();
		// Where all three exist, histogram is exactly macd − signal.
		const last = m[39];
		expect(last.histogram).toBe((last.macd as number) - (last.signal as number));
	});

	test('Bollinger bands are ordered upper ≥ middle ≥ lower and null-padded', () => {
		const series = Array.from({ length: 40 }, (_, i) => 10_000 + Math.round(Math.sin(i / 3) * 500) + i * 20);
		const b = bollinger(series, 20, 2);
		expect(b.findIndex((p) => p.middle !== null)).toBe(19); // period 20 → first at index 19
		expect(b[18].middle).toBeNull();
		const last = b[39];
		expect(last.upper as number).toBeGreaterThanOrEqual(last.middle as number);
		expect(last.middle as number).toBeGreaterThanOrEqual(last.lower as number);
	});
});

test.describe('V08 rebase — scaled-integer, drift-free', () => {
	test('single series rebases its first non-null point to 100.00 (×100)', () => {
		expect(rebaseTo100Scaled([200, 210, 190])).toEqual([10000, 10500, 9500]);
		expect(rebaseTo100Scaled([null, 50, 55])).toEqual([null, 10000, 11000]);
		expect(rebaseTo100Scaled([null, null])).toEqual([null, null]);
	});

	test('pair rebase clips both series to the later common start', () => {
		const pair = rebasePair([100, 110, 120, 130], [50, 55]);
		expect(pair.base).toEqual([10000, 10833]); // rebased from 120: 130·10000/120 = 10833.3 → 10833
		expect(pair.compare).toEqual([10000, 11000]); // rebased from 50
		expect(pair.clipped).toBe(2); // two sessions dropped from the longer series
	});
});
