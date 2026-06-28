// Revolving credit line math (L05) — eligibility + offered limit, representative APR
// with a worked example, the minimum-payment rule, and the interest impact of repaying
// less than the statement balance. Unlike a fixed loan, revolving credit discloses a
// *representative* APR + example, and warns plainly about paying only the minimum.
// Deterministic and mock.

import { monthlyRateFromApr } from '$lib/data/lending';

// ---- Rates + fees (disclosed) -------------------------------------------
export const REPRESENTATIVE_APR_BPS = 2490; // 24.9% APR variable, representative
export const CASH_ADVANCE_APR_BPS = 2990; // 29.9% on cash advances
export const ANNUAL_FEE_MINOR = 0; // no annual fee
export const MAX_LIMIT_MINOR = 1500000; // €15,000 ceiling
export const MIN_LIMIT_MINOR = 50000; // €500 floor

// Minimum payment = the greater of €25 or 5% of the statement balance.
export const MIN_PAYMENT_FLOOR_MINOR = 2500;
export const MIN_PAYMENT_PCT_BPS = 500;

/** The representative example regulation requires beside the APR. */
export const REPRESENTATIVE_EXAMPLE =
	'Assumed credit limit €1,200 at 24.9% APR (variable) gives a representative 24.9% APR.';

// ---- Eligibility ---------------------------------------------------------
export type CreditOutcome = 'eligible' | 'referred' | 'declined';

export interface CreditEligibility {
	outcome: CreditOutcome;
	requestedLimitMinor: number;
	offeredLimitMinor: number;
	aprBps: number;
	/** A plain, no-blame line. */
	reason: string;
}

function roundTo500(minor: number): number {
	return Math.round(minor / 50000) * 50000;
}

/** A soft eligibility check — an income-based cap sets the offered limit, which may
 *  be lower than requested (stated plainly). High commitments refer; too little
 *  income declines. No score impact. */
export function eligibilityCheck(
	requestedLimitMinor: number,
	grossAnnualIncomeMinor: number,
	monthlyCommitmentsMinor: number
): CreditEligibility {
	const base = {
		requestedLimitMinor,
		aprBps: REPRESENTATIVE_APR_BPS
	};
	// ~20% of annual income, capped at the ceiling.
	const incomeCapMinor = Math.min(MAX_LIMIT_MINOR, roundTo500(Math.round(grossAnnualIncomeMinor * 0.2)));
	const monthlyIncomeMinor = Math.round((grossAnnualIncomeMinor * 0.72) / 12);

	if (incomeCapMinor < MIN_LIMIT_MINOR) {
		return {
			...base,
			outcome: 'declined',
			offeredLimitMinor: 0,
			reason:
				'On the income given I can’t offer a credit line right now. A higher or more established income would change this.'
		};
	}
	if (monthlyIncomeMinor > 0 && monthlyCommitmentsMinor / monthlyIncomeMinor > 0.5) {
		return {
			...base,
			outcome: 'referred',
			offeredLimitMinor: Math.min(requestedLimitMinor, incomeCapMinor),
			reason:
				'This looks workable, but your existing commitments mean an underwriter will review before the line opens.'
		};
	}
	const offeredLimitMinor = Math.max(
		MIN_LIMIT_MINOR,
		Math.min(requestedLimitMinor, incomeCapMinor)
	);
	return {
		...base,
		outcome: 'eligible',
		offeredLimitMinor,
		reason:
			offeredLimitMinor < requestedLimitMinor
				? `Approved at €${(offeredLimitMinor / 100).toLocaleString('en-IE')} — a little under what you asked for, based on your income. You can accept this limit or decline.`
				: 'Approved at the limit you asked for. The offer below sets out the representative APR and the rates.'
	};
}

// ---- Minimum payment + repayment impact ---------------------------------
/** Minimum payment due = greater of €25 or 5% of the statement balance (never more
 *  than the balance itself). */
export function minimumPaymentMinor(statementBalanceMinor: number): number {
	if (statementBalanceMinor <= 0) return 0;
	const pct = Math.round((statementBalanceMinor * MIN_PAYMENT_PCT_BPS) / 10000);
	return Math.min(statementBalanceMinor, Math.max(MIN_PAYMENT_FLOOR_MINOR, pct));
}

export interface RepayImpact {
	payMinor: number;
	residualMinor: number;
	/** Interest that will be charged next cycle on the residual (0 if cleared). */
	nextInterestMinor: number;
	clearsStatement: boolean;
}

/** The interest impact of a repayment: anything left on the statement balance after
 *  paying accrues a cycle of interest at the representative rate. Paying the full
 *  statement balance avoids interest. */
export function repayImpact(
	statementBalanceMinor: number,
	payMinor: number,
	aprBps = REPRESENTATIVE_APR_BPS
): RepayImpact {
	const residualMinor = Math.max(0, statementBalanceMinor - payMinor);
	const r = monthlyRateFromApr(aprBps);
	return {
		payMinor,
		residualMinor,
		nextInterestMinor: Math.round(residualMinor * r),
		clearsStatement: residualMinor === 0
	};
}

/** Utilisation in bps (balance ÷ limit) for the progress read. */
export function utilisationBps(balanceMinor: number, limitMinor: number): number {
	if (limitMinor <= 0) return 0;
	return Math.min(10000, Math.round((balanceMinor / limitMinor) * 10000));
}
