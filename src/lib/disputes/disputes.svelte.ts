// Card-dispute (chargeback) runtime state (S02) — the raise-a-dispute wizard's
// working state, the resolution-tracker reads, and the withdraw mutation, over the
// pure dispute layers (`$lib/disputes/dispute-rules` for the honest eligibility +
// branching, `$lib/data/disputes-data` for the mutable case records). Like the rest
// of the spine this is **revision-reactive**: every getter that reads the disputes/
// transactions spine touches `revision.value` to take a dependency on the shared
// signal, and every mutation (`fileDispute`, `withdrawDispute`) calls `revision.bump()`
// so the hub count, the tracker, and the transaction views all re-flow at once.
// Deterministic — no Date.now / Math.random / argless `new Date()`; the size labels
// and ids derive only from what the user typed.
//
// The five-step wizard rides the F05 composite (`createWizard`): `wizard.data` IS the
// `$state` draft (fields write into it directly), and the steps declare their own
// forward-gating validators. The eligibility check on the charge step is a hard gate
// (a charge outside the window or already disputed can't be raised here); merchant-
// first is the softer, in-flow gate — informative, asking once whether the merchant
// was tried, never blaming.

import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
import type { StepDef } from '$lib/components/wizard/types';
import {
	checkEligibility,
	getsProvisionalCredit,
	needsMerchantFirst
} from '$lib/disputes/dispute-rules';
import type { DisputeReason, Eligibility } from '$lib/disputes/dispute-rules';
import {
	getTransactionById,
	getDispute,
	getDisputes,
	getDisputesForTransaction,
	getOpenDisputes,
	fileDispute,
	withdrawDispute,
	disputeStage
} from '$lib/data/disputes-data';
import type { Dispute, DisputeStatus } from '$lib/data/disputes-data';
import type { Evidence, EvidenceKind } from '$lib/data/claims-data';
import type { Transaction } from '$lib/data/types';
import { getTransactions } from '$lib/data/index';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';

// Re-export the pure types/labels the S02 surface is authored against, so it imports
// everything it needs from this one runtime module.
export type { DisputeReason } from '$lib/disputes/dispute-rules';
export type { Dispute, DisputeStatus } from '$lib/data/disputes-data';
export type { Evidence, EvidenceKind } from '$lib/data/claims-data';

// Re-export the label/stage lookups too, so surfaces read labels from this one
// module instead of reaching into the data/rules layers directly.
export { DISPUTE_REASON_LABELS, DISPUTE_REASON_HINTS } from '$lib/disputes/dispute-rules';
export { DISPUTE_STATUS_LABELS, DISPUTE_STAGES } from '$lib/data/disputes-data';

/** The in-flight dispute draft (the S02 wizard's working state; persisted as a draft). */
export interface DisputeData {
	/** The charge being disputed (a `Transaction.id`). */
	transactionId: string;
	/** Why the charge is disputed — '' until the user picks a reason. */
	reason: DisputeReason | '';
	/** The user's free-text account of the problem. */
	statement: string;
	/** Did they contact the merchant first? Only relevant for not-received / faulty. */
	contactedMerchant: boolean | null;
	/** The (simulated) attached evidence files. */
	evidence: Evidence[];
}

/** The flow id — completes the wizard's `gok-bank-wizard-<flowId>` draft key. */
const FLOW_ID = 'dispute';

/** A fresh, empty dispute draft — a new object each call so resets never share state. */
function emptyDispute(): DisputeData {
	return {
		transactionId: '',
		reason: '',
		statement: '',
		contactedMerchant: null,
		evidence: []
	};
}

/**
 * The five wizard steps (ids double as the `[step]` URL segments). Back never
 * validates (the store enforces that); these only run on Continue, in the user's
 * first-person, no-blame voice. The `transaction` step is the real gate: it requires
 * a charge, then runs the eligibility check and blocks (with its honest reason) if the
 * charge can't be disputed. The `details` step asks the merchant-first question once,
 * but only for the reasons where it matters.
 */
