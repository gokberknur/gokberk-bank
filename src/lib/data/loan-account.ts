// The serviced state of the active personal loan (L02) — the mutable layer over the
// pure `ACTIVE_LOAN` seed. The seed (principal, APR, term, start date) never changes;
// what moves is the **overpaid-ahead-of-schedule** total and the loan's lifecycle
// status. Overpayments knock down the balance; a full settlement marks the loan
// `settling` (held distinct from `closed` until it clears — we never claim a loan is
// closed before the money has cleared). Deterministic, in-memory, mock — no real
// disbursement. Immutable replacement on every mutation so the reactive bridge can
// diff it.

import { ACTIVE_LOAN, loanStatus, type Loan } from './lending';

export type LoanLifecycle = 'active' | 'settling' | 'closed';

export interface ServicedLoan {
	loan: Loan;
	/** Lump sums paid against principal ahead of schedule, EUR minor units. */
	overpaidMinor: number;
	status: LoanLifecycle;
	/** ISO date the settlement was requested (when status left `active`). */
	settledOn: string | null;
}

let serviced: ServicedLoan = {
	loan: ACTIVE_LOAN,
	overpaidMinor: 0,
	status: 'active',
	settledOn: null
};

export function getServicedLoan(): ServicedLoan {
	return serviced;
}

/** Months paid so far on the active loan, derived from the schedule vs TODAY. */
export function paidMonths(): number {
	return loanStatus(serviced.loan).paidMonths;
}

/** Apply a lump overpayment against principal (shortens the term). */
export function applyOverpayment(extraMinor: number): ServicedLoan {
	serviced = { ...serviced, overpaidMinor: serviced.overpaidMinor + Math.max(0, extraMinor) };
	return serviced;
}

/** Settle the loan in full — it moves to `settling` (pending clearance), not closed. */
export function settleLoan(onIso: string): ServicedLoan {
	serviced = { ...serviced, status: 'settling', settledOn: onIso };
	return serviced;
}
