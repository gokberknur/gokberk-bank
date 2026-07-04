// V09 · Type-branched factual fundamentals, seeded/deterministic. Beyond V02's key-stats
// ledger: a stock gets revenue / EPS / sector peers; an ETF gets top holdings / ongoing
// charge (TER) / tracked index; crypto gets an honest "not applicable" (no fabricated
// equity stats). Figures derive from the instrument's own seeded metadata — no ratings,
// no estimates, no recommendations. Money is integer minor units.

import { mulberry32 } from '../data/prng';
import { INSTRUMENTS } from '../data/market';
import type { Instrument } from '../data/market';

export interface StockFundamentals {
	type: 'stock';
	/** Trailing revenue, EUR minor units (indicative, derived from market cap × a seeded P/S). */
	revenueEurMinor: number;
	/** Earnings per share, minor units (instrument currency) — price ÷ P/E. */
	epsMinor: number;
	/** Same-sector peer symbols (excludes self), up to 4. */
	peerSymbols: string[];
}

export interface EtfFundamentals {
	type: 'etf';
	/** Top holdings by weight (weight in basis points). */
	holdings: { name: string; weightBps: number }[];
	/** Ongoing charge / total expense ratio, basis points. */
	terBps: number;
	/** The index the fund tracks. */
	index: string;
}

export interface CryptoFundamentals {
	type: 'crypto';
}

export type Fundamentals = StockFundamentals | EtfFundamentals | CryptoFundamentals;

function seedOf(symbol: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < symbol.length; i++) {
		h ^= symbol.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

// A small factual mega-cap pool for broad-equity ETF top-holdings (both seeded funds are
// global equity trackers). Weights are seeded per fund so the two don't read identically.
const ETF_HOLDING_NAMES = ['Apple', 'Microsoft', 'NVIDIA', 'Amazon', 'Alphabet', 'Meta Platforms'];

// The index each seeded ETF tracks (falls back to a generic label for any future fund).
const ETF_INDEX: Record<string, string> = {
	IWDA: 'MSCI World',
	VWCE: 'FTSE All-World'
};

export function getFundamentals(inst: Instrument): Fundamentals {
	if (inst.type === 'crypto') return { type: 'crypto' };

	const rng = mulberry32(seedOf(inst.symbol));

	if (inst.type === 'etf') {
		// Descending seeded weights that sum to a realistic "top holdings" slice (~20–30%).
		let remainingBps = 2000 + Math.round(rng() * 1000);
		const holdings = ETF_HOLDING_NAMES.map((name, idx) => {
			const share = idx === ETF_HOLDING_NAMES.length - 1 ? remainingBps : Math.round(remainingBps * (0.28 + rng() * 0.12));
			remainingBps = Math.max(0, remainingBps - share);
			return { name, weightBps: share };
		}).filter((h) => h.weightBps > 0);
		return {
			type: 'etf',
			holdings,
			terBps: 7 + Math.round(rng() * 15), // 0.07%–0.22%
			index: ETF_INDEX[inst.symbol] ?? `${inst.region} equity index`
		};
	}

	// Stock: EPS = price ÷ P/E (both seeded on the instrument); revenue = market cap ÷ a
	// seeded price-to-sales in a plausible band.
	const epsMinor = inst.peRatioX100 ? Math.round((inst.lastPriceMinor * 100) / inst.peRatioX100) : 0;
	const psRatio = 3 + rng() * 9; // 3×–12×
	const revenueEurMinor = Math.round(inst.marketCapEurMinor / psRatio);
	const peerSymbols = INSTRUMENTS.filter(
		(i) => i.symbol !== inst.symbol && i.type === 'stock' && i.sector === inst.sector
	)
		.map((i) => i.symbol)
		.slice(0, 4);

	return { type: 'stock', revenueEurMinor, epsMinor, peerSymbols };
}
