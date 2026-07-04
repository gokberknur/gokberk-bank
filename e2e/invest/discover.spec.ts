import { test, expect } from '@playwright/test';
import { fold, scoreInstrument, searchInstruments } from '../../src/lib/invest/search';
import { dayChangePctX100, dayChangeMinor, moveDir, movers } from '../../src/lib/invest/movers';
import { categoriesFor, DIMENSIONS } from '../../src/lib/invest/lists';
import { INSTRUMENTS, type Instrument } from '../../src/lib/data/market';

/**
 * INV-V13 — regression guard for the pure discovery layer (search · movers · lists).
 *
 * Discovery's promise is "inform, never hype", and the load-bearing part of keeping that honest
 * is the data derivation: the search matches, the day-change math (integer minor units, never a
 * float compare), and the neutral list groupings. These functions are pure and dependency-free,
 * so they're asserted directly against hand-verifiable fixtures + self-checking seed invariants
 * (no page needed) — the mechanical proof the council's ship gate asked for.
 *
 * The seed-coupled assertions (searchInstruments / movers / categoriesFor read the real universe)
 * lean on INVARIANTS the code must uphold whatever the seed is — e.g. "gainers[0] is the max mover
 * in the universe" is recomputed here, not hardcoded — so a seed retune can't silently rot them.
 */

// A minimal Instrument for the pure ranking/math laws (these functions read only a couple fields).
function inst(fields: Partial<Instrument>): Instrument {
	return { symbol: 'X', name: 'X', lastPriceMinor: 0, priorCloseMinor: 0, ...fields } as Instrument;
}

test.describe('V13 search — fold, score, matches', () => {
	test('fold strips case, diacritics AND apostrophes (both quote forms)', () => {
		expect(fold('Nestlé')).toBe('nestle');
		expect(fold('Industria de Diseño Textil')).toBe('industria de diseno textil');
		expect(fold('AAPL')).toBe('aapl');
		// The seed writes L'Oréal with a typographic curly apostrophe (U+2019); a user types neither
		// the apostrophe nor the accent, so the fold must collapse to a bare "loreal sa".
		expect(fold('L’Oréal SA')).toBe('loreal sa');
		expect(fold("O'Reilly")).toBe('oreilly'); // straight apostrophe (U+0027) too
	});

	test('scoreInstrument ranks symbol-exact > symbol-prefix > name-prefix > name-sub > symbol-sub', () => {
		const q = 'as';
		const exact = scoreInstrument(inst({ symbol: 'AS', name: 'Zeta' }), q); // sym === q
		const symPrefix = scoreInstrument(inst({ symbol: 'ASML', name: 'Zeta' }), q); // sym startsWith
		const namePrefix = scoreInstrument(inst({ symbol: 'ZZZ', name: 'Assa Abloy' }), q); // name startsWith
		const nameSub = scoreInstrument(inst({ symbol: 'ZZZ', name: 'Basalt' }), q); // name includes
		const symSub = scoreInstrument(inst({ symbol: 'BASF', name: 'Chemie' }), q); // sym includes only
		const none = scoreInstrument(inst({ symbol: 'ZZZ', name: 'Qux' }), q);

		expect([exact, symPrefix, namePrefix, nameSub, symSub, none]).toEqual([1000, 800, 600, 450, 400, 0]);
		// Strictly descending — the ranking law, not just distinct buckets.
		const ordered = [exact, symPrefix, namePrefix, nameSub, symSub, none];
		for (let i = 1; i < ordered.length; i++) expect(ordered[i - 1]).toBeGreaterThan(ordered[i]);
	});

	test('searchInstruments trims to empty, is case/diacritic/apostrophe-insensitive over the seed', () => {
		expect(searchInstruments('')).toEqual([]);
		expect(searchInstruments('   ')).toEqual([]);

		// Diacritic fold: "nestle" reaches "Nestlé SA".
		const nestle = searchInstruments('nestle');
		expect(nestle.some((i) => i.symbol === 'NESN')).toBe(true);

		// Apostrophe fold: "loreal" reaches the curly-apostrophe "L’Oréal SA" (the gap the fold closes).
		const loreal = searchInstruments('loreal');
		expect(loreal.some((i) => i.symbol === 'OR')).toBe(true);

		// Symbol-exact jumps straight to the ticker, case-insensitively.
		expect(searchInstruments('AAPL')[0].symbol).toBe('AAPL');
		expect(searchInstruments('aapl')[0].symbol).toBe('AAPL');
	});

	test('searchInstruments caps at limit and returns non-increasing scores', () => {
		expect(searchInstruments('a', 3).length).toBeLessThanOrEqual(3);
		const q = fold('a');
		const scores = searchInstruments('a', 50).map((i) => scoreInstrument(i, q));
		for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
	});
});

