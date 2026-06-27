// Lending runtime state — three concerns over the pure L-series math (the
// `$lib/data/lending` model). All money is integer **minor units** (EUR), every
// rate an effective **APR in basis points**, and every outcome is **deterministic**
// — no `Date.now()`, no `Math.random()`, so the same inputs always yield the same
// numbers, dates, and decisions.
//
//  1. Active loan — a thin reactive face over the seeded `ACTIVE_LOAN`'s servicing
//     status, read fresh for the lending hub (never cached here).
//  2. Personal-loan application (L01) — one ephemeral draft → a live indicative
//     estimate → a synchronous, affordability-driven soft-check decision → a fully
//     disclosed offer → e-sign. Mirrors the invest ticket's draft → preview → place
//     shape: a working draft, a derived preview, a terminal commit.
//  3. Mortgage calculator (L03) — a public, URL-shareable model: seeded inputs →
//     live results ledger → a yearly amortization series for the chart, with a
//     short, stable query scheme so a result can be linked or bookmarked.
//
// Scope note (this slice): nothing here disburses real money or mutates the seed.
// `submitLoan()` only marks the draft signed and hands back a deterministic
// reference id; the active-loan reads stay derived from the fixed seed. Both the
// loan draft and the mortgage inputs are in-memory only — re-seeded every boot,
// never persisted.

import {
	ACTIVE_LOAN,
	loanStatus,
	loanCost,
	personalLoanAprBps,
	affordability,
	amortization,
	ltvBps,
	mortgageRateBps,
	MORTGAGE_BOUNDS
} from '$lib/data/lending';
import type { Loan, LoanStatus, LoanPurpose, Affordability, MortgageRateType } from '$lib/data/lending';
import { TODAY, isoDate } from '$lib/data/time';

// ── L01: the personal-loan application ────────────────────────────────────────

/** Employment status as declared on the finances step. */
export type Employment = 'employed' | 'self-employed' | 'other';

/** The soft-check decision lifecycle. `checking` is a transient the UI can dwell
 *  on; the resolution (`approved` / `referred` / `declined`) is computed now. */
export type LoanDecision = 'idle' | 'checking' | 'approved' | 'referred' | 'declined';

/** The in-flight loan-application draft (the L01 wizard's working state). */
export interface LoanDraft {
	/** Requested amount, EUR minor units. */
	amountMinor: number;
	termMonths: number;
	purpose: LoanPurpose;
	/** Free-text "more options" note. */
	note: string;
	employment: Employment;
	/** Declared gross annual income, EUR minor units. */
	grossAnnualIncomeMinor: number;
	/** Monthly housing cost (rent/mortgage), EUR minor units. */
	monthlyHousingMinor: number;
	/** Existing monthly credit commitments, EUR minor units. */
	monthlyCommitmentsMinor: number;
}

/** The live step-1 estimate — indicative until the soft check confirms the rate. */
export interface LoanEstimate {
	aprBps: number;
	monthlyMinor: number;
	totalRepayableMinor: number;
	totalInterestMinor: number;
}

/** A worked representative example for a fixed reference loan (the regulated
 *  "21.9% APR representative" disclosure, carried at equal weight to the headline). */
export interface RepresentativeExample {
	principalMinor: number;
	termMonths: number;
	aprBps: number;
	monthlyMinor: number;
	totalRepayableMinor: number;
}

/** The fully-disclosed offer ledger shown once the application is approved. */
export interface LoanOffer {
	aprBps: number;
	monthlyMinor: number;
	termMonths: number;
	principalMinor: number;
	totalRepayableMinor: number;
	totalInterestMinor: number;
	/** First instalment date — the 1st of next month, ISO (YYYY-MM-DD). */
	firstPaymentDate: string;
	representativeExample: RepresentativeExample;
}

/** Sensible application defaults so step 1 has a live estimate before any PII. */
function seedLoanDraft(): LoanDraft {
	return {
		amountMinor: 1_000_000, // €10,000
		termMonths: 36,
		purpose: 'consolidation',
		note: '',
		employment: 'employed',
		grossAnnualIncomeMinor: 0,
		monthlyHousingMinor: 0,
		monthlyCommitmentsMinor: 0
	};
}

