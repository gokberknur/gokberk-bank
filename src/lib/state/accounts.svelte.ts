// The accounts spine — wallets + pots, read-only for now. Seeded **once** at
// construction from the F03 mock-data layer; not persisted (it re-derives from
// the fixed seed every boot). Balances are computed in F03 (reduced from the
// transactions spine); this singleton just holds the reactive handle the screens
// read. Mutating intents (freeze / open a wallet) arrive with later specs.

import {
	getWallets,
	getPots,
	getNetWorthEurMinor,
	getWalletsTotalEurMinor,
	getPotsTotalEurMinor
} from '$lib/data';
import type { Wallet, Pot } from '$lib/data';

class AccountsState {
	wallets = $state<Wallet[]>(getWallets());
	pots = $state<Pot[]>(getPots());

	/** Net worth (cash) = wallets + pots, in EUR minor units. */
	get netWorthEurMinor(): number {
		return getNetWorthEurMinor();
	}

	/** Total of all wallet available balances, in EUR minor units. */
	get walletsTotalEurMinor(): number {
		return getWalletsTotalEurMinor();
	}

	/** Total of all pots, in EUR minor units. */
	get potsTotalEurMinor(): number {
		return getPotsTotalEurMinor();
	}

	/** The primary EUR home wallet (falls back to the first wallet). */
	get primary(): Wallet {
		return this.wallets.find((w) => w.primary) ?? this.wallets[0];
	}

	/** Find a wallet by id. */
	wallet(id: string): Wallet | undefined {
		return this.wallets.find((w) => w.id === id);
	}
}

export const accounts = new AccountsState();
