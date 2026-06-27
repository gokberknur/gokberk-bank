// A fixed "today" anchor so the generated financial life is reproducible. The
// data layer never calls `Date.now()` — every relative date is computed from
// this constant, so the same seed yields the same dates on every run.

/** The mock present moment. All seeded history is dated relative to this. */
export const TODAY = new Date('2026-06-20T12:00:00');

/** A new Date `days` before TODAY (days may be fractional). */
export function daysBeforeToday(days: number): Date {
	return new Date(TODAY.getTime() - days * 24 * 60 * 60 * 1000);
}

/** ISO date string (YYYY-MM-DD) for a Date. */
export function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}
