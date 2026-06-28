// Add to Apple / Google Pay (C05) — the pure model behind provisioning a card to
// a mobile wallet. Which card is in which wallet, the device it'd be added to,
// and the eligibility gate (a frozen / expired / cancelled card can't be added).
// All SIMULATED — no real provisioning, no device token leaves the browser. The
// provisioned set is a module map; the state layer bumps the revision so the card
// detail reflects a new wallet immediately.

import type { Card } from '$lib/data/types';

export type MobileWallet = 'apple' | 'google';

export const MOBILE_WALLET_LABELS: Record<MobileWallet, string> = {
	apple: 'Apple Pay',
	google: 'Google Pay'
};

/** The demo device. It's an iPhone, so Apple Pay is the platform-appropriate
 *  wallet; Google Pay is offered but noted as unavailable on this device. */
export const DEVICE_NAME = 'iPhone 16 Pro';
export const DEVICE_PLATFORM: MobileWallet = 'apple';

export interface WalletOption {
	wallet: MobileWallet;
	label: string;
	/** False when this wallet isn't available on the current device. */
	availableOnDevice: boolean;
	unavailableNote?: string;
}

export const WALLET_OPTIONS: WalletOption[] = [
	{ wallet: 'apple', label: MOBILE_WALLET_LABELS.apple, availableOnDevice: true },
	{
		wallet: 'google',
		label: MOBILE_WALLET_LABELS.google,
		availableOnDevice: false,
		unavailableNote: `Not available on ${DEVICE_NAME}.`
	}
];

const provisioned = new Map<string, Set<MobileWallet>>();

export function provisionedWallets(cardId: string): MobileWallet[] {
	return [...(provisioned.get(cardId) ?? [])];
}

export function isProvisioned(cardId: string, wallet: MobileWallet): boolean {
	return provisioned.get(cardId)?.has(wallet) ?? false;
}

/** Add the card to a wallet (mock — issues a device token, here just records it). */
export function provision(cardId: string, wallet: MobileWallet): void {
	const set = provisioned.get(cardId) ?? new Set<MobileWallet>();
	set.add(wallet);
	provisioned.set(cardId, set);
}

export interface ProvisionEligibility {
	eligible: boolean;
	reason?: string;
}

/** A card must be usable to provision it — a frozen, expired, or cancelled card
 *  can't be added to a wallet. */
export function canProvision(card: Card): ProvisionEligibility {
	if (card.status === 'cancelled') return { eligible: false, reason: 'This card was cancelled, so it can’t be added to a wallet.' };
	if (card.status === 'expired') return { eligible: false, reason: 'This card has expired, so it can’t be added to a wallet.' };
	if (card.controls.frozen) return { eligible: false, reason: 'This card is frozen — I’ll unfreeze it first, then add it.' };
	return { eligible: true };
}
