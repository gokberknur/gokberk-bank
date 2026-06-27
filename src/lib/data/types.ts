// Shared domain types for the mock-data layer. Money fields are always integer
// **minor units** and named `*Minor`; currencies are ISO codes; dates are ISO
// strings (YYYY-MM-DD) so screens never render bare codes or do float math.

import type { Currency } from './money';

export type TxnType = 'card' | 'sepa' | 'swift' | 'transfer' | 'fee' | 'topup' | 'fx';
export type TxnStatus = 'pending' | 'settled';
export type TxnDirection = 'in' | 'out';

export type Category =
	| 'groceries'
	| 'dining'
	| 'transport'
	| 'shopping'
	| 'utilities'
	| 'housing'
	| 'income'
	| 'transfers'
	| 'entertainment'
	| 'health'
	| 'travel'
	| 'subscriptions'
	| 'fees'
	| 'cash';

export interface Transaction {
	id: string;
	walletId: string;
	/** ISO date (YYYY-MM-DD). */
	date: string;
	merchant: string;
	category: Category;
	type: TxnType;
	status: TxnStatus;
	/** Signed minor units: negative = outflow, positive = inflow. */
	amountMinor: number;
	currency: Currency;
	/** Running settled balance in this wallet after this row (minor units). */
	runningBalanceMinor: number;
	reference: string;
	counterpartyIban?: string;
	notes?: string;
}

export interface Wallet {
	id: string;
	currency: Currency;
	/** Friendly name, e.g. "Main", "Travel". */
	name: string;
	/** Settled/ledger balance (minor units). */
	currentMinor: number;
	/** Spendable now = current − held (minor units). */
	availableMinor: number;
	/** Pending outflow holds (minor units, ≥ 0). */
	holdMinor: number;
	iban: string;
	bic: string;
	/** ISO date the wallet was opened. */
	openedAt: string;
	/** Whether this is the primary EUR home wallet. */
	primary: boolean;
}

export interface Pot {
	id: string;
	name: string;
	currency: Currency;
	/** Saved so far (minor units). */
	balanceMinor: number;
	/** Goal target (minor units), or null for an open-ended pot. */
	goalMinor: number | null;
	/** Whether round-ups feed this pot. */
	roundUps: boolean;
	emoji: string;
}

export type CardType = 'physical' | 'virtual' | 'disposable';
export type CardStatus = 'active' | 'expired';
export type CardNetwork = 'visa' | 'mastercard';
/** Art treatment — the one place colour lives richly (still brand-anchored). */
export type CardDesign = 'ink' | 'mist' | 'forest';

export interface CardControls {
	frozen: boolean;
	/** Per-channel use. */
	online: boolean;
	contactless: boolean;
	atm: boolean;
	/** Daily spend cap in minor units, or null for no limit. */
	dailyLimitMinor: number | null;
	/** The highest limit this card allows (minor units). */
	ceilingMinor: number;
	/** Allowed ISO country codes; empty = anywhere. */
	regions: string[];
	/** The card's home region — pinned, can't be removed. */
	homeRegion: string;
}

export interface Card {
	id: string;
	type: CardType;
	network: CardNetwork;
	design: CardDesign;
	/** Last four digits (the at-a-glance identity). */
	last4: string;
	/** Full grouped PAN, revealed only behind step-up (mock). */
	pan: string;
	cvv: string;
	/** MM/YY. */
	expiry: string;
	/** Embossed name. */
	holder: string;
	/** Linked funding wallet. */
	walletId: string;
	/** Base lifecycle status; the live "Frozen" state comes from `controls.frozen`. */
	status: CardStatus;
	controls: CardControls;
}

export type PayeeType = 'sepa' | 'swift' | 'gok';

export interface Payee {
	id: string;
	/** Account holder / display name. */
	name: string;
	type: PayeeType;
	/** Settlement currency. */
	currency: Currency;
	/** IBAN (SEPA/SWIFT) or null for a gök-user handle payee. */
	iban: string | null;
	/** BIC (required for SWIFT, optional for SEPA). */
	bic: string | null;
	/** ISO country (for SWIFT). */
	country?: string;
	/** gök handle for gok-user payees (e.g. "@lena"). */
	handle?: string;
	/** ISO date last paid, or null if never. */
	lastUsedAt: string | null;
}
