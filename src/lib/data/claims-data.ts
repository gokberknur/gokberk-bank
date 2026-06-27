// Insurance claims (N03) — the mutable claim records behind the file-a-claim wizard
// and the status tracker. A claim moves Submitted → In review → Decision (approved /
// declined), or is Withdrawn while open. EUR is integer minor units; everything is
// deterministic (seeded dates off TODAY, a hashed reference — no Date.now /
// Math.random). Mock; no backend, no real adjuster. Immutable replacement on every
// mutation so the reactive bridge can diff it.

import { TODAY, isoDate, daysBeforeToday } from './time';
import type { ClaimType } from '$lib/insurance/claim-rules';

export type ClaimStatus = 'submitted' | 'in-review' | 'approved' | 'declined' | 'withdrawn';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
	submitted: 'Submitted',
	'in-review': 'In review',
	approved: 'Approved',
	declined: 'Declined',
	withdrawn: 'Withdrawn'
};

/** The three tracker stages. A claim's progress is `claimStage(status)` of 3. */
export const CLAIM_STAGES = ['Submitted', 'In review', 'Decision'] as const;

/** How many of the three stages a status has reached (1–3); 0 for a withdrawn claim. */
export function claimStage(status: ClaimStatus): number {
	switch (status) {
		case 'submitted':
			return 1;
		case 'in-review':
			return 2;
		case 'approved':
		case 'declined':
			return 3;
		case 'withdrawn':
			return 0;
	}
}

export type EvidenceKind = 'photo' | 'receipt' | 'report' | 'document';

export interface Evidence {
	id: string;
	name: string;
	kind: EvidenceKind;
	/** A human size label, e.g. "1.2 MB" (illustrative). */
	sizeLabel: string;
}

export interface ClaimDoc {
	label: string;
	note: string;
}

export interface Claim {
	id: string;
	reference: string;
	policyId: string;
	type: ClaimType;
	/** ISO date the incident happened. */
	incidentDate: string;
	description: string;
	evidence: Evidence[];
	status: ClaimStatus;
	/** ISO date the claim was filed. */
	filedOn: string;
	/** A clear, no-blame reason once decided (approved or declined). */
	decisionReason?: string;
	/** Decision / evidence documents for the vault. */
	documents: ClaimDoc[];
}

function reference(seed: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return 'CLM-' + (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

// ─── Seeded claims (one in review, one historical approved) ───────────────────
let claims: Claim[] = [
	{
		id: 'clm-1',
		reference: 'CLM-7F2A4C',
		policyId: 'pol-device',
		type: 'damage',
		incidentDate: isoDate(daysBeforeToday(9)),
		description: 'Cracked the screen when my phone slipped off the car seat onto the kerb.',
		evidence: [
			{ id: 'ev-1', name: 'cracked-screen.jpg', kind: 'photo', sizeLabel: '1.8 MB' },
			{ id: 'ev-2', name: 'repair-quote.pdf', kind: 'receipt', sizeLabel: '240 KB' }
		],
		status: 'in-review',
		filedOn: isoDate(daysBeforeToday(7)),
		documents: [{ label: 'Claim summary', note: 'What I filed.' }]
	},
	{
		id: 'clm-0',
		reference: 'CLM-3B91D0',
		policyId: 'pol-travel',
		type: 'cancellation',
		incidentDate: isoDate(daysBeforeToday(95)),
		description: 'Flight cancelled by the airline; rebooked the next day and claimed the extra night.',
		evidence: [{ id: 'ev-3', name: 'hotel-receipt.pdf', kind: 'receipt', sizeLabel: '180 KB' }],
		status: 'approved',
		filedOn: isoDate(daysBeforeToday(88)),
		decisionReason: 'Covered under trip disruption. The extra night was reimbursed to my account.',
		documents: [
			{ label: 'Decision letter', note: 'Why this was approved.' },
			{ label: 'Claim summary', note: 'What I filed.' }
		]
	}
];

let seq = 100;
function nextId(): string {
	seq += 1;
	return `clm-${seq}`;
}

export function getClaims(): Claim[] {
	return claims;
}

export function getClaim(id: string): Claim | undefined {
	return claims.find((c) => c.id === id);
}

export function getClaimsForPolicy(policyId: string): Claim[] {
	return claims.filter((c) => c.policyId === policyId);
}

/** Open claims (still in flight) — for the hub count + the duplicate check. */
export function getOpenClaims(): Claim[] {
	return claims.filter((c) => c.status === 'submitted' || c.status === 'in-review');
}

export interface NewClaim {
	policyId: string;
	type: ClaimType;
	incidentDate: string;
	description: string;
	evidence: Evidence[];
}

/** File a claim — it lands as `submitted` (stage 1) with a deterministic reference. */
export function fileClaim(draft: NewClaim): Claim {
	const id = nextId();
	const claim: Claim = {
		id,
		reference: reference(`${draft.policyId}:${draft.incidentDate}:${draft.type}:${id}`),
		policyId: draft.policyId,
		type: draft.type,
		incidentDate: draft.incidentDate,
		description: draft.description,
		evidence: draft.evidence,
		status: 'submitted',
		filedOn: isoDate(TODAY),
		documents: [{ label: 'Claim summary', note: 'What I filed.' }]
	};
	claims = [claim, ...claims];
	return claim;
}

/** Withdraw an open claim (immutable replacement so rune reads re-flow). */
export function withdrawClaim(id: string): void {
	claims = claims.map((c) => (c.id === id ? { ...c, status: 'withdrawn' as ClaimStatus } : c));
}

export { TODAY };
