// The mock-data barrel. Everything is generated **once** at module init from a
// fixed seed, so the financial life is identical on every run and every machine.
// Screens read these typed getters; balances are reduced from the transactions
// spine, never invented.

import { Rng } from './prng';
import { toEur, HOME_CURRENCY } from './money';
import type { Currency } from './money';
import { TODAY, isoDate } from './time';
import { WALLET_BLUEPRINTS, POTS } from './accounts';
import { generateWalletTxns } from './transactions';
import { PAYEES } from './payees';
import { CARDS, deriveCardSpend } from './cards';
import type { Card, Payee, Pot, PotAutoSave, Transaction, Wallet } from './types';

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
const payees: Payee[] = PAYEES.map((p) => ({ ...p }));
const cards: Card[] = CARDS.map((c) => ({ ...c, controls: { ...c.controls, regions: [...c.controls.regions] } }));

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

export function getPayees(): Payee[] {
	return payees;
}

export function getPayee(id: string): Payee | undefined {
	return payees.find((p) => p.id === id);
}

/** Add a runtime payee (from the add-payee flow). Returns the stored payee. */
export function addPayee(payee: Payee): Payee {
	payees.unshift(payee);
	return payee;
}

// ---- Money movement (mutates the in-memory spine + balances) --------------
//
// These are how a flow records a real transfer: a pending row is appended and
// the source wallet's available balance drops by the held amount, so the change
// reflects everywhere a screen reads the data (paired with a reactive bump in
// the state layer). Nothing is persisted — a reload regenerates the seed.

function applyToWallet(t: Transaction, direction: 1 | -1): void {
	const w = wallets.find((x) => x.id === t.walletId);
	if (!w) return;
	if (t.status === 'pending' && t.amountMinor < 0) {
		// A pending outflow is held: available drops, current (settled) unchanged.
		w.holdMinor += direction * -t.amountMinor;
	} else {
		w.currentMinor += direction * t.amountMinor;
	}
	w.availableMinor = w.currentMinor - w.holdMinor;
}

/** Append a (usually pending) transaction and adjust the wallet balance. */
export function appendTransaction(t: Transaction): void {
	allTxns.unshift(t);
	applyToWallet(t, 1);
}

/** Settle a pending transaction: release the hold into the settled balance. */
export function settleTransaction(id: string): void {
	const t = allTxns.find((x) => x.id === id);
	if (!t || t.status !== 'pending') return;
	const w = wallets.find((x) => x.id === t.walletId);
	if (w && t.amountMinor < 0) w.holdMinor -= -t.amountMinor;
	t.status = 'settled';
	if (w) {
		w.currentMinor += t.amountMinor;
		w.availableMinor = w.currentMinor - w.holdMinor;
		t.runningBalanceMinor = w.currentMinor;
	}
}

/** Cancel a pending transaction within its window: remove it, restore the hold. */
export function cancelTransaction(id: string): void {
	const i = allTxns.findIndex((x) => x.id === id);
	if (i === -1) return;
	const t = allTxns[i];
	if (t.status !== 'pending') return;
	applyToWallet(t, -1);
	allTxns.splice(i, 1);
}

// ---- Cards ----------------------------------------------------------------

export function getCards(): Card[] {
	return cards;
}

export function getCard(id: string): Card | undefined {
	return cards.find((c) => c.id === id);
}

/** The card's spend stream (card-type rows on its linked wallet, sliced per card). */
export function getCardSpend(id: string): Transaction[] {
	const card = getCard(id);
	if (!card) return [];
	return deriveCardSpend(
		card,
		allTxns.filter((t) => t.walletId === card.walletId)
	);
}

/** Today's settled+pending card spend on a card (minor units, positive). */
export function getCardSpentToday(id: string, todayIso: string): number {
	return getCardSpend(id)
		.filter((t) => t.date === todayIso && t.amountMinor < 0)
		.reduce((s, t) => s - t.amountMinor, 0);
}

