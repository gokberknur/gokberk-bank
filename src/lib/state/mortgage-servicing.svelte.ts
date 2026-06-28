// Mortgage servicing state (L04 Flow B) — the active mortgage, its forward
// amortization schedule (for the virtualized table), and the two commitment actions:
// a lump overpayment (with its ERC forced-decision quote) and a rate switch. Reads
// touch `revision`; the commits mutate the in-memory mortgage and reflect everywhere.

import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';
import {
	getMortgage,
	getMortgageById,
	applyMortgageOverpayment,
	switchMortgageRate
} from '$lib/data/mortgage-account';
import type { ServicedMortgage } from '$lib/data/mortgage-account';
import { amortizationAtPayment } from '$lib/data/lending';
import type { AmortRow } from '$lib/data/lending';
import {
	overpayQuote,
	rateSwitchProducts,
	ltvNowBps,
	paidFraction,
	inFixedPeriod
} from '$lib/lending/mortgage-servicing';
import type { OverpayQuote } from '$lib/lending/mortgage-servicing';
import type { MortgageProduct } from '$lib/lending/mortgage';
import { TODAY, isoDate } from '$lib/data/time';

class MortgageServicing {
	get mortgage(): ServicedMortgage {
		revision.value;
		return getMortgage();
	}

	byId(id: string): ServicedMortgage | undefined {
		revision.value;
		return getMortgageById(id);
	}

	get remainingMonths(): number {
		const m = this.mortgage;
		return Math.max(0, m.termMonths - m.monthsElapsed);
	}

	/** Loan-to-value today, in bps (÷100 for %). */
	get ltvNowBps(): number {
		return ltvNowBps(this.mortgage);
	}

	get paidFraction(): number {
		return paidFraction(this.mortgage);
	}

	get inFixedPeriod(): boolean {
		return inFixedPeriod(this.mortgage);
	}

	/** The forward repayment schedule from today (the rows the table windows). Run at
	 *  the contractual level payment so it stays consistent with the summary's monthly
	 *  figure: an overpayment keeps the payment and shortens the term (fewer rows). */
	get schedule(): AmortRow[] {
		revision.value;
		const m = this.mortgage;
		return amortizationAtPayment(m.balanceMinor, m.aprBps, m.monthlyMinor);
	}

	/** ISO date of payment N (1-based) counting from this month. */
	scheduleDateIso(month: number): string {
		const d = new Date(TODAY);
		d.setMonth(d.getMonth() + month);
		return isoDate(d);
	}

	/** The full effect (+ any ERC) of a lump overpayment — drives the forced decision. */
	quoteOverpay(amountMinor: number): OverpayQuote {
		return overpayQuote(this.mortgage, amountMinor);
	}

	/** Apply a lump overpayment (after the ERC forced decision + step-up). */
	commitOverpay(amountMinor: number): OverpayQuote {
		const quote = this.quoteOverpay(amountMinor);
		applyMortgageOverpayment(amountMinor);
		revision.bump();
		toast(
			quote.ercMinor > 0 ? 'Overpayment made — ERC applied' : 'Overpayment made',
			{ status: 'success' }
		);
		return quote;
	}

	get rateSwitchProducts(): MortgageProduct[] {
		revision.value;
		return rateSwitchProducts(this.mortgage);
	}

	/** Switch to a new product — resets the fixed-period end and regenerates the
	 *  schedule via the new monthly payment. */
	commitRateSwitch(product: MortgageProduct) {
		const end = new Date(TODAY);
		end.setFullYear(end.getFullYear() + (product.fixedYears || 0));
		switchMortgageRate({
			aprBps: product.aprBps,
			rateType: product.rateType,
			fixedYears: product.fixedYears,
			fixedEndIso: isoDate(end)
		});
		revision.bump();
		toast(`Switched to ${product.label}`, { status: 'success' });
	}
}

export const mortgageServicing = new MortgageServicing();
