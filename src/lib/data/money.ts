// Money is **integer minor units** end-to-end (cents, pence, öre) — never a
// float. All arithmetic here is integer; FX uses a scaled-integer rate, not
// `amount * rate` in floating point. Human formatting lives only in format.ts.

export type Currency = 'EUR' | 'USD' | 'GBP' | 'SEK' | 'CHF';

/** The home currency every total rolls up to. */
export const HOME_CURRENCY: Currency = 'EUR';

/** Minor-unit decimals per currency (all 2 here; kept as a map for honesty). */
export const DECIMALS: Record<Currency, number> = {
	EUR: 2,
	USD: 2,
	GBP: 2,
	SEK: 2,
	CHF: 2
};

/**
 * Mock FX mid-rates expressed as **EUR per 1 unit of the currency**, scaled by
 * 1e6 to stay in integer space. Deterministic and fixed — never fetched. A
 * per-pair margin is applied at exchange time (see P04 later); the mid-rate is
 * what balances and net-worth totals convert at.
 */
const RATE_SCALE = 1_000_000;
const EUR_PER_UNIT_SCALED: Record<Currency, number> = {
	EUR: 1_000_000, // 1 EUR = 1 EUR
	USD: 920_000, // 1 USD ≈ 0.92 EUR
	GBP: 1_172_000, // 1 GBP ≈ 1.172 EUR
	SEK: 88_000, // 1 SEK ≈ 0.088 EUR
	CHF: 1_048_000 // 1 CHF ≈ 1.048 EUR
};

/** Integer add of two minor-unit amounts (same currency assumed). */
export function add(a: number, b: number): number {
	return a + b;
}

/** Scale a minor-unit amount by an integer-friendly factor, rounding to integer. */
export function scale(minor: number, factor: number): number {
	return Math.round(minor * factor);
}

/**
 * Convert a minor-unit amount in `from` to minor units in EUR, via the scaled
 * integer mid-rate. Both sides are 2-decimal here, so no decimal re-scaling is
 * needed; the rounding happens once, at the end.
 */
export function toEur(minor: number, from: Currency): number {
	if (from === 'EUR') return minor;
	return Math.round((minor * EUR_PER_UNIT_SCALED[from]) / RATE_SCALE);
}

/** The mid-rate (EUR per 1 unit) as a float — for display only, never for money math. */
export function midRateEur(from: Currency): number {
	return EUR_PER_UNIT_SCALED[from] / RATE_SCALE;
}
