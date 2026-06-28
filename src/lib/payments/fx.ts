// FX quote engine (P04) — convert between my own currency wallets at a live-ish
// rate. Built on the scaled-integer mid-rates in `money.ts` (EUR per 1 unit ×1e6);
// a per-tier margin is applied here, at exchange time, exactly as that module
// anticipated. All money math is integer minor units; the rate is a scaled integer,
// never a float multiply. Deterministic — the rates are fixed seed values, the
// "refresh" re-quotes the same numbers (the countdown is UX, not a new price).
// This is the single quote source the other cross-currency send paths import.

import { DECIMALS } from '$lib/data/money';
import type { Currency } from '$lib/data/money';

// Re-expose the mid-rate table (money.ts keeps it private). EUR per 1 unit, ×1e6.
const RATE_SCALE = 1_000_000;
const EUR_PER_UNIT_SCALED: Record<Currency, number> = {
	EUR: 1_000_000,
	USD: 920_000,
	GBP: 1_172_000,
	SEK: 88_000,
	CHF: 1_048_000
};

export type Tier = 'Standard' | 'Plus' | 'Metal';

/** Exchange margin (basis points) by tier — Metal waives it entirely. */
export const TIER_MARGIN_BPS: Record<Tier, number> = {
	Standard: 90,
	Plus: 50,
	Metal: 0
};

/** Smallest convertible amount on the From side (minor units of From). */
export const MIN_FROM_MINOR = 100;

/** Seconds a quote holds before it re-quotes. */
export const QUOTE_TTL_SECONDS = 30;

export function marginBps(tier: Tier): number {
	return TIER_MARGIN_BPS[tier];
}

/** Mid cross-rate: units of `to` per 1 unit of `from`, scaled ×1e6 (display + math). */
export function midRateScaled(from: Currency, to: Currency): number {
	return Math.round((EUR_PER_UNIT_SCALED[from] * RATE_SCALE) / EUR_PER_UNIT_SCALED[to]);
}

/** My rate after the tier margin (units of `to` per 1 `from`, ×1e6). The margin
 *  reduces what I receive, so it shaves the mid. */
export function yourRateScaled(from: Currency, to: Currency, tier: Tier): number {
	const mid = midRateScaled(from, to);
	const bps = marginBps(tier);
	return bps === 0 ? mid : Math.round((mid * (10_000 - bps)) / 10_000);
}

/** A rate as a float, for display only (never for money math). */
export function rateAsFloat(scaled: number): number {
	return scaled / RATE_SCALE;
}

export interface Quote {
	from: Currency;
	to: Currency;
	tier: Tier;
	/** What I convert (minor units of From). */
	fromMinor: number;
	/** What I receive (minor units of To), my rate applied. */
	receiveMinor: number;
	/** Mid cross-rate (To per 1 From, ×1e6) — the honest reference. */
	midScaled: number;
	/** My cross-rate after margin (To per 1 From, ×1e6). */
	yourScaled: number;
	marginBps: number;
	/** Flat fee, minor units of From (0 in this slice). */
	feeMinor: number;
}

function build(from: Currency, to: Currency, tier: Tier, fromMinor: number, receiveMinor: number): Quote {
	return {
		from,
		to,
		tier,
		fromMinor,
		receiveMinor,
		midScaled: midRateScaled(from, to),
		yourScaled: yourRateScaled(from, to, tier),
		marginBps: marginBps(tier),
		feeMinor: 0
	};
}

/** Forward quote: I type the From amount, this computes what I receive. Both sides
 *  are 2-decimal, so the scaled rate maps minor→minor directly. */
export function quote(from: Currency, to: Currency, fromMinor: number, tier: Tier): Quote {
	const receiveMinor =
		from === to ? fromMinor : Math.round((fromMinor * yourRateScaled(from, to, tier)) / RATE_SCALE);
	return build(from, to, tier, Math.max(0, fromMinor), Math.max(0, receiveMinor));
}

/** Inverse quote: I type the To (target) amount, this computes the From cost needed
 *  to receive it — the linked-input path for editing the receive side. */
export function quoteForTarget(from: Currency, to: Currency, toMinor: number, tier: Tier): Quote {
	const rate = yourRateScaled(from, to, tier);
	const fromMinor = from === to ? toMinor : rate === 0 ? 0 : Math.round((toMinor * RATE_SCALE) / rate);
	return build(from, to, tier, Math.max(0, fromMinor), Math.max(0, toMinor));
}

/** A currency pair can't be exchanged with itself. */
export function samePair(from: Currency, to: Currency): boolean {
	return from === to;
}

export { DECIMALS };
export type { Currency };
