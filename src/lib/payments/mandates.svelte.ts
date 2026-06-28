// Direct-debit mandates state (P06) — the reactive bridge over the mandates domain.
// Reads touch `revision`; cancel/dispute mutate immutably + bump. This surface is
// about visibility and control: the destructive acts (cancel a mandate, dispute a
// collection) are gated by a forced-decision in the UI. Mirrors the other domains.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import {
	getMandates,
	getMandate,
	upcomingCollections,
	withinRefundWindow,
	cancelMandate,
	disputeCollection,
	DD_DISPUTE_REASONS
} from '$lib/data/mandates-data';
import type { Mandate, Collection, DisputeReason } from '$lib/data/mandates-data';

class MandatesState {
	list(): Mandate[] {
		revision.value;
		return getMandates();
	}

	/** Active mandates — what authorises a pull right now. */
	active(): Mandate[] {
		revision.value;
		return getMandates().filter((m) => m.status === 'active');
	}

	get(id: string): Mandate | undefined {
		revision.value;
		return getMandate(id);
	}

	/** Upcoming collections (next 30 days) across active mandates. */
	upcoming(days = 30) {
		revision.value;
		return upcomingCollections(days);
	}

	/** Sum of the next 30 days of collections (the near-term outflow). */
	upcomingTotalMinor(days = 30): number {
		return this.upcoming(days).reduce((s, c) => s + c.amountMinor, 0);
	}

	withinRefundWindow(dateIso: string): boolean {
		return withinRefundWindow(dateIso);
	}

	reasons() {
		return DD_DISPUTE_REASONS;
	}

	cancel(id: string): void {
		const m = this.get(id);
		cancelMandate(id);
		revision.bump();
		toast(m ? `Cancelled ${m.creditorName} mandate` : 'Mandate cancelled', { status: 'neutral' });
	}

	dispute(mandateId: string, collectionId: string, _reason: DisputeReason): void {
		disputeCollection(mandateId, collectionId);
		revision.bump();
		toast('Collection disputed — under review', { status: 'info' });
	}
}

export const mandates = new MandatesState();
export type { Mandate, Collection, DisputeReason } from '$lib/data/mandates-data';