/** The fixed reference loan behind the representative example: €10,000 / 36 months. */
const REPRESENTATIVE_PRINCIPAL_MINOR = 1_000_000;
const REPRESENTATIVE_TERM_MONTHS = 36;

/** A stable, deterministic application reference from the draft (no randomness). */
function loanReference(draft: LoanDraft): string {
	const basis = `${draft.amountMinor}:${draft.termMonths}:${draft.purpose}`;
	let hash = 0;
	for (let i = 0; i < basis.length; i++) {
		hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
	}
	return 'LN-' + hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

// ── L03: the mortgage calculator ──────────────────────────────────────────────

/** The public mortgage-calculator inputs (no auth, URL-shareable). */
export interface MortgageInputs {
	/** Property value, EUR minor units. */
	propertyMinor: number;
	/** Deposit, EUR minor units. */
	depositMinor: number;
	termYears: number;
	rateType: MortgageRateType;
}

/** The live mortgage results ledger derived from the inputs. */
export interface MortgageResults {
	ltvBps: number;
	aprBps: number;
	monthlyMinor: number;
	totalInterestMinor: number;
	totalRepayableMinor: number;
	/** Borrowed amount = property − deposit, EUR minor units. */
	loanAmountMinor: number;
	/** Deposit as a share of the property value, bps. */
	depositPctBps: number;
	/** Deposit is below the minimum-deposit rule → the UI blocks compute. */
	belowMinDeposit: boolean;
	/** Deposit ≥ property value → invalid, the UI blocks compute. */
	depositGteValue: boolean;
}

/** One year of the mortgage amortization, shaped for a stacked-area / line chart. */
export interface MortgageYear {
	year: number;
	/** Remaining balance at year end, EUR minor units. */
	balanceMinor: number;
	/** Principal repaid across the year, EUR minor units. */
	principalMinor: number;
	/** Interest paid across the year, EUR minor units. */
	interestMinor: number;
}

/** Sensible seeded inputs so the calculator + chart are never empty on first load. */
function seedMortgage(): MortgageInputs {
	return {
		propertyMinor: 35_000_000, // €350,000
		depositMinor: 5_250_000, // €52,500 (15%)
		termYears: 25,
		rateType: 'fixed'
	};
}

/**
 * Read one integer query param, clamped into [min, max] — falling back to
 * `fallback` when the key is missing, empty, or unparseable (so a partial or
 * absent query keeps the current seed rather than clobbering it with 0).
 */
function queryInt(
	params: URLSearchParams,
	key: string,
	min: number,
	max: number,
	fallback: number
): number {
	const raw = params.get(key);
	if (raw === null || raw.trim() === '') return fallback;
	const value = Number(raw);
	if (!Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}

// Short, stable URL keys — the share contract (round-trip safe).
const Q_PROPERTY = 'p';
const Q_DEPOSIT = 'd';
const Q_TERM = 't';
const Q_RATE = 'r';

class LendingState {
	// ── 1. Active loan (servicing summary for the hub) ──

	/** The one seeded active personal loan. */
	get activeLoan(): Loan {
		return ACTIVE_LOAN;
	}

	/** Its live servicing status (balance, next payment, progress) vs TODAY. */
	get activeLoanStatus(): LoanStatus {
		return loanStatus(ACTIVE_LOAN);
	}

	// ── 2. Personal-loan application (L01) ──

	// Ephemeral this phase — one in-memory draft per visit, never persisted.
	loanDraft = $state<LoanDraft>(seedLoanDraft());

	/** The soft-check decision; `idle` until the applicant runs the check. */
	decision = $state<LoanDecision>('idle');

	/** Whether the credit agreement has been e-signed. */
	signed = $state(false);

	/** Merge a partial patch into the working application draft. */
	setLoanDraft(patch: Partial<LoanDraft>) {
		this.loanDraft = { ...this.loanDraft, ...patch };
	}

	/** Reset the whole application back to seed (draft, decision, signature). */
	resetLoanApply() {
		this.loanDraft = seedLoanDraft();
		this.decision = 'idle';
		this.signed = false;
	}

	/**
	 * The live step-1 estimate from the current amount + term: the indicative APR
	 * and the annuity cost it implies. Re-flows on every draft change. "Indicative"
	 * — the rate is only confirmed once the soft check runs.
	 */
	loanEstimate(): LoanEstimate {
		const d = this.loanDraft;
		const aprBps = personalLoanAprBps(d.amountMinor, d.termMonths);
		const cost = loanCost(d.amountMinor, aprBps, d.termMonths);
		return {
			aprBps,
			monthlyMinor: cost.monthlyMinor,
			totalRepayableMinor: cost.totalRepayableMinor,
			totalInterestMinor: cost.totalInterestMinor
		};
	}

	/**
	 * The affordability model for the current draft + estimate — the source for the
	 * decision and the decline/refer reason & alternatives screen (headroom, the
	 * largest affordable loan, the payment-to-disposable ratio).
	 */
	affordabilityResult(): Affordability {
		const d = this.loanDraft;
		const est = this.loanEstimate();
		return affordability(
			d.grossAnnualIncomeMinor,
			d.monthlyHousingMinor,
			d.monthlyCommitmentsMinor,
			est.monthlyMinor,
			est.aprBps,
			d.termMonths
		);
	}

	/**
	 * Run the soft affordability check and resolve to a deterministic outcome NOW.
	 * No timers live in state — the UI may dwell on a brief `checking` pending, but
	 * the result is computed synchronously here from the affordability model:
	 *   • approved — the payment is within the affordable share (`pass`).
	 *   • referred — not a pass, but the payment is ≤ 60% of disposable income
	 *     (`ratioBps ≤ 6000`) and there's positive disposable income → manual review.
	 *   • declined — everything else (no headroom).
	 * The soft search never affects a credit score; that's a UI disclosure, not state.
	 */
	runSoftCheck(): LoanDecision {
		this.decision = 'checking';
		const a = this.affordabilityResult();
		let outcome: LoanDecision;
		if (a.pass) {
			outcome = 'approved';
		} else if (a.ratioBps <= 6000 && a.disposableMinor > 0) {
			outcome = 'referred';
		} else {
			outcome = 'declined';
		}
		this.decision = outcome;
		return outcome;
	}

	/**
	 * The fully-disclosed offer ledger — valid once the decision is `approved`:
	 * confirmed APR, monthly payment, term, principal, total repayable, total cost
	 * of credit, the first-payment date (1st of next month), and a worked
	 * representative example for the fixed reference loan.
	 */
	loanOffer(): LoanOffer {
		const d = this.loanDraft;
		const est = this.loanEstimate();

		const first = new Date(TODAY);
		first.setMonth(first.getMonth() + 1, 1);

		const repAprBps = personalLoanAprBps(REPRESENTATIVE_PRINCIPAL_MINOR, REPRESENTATIVE_TERM_MONTHS);
		const repCost = loanCost(REPRESENTATIVE_PRINCIPAL_MINOR, repAprBps, REPRESENTATIVE_TERM_MONTHS);

		return {
			aprBps: est.aprBps,
			monthlyMinor: est.monthlyMinor,
			termMonths: d.termMonths,
			principalMinor: d.amountMinor,
			totalRepayableMinor: est.totalRepayableMinor,
			totalInterestMinor: est.totalInterestMinor,
			firstPaymentDate: isoDate(first),
			representativeExample: {
				principalMinor: REPRESENTATIVE_PRINCIPAL_MINOR,
				termMonths: REPRESENTATIVE_TERM_MONTHS,
				aprBps: repAprBps,
				monthlyMinor: repCost.monthlyMinor,
				totalRepayableMinor: repCost.totalRepayableMinor
			}
		};
	}

	/**
	 * Mark the credit agreement e-signed and return a deterministic reference id.
	 * NOTE: no real disbursement in this slice — funds move out of band (the UI
	 * states an ETA); this only records the signature + hands back the reference.
	 */
	submitLoan(): string {
		this.signed = true;
		return loanReference(this.loanDraft);
	}

	// ── 3. Mortgage calculator (L03) ──

	// Seeded so the ledger + chart render immediately; in-memory only.
	mortgage = $state<MortgageInputs>(seedMortgage());

	/** Merge a partial patch into the mortgage inputs. */
	setMortgage(patch: Partial<MortgageInputs>) {
		this.mortgage = { ...this.mortgage, ...patch };
	}

	/**
	 * The live results ledger: LTV, the indicative rate it bands into, the monthly
	 * payment, total interest, total repayable, the borrowed amount, the deposit %,
	 * and the two reward-early invalid flags (below the minimum deposit, or deposit
	 * ≥ value). When invalid, the cost figures fall to zero and the UI blocks compute.
	 */
	mortgageResults(): MortgageResults {
		const m = this.mortgage;
		const loanAmountMinor = m.propertyMinor - m.depositMinor;
		const minDepositMinor = Math.round((m.propertyMinor * MORTGAGE_BOUNDS.minDepositBps) / 10000);
		const depositGteValue = m.depositMinor >= m.propertyMinor;
		const belowMinDeposit = m.depositMinor < minDepositMinor;
		const depositPctBps = m.propertyMinor > 0 ? Math.round((m.depositMinor / m.propertyMinor) * 10000) : 0;

		const ltv = ltvBps(m.propertyMinor, m.depositMinor);
		const aprBps = mortgageRateBps(ltv, m.rateType);
		const termMonths = m.termYears * 12;

		// Only price a positive loan; an invalid deposit zeroes the cost (UI blocks).
		const cost =
			loanAmountMinor > 0
				? loanCost(loanAmountMinor, aprBps, termMonths)
				: { monthlyMinor: 0, totalInterestMinor: 0, totalRepayableMinor: 0 };

		return {
			ltvBps: ltv,
			aprBps,
			monthlyMinor: cost.monthlyMinor,
			totalInterestMinor: cost.totalInterestMinor,
			totalRepayableMinor: cost.totalRepayableMinor,
			loanAmountMinor,
			depositPctBps,
			belowMinDeposit,
			depositGteValue
		};
	}

	/**
	 * The mortgage amortization aggregated by year for the F11 chart: each year's
	 * end-of-year remaining balance plus that year's summed principal and interest.
	 * Empty when the inputs are invalid (nothing to plot).
	 */
	mortgageAmortYearly(): MortgageYear[] {
		const m = this.mortgage;
		const loanAmountMinor = m.propertyMinor - m.depositMinor;
		if (loanAmountMinor <= 0) return [];

		const aprBps = mortgageRateBps(ltvBps(m.propertyMinor, m.depositMinor), m.rateType);
		const rows = amortization(loanAmountMinor, aprBps, m.termYears * 12);

		const years: MortgageYear[] = [];
		for (const row of rows) {
			const year = Math.ceil(row.month / 12);
			let bucket = years[year - 1];
			if (!bucket) {
				bucket = { year, balanceMinor: 0, principalMinor: 0, interestMinor: 0 };
				years[year - 1] = bucket;
			}
			bucket.principalMinor += row.principalMinor;
			bucket.interestMinor += row.interestMinor;
			// The last row processed for a year leaves its end-of-year balance.
			bucket.balanceMinor = row.balanceMinor;
		}
		return years;
	}

	/** Serialize the mortgage inputs to a stable URL query string (the share link). */
	mortgageToQuery(): string {
		const m = this.mortgage;
		const params = new URLSearchParams();
		params.set(Q_PROPERTY, String(m.propertyMinor));
		params.set(Q_DEPOSIT, String(m.depositMinor));
		params.set(Q_TERM, String(m.termYears));
		params.set(Q_RATE, m.rateType);
		return params.toString();
	}

	/**
	 * Rehydrate the mortgage inputs from URL params — parse, clamp to bounds, and
	 * apply. Missing or unparseable values keep the current seed; the term clamps to
	 * the mortgage bounds and the rate type falls back to the current one.
	 */
	mortgageFromQuery(params: URLSearchParams) {
		const current = this.mortgage;

		const property = queryInt(params, Q_PROPERTY, 0, Number.MAX_SAFE_INTEGER, current.propertyMinor);
		const deposit = queryInt(params, Q_DEPOSIT, 0, Number.MAX_SAFE_INTEGER, current.depositMinor);
		const termYears = queryInt(
			params,
			Q_TERM,
			MORTGAGE_BOUNDS.minTermYears,
			MORTGAGE_BOUNDS.maxTermYears,
			current.termYears
		);
		const rawRate = params.get(Q_RATE);
		const rateType: MortgageRateType =
			rawRate === 'fixed' || rawRate === 'variable' ? rawRate : current.rateType;

		this.setMortgage({ propertyMinor: property, depositMinor: deposit, termYears, rateType });
	}
}

export const lending = new LendingState();
