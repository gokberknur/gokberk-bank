// Credit-line state (L05) — the apply draft + eligibility (Flow A) and the managed
// facility + repayment (Flow B). The apply draft is persisted for resume; the facility
// is the in-memory seed that a repayment mutates. Reads touch `revision`. The e-sign
// step hands off to the shared D02 flow via a minted credit-agreement document.

import { readJSON, writeJSON } from './persist';
import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';
import {
	eligibilityCheck,
	minimumPaymentMinor,
	repayImpact,
	utilisationBps,
	REPRESENTATIVE_APR_BPS
} from '$lib/lending/credit';
import type { CreditEligibility, RepayImpact } from '$lib/lending/credit';
import {
	getCreditFacility,
	getCreditFacilityById,
	repayCredit
} from '$lib/data/credit-line';
import type { CreditFacility } from '$lib/data/credit-line';
import { addDocument, getDocument } from '$lib/data/documents-data';
import { TODAY, isoDate } from '$lib/data/time';
import { formatMoney } from '$lib/format';

const KEY = 'credit-line-application';
const AGREEMENT_DOC_ID = 'doc-credit-agreement';

export interface CreditDraft {
	requestedLimitMinor: number;
	grossAnnualIncomeMinor: number;
	monthlyCommitmentsMinor: number;
	decided: boolean;
}

function emptyDraft(): CreditDraft {
	return {
		requestedLimitMinor: 300000, // €3,000
		grossAnnualIncomeMinor: 7200000, // €72,000
		monthlyCommitmentsMinor: 40000, // €400
		decided: false
	};
}

class CreditLineState {
	// ---- Apply (Flow A) ---------------------------------------------------
	draft = $state<CreditDraft>(readJSON(KEY, emptyDraft()));

	private save() {
		writeJSON(KEY, this.draft);
	}

	patch(change: Partial<CreditDraft>) {
		this.draft = { ...this.draft, ...change };
		this.save();
	}

	get eligibility(): CreditEligibility {
		return eligibilityCheck(
			this.draft.requestedLimitMinor,
			this.draft.grossAnnualIncomeMinor,
			this.draft.monthlyCommitmentsMinor
		);
	}

	runDecision() {
		this.patch({ decided: true });
	}

	resetApplication() {
		this.draft = emptyDraft();
		this.save();
	}

	/** Mint (once) the credit-agreement document → hands the e-sign step to D02. */
	createAgreementDocument(): string {
		if (getDocument(AGREEMENT_DOC_ID)) return AGREEMENT_DOC_ID;
		const e = this.eligibility;
		addDocument({
			id: AGREEMENT_DOC_ID,
			title: 'Credit line agreement',
			category: 'agreement',
			source: 'Flex credit line',
			dateIso: isoDate(TODAY),
			sizeKb: 190,
			signed: false,
			summary: `My revolving credit line agreement: a ${formatMoney(e.offeredLimitMinor, 'EUR')} limit at ${(e.aprBps / 100).toFixed(1)}% APR (variable, representative). The pre-contract terms, the rates, the minimum-payment rule and my 14-day right to withdraw are set out in full.`
		});
		revision.bump();
		return AGREEMENT_DOC_ID;
	}

	// ---- Manage (Flow B) --------------------------------------------------
	get facility(): CreditFacility {
		revision.value;
		return getCreditFacility();
	}

	facilityById(id: string): CreditFacility | undefined {
		revision.value;
		return getCreditFacilityById(id);
	}

	get availableMinor(): number {
		const f = this.facility;
		return Math.max(0, f.limitMinor - f.balanceMinor);
	}

	get utilisationBps(): number {
		const f = this.facility;
		return utilisationBps(f.balanceMinor, f.limitMinor);
	}

	get minimumPaymentMinor(): number {
		return minimumPaymentMinor(this.facility.statementBalanceMinor);
	}

	repayImpact(payMinor: number): RepayImpact {
		return repayImpact(this.facility.statementBalanceMinor, payMinor, this.facility.aprBps);
	}

	/** Apply a repayment (after the forced-decision confirm). */
	commitRepay(amountMinor: number): RepayImpact {
		const impact = this.repayImpact(amountMinor);
		repayCredit(amountMinor);
		revision.bump();
		toast(
			impact.clearsStatement ? 'Statement paid — no interest' : 'Payment made',
			{ status: 'success' }
		);
		return impact;
	}
}

export const creditLine = new CreditLineState();
export { REPRESENTATIVE_APR_BPS };
