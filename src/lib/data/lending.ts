// Lending math + seed (L-series) — annuity amortization, representative rates,
// affordability, and an active personal-loan seed. All money is integer minor
// units (EUR). Rates are held as **effective APR in basis points** (790 = 7.90%);
// the monthly compounding rate is derived from the APR, so the APR is always the
// honest headline figure and the monthly payment follows from it. Pure +
// deterministic — the calculators recompute locally with no backend.

import { TODAY, isoDate } from './time';

export const LOAN_BOUNDS = {
	minMinor: 100_000, // €1,000
	maxMinor: 5_000_000, // €50,000
	minTermMonths: 12,
	maxTermMonths: 84
} as const;

export const MORTGAGE_BOUNDS = {
	minTermYears: 5,
	maxTermYears: 35,
	/** Minimum deposit as a share of property value, basis points (10%). */
	minDepositBps: 1000
} as const;

/** Effective-APR (bps) → the equivalent monthly compounding rate (decimal). */
export function monthlyRateFromApr(aprBps: number): number {
	return Math.pow(1 + aprBps / 10000, 1 / 12) - 1;
}

/** Level monthly payment (minor units) for an annuity loan. */
export function monthlyPaymentMinor(principalMinor: number, aprBps: number, termMonths: number): number {
	if (termMonths <= 0) return 0;
	const r = monthlyRateFromApr(aprBps);
	if (r === 0) return Math.round(principalMinor / termMonths);
	const pay = (principalMinor * r) / (1 - Math.pow(1 + r, -termMonths));
	return Math.round(pay);
}

export interface AmortRow {
	/** 1-based month index. */
	month: number;
	paymentMinor: number;
	interestMinor: number;
	principalMinor: number;
	/** Remaining balance after this payment. */
	balanceMinor: number;
}

/** The full repayment schedule; the final row is trued-up so the balance hits 0. */
export function amortization(principalMinor: number, aprBps: number, termMonths: number): AmortRow[] {
	const r = monthlyRateFromApr(aprBps);
	const payment = monthlyPaymentMinor(principalMinor, aprBps, termMonths);
	const rows: AmortRow[] = [];
	let balance = principalMinor;
	for (let month = 1; month <= termMonths; month++) {
		const interest = Math.round(balance * r);
		let principal = payment - interest;
		let pay = payment;
		if (month === termMonths || principal >= balance) {
			// Final instalment clears the balance exactly.
			principal = balance;
			pay = balance + interest;
		}
		balance -= principal;
		rows.push({ month, paymentMinor: pay, interestMinor: interest, principalMinor: principal, balanceMinor: Math.max(0, balance) });
		if (balance <= 0) break;
	}
	return rows;
}

export interface LoanCost {
	monthlyMinor: number;
	totalRepayableMinor: number;
	totalInterestMinor: number;
	aprBps: number;
}

/** Headline cost of a loan/mortgage from its amortization. */
export function loanCost(principalMinor: number, aprBps: number, termMonths: number): LoanCost {
	const rows = amortization(principalMinor, aprBps, termMonths);
	const totalRepayableMinor = rows.reduce((s, r) => s + r.paymentMinor, 0);
	return {
		monthlyMinor: monthlyPaymentMinor(principalMinor, aprBps, termMonths),
		totalRepayableMinor,
		totalInterestMinor: totalRepayableMinor - principalMinor,
		aprBps
	};
}

/**
 * Representative APR (bps) for an unsecured personal loan — smaller and longer
 * loans price higher, the standard risk-based banding. Indicative until the soft
 * check confirms it.
 */
export function personalLoanAprBps(principalMinor: number, termMonths: number): number {
	let base: number;
	if (principalMinor < 300_000) base = 1490; // < €3k → 14.9%
	else if (principalMinor < 700_000) base = 990; // < €7k → 9.9%
	else if (principalMinor < 1_500_000) base = 690; // < €15k → 6.9%
	else if (principalMinor < 2_500_000) base = 590; // < €25k → 5.9%
	else base = 540; // ≥ €25k → 5.4%
	// Longer terms add a little.
	if (termMonths > 60) base += 80;
	else if (termMonths > 36) base += 40;
	return base;
}

/** Loan-to-value in bps (e.g. 8000 = 80%). */
export function ltvBps(propertyMinor: number, depositMinor: number): number {
	if (propertyMinor <= 0) return 0;
	return Math.round(((propertyMinor - depositMinor) / propertyMinor) * 10000);
}

export type MortgageRateType = 'fixed' | 'variable';

/** Indicative mortgage rate (APR bps) by LTV band + rate type — a lower LTV
 *  (bigger deposit) unlocks a better band. */
