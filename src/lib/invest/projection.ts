// V12 · Portfolio projection — a neutral what-if calculator (pure). It turns the user's
// OWN assumptions (a starting value, a monthly contribution, an expected annual return,
// a horizon) into an illustrative future value with monthly compounding. It is an
// illustration built from user-set inputs — never advice, never a "recommended" amount,
// never a "target". Money is integer EUR minor units; the rate is basis points.

export interface ProjectionInput {
	/** Starting value (e.g. today's portfolio value), EUR minor units. */
	startMinor: number;
	/** Recurring monthly contribution, EUR minor units. */
	monthlyMinor: number;
	/** Expected annual return, basis points — an assumption the user edits. */
	annualBps: number;
	/** Horizon in whole years. */
	years: number;
}

export interface ProjectionResult {
	/** Illustrative projected value at the horizon, EUR minor units. */
	projectedMinor: number;
	/** Start + every contribution paid in, EUR minor units (no growth). */
	contributedMinor: number;
	/** Projected − contributed, EUR minor units (may be negative for a negative rate). */
	growthMinor: number;
}

/**
 * Future value with monthly compounding: the start grows at the monthly rate, and each
 * month's contribution grows for its remaining months (an ordinary annuity). At a zero
 * rate it reduces to start + monthly × months, so zero/zero inputs return the start
 * value flat. Monotonic in both the contribution and the rate. Rounded to EUR minor for
 * display only — the math runs in floats then rounds once at the end.
 */
export function project({ startMinor, monthlyMinor, annualBps, years }: ProjectionInput): ProjectionResult {
	const months = Math.max(0, Math.round(years * 12));
	const r = annualBps / 10000 / 12; // monthly rate

	let fv: number;
	if (r === 0) {
		fv = startMinor + monthlyMinor * months;
	} else {
		const growthFactor = Math.pow(1 + r, months);
		fv = startMinor * growthFactor + monthlyMinor * ((growthFactor - 1) / r);
	}

	const projectedMinor = Math.round(fv);
	const contributedMinor = startMinor + monthlyMinor * months;
	return {
		projectedMinor,
		contributedMinor,
		growthMinor: projectedMinor - contributedMinor
	};
}

/** The disclosed default expected-return assumption (nominal, annual) — the user edits
 *  it; it is never presented as a recommended or prescribed rate. */
export const DEFAULT_ANNUAL_BPS = 600;

/** The horizon presets offered by the calculator. */
export const HORIZON_YEARS = [5, 10, 20] as const;
export type HorizonYears = (typeof HORIZON_YEARS)[number];