const DISPUTE_STEPS: StepDef<DisputeData>[] = [
	{
		id: 'transaction',
		title: 'The charge',
		validate: (d) => {
			if (!d.transactionId) return 'Pick the charge I want to dispute.';
			const txn = getTransactionById(d.transactionId);
			if (!txn) return 'Pick the charge I want to dispute.';
			const elig = checkEligibility(txn, getDisputes());
			if (!elig.eligible) return elig.reason ?? 'This charge can’t be disputed.';
			return true;
		}
	},
	{
		id: 'reason',
		title: 'What went wrong',
		validate: (d) => (d.reason ? true : 'Choose what went wrong.')
	},
	{
		id: 'details',
		title: 'Tell me more',
		validate: (d) => {
			if (!d.statement.trim()) return 'Tell me what happened.';
			if (d.reason && needsMerchantFirst(d.reason) && d.contactedMerchant === null) {
				return "Let me know whether I've contacted the merchant first.";
			}
			return true;
		}
	},
	{
		id: 'evidence',
		title: 'Add evidence'
		// Evidence is optional — nothing to gate.
	},
	{
		id: 'review',
		title: 'Review & submit'
		// The final step's Continue is the flow's submit; no validation to advance.
	}
];

/**
 * The S02 disputes state — the wizard draft + the derivations the raise flow reads, the
 * evidence mutators, the terminal `submit`, and the tracker reads/withdraw. The flow
 * surface drives the wizard through `disputes.wizard` and reads `disputes.wizard.data`
 * for the fields; everything that touches the data spine flows through here.
 */
class DisputesState {
	/** The raise-a-dispute wizard store — the Wizard.svelte shell drives the flow through this. */
	wizard = createWizard<DisputeData>({
		flowId: FLOW_ID,
		persist: true,
		steps: DISPUTE_STEPS,
		initialData: emptyDispute()
	});

	// ── Raise-flow derivations (revision-reactive over the transactions/disputes spine) ──

	/** The charge the draft is disputing, or undefined until one is chosen. */
	transaction(): Transaction | undefined {
		revision.value;
		return getTransactionById(this.wizard.data.transactionId);
	}

	/**
	 * The live eligibility check for the drafted charge, or null until one is set (or the
	 * id no longer resolves). Drives the honest gate on the charge step + the surface note.
	 */
	eligibility(): Eligibility | null {
		revision.value;
		const txn = getTransactionById(this.wizard.data.transactionId);
		if (!txn) return null;
		return checkEligibility(txn, getDisputes());
	}

