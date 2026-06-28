// The cards spine — the wallet of physical / virtual / disposable cards and the
// everyday safety controls on each (freeze, per-channel use, daily limit, region
// allow-list). Read fresh from the F03 mock-data layer on every access, with a
// reactive dependency on the shared `revision` signal so a control change (freeze,
// a channel toggle, a limit edit) reflects across every surface at once.
//
// These mutations are "optimistic" only in the trivial sense: this is a mock with
// no async apply and so no failure path — each setter applies immediately via
// `updateCardControls` and bumps the revision. There is nothing to roll back. A
// real implementation would optimistic-update the UI, then revert on a rejected
// server apply (see C01/C03 — failure rolls back + a gok-alert).

import { getCards, getCard, getCardSpend, getCardSpentToday, updateCardControls } from '$lib/data';
import type { Card, Transaction } from '$lib/data';
import { TODAY, isoDate } from '$lib/data/time';
import { revision } from './revision.svelte';

class CardsState {
	/** All cards, read fresh so a runtime control change reflects. */
	get all(): Card[] {
		revision.value;
		return getCards();
	}

	/** Find a card by id. */
	card(id: string): Card | undefined {
		revision.value;
		return getCard(id);
	}

	/** A card's spend stream (its rows on the linked wallet), read fresh. */
	spend(id: string): Transaction[] {
		revision.value;
		return getCardSpend(id);
	}

	/** Today's settled+pending spend on a card (minor units, positive). */
	spentTodayMinor(id: string): number {
		revision.value;
		return getCardSpentToday(id, isoDate(TODAY));
	}

	/** The live status shown on the hero + tag — frozen overrides the lifecycle. */
	displayStatus(card: Card): 'Active' | 'Frozen' | 'Expired' | 'Cancelled' {
		if (card.status === 'cancelled') return 'Cancelled';
		return card.controls.frozen ? 'Frozen' : card.status === 'expired' ? 'Expired' : 'Active';
	}

	/** True when no payment channel is enabled — the card can't be used. */
	allChannelsOff(card: Card): boolean {
		return !card.controls.online && !card.controls.contactless && !card.controls.atm;
	}

	/** Flip the freeze and return the new frozen state (the caller toasts on it). */
	toggleFreeze(id: string): boolean {
		const card = getCard(id);
		if (!card) return false;
		const frozen = !card.controls.frozen;
		updateCardControls(id, { frozen });
		revision.bump();
		return frozen;
	}

	/** Turn a single payment channel on or off. */
	setChannel(id: string, channel: 'online' | 'contactless' | 'atm', on: boolean): void {
		updateCardControls(id, { [channel]: on });
		revision.bump();
	}

	/** Set the daily spend cap (minor units), clamped to [0, ceiling]; null = no limit. */
	setDailyLimit(id: string, minor: number | null): void {
		const card = getCard(id);
		if (!card) return;
		const dailyLimitMinor =
			minor === null ? null : Math.min(Math.max(minor, 0), card.controls.ceilingMinor);
		updateCardControls(id, { dailyLimitMinor });
		revision.bump();
	}

	/** Clear the daily spend cap ("No daily limit"). */
	clearDailyLimit(id: string): void {
		updateCardControls(id, { dailyLimitMinor: null });
		revision.bump();
	}

	/** Add a country to the allow-list (de-duped; empty list = anywhere). */
	addRegion(id: string, code: string): void {
		const card = getCard(id);
		if (!card) return;
		if (card.controls.regions.includes(code)) return;
		updateCardControls(id, { regions: [...card.controls.regions, code] });
		revision.bump();
	}

	/** Remove a country from the allow-list — never the pinned home region. */
	removeRegion(id: string, code: string): void {
		const card = getCard(id);
		if (!card) return;
		if (code === card.controls.homeRegion) return;
		updateCardControls(id, { regions: card.controls.regions.filter((r) => r !== code) });
		revision.bump();
	}
}

export const cards = new CardsState();
