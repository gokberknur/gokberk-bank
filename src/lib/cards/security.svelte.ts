// Card security & provisioning state (C04 PIN + C05 add-to-wallet) — the reactive
// bridge over the pure `pin` and `wallet-provisioning` stores. Reads touch the
// shared `revision` signal so a changed PIN or a newly-added wallet reflects on
// the card detail at once; mutations bump it. Mirrors the `cards` state idiom.
// All SIMULATED — no real secure element, no real provisioning.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { cardPin, setPin, pinError, isWeakPin } from './pin';
import {
	provisionedWallets,
	isProvisioned,
	provision,
	canProvision,
	MOBILE_WALLET_LABELS,
	type MobileWallet,
	type ProvisionEligibility
} from './wallet-provisioning';
import type { Card } from '$lib/data/types';

class CardSecurityState {
	// ── PIN ──────────────────────────────────────────────────────────────────
	/** The card's current PIN (reactive — reflects a change). */
	pin(cardId: string): string {
		revision.value;
		return cardPin(cardId);
	}

	/** Validate a candidate new PIN (no-blame message, or null if good). */
	pinError(pin: string): string | null {
		return pinError(pin);
	}

	isWeakPin(pin: string): boolean {
		return isWeakPin(pin);
	}

	/** Commit a changed PIN (after the OTP confirm) + toast. */
	changePin(cardId: string, pin: string): void {
		setPin(cardId, pin);
		revision.bump();
		toast('PIN updated', { status: 'success' });
	}

	// ── Mobile wallets ─────────────────────────────────────────────────────────
	/** Wallets this card is already in (reactive). */
	walletsFor(cardId: string): MobileWallet[] {
		revision.value;
		return provisionedWallets(cardId);
	}

	isProvisioned(cardId: string, wallet: MobileWallet): boolean {
		revision.value;
		return isProvisioned(cardId, wallet);
	}

	canProvision(card: Card): ProvisionEligibility {
		revision.value;
		return canProvision(card);
	}

	/** Provision the card to a wallet (after step-up) + toast. */
	addToWallet(cardId: string, wallet: MobileWallet): void {
		provision(cardId, wallet);
		revision.bump();
		toast(`Added to ${MOBILE_WALLET_LABELS[wallet]}`, { status: 'success' });
	}
}

export const cardSecurity = new CardSecurityState();

export {
	WALLET_OPTIONS,
	MOBILE_WALLET_LABELS,
	DEVICE_NAME,
	DEVICE_PLATFORM,
	type MobileWallet
} from './wallet-provisioning';
