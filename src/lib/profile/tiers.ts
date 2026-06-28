// The plan tier table (X04) — Standard / Plus / Metal, finalized here. This is the
// single source for what a tier costs and unlocks; the FX margin per tier mirrors
// `payments/fx.ts` exactly (Standard 90 / Plus 50 / Metal 0 bps) so switching to
// Metal genuinely turns FX to "No markup" everywhere. Fees are integer minor units
// (EUR), stated as plain fact — perks and price carry equal weight, no upsell hype.

import type { Tier } from '$lib/state/session.svelte';

export type { Tier };

export interface TierLimit {
	label: string;
	/** Stated value, already formatted for display (e.g. "€20,000 / day", "Unlimited"). */
	value: string;
}

export interface TierPlan {
	id: Tier;
	name: string;
	/** One-line positioning — calm, factual. */
	blurb: string;
	/** Monthly fee in minor units (EUR). 0 = free. */
	monthlyFeeMinor: number;
	/** FX margin in basis points — MUST match TIER_MARGIN_BPS in payments/fx.ts. */
	fxMarginBps: number;
	/** What this tier unlocks, price-neutral wording. */
	perks: string[];
	/** Per-tier limits, surfaced read-only on /profile/limits. */
	limits: TierLimit[];
}

export const TIERS: TierPlan[] = [
	{
		id: 'Standard',
		name: 'Standard',
		blurb: 'The essentials, free for as long as I want them.',
		monthlyFeeMinor: 0,
		fxMarginBps: 90,
		perks: [
			'EUR wallet',
			'SEPA & SEPA Instant transfers',
			'1 virtual card',
			'FX at the mid-market rate + 0.9% fair-use margin',
			'In-app support'
		],
		limits: [
			{ label: 'Card spend', value: '€5,000 / day' },
			{ label: 'ATM withdrawals', value: '€200 / month free' },
			{ label: 'FX volume', value: '€1,000 / month at fair-use margin' },
			{ label: 'Virtual cards', value: '1' }
		]
	},
	{
		id: 'Plus',
		name: 'Plus',
		blurb: 'Multi-currency and lower FX margin for travel and everyday.',
		monthlyFeeMinor: 799,
		fxMarginBps: 50,
		perks: [
			'Everything in Standard',
			'Multi-currency wallets (USD, GBP, SEK)',
			'Disposable cards',
			'Higher card & ATM limits',
			'FX margin lowered to 0.5%',
			'Priority support'
		],
		limits: [
			{ label: 'Card spend', value: '€20,000 / day' },
			{ label: 'ATM withdrawals', value: '€400 / month free' },
			{ label: 'FX volume', value: '€10,000 / month at 0.5%' },
			{ label: 'Virtual cards', value: '5' }
		]
	},
	{
		id: 'Metal',
		name: 'Metal',
		blurb: 'No-markup FX, a metal card, and protection that travels with me.',
		monthlyFeeMinor: 1699,
		fxMarginBps: 0,
		perks: [
			'Everything in Plus',
			'No-markup FX — mid-market rate, no margin',
			'Metal card',
			'Cashback & rewards boost',
			'Travel & purchase insurance',
			'Concierge'
		],
		limits: [
			{ label: 'Card spend', value: '€50,000 / day' },
			{ label: 'ATM withdrawals', value: '€800 / month free' },
			{ label: 'FX volume', value: 'Unlimited, no markup' },
			{ label: 'Virtual cards', value: 'Unlimited' }
		]
	}
];

const BY_ID = new Map(TIERS.map((t) => [t.id, t]));

export function getTier(id: Tier): TierPlan {
	return BY_ID.get(id) ?? TIERS[0];
}

/** The fee as minor units; 0 for the free tier. */
export function tierFeeMinor(id: Tier): number {
	return getTier(id).monthlyFeeMinor;
}

/** Is `b` a step up in price from `a`? (used to word a switch as upgrade/downgrade) */
export function isUpgrade(from: Tier, to: Tier): boolean {
	return tierFeeMinor(to) > tierFeeMinor(from);
}
