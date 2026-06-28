// Top-up funding model (P09) — the inbound "add money to my wallet" act. The point
// of this surface is the honest optimistic-vs-pending split: a linked card lands
// instantly (settled), a bank / open-banking pull is genuinely pending until it
// settles, and we never fake the instant. Pure + deterministic; money in integer
// minor units, no float math.

export type FundingType = 'card' | 'bank' | 'open-banking';

export interface FundingSource {
	id: string;
	type: FundingType;
	/** Human label, e.g. "Personal Visa". */
	label: string;
	/** Masked identifier for display (never a real number). */
	maskedId: string;
	/** Instant (card) → settles immediately; otherwise pending. */
	instant: boolean;
	/** Flat fee in minor units (0 = free). */
	feeMinor: number;
	/** Per-top-up limits (minor units of the destination wallet's currency). */
	minMinor: number;
	maxMinor: number;
	/** Honest speed note. */
	etaNote: string;
}

export const FUNDING_SOURCES: FundingSource[] = [
	{
		id: 'src-card',
		type: 'card',
		label: 'Personal Visa',
		maskedId: '•••• 4417',
		instant: true,
		feeMinor: 0,
		minMinor: 100,
		maxMinor: 500_000,
		etaNote: 'Instant'
	},
	{
		id: 'src-bank',
		type: 'bank',
		label: 'SEB current account',
		maskedId: 'SE•• •••• 8821',
		instant: false,
		feeMinor: 0,
		minMinor: 100,
		maxMinor: 5_000_000,
		etaNote: 'Usually within an hour'
	},
	{
		id: 'src-ob',
		type: 'open-banking',
		label: 'Open banking',
		maskedId: 'Any EU bank',
		instant: false,
		feeMinor: 0,
		minMinor: 100,
		maxMinor: 5_000_000,
		etaNote: 'Usually within an hour'
	}
];

/** A top-up at or above this (minor, EUR-equivalent) asks for step-up re-auth. */
export const LARGE_TOPUP_MINOR = 500_000; // €5,000

const BY_ID = new Map(FUNDING_SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): FundingSource | undefined {
	return BY_ID.get(id);
}

export function sourceFeeMinor(source: FundingSource): number {
	return source.feeMinor;
}

/** Reward-early limit check; returns a reason string when out of range, else null. */
export function limitError(source: FundingSource, amountMinor: number): string | null {
	if (amountMinor <= 0) return null; // nothing typed yet
	if (amountMinor < source.minMinor) return 'below-min';
	if (amountMinor > source.maxMinor) return 'above-max';
	return null;
}

export function withinLimits(source: FundingSource, amountMinor: number): boolean {
	return amountMinor >= source.minMinor && amountMinor <= source.maxMinor;
}