/**
 * Update a card's controls **immutably** — replace the card object (and its
 * controls) with new references. Consumers read the card through a `$derived`
 * (`cards.card(id)`); an in-place mutation returns the same reference, so Svelte
 * would short-circuit the derived chain and the UI (status, frozen art, channel
 * switches) wouldn't update. Swapping the reference makes the change propagate.
 * The state layer still bumps the revision so the `$derived` re-runs.
 */
export function updateCardControls(id: string, patch: Partial<Card['controls']>): void {
	const i = cards.findIndex((c) => c.id === id);
	if (i === -1) return;
	cards[i] = { ...cards[i], controls: { ...cards[i].controls, ...patch } };
}

/** Add a freshly-issued card to the wallet (newest first). The card factory in
 *  `$lib/cards/issuing` builds the object; this just admits it to the spine. */
export function addCard(card: Card): void {
	cards.unshift(card);
}

/** Cancel a card (the lost/stolen + replace path) — it stops working immediately.
 *  Immutable replacement so the `$derived` card view re-runs; frozen so every
 *  channel reads as off too. */
export function cancelCard(id: string): void {
	const i = cards.findIndex((c) => c.id === id);
	if (i === -1) return;
	cards[i] = {
		...cards[i],
		status: 'cancelled',
		controls: { ...cards[i].controls, frozen: true }
	};
}

// ---- Open a wallet (A03) -------------------------------------------------
/** Open a new currency wallet — no money, just a freshly issued (mock) account.
 *  Starts at a zero balance; the caller supplies the deterministic IBAN/BIC. */
export function addWallet(draft: {
	currency: Currency;
	name: string;
	iban: string;
	bic: string;
}): Wallet {
	const w: Wallet = {
		id: `wallet-${draft.currency.toLowerCase()}-${wallets.length}`,
		currency: draft.currency,
		name: draft.name,
		currentMinor: 0,
		availableMinor: 0,
		holdMinor: 0,
		iban: draft.iban,
		bic: draft.bic,
		openedAt: isoDate(TODAY),
		primary: false
	};
	wallets.push(w);
	return w;
}

// ---- Pots (A04) ----------------------------------------------------------
// A pot is a sub-balance of one wallet. Moving money in/out is an instant,
// reversible internal transfer: it's recorded on the wallet via appendTransaction
// (which adjusts the wallet balance for us), and the pot balance is replaced
// immutably so the $derived pot views re-run. No money is invented — the wallet
// gives exactly what the pot receives, and vice-versa.

/** Add (deltaToPot > 0) or withdraw (< 0) against a pot, as a wallet transfer.
 *  Returns false (no-op) if it would overdraw the wallet or the pot. */
function potTransfer(potId: string, deltaToPot: number): boolean {
	const pi = pots.findIndex((p) => p.id === potId);
	if (pi === -1) return false;
	const pot = pots[pi];
	const w = wallets.find((x) => x.id === pot.walletId);
	if (!w) return false;
	const amount = Math.abs(deltaToPot);
	if (amount <= 0) return false;
	if (deltaToPot > 0 && amount > w.availableMinor) return false; // insufficient wallet
	if (deltaToPot < 0 && amount > pot.balanceMinor) return false; // over-withdraw
	const walletDelta = -deltaToPot; // adding to a pot is a wallet outflow
	const txn: Transaction = {
		id: `pot-${potId}-${allTxns.length}`,
		walletId: w.id,
		date: isoDate(TODAY),
		merchant: deltaToPot > 0 ? `To ${pot.name}` : `From ${pot.name}`,
		category: 'transfers',
		type: 'transfer',
		status: 'settled',
		amountMinor: walletDelta,
		currency: w.currency,
		runningBalanceMinor: w.currentMinor + walletDelta,
		reference: pot.name
	};
	appendTransaction(txn); // adjusts the wallet balance
	pots[pi] = { ...pot, balanceMinor: pot.balanceMinor + deltaToPot };
	return true;
}

/** Move money wallet → pot (instant). False if the wallet can't cover it. */
export function addToPot(id: string, amountMinor: number): boolean {
	return potTransfer(id, Math.abs(amountMinor));
}

