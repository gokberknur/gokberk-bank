// Wallet + pot seeds. Wallet identifiers (IBAN/BIC/openedAt) and the generation
// config are static; the **balances are derived** from the transactions spine
// (see index.ts), never stored independently.

import type { Currency } from './money';
import type { Pot } from './types';
import type { WalletGenConfig } from './transactions';

export interface WalletBlueprint extends WalletGenConfig {
	name: string;
	iban: string;
	bic: string;
	openedAt: string;
}

/** The four wallets the demo user holds. The EUR Main wallet is the home/operating
 *  wallet: it carries the salary + everyday spend (the `primary` gen flag), and the
 *  money engine settles against it (`accounts.home`) — top-up, exchange, cards, pots,
 *  and the EUR-priced brokerage all fund from it. The SEK Stockholm wallet is the
 *  owner's headline account and leads the home + accounts lists (floated by id in
 *  those views), but is not the EUR settlement wallet. */
export const WALLET_BLUEPRINTS: readonly WalletBlueprint[] = [
	{
		id: 'eur-main',
		currency: 'EUR' as Currency,
		name: 'Main',
		iban: 'SE45 5000 0000 0583 9825 7466',
		bic: 'GOKBSESS',
		openedAt: '2023-02-14',
		primary: true,
		targetCurrentMinor: 700_000,
		discretionary: 620
	},
	{
		id: 'usd-travel',
		currency: 'USD' as Currency,
		name: 'Travel',
		iban: 'SE83 1200 0000 0123 4567 8901',
		bic: 'GOKBSESS',
		openedAt: '2024-05-03',
		primary: false,
		targetCurrentMinor: 124_010,
		discretionary: 150
	},
	{
		id: 'gbp-london',
		currency: 'GBP' as Currency,
		name: 'London',
		iban: 'SE50 6002 0000 0987 6543 2109',
		bic: 'GOKBSESS',
		openedAt: '2024-09-21',
		primary: false,
		targetCurrentMinor: 98_040,
		discretionary: 150
	},
	{
		id: 'sek-stockholm',
		currency: 'SEK' as Currency,
		name: 'Stockholm',
		iban: 'SE30 8000 6000 0123 4987 6543',
		bic: 'GOKBSESS',
		openedAt: '2025-01-11',
		primary: false,
		targetCurrentMinor: 1_420_000,
		discretionary: 150
	}
];

/** Savings pots — independent EUR sub-balances with optional goals + round-ups. */
export const POTS: readonly Pot[] = [
	{ id: 'pot-emergency', walletId: 'eur-main', name: 'Emergency fund', currency: 'EUR', balanceMinor: 480_000, goalMinor: 600_000, targetDate: null, roundUps: false, autoSave: { amountMinor: 20_000, frequency: 'monthly', paused: false }, emoji: '🛟' },
	{ id: 'pot-laptop', walletId: 'eur-main', name: 'New laptop', currency: 'EUR', balanceMinor: 92_000, goalMinor: 220_000, targetDate: '2026-12-01', roundUps: true, autoSave: null, emoji: '💻' },
	{ id: 'pot-japan', walletId: 'eur-main', name: 'Japan trip', currency: 'EUR', balanceMinor: 168_000, goalMinor: 400_000, targetDate: '2026-10-15', roundUps: true, autoSave: { amountMinor: 5_000, frequency: 'weekly', paused: false }, emoji: '🗾' }
];
