// Recurring & savings plans (V10) — self-contained mock domain (its own array +
// getters + mutators, like scheduled-data). A plan stores its rule (target + cadence +
// start + end); the *next run* is computed from schedule.ts at read time, never stored
// stale. It composes what we already own: P05's schedule (when), V03's order spine
// (what runs each trigger), and A04's round-up engine (an optional funding destination).
// Money is integer minor units; basket weights are integer bps summing to 10000.

import type { Currency } from './money';
import { isoDate, daysBeforeToday } from './time';
import type { EndRule, Frequency } from '$lib/payments/schedule';
import type { BasketLeg } from '$lib/invest/basket';
import type { Order } from './market';

export type PlanStatus = 'active' | 'paused' | 'ended';
export type PlanKind = 'instrument' | 'fund' | 'basket';
/** A plan runs weekly or monthly — a subset of the P05 {@link Frequency} (never 'once'). */
export type PlanCadence = Extract<Frequency, 'weekly' | 'monthly'>;

export interface SavingsPlan {
	id: string;
	/** Display label — the instrument/fund name, or a basket's given name. */
	name: string;
	kind: PlanKind;
	/** instrument/fund target symbol; null for a basket. */
	symbol: string | null;
	/** basket legs (weights integer bps summing to 10000); empty for a single target. */
	legs: BasketLeg[];
	/** Per-run contribution (the invested notional), EUR minor units. */
	amountMinor: number;
	currency: Currency;
	cadence: PlanCadence;
	/** Source wallet — the plan only READS its buying power (funding stays with payments). */
	walletId: string;
	/** Schedule anchor (day-of-month / day-of-week is encoded here, the P05 idiom). */
	startIso: string;
	end: EndRule;
	status: PlanStatus;
	/** When set, spare-change round-ups (A04) top up this plan as a funding destination. */
	roundUpFunded: boolean;
	createdIso: string;
	/** Order ids of executed runs — join against the V03 orders (V04 blotter). */
	runHistory: string[];
}

const created = isoDate(daysBeforeToday(70));

const items: SavingsPlan[] = [
	{
		id: 'plan-world',
		name: 'World tracker',
		kind: 'instrument',
		symbol: 'IWDA',
		legs: [],
		amountMinor: 20_000,
		currency: 'EUR',
		cadence: 'monthly',
		walletId: 'eur-main',
		startIso: '2026-03-05',
		end: { kind: 'until-cancelled' },
		status: 'active',
		roundUpFunded: false,
		createdIso: created,
		runHistory: ['ord-plan-world-1', 'ord-plan-world-2', 'ord-plan-world-3']
	},
	{
		id: 'plan-tech',
		name: 'Big tech basket',
		kind: 'basket',
		symbol: null,
		legs: [
			{ symbol: 'AAPL', weightBps: 4000 },
			{ symbol: 'MSFT', weightBps: 3500 },
			{ symbol: 'NVDA', weightBps: 2500 }
		],
		amountMinor: 15_000,
		currency: 'EUR',
		cadence: 'monthly',
		walletId: 'eur-main',
		startIso: '2026-05-12',
		end: { kind: 'until-cancelled' },
		status: 'active',
		roundUpFunded: true,
		createdIso: isoDate(daysBeforeToday(39)),
		runHistory: ['ord-plan-tech-1a', 'ord-plan-tech-1b', 'ord-plan-tech-1c']
	},
	{
		id: 'plan-safety',
		name: 'All-World, steady',
		kind: 'fund',
		symbol: 'VWCE',
		legs: [],
		amountMinor: 2_500,
		currency: 'EUR',
		cadence: 'weekly',
		walletId: 'eur-main',
		startIso: '2026-06-01',
		end: { kind: 'until-cancelled' },
		status: 'paused',
		roundUpFunded: false,
		createdIso: isoDate(daysBeforeToday(20)),
		runHistory: []
	}
];

/**
 * The Order records for the seeded plans' past runs — merged into the V03 orders list
 * (invest.svelte) so a run shows in the V04 blotter and the plan's contribution history
 * joins against it. Ids match each plan's `runHistory`. Buys, filled, EUR totals =
 * contribution + fee (see V03's `orderFee`). Dates off the fixed TODAY anchor.
 */
export const PLAN_SEED_ORDERS: Order[] = [
	// plan-world — three monthly IWDA runs (price 98.42, fractional; €200 + €1 fee).
	{ id: 'ord-plan-world-1', symbol: 'IWDA', side: 'buy', kind: 'market', quantity: 2.032, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 20_100, placedAt: '2026-03-05' },
	{ id: 'ord-plan-world-2', symbol: 'IWDA', side: 'buy', kind: 'market', quantity: 2.033, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 20_100, placedAt: '2026-04-06' },
	{ id: 'ord-plan-world-3', symbol: 'IWDA', side: 'buy', kind: 'market', quantity: 2.031, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 20_100, placedAt: '2026-05-05' },
	// plan-tech — one monthly run, split 40/35/25 across the basket (€150; €1 fee/leg).
	{ id: 'ord-plan-tech-1a', symbol: 'AAPL', side: 'buy', kind: 'market', quantity: 0.305, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 6_100, placedAt: '2026-05-12' },
	{ id: 'ord-plan-tech-1b', symbol: 'MSFT', side: 'buy', kind: 'market', quantity: 0.127, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 5_350, placedAt: '2026-05-12' },
	{ id: 'ord-plan-tech-1c', symbol: 'NVDA', side: 'buy', kind: 'market', quantity: 0.319, priceMinor: null, tif: 'day', status: 'filled', totalEurMinor: 3_850, placedAt: '2026-05-12' }
];

export function getPlans(): SavingsPlan[] {
	return items;
}

export function getPlan(id: string): SavingsPlan | undefined {
	return items.find((p) => p.id === id);
}

/** The fields a create flow supplies — the rule, minus the derived/managed fields. */
export interface PlanDraft {
	name: string;
	kind: PlanKind;
	symbol: string | null;
	legs: BasketLeg[];
	amountMinor: number;
	currency: Currency;
	cadence: PlanCadence;
	walletId: string;
	startIso: string;
	end: EndRule;
	roundUpFunded: boolean;
}

export function createPlan(draft: PlanDraft): SavingsPlan {
	const plan: SavingsPlan = {
		id: `plan-custom-${items.length}`,
		...draft,
		status: 'active',
		createdIso: isoDate(daysBeforeToday(0)),
		runHistory: []
	};
	items.unshift(plan);
	return plan;
}

function patch(id: string, p: Partial<SavingsPlan>): void {
	const i = items.findIndex((x) => x.id === id);
	if (i !== -1) items[i] = { ...items[i], ...p };
}

/** Edit a plan's amount and/or cadence (the two things the detail page can change). */
export function editPlan(id: string, changes: { amountMinor?: number; cadence?: PlanCadence }): void {
	patch(id, changes);
}

export function pausePlan(id: string): void {
	patch(id, { status: 'paused' });
}

export function resumePlan(id: string): void {
	patch(id, { status: 'active' });
}

export function stopPlan(id: string): void {
	patch(id, { status: 'ended' });
}

/** Append an executed run's order id(s) to a plan's history (used when a run fires). */
export function recordPlanRun(id: string, orderIds: string[]): void {
	const plan = items.find((x) => x.id === id);
	if (plan) plan.runHistory = [...plan.runHistory, ...orderIds];
}
