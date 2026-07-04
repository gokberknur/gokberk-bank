// V08 · Rebasing for the comparison overlay. Plotting a €190 stock against a 4,800-point
// index is meaningless, so both series are indexed to a common start = 100.00 and compared
// as relative performance. Output is a ×100 SCALED INTEGER (10000 = 100.00, 10523 = 105.23):
// the ratio multiplies before it divides (`v*10000/base`), so there is no float-drift — a
// deterministic, integer-safe transform, distinct from the hub's display-only float
// `rebaseTo100` in `portfolio.ts` (that one feeds the LineChart in major units; this one
// feeds the instrument chart overlay + the View-data table and must not drift).

/** Rebase a value series so its first non-null, non-zero point reads 100.00 (×100 scaled).
 *  Leading nulls stay null; an all-null/all-zero series returns all null. */
export function rebaseTo100Scaled(values: (number | null)[]): (number | null)[] {
	const base = values.find((v) => v !== null && v !== 0) ?? null;
	if (base === null) return values.map(() => null);
	return values.map((v) => (v === null ? null : Math.round((v * 10000) / base)));
}

export interface RebasedPair {
	/** The focal (base) series, rebased to 100.00 (×100 scaled). */
	base: (number | null)[];
	/** The comparison series, rebased to the SAME common start (×100 scaled). */
	compare: (number | null)[];
	/** Sessions dropped from the longer series to reach the common start (0 when equal). */
	clipped: number;
}

/**
 * Rebase two date-aligned close series (each ending TODAY, walked back over the same daily
 * grid) to a common start. When histories differ in length, both are clipped to the shorter
 * — the LATER common start — and rebased from there, so the comparison is apples-to-apples;
 * `clipped` reports how much of the longer series was dropped so the UI can note the origin.
 */
export function rebasePair(baseCloses: number[], compareCloses: number[]): RebasedPair {
	const n = Math.min(baseCloses.length, compareCloses.length);
	const b = baseCloses.slice(baseCloses.length - n);
	const c = compareCloses.slice(compareCloses.length - n);
	return {
		base: rebaseTo100Scaled(b),
		compare: rebaseTo100Scaled(c),
		clipped: Math.max(baseCloses.length, compareCloses.length) - n
	};
}
