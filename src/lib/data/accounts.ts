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

/** The four wallets the demo user holds. EUR Main is the home/primary wallet. */
export const WALLET_BLUEPRINTS: readonly WalletBlueprint[] = [
	{
		id: 'eur-main',
		currency: 'EUR' as Currency,
		name: 'Main',
		iban: 'DE89 3704 0044 0532 0130 00',
		bic: 'GOKBDEB1XXX',
		openedAt: '2023-02-14',
		primary: true,
		targetCurrentMinor: 700_000,
		discretionary: 620
	},
	{
		id: 'usd-travel',
		currency: 'USD' as Currency,
		name: 'Travel',
		iban: 'DE44 5001 0517 5407 3249 31',
		bic: 'GOKBDEB1XXX',
		openedAt: '2024-05-03',
		primary: false,
		targetCurrentMinor: 124_010,
		discretionary: 150
	},
	{
		id: 'gbp-london',
		currency: 'GBP' as Currency,
		name: 'London',
		iban: 'DE12 5001 0517 0648 4898 90',
		bic: 'GOKBDEB1XXX',
		openedAt: '2024-09-21',
		primary: false,
		targetCurrentMinor: 98_040,
		discretionary: 150
	},
	{
		id: 'sek-stockholm',
		currency: 'SEK' as Currency,
		name: 'Stockholm',
		iban: 'DE71 5001 0517 9876 5432 10',
		bic: 'GOKBDEB1XXX',
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
