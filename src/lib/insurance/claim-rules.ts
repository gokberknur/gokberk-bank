// Claim eligibility rules (N03) — the pure, mock logic behind the incident step's
// honest gating: a reporting window and a duplicate check. Nothing here blocks the
// user; both are *informative* (the wizard lets you proceed with a forced
// acknowledgement) — banks must let a customer file even a late or lookalike claim.
// Deterministic, no Date.now — all dates compare against the fixed `TODAY`.

import { TODAY } from '$lib/data/time';
import type { Policy } from '$lib/data/insurance-data';
import type { Claim } from '$lib/data/claims-data';

/** The kinds of incident a claim can be about. */
export type ClaimType = 'theft' | 'damage' | 'loss' | 'liability' | 'medical' | 'cancellation';

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
	theft: 'Theft',
	damage: 'Damage',
	loss: 'Loss',
	liability: 'Liability',
	medical: 'Medical',
	cancellation: 'Cancellation'
};

/** The incident types that make sense per product — the wizard offers these. A
 *  product not listed falls back to the full set. */
const TYPES_BY_PRODUCT: Record<string, ClaimType[]> = {
	travel: ['theft', 'loss', 'medical', 'cancellation', 'liability'],
	device: ['theft', 'damage', 'loss']
};

export function claimTypesFor(productId: string): ClaimType[] {
	return TYPES_BY_PRODUCT[productId] ?? (Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]);
}

/** A claim must be reported within this many days of the incident. */
export const REPORT_WINDOW_DAYS = 60;

function parseIso(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(aIso: string, bIso: string): number {
	const ms = parseIso(bIso).getTime() - parseIso(aIso).getTime();
	return Math.round(ms / 86_400_000);
}

const todayIso = (): string => {
	const y = TODAY.getFullYear();
	const m = String(TODAY.getMonth() + 1).padStart(2, '0');
	const d = String(TODAY.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};

export interface WindowCheck {
	/** True when the incident date is claimable: within the reporting window, on or
	 *  after the policy start, and not in the future. */
	withinWindow: boolean;
	daysSinceIncident: number;
	windowDays: number;
	/** A specific, no-blame reason when it's outside the window. */
	reason?: string;
}

/**
 * Check an incident date against the policy: it must be on/after the policy start,
 * not in the future, and reported within the window. Returns a plain reason when
 * not — stated as fact, never as an accusation (the UI still lets the user proceed
 * with an acknowledgement).
 */
export function claimWindowCheck(policy: Policy, incidentDateIso: string): WindowCheck {
	const today = todayIso();
	const daysSinceIncident = daysBetween(incidentDateIso, today);

	if (daysBetween(today, incidentDateIso) > 0) {
		return {
			withinWindow: false,
			daysSinceIncident,
			windowDays: REPORT_WINDOW_DAYS,
			reason: 'That date is in the future — I can only claim for something that has already happened.'
		};
	}
	if (daysBetween(policy.startDate, incidentDateIso) < 0) {
		return {
			withinWindow: false,
			daysSinceIncident,
			windowDays: REPORT_WINDOW_DAYS,
			reason: 'That date is before my cover started, so this policy wouldn’t cover it.'
		};
	}
	if (daysSinceIncident > REPORT_WINDOW_DAYS) {
		return {
			withinWindow: false,
			daysSinceIncident,
			windowDays: REPORT_WINDOW_DAYS,
			reason: `It’s been ${daysSinceIncident} days — claims are normally reported within ${REPORT_WINDOW_DAYS}. I can still file, but it may be reviewed more closely.`
		};
	}
	return { withinWindow: true, daysSinceIncident, windowDays: REPORT_WINDOW_DAYS };
}

/**
 * Find an existing *open* claim against the same policy + incident type — a likely
 * duplicate to flag (info, not a block). Withdrawn/declined/approved claims don't
 * count; only one still in flight.
 */
export function findDuplicate(existing: Claim[], policyId: string, type: ClaimType): Claim | undefined {
	return existing.find(
		(c) => c.policyId === policyId && c.type === type && (c.status === 'submitted' || c.status === 'in-review')
	);
}
