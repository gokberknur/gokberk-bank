// Per-trigger plan execution (V10) — pure, mock, deterministic. On each scheduled
// trigger a plan splits its contribution across its legs and runs one V03 buy per leg;
// this module computes what those buys WOULD be (leg notional → price → quantity → fee)
// and the run's honest terminal outcome. It reuses the order spine's fee schedule
// (`orderFee`) and the market model (`instrumentOf`, prices, `isMarketOpen`); it never
// mutates holdings — a run is recorded as Order(s), exactly like the manual ticket.
//
//   outcome = 'skipped'  the wallet couldn't cover the run on the day (recorded, no blame)
//           = 'queued'   the market was shut (runs at the next open — never a faked fill)
//           = 'filled'   the market was open

import { instrumentOf } from '$lib/data/portfolio';
import { toEur } from '$lib/data/money';
import { orderFee } from '$lib/state/invest.svelte';
import type { SavingsPlan } from '$lib/data/plans-data';
import type { BasketLeg } from './basket';
import { splitAmountMinor } from './basket';

export type RunOutcome = 'filled' | 'queued' | 'skipped';

/** One leg's worth of a run — the buy that would be placed for it. */
export interface RunLeg {
	symbol: string;
	/** The slice of the contribution routed to this leg, EUR minor units. */
	notionalMinor: number;
	/** Resolved execution price, minor units, INSTRUMENT currency. */
	priceMinor: number;
	/** Quantity that would trade (fractional where the instrument allows it). */
	quantity: number;
	/** The order fee for this leg, EUR minor units. */
	feeMinor: number;
}

/** The computed result of one trigger — the legs, the money, and the outcome. */
export interface PlanRunResult {
	dateIso: string;
	legs: RunLeg[];
	/** Sum of leg notionals actually invested, EUR minor units. */
	investedMinor: number;
	/** Sum of leg fees, EUR minor units. */
	feeMinor: number;
	/** What leaves the wallet on the day: invested + fees. */
	totalCostMinor: number;
	outcome: RunOutcome;
}

/** A plan's legs: instrument/fund → one leg at 100%; a basket → its own legs. */
export function planLegs(plan: SavingsPlan): BasketLeg[] {
	if (plan.kind === 'basket') return plan.legs;
	return plan.symbol ? [{ symbol: plan.symbol, weightBps: 10_000 }] : [];
}

/** The whole-plan per-run cost (contribution + every leg's fee), EUR minor units —
 *  what a run debits the wallet, used for the reward-early projected-balance check. */
export function perRunCostMinor(plan: SavingsPlan): number {
	const legs = planLegs(plan);
	const split = splitAmountMinor(plan.amountMinor, legs);
	const fees = split.reduce((sum, leg) => sum + orderFee(leg.amountMinor), 0);
	return plan.amountMinor + fees;
}

/**
 * Compute a single run for `plan` on `dateIso`, given the day's funding context.
 * Pure — no side effects; the state layer decides whether to persist the resulting
 * Order(s). A run is `skipped` when the wallet can't cover its all-in cost; otherwise
 * it's `filled` when the market is open and `queued` when it's shut.
 */
export function computeRun(
	plan: SavingsPlan,
	dateIso: string,
	buyingPowerMinor: number,
	marketOpen: boolean
): PlanRunResult {
	const split = splitAmountMinor(plan.amountMinor, planLegs(plan));

	const legs: RunLeg[] = split.map(({ symbol, amountMinor }) => {
		const inst = instrumentOf(symbol);
		const priceMinor = inst?.lastPriceMinor ?? 0;
		const priceEurMinor = inst ? toEur(priceMinor, inst.currency) : 0;
		const raw = priceEurMinor > 0 ? amountMinor / priceEurMinor : 0;
		const quantity = inst?.fractionalAllowed ? raw : Math.floor(raw);
		return { symbol, notionalMinor: amountMinor, priceMinor, quantity, feeMinor: orderFee(amountMinor) };
	});

	const investedMinor = legs.reduce((s, l) => s + l.notionalMinor, 0);
	const feeMinor = legs.reduce((s, l) => s + l.feeMinor, 0);
	const totalCostMinor = investedMinor + feeMinor;
	const outcome: RunOutcome =
		buyingPowerMinor < totalCostMinor ? 'skipped' : marketOpen ? 'filled' : 'queued';

	return { dateIso, legs, investedMinor, feeMinor, totalCostMinor, outcome };
}
