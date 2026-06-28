// Split-a-bill maths (P08) — all in integer minor units, never float-divide-and-hope.
// The one rule that matters: the shares must always sum to the total, so the rounding
// remainder is distributed deterministically (to the earliest rows) and shown, never
// silently dropped. Pure; the state layer turns the resulting shares into P07 requests.

export type SplitMethod = 'equal' | 'amount' | 'percent';

/** Divide `totalMinor` into `n` shares as evenly as possible. The leftover minor
 *  units (total − floor·n) go one each to the first rows, so the shares sum exactly
 *  to the total. €100 / 3 → [3334, 3333, 3333]. */
export function splitEqual(totalMinor: number, n: number): number[] {
	if (n <= 0) return [];
	const base = Math.floor(totalMinor / n);
	let remainder = totalMinor - base * n; // 0..n-1 leftover minor units
	const shares = new Array<number>(n).fill(base);
	for (let i = 0; i < shares.length && remainder > 0; i++, remainder--) {
		shares[i] += 1;
	}
	return shares;
}

/** Index of the row carrying the rounding remainder in an equal split (the first
 *  row, when the total doesn't divide evenly), or -1 if it divides cleanly. */
export function equalRemainderRow(totalMinor: number, n: number): number {
	if (n <= 0) return -1;
	return totalMinor % n === 0 ? -1 : 0;
}

/** Shares from percentages (each 0..100, ideally summing to 100). Each share is
 *  rounded, then the rounding difference is applied to the first row so the shares
 *  still sum exactly to the total. */
export function splitByPercent(totalMinor: number, percents: number[]): number[] {
	const shares = percents.map((p) => Math.round((totalMinor * p) / 100));
	const diff = totalMinor - shares.reduce((s, v) => s + v, 0);
	if (shares.length > 0) shares[0] += diff; // absorb the rounding drift
	return shares;
}

/** Unallocated amount: total − sum of shares. Positive = under-allocated (more to
 *  assign), negative = over-allocated. Zero = balanced (ready to send). */
export function remainderMinor(totalMinor: number, shares: number[]): number {
	return totalMinor - shares.reduce((s, v) => s + v, 0);
}

/** Sum of percentages (for the percent-mode "must total 100%" check). */
export function percentTotal(percents: number[]): number {
	return percents.reduce((s, v) => s + v, 0);
}