/** Move money pot → wallet (instant). False if the pot doesn't hold that much. */
export function withdrawFromPot(id: string, amountMinor: number): boolean {
	return potTransfer(id, -Math.abs(amountMinor));
}

/** Create a new pot (starts empty). Returns the created pot. */
export function createPot(draft: {
	walletId: string;
	name: string;
	currency: Currency;
	goalMinor: number | null;
	targetDate: string | null;
	roundUps: boolean;
	emoji: string;
}): Pot {
	const pot: Pot = {
		id: `pot-custom-${pots.length}`,
		walletId: draft.walletId,
		name: draft.name,
		currency: draft.currency,
		balanceMinor: 0,
		goalMinor: draft.goalMinor,
		targetDate: draft.targetDate,
		roundUps: draft.roundUps,
		autoSave: null,
		emoji: draft.emoji
	};
	pots.unshift(pot);
	return pot;
}

function patchPot(id: string, patch: Partial<Pot>): void {
	const i = pots.findIndex((p) => p.id === id);
	if (i === -1) return;
	pots[i] = { ...pots[i], ...patch };
}

export function setPotRoundUps(id: string, on: boolean): void {
	patchPot(id, { roundUps: on });
}

/** Set or clear the recurring auto-save rule. */
export function setPotAutoSave(id: string, rule: PotAutoSave | null): void {
	patchPot(id, { autoSave: rule });
}

/** Pause/resume an existing auto-save rule (no-op if none set). */
export function togglePotAutoSavePause(id: string): void {
	const pot = pots.find((p) => p.id === id);
	if (!pot?.autoSave) return;
	patchPot(id, { autoSave: { ...pot.autoSave, paused: !pot.autoSave.paused } });
}

/** Close a pot. Any balance must be withdrawn first (the UI enforces this). */
export function deletePot(id: string): void {
	const i = pots.findIndex((p) => p.id === id);
	if (i !== -1) pots.splice(i, 1);
}

/** Round-ups accrued for a pot — the spare change (to the nearest €1) on the
 *  owning wallet's recent card spend. Deterministic; 0 if round-ups are off. */
export function potRoundUpAccruedMinor(id: string): number {
	const pot = pots.find((p) => p.id === id);
	if (!pot || !pot.roundUps) return 0;
	return allTxns
		.filter(
			(t) =>
				t.walletId === pot.walletId &&
				t.type === 'card' &&
				t.status === 'settled' &&
				t.amountMinor < 0
		)
		.slice(0, 40)
		.reduce((sum, t) => {
			const abs = -t.amountMinor;
			const up = (100 - (abs % 100)) % 100; // change to the next whole unit
			return sum + up;
		}, 0);
}

// ---- Top-up (P09) --------------------------------------------------------
// Add money to a wallet. An instant (card) top-up settles immediately and raises
// the balance via the normal transaction path. A pending (bank / open-banking)
// top-up is recorded as a pending inflow but deliberately does NOT touch the
// settled or available balance — the money is "processing", shown in activity,
// and would only land when it settles. We never fake the instant.
export function topUp(walletId: string, amountMinor: number, instant: boolean): string | null {
	const w = wallets.find((x) => x.id === walletId);
	if (!w || amountMinor <= 0) return null;
	const id = `topup-${walletId}-${allTxns.length}`;
	const txn: Transaction = {
		id,
		walletId,
		date: isoDate(TODAY),
		merchant: 'Top-up',
		category: 'income',
		type: 'topup',
		status: instant ? 'settled' : 'pending',
		amountMinor,
		currency: w.currency,
		runningBalanceMinor: instant ? w.currentMinor + amountMinor : w.currentMinor,
		reference: 'Top-up'
	};
	if (instant) {
		appendTransaction(txn); // settled inflow → balance rises now
	} else {
		allTxns.unshift(txn); // pending inflow → visible as processing, balance untouched
	}
	return id;
}

export { HOME_CURRENCY };
export type { Wallet, Pot, PotAutoSave, Transaction, Payee, Card };
