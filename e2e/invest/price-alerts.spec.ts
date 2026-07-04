import { test, expect } from '@playwright/test';
import { crossed, wouldFire, alertId, quoteFor, type PriceAlert } from '../../src/lib/invest/alert-engine';

/**
 * INV-V11 — regression guard for the pure price-alert crossing engine (V11 Phase 1).
 *
 * A price alert that fires when it shouldn't (or stays quiet when it should) is a broken
 * promise on a money surface, so the crossing decision is a pure, hand-verifiable function
 * asserted directly here (no page needed) — the mechanical proof the council's gate requires
 * before an alert reaches a customer.
 *
 * Conventions asserted: thresholds + prices are integer minor units, compared `>=`/`<=`,
 * never a float; a "crossing" is the seed's own most-recent completed session move
 * (priorCloseMinor → lastPriceMinor); a level the price had ALREADY passed (didn't move
 * through) is NOT a crossing; a fired alert stays quiet (the re-fire guard is `firedAt`).
 */

const band = (priorCloseMinor: number, lastPriceMinor: number) => ({ priorCloseMinor, lastPriceMinor });

test.describe('V11 price-alert crossing — fixture math', () => {
	test('above fires only when the move crosses UP through the level (minor units, inclusive)', () => {
		// AAPL's seeded session move: 21155 → 21380.
		expect(crossed('above', 21200, band(21155, 21380))).toBe(true); // crossed up through 212.00
		expect(crossed('above', 21380, band(21155, 21380))).toBe(true); // last == level → inclusive (>=)
		expect(crossed('above', 22000, band(21155, 21380))).toBe(false); // above the whole move — untouched
		expect(crossed('above', 21000, band(21155, 21380))).toBe(false); // already above at prior close — not a crossing
		expect(crossed('above', 21155, band(21155, 21380))).toBe(false); // sat AT prior close — must start below (strict <)
	});

	test('below fires only when the move crosses DOWN through the level (minor units, inclusive)', () => {
		// A down session: 19500 → 18800.
		expect(crossed('below', 19000, band(19500, 18800))).toBe(true); // crossed down through 190.00
		expect(crossed('below', 18800, band(19500, 18800))).toBe(true); // last == level → inclusive (<=)
		expect(crossed('below', 18000, band(19500, 18800))).toBe(false); // below the whole move — untouched
		expect(crossed('below', 19600, band(19500, 18800))).toBe(false); // already below at prior close — not a crossing
		expect(crossed('below', 19500, band(19500, 18800))).toBe(false); // sat AT prior close — must start above (strict >)
	});

	test('a flat session (prior == last) never crosses either way', () => {
		expect(crossed('above', 21155, band(21155, 21155))).toBe(false);
		expect(crossed('below', 21155, band(21155, 21155))).toBe(false);
	});

	test('a threshold equal to the current price is not a crossing (guarded at create, proven here)', () => {
		// The level sits at last; the move ended exactly on it without passing through from the
		// correct side, so neither condition fires — the store blocks this input up front.
		expect(crossed('above', 21380, band(21400, 21380))).toBe(false); // came DOWN to it — not an up-cross
		expect(crossed('below', 21380, band(21100, 21380))).toBe(false); // came UP to it — not a down-cross
	});
});

test.describe('V11 price-alert firing predicate — status + guards', () => {
	const make = (over: Partial<PriceAlert>): PriceAlert => ({
		id: 'x',
		symbol: 'AAPL',
		condition: 'above',
		thresholdMinor: 21200, // in-band for AAPL's 21155 → 21380 seed move
		mode: 'once',
		status: 'armed',
		createdAt: '2026-07-04T00:00:00.000Z',
		...over
	});

	test('an armed, never-fired, in-band alert would fire', () => {
		expect(wouldFire(make({}))).toBe(true);
	});

	test('a muted alert never fires, even in-band', () => {
		expect(wouldFire(make({ status: 'muted' }))).toBe(false);
	});

	test('an already-fired alert stays quiet (the firedAt re-fire guard) — one-shot fires once', () => {
		expect(wouldFire(make({ status: 'fired', firedAt: '2026-07-04T00:00:00.000Z' }))).toBe(false);
		// A repeating alert that has fired is also guarded by firedAt on the static seed (no cross-back).
		expect(wouldFire(make({ mode: 'repeating', firedAt: '2026-07-04T00:00:00.000Z' }))).toBe(false);
	});

	test('an out-of-band armed alert would not fire', () => {
		expect(wouldFire(make({ thresholdMinor: 22000 }))).toBe(false);
	});

	test('an unknown symbol has no quote and cannot fire', () => {
		expect(wouldFire(make({ symbol: 'NOPE' }))).toBe(false);
		expect(quoteFor('NOPE')).toBeNull();
	});
});

test.describe('V11 alert identity — no duplicates', () => {
	test('alertId is a stable composite of symbol + condition + threshold', () => {
		expect(alertId('AAPL', 'above', 21200)).toBe('al-AAPL-above-21200');
		// Same three inputs → same id (so an identical alert can never duplicate).
		expect(alertId('AAPL', 'above', 21200)).toBe(alertId('AAPL', 'above', 21200));
		// Any input differs → a different id.
		expect(alertId('AAPL', 'below', 21200)).not.toBe(alertId('AAPL', 'above', 21200));
		expect(alertId('ASML', 'above', 21200)).not.toBe(alertId('AAPL', 'above', 21200));
	});

	test('the AAPL seed quote matches the market seed (prior close < threshold <= last)', () => {
		const q = quoteFor('AAPL');
		expect(q).not.toBeNull();
		expect(q!.priorCloseMinor).toBeLessThan(21200);
		expect(q!.lastPriceMinor).toBeGreaterThanOrEqual(21200);
	});
});
