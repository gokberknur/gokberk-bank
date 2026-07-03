// Basket weights (V10) — the pure maths for a small named basket a savings plan can
// target. Weights are INTEGER basis points summing to exactly 10000 (never floats), so
// the split of a per-run contribution is exact and deterministic. Equal is the default;
// custom lets a leg carry its own weight. No rebalancing here (that would be advice) —
// just "hold these N at these weights and split each contribution accordingly".

/** One leg of a basket: a target symbol and its weight in integer basis points. */
export interface BasketLeg {
	symbol: string;
	/** Weight in basis points (100 = 1%); the legs of a basket sum to 10000. */
	weightBps: number;
}

/** The whole, in basis points — every basket's weights sum to this. */
export const TOTAL_BPS = 10_000;

/** A percentage (0–100, one decimal ok) as integer basis points — 12.5% → 1250. */
export function pctToBps(pct: number): number {
	return Math.round(pct * 100);
}

/** Basis points back to a percentage number (1250 → 12.5) for display. */
export function bpsToPct(bps: number): number {
	return bps / 100;
}

/**
 * Equal weights across `symbols`, in integer bps summing to exactly 10000. The base
 * share is floored and the remainder is spread one bp at a time across the first legs,
 * so the total is always exact (e.g. 3 legs → 3334 / 3333 / 3333).
 */
export function equalWeights(symbols: string[]): BasketLeg[] {
	const n = symbols.length;
	if (n === 0) return [];
	const base = Math.floor(TOTAL_BPS / n);
	let remainder = TOTAL_BPS - base * n;
	return symbols.map((symbol) => {
		const bump = remainder > 0 ? 1 : 0;
		remainder -= bump;
		return { symbol, weightBps: base + bump };
	});
}

/** Whether a basket is well-formed: 2+ unique legs, each weight > 0, summing to 10000. */
export function validateBasket(legs: BasketLeg[]): { ok: boolean; error?: string } {
	if (legs.length < 2) return { ok: false, error: 'A basket needs at least two holdings.' };
	const symbols = new Set(legs.map((l) => l.symbol));
	if (symbols.size !== legs.length) return { ok: false, error: 'Each holding can appear once.' };
	if (legs.some((l) => l.weightBps <= 0))
		return { ok: false, error: 'Every holding needs a weight above zero.' };
	const sum = legs.reduce((s, l) => s + l.weightBps, 0);
	if (sum !== TOTAL_BPS) return { ok: false, error: 'Weights must add up to 100%.' };
	return { ok: true };
}

/**
 * Split a per-run contribution (EUR minor units) across the legs by weight, exactly.
 * Each leg gets floor(amount × weight / 10000); the rounding remainder is added to the
 * largest-weight leg so the parts sum back to `amountMinor` to the cent (no leaked cent).
 */
export function splitAmountMinor(
	amountMinor: number,
	legs: BasketLeg[]
): { symbol: string; amountMinor: number }[] {
	if (legs.length === 0) return [];
	const parts = legs.map((l) => ({
		symbol: l.symbol,
		amountMinor: Math.floor((amountMinor * l.weightBps) / TOTAL_BPS)
	}));
	const allocated = parts.reduce((s, p) => s + p.amountMinor, 0);
	const remainder = amountMinor - allocated;
	if (remainder !== 0) {
		// Hand the leftover cent(s) to the heaviest leg (stable: first on a tie).
		let largest = 0;
		for (let i = 1; i < legs.length; i++) if (legs[i].weightBps > legs[largest].weightBps) largest = i;
		parts[largest].amountMinor += remainder;
	}
	return parts;
}
