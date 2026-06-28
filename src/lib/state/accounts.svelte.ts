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
	getPotsTotalEurMinor,
	getInvestmentsEurMinor,
	addWallet
} from '$lib/data';
import type { Wallet, Pot } from '$lib/data';
import type { Currency } from '$lib/data/money';
import {
	openableCurrencies as openablePure,
	makeIban,
	makeBic
} from '$lib/accounts/open-wallet';
import type { SupportedCurrency } from '$lib/accounts/open-wallet';
import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';

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

	/** EUR value of the brokerage portfolio (market value of open positions). */
	get investmentsEurMinor(): number {
		revision.value;
		return getInvestmentsEurMinor();
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

	/** Currencies I already hold (deduped). */
	get heldCurrencies(): Currency[] {
		revision.value;
		return [...new Set(getWallets().map((w) => w.currency))];
	}

	/** Currencies I can still open (supported minus held) — for the A03 picker. */
	openableCurrencies(): SupportedCurrency[] {
		return openablePure(this.heldCurrencies);
	}

	/** Open a new wallet in `code`, issuing a deterministic mock IBAN/BIC. */
	openWallet(code: Currency): Wallet {
		const seq = getWallets().length;
		const w = addWallet({
			currency: code,
			name: code,
			iban: makeIban(code, seq),
			bic: makeBic(code)
		});
		revision.bump();
		toast(`${code} wallet opened`, { status: 'success' });
		return w;
	}
}

export const accounts = new AccountsState();
