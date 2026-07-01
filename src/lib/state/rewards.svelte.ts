// Rewards / cashback (M02) runtime state — the quiet loyalty layer and its one
// real money move: redeeming cashback into a wallet. Like the cards/payments
// spines this is **revision-reactive**: every getter touches `revision.value` to
// take a dependency on the shared signal, and every mutation (toggle an offer,
// redeem cashback) calls `revision.bump()` so balances, the offer grid, and the
// history re-flow on every surface at once.
//
// The rewards data layer (`$lib/data/rewards-data`) owns the balance/offers/history
// and mutates them by immutable replacement; redeeming there debits the cashback
// balance. The matching wallet **credit** is recorded on the F03 transactions
// spine via `appendTransaction` (see `redeem()` below).

import {
	getRewardsBalance,
	getOffers,
	getOffer,
	isOfferLive,
	setOfferActivated,
	getRewardsHistory,
	redeemCashback
} from '$lib/data/rewards-data';
import type {
	RewardOffer,
	RewardHistoryEntry,
	RewardsBalance,
	RewardType,
	RewardKind
} from '$lib/data/rewards-data';
import { appendTransaction, getWallet, getTransactions } from '$lib/data';
import type { Transaction } from '$lib/data';
import { TODAY, isoDate } from '$lib/data/time';
import { revision } from './revision.svelte';
import { accounts } from './accounts.svelte';
import { toast } from './toasts.svelte';

export type { RewardOffer, RewardHistoryEntry, RewardsBalance, RewardType, RewardKind };

/** The in-flight redeem-cashback draft (ephemeral — the redeem sheet's working state). */
export interface RedeemDraft {
	amountMinor: number;
	destinationWalletId: string;
}

/** A preview of the redeem before I commit it — what's available and whether it's valid. */
export interface RedeemPreview {
	amountMinor: number;
	availableMinor: number;
	/** Too much, or nothing, to redeem. */
	insufficient: boolean;
	destinationLabel: string;
}

/** A fresh redeem draft: nothing entered yet, targeting my primary EUR wallet. */
function emptyRedeemDraft(): RedeemDraft {
	return { amountMinor: 0, destinationWalletId: accounts.home.id };
}

class RewardsState {
	/** The redeem sheet's working draft — ephemeral, never persisted. */
	redeemDraft = $state<RedeemDraft>(emptyRedeemDraft());

	/** My cashback + points balance, read fresh so a redeem reflects. */
	get balance(): RewardsBalance {
		revision.value;
		return getRewardsBalance();
	}

	/** The merchant offer grid, read fresh so an activation toggle reflects. */
	get offers(): RewardOffer[] {
		revision.value;
		return getOffers();
	}

	/** Find an offer by id. */
	offer(id: string): RewardOffer | undefined {
		revision.value;
		return getOffer(id);
	}

	/** My earn/redeem history, newest first. */
	get history(): RewardHistoryEntry[] {
		revision.value;
		return getRewardsHistory();
	}

	/** Whether an offer is within its validity window. */
	isLive(o: RewardOffer): boolean {
		return isOfferLive(o);
	}

	/** Flip an offer's activation, bump, toast (reversible feel), return the new state. */
	toggleOffer(id: string): boolean {
		const offer = getOffer(id);
		if (!offer) return false;
		const activated = setOfferActivated(id, !offer.activated);
		revision.bump();
		toast(activated ? 'Offer activated — earning now' : 'Offer turned off', {
			status: activated ? 'success' : 'neutral'
		});
		return activated;
	}

	// ---- Redeem flow (the money spine) ---------------------------------------

	/** Open the redeem sheet: seed amount 0, target my primary EUR wallet. */
	openRedeem() {
		this.redeemDraft = emptyRedeemDraft();
	}

	/** Merge a partial patch into the redeem draft. */
	setRedeem(patch: Partial<RedeemDraft>) {
		this.redeemDraft = { ...this.redeemDraft, ...patch };
	}

	/** Discard the redeem draft back to its seeded defaults. */
	resetRedeem() {
		this.redeemDraft = emptyRedeemDraft();
	}

	/** The destination wallet's friendly name (falls back to "Main"). */
	#destinationLabel(): string {
		return getWallet(this.redeemDraft.destinationWalletId)?.name ?? 'Main';
	}

	/**
	 * Preview the redeem: the amount, what's available (my cashback balance), and
	 * whether it's invalid (more than available, or nothing entered).
	 */
	redeemPreview(): RedeemPreview {
		revision.value;
		const amountMinor = this.redeemDraft.amountMinor;
		const availableMinor = getRewardsBalance().cashbackBalanceMinor;
		return {
			amountMinor,
			availableMinor,
			insufficient: amountMinor > availableMinor || amountMinor <= 0,
			destinationLabel: this.#destinationLabel()
		};
	}

	/**
	 * Redeem my cashback into the destination wallet. Guards on the preview, then
	 * does two things: debits the cashback balance + logs the redemption in the
	 * rewards layer, and records the matching wallet **credit** on the F03 spine.
	 * Bumps the revision so balances/history re-flow. Returns the history entry, or
	 * null when the amount is invalid.
	 */
	redeem(): RewardHistoryEntry | null {
		const preview = this.redeemPreview();
		if (preview.insufficient) return null;

		const { amountMinor, destinationLabel } = preview;

		// Debit the cashback balance + append the "redeemed" history row.
		const entry = redeemCashback(amountMinor, destinationLabel);

		// Credit the destination wallet on the F03 transactions spine: a positive
		// EUR inbound top-up row. Categorised `transfers` (an internal money move,
		// not external income), so it stays neutral in the spend/income analytics.
		const wallet = getWallet(this.redeemDraft.destinationWalletId);
		if (wallet) {
			const credit: Transaction = {
				id: 'cashback-' + wallet.id + '-' + getTransactions().length,
				walletId: wallet.id,
				date: isoDate(TODAY),
				merchant: 'Cashback redeemed',
				category: 'transfers',
				type: 'topup',
				status: 'settled',
				amountMinor, // positive → inbound credit
				currency: wallet.currency,
				runningBalanceMinor: wallet.currentMinor + amountMinor,
				reference: 'Cashback to ' + destinationLabel
			};
			appendTransaction(credit);
		}

		revision.bump();
		return entry;
	}
}

export const rewards = new RewardsState();