test.describe('V13 movers — day-change math (integer minor units)', () => {
	test('dayChangePctX100 is signed, rounded, and guards prior=0', () => {
		expect(dayChangePctX100(inst({ lastPriceMinor: 10600, priorCloseMinor: 10000 }))).toBe(600); // +6.00%
		expect(dayChangePctX100(inst({ lastPriceMinor: 9400, priorCloseMinor: 10000 }))).toBe(-600); // -6.00%
		expect(dayChangePctX100(inst({ lastPriceMinor: 33333, priorCloseMinor: 33000 }))).toBe(101); // 1.009% → 1.01%
		expect(dayChangePctX100(inst({ lastPriceMinor: 10000, priorCloseMinor: 0 }))).toBe(0); // no prior → 0, no divide-by-zero
	});

	test('dayChangeMinor and moveDir read the sign, never colour', () => {
		expect(dayChangeMinor(inst({ lastPriceMinor: 10600, priorCloseMinor: 10000 }))).toBe(600);
		expect(dayChangeMinor(inst({ lastPriceMinor: 9400, priorCloseMinor: 10000 }))).toBe(-600);
		expect(moveDir(inst({ lastPriceMinor: 10600, priorCloseMinor: 10000 }))).toBe('up');
		expect(moveDir(inst({ lastPriceMinor: 9400, priorCloseMinor: 10000 }))).toBe('down');
		expect(moveDir(inst({ lastPriceMinor: 10000, priorCloseMinor: 10000 }))).toBe('flat');
	});

	test('movers() is symmetric, capped, sorted by magnitude, disjoint, and anchored to the extremes', () => {
		const { gainers, losers } = movers(5);

		expect(gainers.length).toBeLessThanOrEqual(5);
		expect(losers.length).toBeLessThanOrEqual(5);
		expect(gainers.length).toBeGreaterThan(0); // the seed has movers on both sides
		expect(losers.length).toBeGreaterThan(0);

		// Gainers strictly positive & sorted biggest-first; losers strictly negative & most-negative-first.
		const gPct = gainers.map(dayChangePctX100);
		const lPct = losers.map(dayChangePctX100);
		expect(gPct.every((p) => p > 0)).toBe(true);
		expect(lPct.every((p) => p < 0)).toBe(true);
		for (let i = 1; i < gPct.length; i++) expect(gPct[i - 1]).toBeGreaterThanOrEqual(gPct[i]);
		for (let i = 1; i < lPct.length; i++) expect(lPct[i - 1]).toBeLessThanOrEqual(lPct[i]);

		// No instrument is both a gainer and a loser.
		const gSet = new Set(gainers.map((i) => i.symbol));
		expect(losers.some((i) => gSet.has(i.symbol))).toBe(false);

		// Self-checking extremes: the top gainer/loser ARE the universe's max/min movers (not hardcoded).
		const allPct = INSTRUMENTS.map(dayChangePctX100);
		expect(dayChangePctX100(gainers[0])).toBe(Math.max(...allPct));
		expect(dayChangePctX100(losers[0])).toBe(Math.min(...allPct));
	});

	test('movers(n) respects the cap', () => {
		const { gainers, losers } = movers(2);
		expect(gainers.length).toBeLessThanOrEqual(2);
		expect(losers.length).toBeLessThanOrEqual(2);
	});
});

test.describe('V13 lists — neutral factual groupings', () => {
	test('DIMENSIONS are the four, in display order', () => {
		expect(DIMENSIONS.map((d) => d.key)).toEqual(['asset', 'sector', 'region', 'theme']);
	});

	test('asset groups the universe into Stocks / ETFs / Crypto, each non-empty, members by name', () => {
		const asset = categoriesFor('asset');
		expect(new Set(asset.map((c) => c.key))).toEqual(new Set(['stock', 'etf', 'crypto']));
		expect(asset.find((c) => c.key === 'stock')?.label).toBe('Stocks');
		expect(asset.find((c) => c.key === 'etf')?.label).toBe('ETFs');
		for (const c of asset) {
			expect(c.members.length).toBeGreaterThan(0);
			const byName = [...c.members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => m.symbol);
			expect(c.members.map((m) => m.symbol)).toEqual(byName); // neutral order — by name, never rank
		}
	});

	test('sector keeps only categories that contain a stock (thematic ETFs fold in; ETF-only drop out)', () => {
		const sectors = categoriesFor('sector');
		for (const c of sectors) expect(c.members.some((m) => m.type === 'stock')).toBe(true);
		const keys = sectors.map((c) => c.key);
		expect(keys).toContain('Technology');
		// Pure ETF/crypto fund categories are NOT sectors.
		expect(keys).not.toContain('Bonds');
		expect(keys).not.toContain('Digital asset');
	});

	test('region groups into Europe / United States / Global, each non-empty', () => {
		const regions = categoriesFor('region');
		expect(new Set(regions.map((c) => c.key))).toEqual(new Set(['Europe', 'United States', 'Global']));
		for (const c of regions) expect(c.members.length).toBeGreaterThan(0);
	});

	test('theme yields only non-empty named queries; dividend-payers upholds its predicate', () => {
		const themes = categoriesFor('theme');
		for (const c of themes) expect(c.members.length).toBeGreaterThan(0);
		const div = themes.find((c) => c.key === 'dividend-payers');
		expect(div).toBeTruthy();
		// The theme IS its predicate — every member must actually pay ≥ 3.00% (300 bps).
		for (const m of div!.members) expect(m.dividendYieldBps).toBeGreaterThanOrEqual(300);
	});
});
