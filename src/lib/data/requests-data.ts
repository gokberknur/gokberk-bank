// Payment requests (P07) — ask someone to pay me via a shareable link + QR. No
// money moves when a request is created (the deliberate act is *sharing*), so there
// is no forced-decision dialog. Self-contained mock domain (its own array + getters
// + mutators, like disputes/claims): a deterministic link token per request, seeded
// statuses incl. a paid and a partially-paid one. The engine P08 (split) reuses.

import type { Currency } from './money';
import { isoDate, daysBeforeToday } from './time';

export type RequestStatus = 'open' | 'paid' | 'expired' | 'cancelled';

export interface PaymentRequest {
	id: string;
	amountMinor: number;
	currency: Currency;
	note: string;
	/** Wallet the money would land in. */
	walletId: string;
	/** Deterministic share token (the link path segment). */
	token: string;
	status: RequestStatus;
	createdIso: string;
	/** Optional expiry (ISO), or null for no expiry. */
	expiryIso: string | null;
	/** Let the payer choose how much (an open ask). */
	payerChoosesAmount: boolean;
	/** Who paid (if known), else null. */
	payer: string | null;
	/** Amount received so far (minor units) — supports partial payment. */
	paidMinor: number;
}

/** The base a share link is built on (mock — never resolves to a real endpoint). */
export const REQUEST_LINK_BASE = 'bank.gokberk.se/r';

/** A stable token from the request id (FNV-1a → base36, 8 chars). */
export function tokenFor(id: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36).padStart(7, '0').slice(0, 8);
}

/** The full shareable link for a request (this is also the QR payload). */
export function linkFor(req: PaymentRequest): string {
	return `${REQUEST_LINK_BASE}/${req.token}`;
}

/** Fraction paid (0..1) — for the partial-payment progress. */
export function paidFraction(req: PaymentRequest): number {
	if (req.amountMinor <= 0) return 0;
	return Math.min(1, req.paidMinor / req.amountMinor);
}

export function isPartiallyPaid(req: PaymentRequest): boolean {
	return req.paidMinor > 0 && req.paidMinor < req.amountMinor;
}

function seed(
	id: string,
	amountMinor: number,
	note: string,
	status: RequestStatus,
	createdDaysAgo: number,
	extra: Partial<PaymentRequest> = {}
): PaymentRequest {
	return {
		id,
		amountMinor,
		currency: 'EUR',
		note,
		walletId: 'eur-main',
		token: tokenFor(id),
		status,
		createdIso: isoDate(daysBeforeToday(createdDaysAgo)),
		expiryIso: null,
		payerChoosesAmount: false,
		payer: null,
		paidMinor: status === 'paid' ? amountMinor : 0,
		...extra
	};
}

const requests: PaymentRequest[] = [
	seed('req-dinner', 4500, 'Dinner Tuesday', 'paid', 6, { payer: 'Elif' }),
	seed('req-concert', 8000, 'Concert tickets', 'open', 3, {
		paidMinor: 4000,
		payer: 'Marco (partial)'
	}),
	seed('req-rent', 60000, 'June utilities share', 'open', 1),
	seed('req-gift', 2500, 'Leaving gift for Sara', 'expired', 20, {
		expiryIso: isoDate(daysBeforeToday(6))
	})
];

export function getRequests(): PaymentRequest[] {
	return requests;
}

export function getRequest(id: string): PaymentRequest | undefined {
	return requests.find((r) => r.id === id);
}

export interface RequestDraft {
	amountMinor: number;
	currency: Currency;
	note: string;
	walletId: string;
	expiryIso: string | null;
	payerChoosesAmount: boolean;
}

/** Create a request (status open, nothing paid). Returns it. */
export function createRequest(draft: RequestDraft): PaymentRequest {
	const id = `req-custom-${requests.length}`;
	const req: PaymentRequest = {
		id,
		amountMinor: draft.amountMinor,
		currency: draft.currency,
		note: draft.note,
		walletId: draft.walletId,
		token: tokenFor(id),
		status: 'open',
		createdIso: isoDate(daysBeforeToday(0)),
		expiryIso: draft.expiryIso,
		payerChoosesAmount: draft.payerChoosesAmount,
		payer: null,
		paidMinor: 0
	};
	requests.unshift(req);
	return req;
}

/** Cancel an open request — it withdraws the live link. Immutable replacement. */
export function cancelRequest(id: string): void {
	const i = requests.findIndex((r) => r.id === id);
	if (i === -1) return;
	requests[i] = { ...requests[i], status: 'cancelled' };
}
