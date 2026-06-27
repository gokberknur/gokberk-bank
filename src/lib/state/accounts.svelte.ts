// The accounts spine — wallets + pots. Read fresh from the F03 mock-data layer
// on every access, with a reactive dependency on the shared `revision` signal so
// runtime money moves (a send holds a balance, a cancel restores it) reflect
// across every surface. Not persisted: the spine re-derives from the fixed seed
// every boot, and runtime mutations live only in memory. Balances are computed
// in F03 (reduced from the transactions spine); this singleton just exposes the
// reactive handle the screens read. Freeze / open intents arrive with later specs.

import {
	getWallets,
	getWallet,
	getPots,
	getPrimaryWallet,
	getNetWorthEurMinor,
	getWalletsTotalEurMinor,
	getPotsTotalEurMinor
} from '$lib/data';
import type { Wallet, Pot } from '$lib/data';
import { revision } from './revision.svelte';

class AccountsState {
	/** All wallets, read fresh so runtime balance changes reflect. */
	get wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	/** All savings pots, read fresh. */
	get pots(): Pot[] {
		revision.value;
		return getPots();
	}

	/** Net worth (cash) = wallets + pots, in EUR minor units. */
	get netWorthEurMinor(): number {
		revision.value;
		return getNetWorthEurMinor();
	}

	/** Total of all wallet available balances, in EUR minor units. */
	get walletsTotalEurMinor(): number {
		revision.value;
		return getWalletsTotalEurMinor();
	}

	/** Total of all pots, in EUR minor units. */
	get potsTotalEurMinor(): number {
		revision.value;
		return getPotsTotalEurMinor();
	}

	/** The primary EUR home wallet (falls back to the first wallet). */
	get primary(): Wallet {
		revision.value;
		return getPrimaryWallet();
	}

	/** Find a wallet by id. */
	wallet(id: string): Wallet | undefined {
		revision.value;
		return getWallet(id);
	}
}

export const accounts = new AccountsState();
