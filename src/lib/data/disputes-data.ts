// Card disputes / chargebacks (S02) — the mutable case records behind the dispute
// wizard and the resolution tracker. A case moves Raised → Investigating →
// Provisional credit → Resolved (upheld / declined), or is Withdrawn while open.
// EUR is integer minor units; everything is deterministic (seeded off TODAY, a
// hashed reference — no Date.now / Math.random). Mock; no backend, no real card
// network. Provisional credit is shown as a transparent, reversible note and does
// NOT move the real wallet in this slice. Immutable replacement on every mutation.

import { TODAY, isoDate, daysBeforeToday } from './time';
import { getTransactions } from './index';
import type { Transaction } from './types';
import type { DisputeReason } from '$lib/disputes/dispute-rules';
import type { Evidence } from './claims-data';

export type DisputeStatus =
	| 'raised'
	| 'investigating'
	| 'provisional-credit'
	| 'upheld'
	| 'declined'
	| 'withdrawn';

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
	raised: 'Raised',
	investigating: 'Investigating',
	'provisional-credit': 'Provisional credit',
	upheld: 'Resolved — upheld',
	declined: 'Resolved — declined',
	withdrawn: 'Withdrawn'
};

/** The four tracker stages. A case's progress is `disputeStage(status)` of 4. */
export const DISPUTE_STAGES = ['Raised', 'Investigating', 'Provisional credit', 'Resolved'] as const;

/** How many of the four stages a status has reached (1–4); 0 for a withdrawn case. */
export function disputeStage(status: DisputeStatus): number {
	switch (status) {
		case 'raised':
			return 1;
		case 'investigating':
			return 2;
		case 'provisional-credit':
			return 3;
		case 'upheld':
		case 'declined':
			return 4;
		case 'withdrawn':
			return 0;
	}
}

export interface DisputeDoc {
	label: string;
	note: string;
}

export interface Dispute {
	id: string;
	reference: string;
	transactionId: string;
	reason: DisputeReason;
	/** The user's free-text account of the problem. */
	statement: string;
	/** For not-received / faulty: did they contact the merchant first? */
	contactedMerchant: boolean | null;
	evidence: Evidence[];
	status: DisputeStatus;
	/** ISO date the case was raised. */
	raisedOn: string;
	/** Temporary credit applied while investigating, minor units (0 if none). */
	provisionalCreditMinor: number;
	/** A clear, no-blame reason once resolved (upheld / declined). */
	resolutionReason?: string;
	documents: DisputeDoc[];
}

function reference(seed: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return 'DSP-' + (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

/** Look up a transaction by id (the dispute carries only the id). */
export function getTransactionById(id: string): Transaction | undefined {
	return getTransactions().find((t) => t.id === id);
}

/** A representative card charge to seed an in-flight dispute against (deterministic
 *  — the first settled card outflow), so the tracker has something to show. */
function seedCardCharge(): Transaction | undefined {
	return getTransactions().find((t) => t.type === 'card' && t.amountMinor < 0 && t.status === 'settled');
}

// ─── Seeded disputes (one investigating with provisional credit) ──────────────
let disputes: Dispute[] = (() => {
	const charge = seedCardCharge();
	if (!charge) return [];
	return [
		{
			id: 'dsp-1',
			reference: 'DSP-4A2C19',
			transactionId: charge.id,
			reason: 'not-recognised',
			statement: "I don't recognise this charge — I've never used this merchant.",
			contactedMerchant: null,
			evidence: [{ id: 'dv-1', name: 'statement-line.png', kind: 'document', sizeLabel: '320 KB' }],
			status: 'provisional-credit',
			raisedOn: isoDate(daysBeforeToday(5)),
			provisionalCreditMinor: Math.abs(charge.amountMinor),
			documents: [{ label: 'Dispute summary', note: 'What I raised.' }]
		}
	];
})();

let seq = 100;
function nextId(): string {
	seq += 1;
	return `dsp-${seq}`;
}

export function getDisputes(): Dispute[] {
	return disputes;
}

export function getDispute(id: string): Dispute | undefined {
	return disputes.find((d) => d.id === id);
}

export function getDisputesForTransaction(transactionId: string): Dispute[] {
	return disputes.filter((d) => d.transactionId === transactionId);
}

/** Open cases (still in flight) — for the dedupe check + the hub count. */
export function getOpenDisputes(): Dispute[] {
	return disputes.filter(
		(d) => d.status === 'raised' || d.status === 'investigating' || d.status === 'provisional-credit'
	);
}

export interface NewDispute {
	transactionId: string;
	reason: DisputeReason;
	statement: string;
	contactedMerchant: boolean | null;
	evidence: Evidence[];
	/** Provisional credit to apply on raise (0 if the reason doesn't qualify). */
	provisionalCreditMinor: number;
}

/** Raise a dispute — it lands as `raised` (stage 1) with a deterministic reference. */
export function fileDispute(draft: NewDispute): Dispute {
	const id = nextId();
	const dispute: Dispute = {
		id,
		reference: reference(`${draft.transactionId}:${draft.reason}:${id}`),
		transactionId: draft.transactionId,
		reason: draft.reason,
		statement: draft.statement,
		contactedMerchant: draft.contactedMerchant,
		evidence: draft.evidence,
		status: 'raised',
		raisedOn: isoDate(TODAY),
		provisionalCreditMinor: draft.provisionalCreditMinor,
		documents: [{ label: 'Dispute summary', note: 'What I raised.' }]
	};
	disputes = [dispute, ...disputes];
	return dispute;
}

/** Withdraw an open dispute (immutable replacement so rune reads re-flow). */
export function withdrawDispute(id: string): void {
	disputes = disputes.map((d) => (d.id === id ? { ...d, status: 'withdrawn' as DisputeStatus } : d));
}

export { TODAY };
