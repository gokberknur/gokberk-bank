// Rewards / cashback (M02) seed — a quiet loyalty layer, not a coupon wall. A
// cashback + points balance, a small grid of merchant offers, and an earn/redeem
// history. Deterministic; money in integer minor units (EUR). Activation and
// redemption mutate in place via immutable replacement (so rune `$derived` chains
// re-flow — the same discipline as cards).

import { TODAY, isoDate } from './time';
import type { Category } from './types';

export type RewardType = 'cashback-pct' | 'points';

export interface RewardOffer {
	id: string;
	merchant: string;
	rewardType: RewardType;
	/** cashback-pct → basis points (500 = 5%); points → fixed points awarded. */
	rewardValue: number;
	/** Cashback cap per the offer, EUR minor (cashback offers only). */
	capMinor?: number;
	category?: Category;
	startDate: string;
	endDate: string;
	activated: boolean;
	featured?: boolean;
	terms: string;
}

export type RewardKind = 'earned' | 'redeemed';

export interface RewardHistoryEntry {
	id: string;
	date: string;
	source: string;
	kind: RewardKind;
	/** Cashback amount, EUR minor (when the entry is cash). */
	amountMinor?: number;
	/** Points delta (when the entry is points). */
	points?: number;
	status: 'pending' | 'settled';
}

export interface RewardsBalance {
	cashbackBalanceMinor: number;
	pendingCashbackMinor: number;
	pointsBalance: number;
}

const d = (deltaDays: number): string => {
	const x = new Date(TODAY);
	x.setDate(x.getDate() + deltaDays);
	return isoDate(x);
};

let balance: RewardsBalance = {
	cashbackBalanceMinor: 4218,
	pendingCashbackMinor: 640,
	pointsBalance: 3240
};

let offers: RewardOffer[] = [
	{ id: 'of-coop', merchant: 'Coop', rewardType: 'cashback-pct', rewardValue: 300, capMinor: 1500, category: 'groceries', startDate: d(-20), endDate: d(40), activated: true, featured: true, terms: '3% back on in-store and online grocery spend, capped at €15 per month.' },
	{ id: 'of-zalando', merchant: 'Zalando', rewardType: 'cashback-pct', rewardValue: 500, capMinor: 2500, category: 'shopping', startDate: d(-10), endDate: d(25), activated: false, terms: '5% back on fashion orders over €40, capped at €25.' },
	{ id: 'of-spotify', merchant: 'Spotify', rewardType: 'points', rewardValue: 200, category: 'subscriptions', startDate: d(-30), endDate: d(60), activated: false, terms: 'Earn 200 points when you keep your subscription active this month.' },
	{ id: 'of-lufthansa', merchant: 'Lufthansa', rewardType: 'cashback-pct', rewardValue: 200, capMinor: 5000, category: 'travel', startDate: d(-5), endDate: d(50), activated: false, terms: '2% back on flights, capped at €50 per booking.' },
	{ id: 'of-apple', merchant: 'Apple', rewardType: 'cashback-pct', rewardValue: 100, capMinor: 3000, category: 'shopping', startDate: d(-2), endDate: d(70), activated: false, terms: '1% back on Apple Store purchases, capped at €30.' },
	{ id: 'of-pret', merchant: 'Pret a Manger', rewardType: 'points', rewardValue: 120, category: 'dining', startDate: d(-40), endDate: d(-2), activated: false, terms: 'Earn 120 points on three or more visits this month.' }
];

let history: RewardHistoryEntry[] = [
	{ id: 'rh-7', date: d(-1), source: 'Coop', kind: 'earned', amountMinor: 186, status: 'pending' },
	{ id: 'rh-6', date: d(-3), source: 'Spotify', kind: 'earned', points: 200, status: 'settled' },
	{ id: 'rh-5', date: d(-8), source: 'Coop', kind: 'earned', amountMinor: 214, status: 'settled' },
	{ id: 'rh-4', date: d(-14), source: 'Cashback to Main', kind: 'redeemed', amountMinor: 2000, status: 'settled' },
	{ id: 'rh-3', date: d(-19), source: 'Coop', kind: 'earned', amountMinor: 240, status: 'settled' },
	{ id: 'rh-2', date: d(-26), source: 'Welcome bonus', kind: 'earned', points: 1000, status: 'settled' },
	{ id: 'rh-1', date: d(-33), source: 'Coop', kind: 'earned', amountMinor: 312, status: 'settled' }
];

export function getRewardsBalance(): RewardsBalance {
	return balance;
}

export function getOffers(): RewardOffer[] {
	return offers;
}

export function getOffer(id: string): RewardOffer | undefined {
	return offers.find((o) => o.id === id);
}

/** Whether an offer is still within its validity window (vs TODAY). */
export function isOfferLive(o: RewardOffer): boolean {
	const today = isoDate(TODAY);
	return o.startDate <= today && o.endDate >= today;
}

/** Toggle an offer's activation (immutable replacement). Returns the new state. */
export function setOfferActivated(id: string, activated: boolean): boolean {
	const i = offers.findIndex((o) => o.id === id);
	if (i === -1) return false;
	offers = offers.map((o, j) => (j === i ? { ...o, activated } : o));
	return activated;
}

export function getRewardsHistory(): RewardHistoryEntry[] {
	return history;
}

/**
 * Redeem cashback to a wallet: debit the cashback balance and log a redemption.
 * Caller credits the wallet (F03). Immutable replacement so consumers re-flow.
 */
export function redeemCashback(amountMinor: number, destinationLabel: string): RewardHistoryEntry {
	balance = { ...balance, cashbackBalanceMinor: Math.max(0, balance.cashbackBalanceMinor - amountMinor) };
	const entry: RewardHistoryEntry = {
		id: `rh-${history.length + 1}-r`,
		date: isoDate(TODAY),
		source: `Cashback to ${destinationLabel}`,
		kind: 'redeemed',
		amountMinor,
		status: 'settled'
	};
	history = [entry, ...history];
	return entry;
}
