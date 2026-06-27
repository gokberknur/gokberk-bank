// The mock-data barrel. Everything is generated **once** at module init from a
// fixed seed, so the financial life is identical on every run and every machine.
// Screens read these typed getters; balances are reduced from the transactions
// spine, never invented.

import { Rng } from './prng';
import { toEur, HOME_CURRENCY } from './money';
import type { Currency } from './money';
import { WALLET_BLUEPRINTS, POTS } from './accounts';
import { generateWalletTxns } from './transactions';
import type { Pot, Transaction, Wallet } from './types';

/** The fixed seed. Change it to regenerate a different (but still stable) life. */
const SEED = 0x9e3779b9;

const rng = new Rng(SEED);

// Generate the spine per wallet (deterministic order: blueprint order), then
// reduce each wallet's settled rows to its balances.
const allTxns: Transaction[] = [];
const wallets: Wallet[] = [];

for (const bp of WALLET_BLUEPRINTS) {
	const rows = generateWalletTxns(rng, bp);
	allTxns.push(...rows);

	// generateWalletTxns back-solves the opening so the settled reduction lands on
	// the target; current is therefore the target, available is current − holds.
	const currentMinor = bp.targetCurrentMinor;
	const holdMinor = rows
		.filter((r) => r.status === 'pending' && r.amountMinor < 0)
		.reduce((s, r) => s - r.amountMinor, 0);

	wallets.push({
		id: bp.id,
		currency: bp.currency,
		name: bp.name,
		currentMinor,
		availableMinor: currentMinor - holdMinor,
		holdMinor,
		iban: bp.iban,
		bic: bp.bic,
		openedAt: bp.openedAt,
		primary: bp.primary
	});
}

// Newest-first across all wallets — the order most screens want.
allTxns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

const pots: Pot[] = POTS.map((p) => ({ ...p }));

// ---- Getters -------------------------------------------------------------

export function getWallets(): Wallet[] {
	return wallets;
}

export function getWallet(id: string): Wallet | undefined {
	return wallets.find((w) => w.id === id);
}

export function getPrimaryWallet(): Wallet {
	return wallets.find((w) => w.primary) ?? wallets[0];
}

export function getPots(): Pot[] {
	return pots;
}

/** All transactions, or just one wallet's, newest-first. */
export function getTransactions(walletId?: string): Transaction[] {
	if (!walletId) return allTxns;
	return allTxns.filter((t) => t.walletId === walletId);
}

/** Home-currency (EUR) value of all wallet available balances at the mock mid-rate. */
export function getWalletsTotalEurMinor(): number {
	return wallets.reduce((s, w) => s + toEur(w.availableMinor, w.currency), 0);
}

/** Home-currency value of all pots. */
export function getPotsTotalEurMinor(): number {
	return pots.reduce((s, p) => s + toEur(p.balanceMinor, p.currency as Currency), 0);
}

/** Net worth (cash) = wallets + pots, in EUR minor units. Investments land later. */
export function getNetWorthEurMinor(): number {
	return getWalletsTotalEurMinor() + getPotsTotalEurMinor();
}

export { HOME_CURRENCY };
export type { Wallet, Pot, Transaction };
