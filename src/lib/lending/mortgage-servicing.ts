// Mortgage servicing math (L04 Flow B) — the early-repayment charge (ERC), what an
// overpayment does (charge, balance, months + interest saved), and the rate-switch
// shelf. Mortgages differ from the personal loan in carrying an ERC while inside the
// fixed period, with an annual ERC-free allowance. Deterministic; dates ISO.

import { remainingSchedule } from './servicing';
import { ltvBps } from '$lib/data/lending';
import { mortgageProducts } from './mortgage';
import type { MortgageProduct } from './mortgage';
import type { ServicedMortgage } from '$lib/data/mortgage-account';
import { TODAY } from '$lib/data/time';

/** The annual ERC-free overpayment allowance — 10% of the outstanding balance. */
export function annualAllowanceMinor(balanceMinor: number): number {
	return Math.round(balanceMinor * 0.1);
}

/** Whole years left in the fixed period (0 once the fix has ended). */
export function remainingFixedYears(fixedEndIso: string): number {
	const end = new Date(fixedEndIso);
	const ms = end.getTime() - TODAY.getTime();
	if (ms <= 0) return 0;
	return ms / (365.25 * 24 * 60 * 60 * 1000);
}

/** The ERC rate (bps) for the charge — 1% per remaining whole fixed year, tapering,
 *  capped at 5%. Zero once outside the fixed period. */
export function ercBps(fixedEndIso: string): number {
	const years = remainingFixedYears(fixedEndIso);
	if (years <= 0) return 0;
	return Math.min(500, Math.ceil(years) * 100);
}

/** Is the mortgage currently inside its fixed period (so an ERC can apply)? */
export function inFixedPeriod(mortgage: ServicedMortgage): boolean {
	return remainingFixedYears(mortgage.fixedEndIso) > 0;
}

/** Loan-to-value today, in bps (balance ÷ current value). */
export function ltvNowBps(mortgage: ServicedMortgage): number {
	return ltvBps(mortgage.propertyValueMinor, mortgage.propertyValueMinor - mortgage.balanceMinor);
}

export interface OverpayQuote {
	amountMinor: number;
	allowanceMinor: number;
	/** The portion of the overpayment exposed to an ERC (above the allowance). */
	ercableMinor: number;
	ercBps: number;
	ercMinor: number;
	/** True when no charge applies (within allowance, or outside the fixed period). */
	withinAllowance: boolean;
	newBalanceMinor: number;
	monthsSaved: number;
	interestSavedMinor: number;
	/** What I pay today: the overpayment plus any ERC. */
	totalCostMinor: number;
}

/** What a lump overpayment does — the ERC (if it breaches the annual allowance inside
 *  the fixed period), the new balance, and the months + interest it saves by keeping
 *  the level payment. */
export function overpayQuote(mortgage: ServicedMortgage, amountMinor: number): OverpayQuote {
	const allowanceMinor = annualAllowanceMinor(mortgage.balanceMinor);
	const charged = inFixedPeriod(mortgage);
	const ercableMinor = charged ? Math.max(0, amountMinor - allowanceMinor) : 0;
	const rateBps = ercBps(mortgage.fixedEndIso);
	const ercMinor = Math.round((ercableMinor * rateBps) / 10000);
	const newBalanceMinor = Math.max(0, mortgage.balanceMinor - amountMinor);

	const before = remainingSchedule(mortgage.balanceMinor, mortgage.aprBps, mortgage.monthlyMinor);
	const after = remainingSchedule(newBalanceMinor, mortgage.aprBps, mortgage.monthlyMinor);

	return {
		amountMinor,
		allowanceMinor,
		ercableMinor,
		ercBps: rateBps,
		ercMinor,
		withinAllowance: ercMinor === 0,
		newBalanceMinor,
		monthsSaved: Math.max(0, before.months - after.months),
		interestSavedMinor: Math.max(0, before.interestMinor - after.interestMinor),
		totalCostMinor: amountMinor + ercMinor
	};
}

/** The products I could switch to — priced on today's balance, remaining term and
 *  current LTV. The product matching my current rate is dropped (nothing to switch). */
export function rateSwitchProducts(mortgage: ServicedMortgage): MortgageProduct[] {
	const remainingMonths = mortgage.termMonths - mortgage.monthsElapsed;
	return mortgageProducts(ltvNowBps(mortgage), mortgage.balanceMinor, remainingMonths).filter(
		(p) => !(p.aprBps === mortgage.aprBps && p.rateType === mortgage.rateType)
	);
}

/** Fraction of the original balance repaid (0–1), for a progress read. */
export function paidFraction(mortgage: ServicedMortgage): number {
	if (mortgage.originalPrincipalMinor <= 0) return 0;
	return Math.min(
		1,
		Math.max(0, (mortgage.originalPrincipalMinor - mortgage.balanceMinor) / mortgage.originalPrincipalMinor)
	);
}