	/**
	 * The charges a dispute can be raised against — recent settled card outflows that
	 * pass the eligibility check, newest-first, capped to a handful. Powers the picker
	 * when the flow wasn't pre-filled from a transaction.
	 */
	disputableTransactions(): Transaction[] {
		revision.value;
		const existing = getDisputes();
		return getTransactions()
			.filter((t) => t.type === 'card' && t.amountMinor < 0 && t.status === 'settled')
			.filter((t) => checkEligibility(t, existing).eligible)
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, 12);
	}

	/** Whether the chosen reason should normally go to the merchant first (false until set). */
	needsMerchantFirst(): boolean {
		const r = this.wizard.data.reason;
		return r ? needsMerchantFirst(r) : false;
	}

	/** Whether the chosen reason qualifies for a provisional credit (false until set). */
	getsProvisionalCredit(): boolean {
		const r = this.wizard.data.reason;
		return r ? getsProvisionalCredit(r) : false;
	}

	/** The provisional credit to apply on raise, in minor units (0 if it doesn't qualify). */
	provisionalCreditMinor(): number {
		const txn = this.transaction();
		return this.getsProvisionalCredit() && txn ? Math.abs(txn.amountMinor) : 0;
	}

	// ── Entry from a transaction (A05) ──

	/**
	 * Open the flow pre-filled from a specific charge — resets to a fresh draft, then
	 * seeds the charge so the user lands past the picker with the right transaction set.
	 */
	startFor(transactionId: string): void {
		this.resetDispute();
		this.wizard.data = { ...emptyDispute(), transactionId };
	}

	// ── Evidence (immutable replacement on the draft's evidence list) ──

	/**
	 * Attach a (simulated) evidence file. The id and size label are deterministic —
	 * the id from the file's position + name, the size a stable function of the name
	 * length (no Date.now / Math.random); nothing real is uploaded.
	 */
	addEvidence(name: string, kind: EvidenceKind): void {
		const data = this.wizard.data;
		const sizeLabel = `${(name.length % 9) + 1}.${name.length % 10} MB`;
		const item: Evidence = {
			id: 'dv-' + (data.evidence.length + 1) + '-' + name,
			name,
			kind,
			sizeLabel
		};
		data.evidence = [...data.evidence, item];
	}

	/** Remove one attached evidence file by id (immutable replacement). */
	removeEvidence(id: string): void {
		const data = this.wizard.data;
		data.evidence = data.evidence.filter((e) => e.id !== id);
	}

	// ── Submit (the terminal commit) ──

	/**
	 * Raise the dispute. Guards the draft has a charge + a reason (the wizard's
	 * validators already enforce these, but the commit double-checks) → throws if not.
	 * Files the dispute on the data spine (it lands `raised`, stage 1, with a
	 * deterministic reference and any provisional credit), bumps the revision, toasts
	 * the reference, and resets the wizard draft so the flow starts clean. Returns it.
	 */
	submit(): Dispute {
		const d = this.wizard.data;
		if (!d.transactionId || !d.reason) {
			throw new Error('A dispute needs a charge and a reason.');
		}
		const dispute = fileDispute({
			transactionId: d.transactionId,
			reason: d.reason,
			statement: d.statement,
			contactedMerchant: d.contactedMerchant,
			evidence: d.evidence,
			provisionalCreditMinor: this.provisionalCreditMinor()
		});
		revision.bump();
		toast(`Dispute ${dispute.reference} raised`, { status: 'success' });
		this.resetDispute();
		return dispute;
	}

	/**
	 * Reset the wizard back to a fresh draft at step 0 — clears the persisted draft,
	 * re-seeds `data`, and resets the visited/error state. (The wizard store has no
	 * `reset()`; this mirrors the claims flow's `resetClaim()`.)
	 */
	resetDispute(): void {
		this.wizard.clearDraft();
		this.wizard.currentIndex = 0;
		this.wizard.data = emptyDispute();
		this.wizard.visited = this.wizard.steps.map((_, i) => i === 0);
		this.wizard.error = null;
	}

	// ── List reads (the hub + transaction detail; revision-reactive, newest-first) ──

	/** Every dispute, newest-first — the disputes hub list. */
	allDisputes(): Dispute[] {
		revision.value;
		return getDisputes();
	}

	/** Disputes still in flight (raised / investigating / provisional credit) — hub count + list. */
	openDisputes(): Dispute[] {
		revision.value;
		return getOpenDisputes();
	}

	/** Every dispute raised against one charge — the transaction-detail disputes list. */
	disputesForTransaction(transactionId: string): Dispute[] {
		revision.value;
		return getDisputesForTransaction(transactionId);
	}

	// ── Tracker reads + withdraw ──

	/** One dispute by id, or undefined — for the resolution tracker (revision-reactive). */
	disputeById(id: string): Dispute | undefined {
		revision.value;
		return getDispute(id);
	}

	/** How many of the four tracker stages a status has reached (0 for withdrawn). */
	stage(status: DisputeStatus): number {
		return disputeStage(status);
	}

	/** Withdraw an open dispute — moves it to `withdrawn`, re-flows reads, and announces. */
	withdraw(id: string): void {
		withdrawDispute(id);
		revision.bump();
		toast('Dispute withdrawn', { status: 'neutral' });
	}
}

/** The shared singleton the S02 disputes routes drive. */
export const disputes = new DisputesState();
