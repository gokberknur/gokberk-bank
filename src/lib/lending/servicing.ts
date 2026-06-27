// Loan-servicing math (L02) — early-settlement figures, overpayment effects, and
// balance glide paths, layered on the pure annuity model in `$lib/data/lending`.
// All money is integer **minor units** (EUR); the monthly rate is derived from the
// honest effective APR (bps); everything is **deterministic** (no Date.now /
// Math.random) so the same loan always settles to the same figure.
//
// CPO product calls baked in here (the spec's open questions):
//  • Overpayment **shortens the term** — the level payment is kept and the balance
//    is knocked down, so the loan finishes sooner and saves the most interest. We
//    report the months saved + the interest saved, never a vague "it helps".
//  • Early settlement is **interest-to-date only, no penalty** — the payoff is the
//    outstanding principal plus interest accrued since the last payment, pro-rated
//    by the day. No early-settlement charge (consumer-friendly, on-brand). The
//    interest you skip vs running to term is stated as the saving.

import { TODAY } from '$lib/data/time';
import {
	monthlyRateFromApr,
	monthlyPaymentMinor,
	amortization,
	type Loan
} from '$lib/data/lending';

/** The scheduled balance after `paidMonths` level payments (no overpayments). */
export function scheduledBalanceMinor(loan: Loan, paidMonths: number): number {
	if (paidMonths <= 0) return loan.principalMinor;
	const rows = amortization(loan.principalMinor, loan.aprBps, loan.termMonths);
	return rows[Math.min(paidMonths, rows.length) - 1]?.balanceMinor ?? 0;
}

/** The actual outstanding balance = scheduled balance less any lump overpayments. */
export function currentBalanceMinor(loan: Loan, paidMonths: number, overpaidMinor: number): number {
	return Math.max(0, scheduledBalanceMinor(loan, paidMonths) - overpaidMinor);
}

export interface RemainingSchedule {
	months: number;
	interestMinor: number;
	/** Per-month end balances from the starting balance down to 0 (for the chart). */
	balances: number[];
}

/**
 * Run a balance forward at the loan's level payment until it clears, returning how
 * many months it takes, the total interest paid over that run, and the month-by-
 * month end balances. This is the engine behind both the payoff saving (interest
 * skipped) and the overpayment effect (months + interest saved).
 */
export function remainingSchedule(balanceMinor: number, aprBps: number, paymentMinor: number): RemainingSchedule {
	const r = monthlyRateFromApr(aprBps);
	let balance = balanceMinor;
	let interestTotal = 0;
	const balances: number[] = [];
	let months = 0;
	// Guard against a payment that can't cover the interest (won't amortise).
	const minPayment = Math.round(balance * r) + 1;
	const payment = Math.max(paymentMinor, minPayment);
	while (balance > 0 && months < 1200) {
		const interest = Math.round(balance * r);
		let principal = payment - interest;
		if (principal >= balance) principal = balance;
		balance -= principal;
		interestTotal += interest;
		months += 1;
		balances.push(Math.max(0, balance));
	}
	return { months, interestMinor: interestTotal, balances };
}

/** Fraction of the current month elapsed since the 1st (the last payment date). */
function monthFractionElapsed(): number {
	const day = TODAY.getDate();
	const daysInMonth = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
	return Math.min(1, Math.max(0, (day - 1) / daysInMonth));
}

export interface PayoffQuote {
	/** Outstanding principal today, minor units. */
	principalMinor: number;
	/** Interest accrued since the last payment, pro-rated by the day, minor units. */
	accruedInterestMinor: number;
	/** The total to settle in full today = principal + accrued interest. */
	totalMinor: number;
	/** Interest you skip vs running every remaining payment to term, minor units. */
	interestSavedMinor: number;
	/** Months that would otherwise remain on the schedule. */
	monthsRemaining: number;
}

/**
 * The exact figure to settle the loan in full today and the interest it saves.
 * Principal is the outstanding balance; the only interest charged is what's
 * accrued since the last payment (pro-rated) — there's no early-settlement fee.
 * The saving is every other interest payment you'd have made to term.
 */
export function payoffQuote(loan: Loan, paidMonths: number, overpaidMinor: number): PayoffQuote {
	const r = monthlyRateFromApr(loan.aprBps);
	const principalMinor = currentBalanceMinor(loan, paidMonths, overpaidMinor);
	const accruedInterestMinor = Math.round(principalMinor * r * monthFractionElapsed());
	const payment = monthlyPaymentMinor(loan.principalMinor, loan.aprBps, loan.termMonths);
	const rest = remainingSchedule(principalMinor, loan.aprBps, payment);
	return {
		principalMinor,
		accruedInterestMinor,
		totalMinor: principalMinor + accruedInterestMinor,
		interestSavedMinor: Math.max(0, rest.interestMinor - accruedInterestMinor),
		monthsRemaining: rest.months
	};
}

export interface OverpaymentEffect {
	/** The extra paid against principal, minor units. */
	extraMinor: number;
	/** Balance after the overpayment, minor units. */
	newBalanceMinor: number;
	/** Months remaining before vs after — the difference is the term saved. */
	monthsBefore: number;
	monthsAfter: number;
	monthsSavedMinor: number; // months saved (named *Minor only for grep-symmetry — it's a count)
	/** Interest saved over the life of the loan, minor units. */
	interestSavedMinor: number;
}

/**
 * What a lump overpayment does to the loan: keeping the level payment, the balance
 * is knocked down so the schedule finishes sooner. We report the months shaved off
 * the term and the interest saved, both computed by running the schedule before and
 * after — so the preview is the truth, not an estimate.
 */
export function overpaymentEffect(
	loan: Loan,
	paidMonths: number,
	overpaidMinor: number,
	extraMinor: number
): OverpaymentEffect {
	const payment = monthlyPaymentMinor(loan.principalMinor, loan.aprBps, loan.termMonths);
	const balanceBefore = currentBalanceMinor(loan, paidMonths, overpaidMinor);
	const balanceAfter = Math.max(0, balanceBefore - extraMinor);
	const before = remainingSchedule(balanceBefore, loan.aprBps, payment);
	const after = remainingSchedule(balanceAfter, loan.aprBps, payment);
	return {
		extraMinor,
		newBalanceMinor: balanceAfter,
		monthsBefore: before.months,
		monthsAfter: after.months,
		monthsSavedMinor: Math.max(0, before.months - after.months),
		interestSavedMinor: Math.max(0, before.interestMinor - after.interestMinor)
	};
}

/**
 * Two balance glide paths for the payoff chart: the original path (current balance
 * paid to term at the level payment) and the path after the proposed action. For an
 * overpayment, pass the post-overpayment balance; for a full payoff, pass 0 so the
 * line drops to zero immediately. Both start from month 0 = today's balance.
 */
export function balanceGlide(
	loan: Loan,
	paidMonths: number,
	overpaidMinor: number,
	actionBalanceMinor: number
): { original: number[]; afterAction: number[] } {
	const payment = monthlyPaymentMinor(loan.principalMinor, loan.aprBps, loan.termMonths);
	const startBalance = currentBalanceMinor(loan, paidMonths, overpaidMinor);
	const original = [startBalance, ...remainingSchedule(startBalance, loan.aprBps, payment).balances];
	const afterAction =
		actionBalanceMinor <= 0
			? [startBalance, 0]
			: [actionBalanceMinor, ...remainingSchedule(actionBalanceMinor, loan.aprBps, payment).balances];
	return { original, afterAction };
}
