// V11 · Price-alert crossing engine — PURE + deterministic. It answers one question in integer
// minor units: did an armed threshold get crossed? On the deterministic seed there is no live
// tick, so a "crossing" is evaluated against the instrument's OWN most-recent completed session
// move — `priorCloseMinor → lastPriceMinor` (the same transition day-change is derived from
// app-wide, `market.ts`). A threshold sitting inside that band was genuinely crossed in the seeded
// series: honest (no fabricated tick, `lastPriceMinor` stays system-of-record per ADR-006),
// deterministic, and works with the network off. Comparisons are `>=`/`<=` in minor units — never
// a float compare. This module holds the domain TYPES too (so the reactive store imports them here
// and there is no circular dependency), and is directly unit-fixture-testable.

import { INSTRUMENTS } from '$lib/data/market';

export type AlertCondition = 'above' | 'below';
export type AlertMode = 'once' | 'repeating';
export type AlertStatus = 'armed' | 'muted' | 'fired';

export interface PriceAlert {
	/** Stable id — a composite of symbol+condition+threshold, so an identical alert can't duplicate. */
	id: string;
	symbol: string;
	condition: AlertCondition;
	/** The trigger level, integer minor units of the instrument's currency. */
	thresholdMinor: number;
	/** `once` fires then auto-mutes; `repeating` re-arms after a cross-back (dormant on the seed). */
	mode: AlertMode;
	status: AlertStatus;
	/** ISO timestamp the alert was armed. */
	createdAt: string;
	/** ISO timestamp it last fired (unset = never fired; the re-fire guard). */
	firedAt?: string;
}

/** A quote reduced to the seed's most-recent completed session move. */
export interface Quote {
	priorCloseMinor: number;
	lastPriceMinor: number;
}

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

/** The seed's most-recent completed session move for a symbol (prior close → last price). */
export function quoteFor(symbol: string): Quote | null {
	const inst = BY_SYMBOL.get(symbol);
	return inst ? { priorCloseMinor: inst.priorCloseMinor, lastPriceMinor: inst.lastPriceMinor } : null;
}

/**
 * Did the threshold get crossed by the session move? Integer minor units, never float.
 * - above: the move went from below the level to at-or-above it (`prior < t && last >= t`).
 * - below: the move went from above the level to at-or-below it (`prior > t && last <= t`).
 * A level the price was ALREADY past (didn't move through) does not count as a crossing.
 */
export function crossed(condition: AlertCondition, thresholdMinor: number, q: Quote): boolean {
	if (condition === 'above') {
		return q.priorCloseMinor < thresholdMinor && q.lastPriceMinor >= thresholdMinor;
	}
	return q.priorCloseMinor > thresholdMinor && q.lastPriceMinor <= thresholdMinor;
}

/** Whether an alert would fire NOW against the seed: armed, never-fired, and crossed. The re-fire
 *  guard is `!firedAt` — on the static seed the price never crosses back, so a fired alert (once OR
 *  repeating) stays quiet until live data (out of scope) moves it back across its threshold. */
export function wouldFire(alert: PriceAlert): boolean {
	if (alert.status !== 'armed' || alert.firedAt) return false;
	const q = quoteFor(alert.symbol);
	return q ? crossed(alert.condition, alert.thresholdMinor, q) : false;
}

/** The stable composite id for an alert (so an identical symbol+condition+level can't duplicate). */
export function alertId(symbol: string, condition: AlertCondition, thresholdMinor: number): string {
	return `al-${symbol}-${condition}-${thresholdMinor}`;
}
