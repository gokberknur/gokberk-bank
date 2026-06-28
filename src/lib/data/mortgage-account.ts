// The active mortgage being serviced (L04 Flow B). One held mortgage, seeded as if
// taken out three years ago: a 25-year term, five-year fixed, part-paid. Balance and
// monthly payment are derived from the shared annuity engine so they reconcile with
// the schedule. Mutable in memory — an overpayment reduces the balance, a rate switch
// changes the rate + regenerates the schedule; re-seeds every boot.

import { monthlyPaymentMinor, amortization } from './lending';
import type { MortgageRateType } from './lending';

export interface ServicedMortgage {
	id: string;
	/** Current estimated property value (has appreciated since purchase). */
	propertyValueMinor: number;
	originalPrincipalMinor: number;
	/** Outstanding balance today. */
	balanceMinor: number;
	aprBps: number;
	rateType: MortgageRateType;
	fixedYears: number;
	/** ISO date the fixed period ends (an ERC applies while inside it). */
	fixedEndIso: string;
	/** Original term in months. */
	termMonths: number;
	/** Level payments made so far. */
	monthsElapsed: number;
	startIso: string;
	monthlyMinor: number;
}

const ORIGINAL_MINOR = 24000000; // €240,000 borrowed
const APR_BPS = 349; // 3.49% five-year fixed
const TERM_MONTHS = 300; // 25 years
const ELAPSED = 36; // three years of payments made

const seedMonthly = monthlyPaymentMinor(ORIGINAL_MINOR, APR_BPS, TERM_MONTHS);
const seedSchedule = amortization(ORIGINAL_MINOR, APR_BPS, TERM_MONTHS);
const seedBalance = seedSchedule[ELAPSED - 1]?.balanceMinor ?? ORIGINAL_MINOR;

let mortgage: ServicedMortgage = {
	id: 'mortgage-home',
	propertyValueMinor: 33000000, // €330,000 — appreciated from €300,000 at purchase
	originalPrincipalMinor: ORIGINAL_MINOR,
	balanceMinor: seedBalance,
	aprBps: APR_BPS,
	rateType: 'fixed',
	fixedYears: 5,
	fixedEndIso: '2028-07-20',
	termMonths: TERM_MONTHS,
	monthsElapsed: ELAPSED,
	startIso: '2023-07-20',
	monthlyMinor: seedMonthly
};

export function getMortgage(): ServicedMortgage {
	return mortgage;
}

export function getMortgageById(id: string): ServicedMortgage | undefined {
	return id === mortgage.id ? mortgage : undefined;
}

/** Apply a lump overpayment — reduces the outstanding balance (the ERC, if any, is
 *  charged separately and does not reduce the balance). */
export function applyMortgageOverpayment(amountMinor: number): ServicedMortgage {
	mortgage = { ...mortgage, balanceMinor: Math.max(0, mortgage.balanceMinor - amountMinor) };
	return mortgage;
}

/** Switch to a new rate/product — keeps the balance + remaining term, recomputes the
 *  monthly payment, and (for a new fix) resets the fixed-period end. */
export function switchMortgageRate(change: {
	aprBps: number;
	rateType: MortgageRateType;
	fixedYears: number;
	fixedEndIso: string;
}): ServicedMortgage {
	const remainingMonths = mortgage.termMonths - mortgage.monthsElapsed;
	mortgage = {
		...mortgage,
		aprBps: change.aprBps,
		rateType: change.rateType,
		fixedYears: change.fixedYears,
		fixedEndIso: change.fixedEndIso,
		monthlyMinor: monthlyPaymentMinor(mortgage.balanceMinor, change.aprBps, remainingMonths)
	};
	return mortgage;
}
