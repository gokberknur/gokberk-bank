// SEPA Direct Debit mandates (P06) — the authorisations that let merchants pull from
// my EUR wallet. Self-contained mock domain (array + getters + mutators, like
// requests/scheduled). A mandate carries its collection history and a next collection;
// "upcoming" is derived. Destructive acts (cancel a mandate, dispute a collection)
// flip status immutably. Dates ISO, money minor units, all anchored near TODAY.

import type { Currency } from './money';
import { TODAY, isoDate, daysBeforeToday } from './time';

export type MandateStatus = 'active' | 'cancelled';
export type CollectionStatus = 'collected' | 'upcoming' | 'disputed';

export interface Collection {
	id: string;
	dateIso: string;
	amountMinor: number;
	status: CollectionStatus;
}

export interface Mandate {
	id: string;
	creditorName: string;
	/** SEPA creditor identifier (mock). */
	creditorId: string;
	/** Mandate reference, masked for display. */
	reference: string;
	walletId: string;
	currency: Currency;
	status: MandateStatus;
	/** Past + present collections, newest first. */
	collections: Collection[];
	/** The next scheduled collection, or null. */
	next: { dateIso: string; amountMinor: number } | null;
}

/** SEPA refund window for an authorised collection — 8 weeks. */
export const REFUND_WINDOW_DAYS = 56;

export type DisputeReason = 'not-authorised' | 'amount-wrong' | 'already-paid' | 'duplicate';

export const DD_DISPUTE_REASONS: { id: DisputeReason; label: string }[] = [
	{ id: 'not-authorised', label: "I didn't authorise this" },
	{ id: 'amount-wrong', label: 'The amount is wrong' },
	{ id: 'already-paid', label: 'I already paid this another way' },
	{ id: 'duplicate', label: 'This is a duplicate' }
];

const TODAY_ISO = isoDate(TODAY);

function past(days: number): string {
	return isoDate(daysBeforeToday(days));
}
function future(days: number): string {
	return isoDate(daysBeforeToday(-days));
}

function mandate(
	id: string,
	creditorName: string,
	creditorId: string,
	ref: string,
	amountMinor: number,
	lastDays: number,
	nextDays: number,
	history: number[]
): Mandate {
	const collections: Collection[] = [
		{ id: `${id}-next`, dateIso: future(nextDays), amountMinor, status: 'upcoming' },
		{ id: `${id}-c0`, dateIso: past(lastDays), amountMinor, status: 'collected' },
		...history.map((d, i) => ({
			id: `${id}-c${i + 1}`,
			dateIso: past(d),
			amountMinor,
			status: 'collected' as CollectionStatus
		}))
	];
	return {
		id,
		creditorName,
		creditorId,
		reference: ref,
		walletId: 'eur-main',
		currency: 'EUR',
		status: 'active',
		collections,
		next: { dateIso: future(nextDays), amountMinor }
	};
}

const mandates: Mandate[] = [
	mandate('dd-folksam', 'Folksam', 'SE94ZZZ8801234567', 'FOLK-••••-2291', 4250, 19, 11, [49, 79]),
	mandate('dd-vattenfall', 'Vattenfall', 'SE51ZZZ5560112233', 'VTF-••••-7740', 8900, 8, 22, [38, 68]),
	mandate('dd-netflix', 'Netflix', 'NL92ZZZ330R0000010000', 'NFLX-••••-0042', 1799, 15, 15, [45, 75]),
	mandate('dd-spotify', 'Spotify', 'SE38ZZZ5567031234', 'SPOT-••••-8810', 1099, 12, 18, [42, 72]),
	mandate('dd-sats', 'SATS', 'SE19ZZZ5564998877', 'SATS-••••-3155', 6900, 5, 25, [35, 65])
];

export function getMandates(): Mandate[] {
	return mandates;
}

export function getMandate(id: string): Mandate | undefined {
	return mandates.find((m) => m.id === id);
}

/** Upcoming collections (next `days`) across active mandates, soonest first. */
export function upcomingCollections(
	days = 30
): { mandateId: string; creditorName: string; dateIso: string; amountMinor: number }[] {
	const limit = isoDate(daysBeforeToday(-days));
	return mandates
		.filter((m) => m.status === 'active' && m.next && m.next.dateIso <= limit && m.next.dateIso >= TODAY_ISO)
		.map((m) => ({
			mandateId: m.id,
			creditorName: m.creditorName,
			dateIso: m.next!.dateIso,
			amountMinor: m.next!.amountMinor
		}))
		.sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
}

/** Is a collection still inside the SEPA refund window? */
export function withinRefundWindow(collectionDateIso: string): boolean {
	const cutoff = isoDate(daysBeforeToday(REFUND_WINDOW_DAYS));
	return collectionDateIso >= cutoff;
}

function patch(id: string, p: Partial<Mandate>): void {
	const i = mandates.findIndex((m) => m.id === id);
	if (i !== -1) mandates[i] = { ...mandates[i], ...p };
}

/** Cancel a mandate — it stops authorising future collections; drop the next one. */
export function cancelMandate(id: string): void {
	patch(id, { status: 'cancelled', next: null });
}

/** Flag a specific collection as disputed (under review). */
export function disputeCollection(mandateId: string, collectionId: string): void {
	const m = getMandate(mandateId);
	if (!m) return;
	patch(mandateId, {
		collections: m.collections.map((c) =>
			c.id === collectionId ? { ...c, status: 'disputed' } : c
		)
	});
}
