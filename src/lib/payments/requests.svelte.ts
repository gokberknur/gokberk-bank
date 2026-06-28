// Payment requests state (P07) — the reactive bridge over the requests data domain.
// Reads touch `revision`; create/cancel mutate immutably + bump. Creating a request
// moves no money (the deliberate act is sharing the link), so there's no spine here —
// just create → share, and a track list with cancel. Mirrors the cards/watchlists idiom.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { getWallets } from '$lib/data';
import type { Wallet } from '$lib/data';
import {
	getRequests,
	getRequest,
	createRequest,
	cancelRequest,
	linkFor,
	paidFraction,
	isPartiallyPaid
} from '$lib/data/requests-data';
import type { PaymentRequest, RequestDraft, RequestStatus } from '$lib/data/requests-data';

class RequestsState {
	all(): PaymentRequest[] {
		revision.value;
		return getRequests();
	}

	get(id: string): PaymentRequest | undefined {
		revision.value;
		return getRequest(id);
	}

	/** Own wallets — the destination picker in the create wizard. */
	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	/** Count of requests still open (for a header/badge). */
	openCount(): number {
		revision.value;
		return getRequests().filter((r) => r.status === 'open').length;
	}

	link(req: PaymentRequest): string {
		return linkFor(req);
	}

	fraction(req: PaymentRequest): number {
		return paidFraction(req);
	}

	isPartial(req: PaymentRequest): boolean {
		return isPartiallyPaid(req);
	}

	create(draft: RequestDraft): PaymentRequest {
		const req = createRequest(draft);
		revision.bump();
		return req;
	}

	cancel(id: string): void {
		const req = this.get(id);
		cancelRequest(id);
		revision.bump();
		toast(req ? `Cancelled “${req.note}”` : 'Request cancelled', { status: 'neutral' });
	}
}

export const requests = new RequestsState();
export type { PaymentRequest, RequestDraft, RequestStatus };
