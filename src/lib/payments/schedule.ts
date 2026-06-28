// Schedule maths (P05) — next-run, occurrences, projected balance, business-day
// shift. All dates are ISO YYYY-MM-DD strings (lexicographically comparable) and
// derived from explicit Date args off the fixed TODAY anchor — never Date.now() or
// an argless new Date, so the schedule is identical on every run. Pure; the state
// layer turns these into scheduled items + standing orders.

import { TODAY, isoDate } from '$lib/data/time';

export type Frequency = 'once' | 'weekly' | 'monthly';

export type EndRule =
	| { kind: 'until-cancelled' }
	| { kind: 'on-date'; dateIso: string }
	| { kind: 'after-count'; count: number };

const MS_DAY = 86_400_000;

/** Parse an ISO date at midday (avoids TZ edge-rollovers in toISOString). */
function parse(iso: string): Date {
	return new Date(`${iso}T12:00:00`);
}

export function addDays(iso: string, n: number): string {
	return isoDate(new Date(parse(iso).getTime() + n * MS_DAY));
}

export function addMonths(iso: string, n: number): string {
	const d = parse(iso);
	// Keep the day-of-month where possible; JS clamps overflow (e.g. Jan 31 + 1mo).
	const m = new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), 12);
	return isoDate(m);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: string): number {
	return parse(iso).getDay();
}

export function isWeekend(iso: string): boolean {
	const dow = dayOfWeek(iso);
	return dow === 0 || dow === 6;
}

/** Shift a weekend run to the next Monday (mock business-day rule — no holidays). */
export function businessDayShift(iso: string): string {
	const dow = dayOfWeek(iso);
	if (dow === 6) return addDays(iso, 2); // Sat → Mon
	if (dow === 0) return addDays(iso, 1); // Sun → Mon
	return iso;
}

export const TODAY_ISO = isoDate(TODAY);

function step(iso: string, freq: Frequency): string {
	return freq === 'weekly' ? addDays(iso, 7) : addMonths(iso, 1);
}

/** The next run on/after `fromIso` (default today) for a schedule starting `startIso`. */
export function nextRun(startIso: string, freq: Frequency, fromIso: string = TODAY_ISO): string {
	if (freq === 'once') return startIso;
	let cur = startIso;
	let guard = 0;
	while (cur < fromIso && guard < 2000) {
		cur = step(cur, freq);
		guard++;
	}
	return cur;
}

/** Upcoming run dates (≥ from), honouring the end rule, capped at `limit`. */
export function occurrences(
	startIso: string,
	freq: Frequency,
	end: EndRule,
	limit = 6,
	fromIso: string = TODAY_ISO
): string[] {
	if (freq === 'once') {
		if (end.kind === 'after-count' && end.count < 1) return [];
		return startIso >= fromIso ? [startIso] : [];
	}
	const runs: string[] = [];
	let cur = startIso;
	let i = 0;
	while (i < 600) {
		if (end.kind === 'after-count' && i >= end.count) break;
		if (end.kind === 'on-date' && cur > end.dateIso) break;
		runs.push(cur);
		cur = step(cur, freq);
		i++;
	}
	return runs.filter((r) => r >= fromIso).slice(0, limit);
}

/** Total number of runs an end rule implies (Infinity for until-cancelled). */
export function totalRuns(startIso: string, freq: Frequency, end: EndRule): number {
	if (freq === 'once') return 1;
	if (end.kind === 'after-count') return end.count;
	if (end.kind === 'until-cancelled') return Infinity;
	// on-date: count steps from start to the end date inclusive
	let cur = startIso;
	let n = 0;
	while (cur <= end.dateIso && n < 600) {
		n++;
		cur = step(cur, freq);
	}
	return n;
}

export interface ProjectedRun {
	dateIso: string;
	/** Run date after the weekend shift (what actually executes). */
	executesIso: string;
	shifted: boolean;
	amountMinor: number;
	balanceAfterMinor: number;
	overdraw: boolean;
}

/** Project the available balance forward across the given run dates. */
export function projectedBalance(
	currentMinor: number,
	amountMinor: number,
	runDates: string[]
): ProjectedRun[] {
	let bal = currentMinor;
	return runDates.map((dateIso) => {
		bal -= amountMinor;
		const executesIso = businessDayShift(dateIso);
		return {
			dateIso,
			executesIso,
			shifted: executesIso !== dateIso,
			amountMinor,
			balanceAfterMinor: bal,
			overdraw: bal < 0
		};
	});
}

/** Does any projected run overdraw the wallet? (reward-early warning) */
export function anyOverdraw(runs: ProjectedRun[]): boolean {
	return runs.some((r) => r.overdraw);
}