export function mortgageRateBps(ltv: number, rateType: MortgageRateType): number {
	let base: number;
	if (ltv <= 6000) base = 349;
	else if (ltv <= 8000) base = 369;
	else if (ltv <= 9000) base = 399;
	else base = 439;
	if (rateType === 'variable') base += 20; // variable carries a small premium here
	return base;
}

export interface Affordability {
	monthlyIncomeMinor: number;
	monthlyOutgoingsMinor: number;
	disposableMinor: number;
	paymentMinor: number;
	/** payment ÷ disposable, bps. */
	ratioBps: number;
	pass: boolean;
	/** Largest loan whose payment stays within the affordable share, minor units. */
	maxLoanMinor: number;
}

/** A soft affordability check: the payment must stay within `affordableShareBps`
 *  (default 40%) of monthly disposable income. */
export function affordability(
	grossAnnualIncomeMinor: number,
	monthlyHousingMinor: number,
	monthlyCommitmentsMinor: number,
	paymentMinor: number,
	aprBps: number,
	termMonths: number,
	affordableShareBps = 4000
): Affordability {
	// A flat ~28% deduction approximates net from gross for the demo.
	const monthlyIncomeMinor = Math.round((grossAnnualIncomeMinor * 0.72) / 12);
	const monthlyOutgoingsMinor = monthlyHousingMinor + monthlyCommitmentsMinor;
	const disposableMinor = Math.max(0, monthlyIncomeMinor - monthlyOutgoingsMinor);
	const affordablePaymentMinor = Math.round((disposableMinor * affordableShareBps) / 10000);
	const r = monthlyRateFromApr(aprBps);
	// Invert the annuity to find the largest principal for the affordable payment.
	const maxLoanMinor =
		r === 0
			? affordablePaymentMinor * termMonths
			: Math.round((affordablePaymentMinor * (1 - Math.pow(1 + r, -termMonths))) / r);
	return {
		monthlyIncomeMinor,
		monthlyOutgoingsMinor,
		disposableMinor,
		paymentMinor,
		ratioBps: disposableMinor > 0 ? Math.round((paymentMinor / disposableMinor) * 10000) : 99999,
		pass: paymentMinor <= affordablePaymentMinor && disposableMinor > 0,
		maxLoanMinor: Math.max(0, maxLoanMinor)
	};
}

export type LoanPurpose = 'consolidation' | 'home' | 'car' | 'other';

export const LOAN_PURPOSES: { value: LoanPurpose; label: string }[] = [
	{ value: 'consolidation', label: 'Debt consolidation' },
	{ value: 'home', label: 'Home improvement' },
	{ value: 'car', label: 'Car or vehicle' },
	{ value: 'other', label: 'Something else' }
];

export interface Loan {
	id: string;
	principalMinor: number;
	aprBps: number;
	termMonths: number;
	/** ISO date the loan drew down. */
	startDate: string;
	purpose: LoanPurpose;
}

function monthsAgo(n: number): string {
	const d = new Date(TODAY);
	d.setMonth(d.getMonth() - n);
	return isoDate(d);
}

/** One active personal loan, for the lending hub's servicing summary. */
export const ACTIVE_LOAN: Loan = {
	id: 'loan-1',
	principalMinor: 800_000, // €8,000
	aprBps: 790, // 7.9%
	termMonths: 36,
	startDate: monthsAgo(10),
	purpose: 'home'
};

export interface LoanStatus {
	paidMonths: number;
	remainingMonths: number;
	balanceMinor: number;
	monthlyMinor: number;
	nextPaymentMinor: number;
	nextPaymentDate: string;
	/** Fraction of the term elapsed, bps. */
	progressBps: number;
}

/** Live status of an active loan, derived from its schedule vs TODAY. */
export function loanStatus(loan: Loan): LoanStatus {
	const rows = amortization(loan.principalMinor, loan.aprBps, loan.termMonths);
	const [sy, sm] = loan.startDate.split('-').map(Number);
	const paidMonths = Math.min(
		loan.termMonths,
		Math.max(0, (TODAY.getFullYear() - sy) * 12 + (TODAY.getMonth() + 1 - sm))
	);
	const remainingMonths = Math.max(0, loan.termMonths - paidMonths);
	const balanceMinor = paidMonths === 0 ? loan.principalMinor : (rows[paidMonths - 1]?.balanceMinor ?? 0);
	const monthlyMinor = monthlyPaymentMinor(loan.principalMinor, loan.aprBps, loan.termMonths);
	const next = new Date(TODAY);
	next.setMonth(next.getMonth() + 1, 1);
	return {
		paidMonths,
		remainingMonths,
		balanceMinor,
		monthlyMinor,
		nextPaymentMinor: remainingMonths > 0 ? monthlyMinor : 0,
		nextPaymentDate: isoDate(next),
		progressBps: Math.round((paidMonths / loan.termMonths) * 10000)
	};
}
