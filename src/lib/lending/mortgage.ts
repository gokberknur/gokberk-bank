// Mortgage application math (L04) — builds on the shared lending engine (annuity
// amortization, LTV, rate bands, affordability in `data/lending.ts`) and adds what a
// full mortgage needs: an itemised fee schedule, an APRC that folds those fees into
// the headline rate, a small product shelf, and a decision-in-principle model. All
// deterministic and mock — indicative until a (simulated) underwrite confirms it.

import {
	monthlyPaymentMinor,
	loanCost,
	mortgageRateBps,
	ltvBps,
	affordability
} from '$lib/data/lending';
import type { MortgageRateType, Affordability, LoanCost } from '$lib/data/lending';

export type EmploymentType = 'employed' | 'self-employed' | 'retired';

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
	{ value: 'employed', label: 'Employed' },
	{ value: 'self-employed', label: 'Self-employed' },
	{ value: 'retired', label: 'Retired' }
];

export type PropertyType = 'house' | 'apartment' | 'new-build';

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
	{ value: 'house', label: 'House' },
	{ value: 'apartment', label: 'Apartment' },
	{ value: 'new-build', label: 'New build' }
];

// ---- Fees ----------------------------------------------------------------
export interface MortgageFees {
	arrangementMinor: number;
	valuationMinor: number;
	fundsTransferMinor: number;
	totalMinor: number;
}

/** The itemised fees for a product — fixed deals carry an arrangement fee; the
 *  variable deal is fee-free. Valuation + funds-transfer apply to all. */
export function mortgageFees(rateType: MortgageRateType, fixedYears: number): MortgageFees {
	const arrangementMinor = rateType === 'fixed' ? (fixedYears >= 5 ? 149900 : 99900) : 0;
	const valuationMinor = 30000;
	const fundsTransferMinor = 3000;
	return {
		arrangementMinor,
		valuationMinor,
		fundsTransferMinor,
		totalMinor: arrangementMinor + valuationMinor + fundsTransferMinor
	};
}

/** APRC (bps): the headline APR with the fees folded in, annualised over the term.
 *  A transparent mock of the "all-in" rate regulation requires beside the rate. */
export function aprcBps(
	principalMinor: number,
	aprBps: number,
	termMonths: number,
	feesMinor: number
): number {
	if (principalMinor <= 0 || termMonths <= 0) return aprBps;
	const years = termMonths / 12;
	const feeLoadBps = Math.round((feesMinor / principalMinor / years) * 10000);
	return aprBps + feeLoadBps;
}

// ---- Product shelf -------------------------------------------------------
export interface MortgageProduct {
	id: string;
	label: string;
	rateType: MortgageRateType;
	/** Years the rate is fixed for (0 = variable). */
	fixedYears: number;
	aprBps: number;
	aprcBps: number;
	fees: MortgageFees;
	monthlyMinor: number;
	cost: LoanCost;
}

function product(
	id: string,
	label: string,
	rateType: MortgageRateType,
	fixedYears: number,
	aprBps: number,
	principalMinor: number,
	termMonths: number
): MortgageProduct {
	const fees = mortgageFees(rateType, fixedYears);
	return {
		id,
		label,
		rateType,
		fixedYears,
		aprBps,
		aprcBps: aprcBps(principalMinor, aprBps, termMonths, fees.totalMinor),
		fees,
		monthlyMinor: monthlyPaymentMinor(principalMinor, aprBps, termMonths),
		cost: loanCost(principalMinor, aprBps, termMonths)
	};
}

/** The products available for a given loan-to-value, principal and term. A longer
 *  fix prices a touch higher; the variable carries the band premium. */
export function mortgageProducts(
	ltv: number,
	principalMinor: number,
	termMonths: number
): MortgageProduct[] {
	const fixedBase = mortgageRateBps(ltv, 'fixed');
	const variable = mortgageRateBps(ltv, 'variable');
	return [
		product('fix-2', '2-year fixed', 'fixed', 2, fixedBase, principalMinor, termMonths),
		product('fix-5', '5-year fixed', 'fixed', 5, fixedBase + 15, principalMinor, termMonths),
		product('var', 'Variable', 'variable', 0, variable, principalMinor, termMonths)
	];
}

// ---- Decision in principle ----------------------------------------------
export type DipOutcome = 'agreed' | 'referred' | 'declined';

export interface DipResult {
	outcome: DipOutcome;
	/** A plain, no-blame line shown to the applicant. */
	reason: string;
	ltv: number;
	affordability: Affordability;
}

/** A decision-in-principle from the affordability check + LTV + employment. Plain
 *  and no-blame: a decline states why and points forward, never judges. */
export function dipDecision(
	propertyMinor: number,
	depositMinor: number,
	grossAnnualIncomeMinor: number,
	monthlyCommitmentsMinor: number,
	employment: EmploymentType,
	aprBps: number,
	termMonths: number
): DipResult {
	const ltv = ltvBps(propertyMinor, depositMinor);
	const principalMinor = Math.max(0, propertyMinor - depositMinor);
	const payment = monthlyPaymentMinor(principalMinor, aprBps, termMonths);
	const aff = affordability(
		grossAnnualIncomeMinor,
		0,
		monthlyCommitmentsMinor,
		payment,
		aprBps,
		termMonths
	);

	if (ltv > 9500) {
		return {
			outcome: 'declined',
			reason:
				'The deposit is below the 5% minimum for this property value. A larger deposit would bring this within range.',
			ltv,
			affordability: aff
		};
	}
	if (!aff.pass) {
		return {
			outcome: 'declined',
			reason:
				'On the figures given, the monthly payment is higher than the affordability guideline allows. A longer term, a larger deposit, or a lower property value would help.',
			ltv,
			affordability: aff
		};
	}
	// A payment up to ~38% of monthly disposable auto-agrees; above that (but still
	// within the 40% affordability gate), or a high LTV / self-employed income, refers
	// to an underwriter rather than declining.
	if (ltv > 9000 || employment === 'self-employed' || aff.ratioBps > 3800) {
		return {
			outcome: 'referred',
			reason:
				employment === 'self-employed'
					? 'This looks affordable. Because the income is self-employed, an underwriter will review the documents before a full offer.'
					: 'This looks affordable, but the loan-to-value or payment ratio means an underwriter will take a closer look before a full offer.',
			ltv,
			affordability: aff
		};
	}
	return {
		outcome: 'agreed',
		reason: 'Agreed in principle. The full offer below sets out the rate, fees and total cost.',
		ltv,
		affordability: aff
	};
}

// ---- Required documents --------------------------------------------------
export interface RequiredDoc {
	id: string;
	label: string;
	hint: string;
}

export const REQUIRED_DOCS: RequiredDoc[] = [
	{ id: 'id', label: 'Photo ID', hint: 'Passport or national ID card' },
	{ id: 'income', label: 'Proof of income', hint: 'Last 3 payslips, or 2 years of accounts' },
	{ id: 'statements', label: 'Bank statements', hint: 'The last 3 months' }
];
