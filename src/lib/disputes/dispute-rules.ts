// Card-dispute (chargeback) eligibility + branching rules (S02) — pure, deterministic,
// mock. Disputing money is stressful and usually follows a scam or error, so every
// gate here is *informative and no-blame*: it explains honestly (window, duplicate,
// merchant-first) and, where it can, offers the right alternative rather than a dead
// end. No Date.now — all dates compare against the fixed `TODAY`.

import { TODAY } from '$lib/data/time';
import type { Transaction } from '$lib/data/types';
import type { Dispute } from '$lib/data/disputes-data';

export type DisputeReason =
	| 'not-recognised'
	| 'duplicate'
	| 'not-received'
	| 'faulty'
	| 'wrong-amount';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
	'not-recognised': "I don't recognise this charge",
	duplicate: 'I was charged more than once',
	'not-received': "I never received the goods or service",
	faulty: 'It was faulty or not as described',
	'wrong-amount': 'I was charged the wrong amount'
};

/** Short one-liners that set the tone per reason (shown under the choice). */
export const DISPUTE_REASON_HINTS: Record<DisputeReason, string> = {
	'not-recognised': 'A charge I didn’t make or authorise.',
	duplicate: 'The same purchase billed two or more times.',
	'not-received': 'I paid, but it never arrived or didn’t happen.',
	faulty: 'It arrived broken, or wasn’t what was described.',
	'wrong-amount': 'The amount billed isn’t what I agreed to.'
};

/** The chargeback window — a charge older than this can’t normally be disputed. */
export const DISPUTE_WINDOW_DAYS = 120;

/** "Not received" / "faulty" cases should normally go to the merchant first. */
export function needsMerchantFirst(reason: DisputeReason): boolean {
	return reason === 'not-received' || reason === 'faulty';
}

/** Clear-cut reasons get a provisional credit while the bank investigates. */
export function getsProvisionalCredit(reason: DisputeReason): boolean {
	return reason === 'not-recognised' || reason === 'duplicate';
}

function parseIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

function daysSince(iso: string): number {
	const today = Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
	return Math.round((today - parseIso(iso).getTime()) / 86_400_000);
}

export interface Eligibility {
	/** True when the charge can be disputed right now. */
	eligible: boolean;
	withinWindow: boolean;
	daysOld: number;
	windowDays: number;
	/** An existing open dispute on this charge, if any (dedupe). */
	alreadyDisputed: boolean;
	/** A specific, no-blame reason + the right alternative when not eligible. */
	reason?: string;
}

/**
 * Can this transaction be disputed? Blocks only on a hard ineligibility — outside the
 * window, or a dispute already open on it. A charge that's still pending, or a refund/
 * inflow, isn't a dispute case and is flagged with a plain reason. Everything else is
 * eligible; softer concerns (merchant-first) are handled later in the flow.
 */
export function checkEligibility(txn: Transaction, existing: Dispute[]): Eligibility {
	const daysOld = daysSince(txn.date);
	const windowDays = DISPUTE_WINDOW_DAYS;
	const alreadyDisputed = existing.some(
		(d) => d.transactionId === txn.id && d.status !== 'withdrawn' && d.status !== 'declined'
	);

	if (alreadyDisputed) {
		return {
			eligible: false,
			withinWindow: daysOld <= windowDays,
			daysOld,
			windowDays,
			alreadyDisputed: true,
			reason: 'I already have a dispute open on this charge — I can track it instead of raising another.'
		};
	}
	if (txn.amountMinor >= 0) {
		return {
			eligible: false,
			withinWindow: true,
			daysOld,
			windowDays,
			alreadyDisputed: false,
			reason: 'This is money coming in, not a charge — there’s nothing to dispute here.'
		};
	}
	if (daysOld > windowDays) {
		return {
			eligible: false,
			withinWindow: false,
			daysOld,
			windowDays,
			alreadyDisputed: false,
			reason: `This charge is ${daysOld} days old — past the ${windowDays}-day dispute window. I can still raise it with support, but it may not qualify for a chargeback.`
		};
	}
	return { eligible: true, withinWindow: true, daysOld, windowDays, alreadyDisputed: false };
}
