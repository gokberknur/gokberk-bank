// Payments runtime state — the send-money draft + payees, and the intent that
// records a real money move on the F03 spine. A send appends a pending OUTFLOW
// (and, for an own-wallet same-currency transfer, a matching pending INFLOW),
// then bumps the shared `revision` signal so balances and the ledger re-flow on
// every surface. Drafts are ephemeral this phase (not persisted) — the wizard
// holds one in memory per visit.
//
// Deferred to later specs: cross-currency FX (exchange + rate disclosure),
// scheduling / standing orders, and SWIFT charge options (OUR/SHA/BEN). Sends
// here are same-currency only; the destination INFLOW is skipped when currencies
// differ.

import {
	getPayees,
	getPayee,
	getWallet,
	getTransactions,
	getPrimaryWallet,
	addPayee as addPayeeData,
	appendTransaction,
	cancelTransaction
} from '$lib/data';
import type { Payee, Transaction } from '$lib/data';
import type { TxnType } from '$lib/data/types';
import { TODAY, isoDate } from '$lib/data/time';
import { revision } from './revision.svelte';

/** Whether the send targets a saved payee or one of my own wallets. */
export type RecipientKind = 'payee' | 'wallet';

/** The in-flight send-money draft (the B4 wizard's working state). */
export interface SendDraft {
	fromWalletId: string;
	recipientKind: RecipientKind;
	payeeId: string | null;
	toWalletId: string | null;
	amountMinor: number;
	reference: string;
}

/** A new payee from the add-payee flow (id + lastUsedAt are assigned on save). */
export type NewPayeeInput = Omit<Payee, 'id' | 'lastUsedAt'>;

/** A fresh draft seeded to send from the EUR operating wallet to a payee. */
function emptyDraft(): SendDraft {
	return {
		fromWalletId: (getWallet('eur-main') ?? getPrimaryWallet()).id,
		recipientKind: 'payee',
		payeeId: null,
		toWalletId: null,
		amountMinor: 0,
		reference: ''
	};
}

/** Lowercase, hyphenated slug of a name (used for a deterministic payee id). */
function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'payee'
	);
}

class PaymentsState {
	// Drafts are ephemeral this phase — kept in memory, never persisted.
	draft = $state<SendDraft>(emptyDraft());

	/** Saved payees / beneficiaries, read fresh so a runtime add reflects. */
	get payees(): Payee[] {
		revision.value;
		return getPayees();
	}

	/** Discard the working draft back to its seeded defaults. */
	resetDraft() {
		this.draft = emptyDraft();
	}

	/** Merge a partial patch into the working draft. */
	setDraft(patch: Partial<SendDraft>) {
		this.draft = { ...this.draft, ...patch };
	}

	/**
	 * Save a new payee. The id is deterministic — a slug of the name plus a
	 * numeric suffix derived from the current payee count (no Math.random/Date.now).
	 */
	addPayee(input: NewPayeeInput): Payee {
		const payee: Payee = {
			...input,
			id: `payee-${slugify(input.name)}-${getPayees().length}`,
			lastUsedAt: null
		};
		addPayeeData(payee);
		revision.bump();
		return payee;
	}

	/**
	 * Record the money move from the current draft: append a pending outflow on the
	 * source wallet (and a matching pending inflow on a same-currency own-wallet
	 * destination), then bump the revision so every surface re-flows. Returns the
	 * new transaction id, or null if the source wallet / recipient can't resolve.
	 */
	executeSend(): { txnId: string } | null {
		const draft = this.draft;
		const from = getWallet(draft.fromWalletId);
		if (!from) return null;

		let name: string;
		let type: TxnType;
		let counterpartyIban: string | undefined;
		let payee: Payee | undefined;

		if (draft.recipientKind === 'payee') {
			payee = getPayee(draft.payeeId!);
			if (!payee) return null;
			name = payee.name;
			type = payee.type === 'sepa' ? 'sepa' : payee.type === 'swift' ? 'swift' : 'transfer';
			counterpartyIban = payee.iban ?? undefined;
		} else {
			const dest = getWallet(draft.toWalletId!);
			if (!dest) return null;
			name = 'To ' + dest.name;
			type = 'transfer';
		}

		const txn: Transaction = {
			id: 'send-' + from.id + '-' + getTransactions().length,
			walletId: from.id,
			date: isoDate(TODAY),
			merchant: name,
			category: 'transfers',
			type,
			status: 'pending',
			amountMinor: -draft.amountMinor,
			currency: from.currency,
			runningBalanceMinor: from.currentMinor,
			reference: draft.reference || 'Transfer',
			counterpartyIban
		};
		appendTransaction(txn);

		// Own-wallet transfer: mirror a pending inflow on the destination when the
		// currencies match (cross-currency FX is deferred).
		if (draft.recipientKind === 'wallet') {
			const dest = getWallet(draft.toWalletId!);
			if (dest && dest.currency === from.currency) {
				const inflow: Transaction = {
					id: 'recv-' + dest.id + '-' + getTransactions().length,
					walletId: dest.id,
					date: isoDate(TODAY),
					merchant: 'From ' + from.name,
					category: 'transfers',
					type: 'transfer',
					status: 'pending',
					amountMinor: draft.amountMinor,
					currency: dest.currency,
					runningBalanceMinor: dest.currentMinor,
					reference: draft.reference || 'Transfer'
				};
				appendTransaction(inflow);
			}
		}

		// Freshen the payee's last-used stamp so it sorts to the top next time.
		if (payee) payee.lastUsedAt = isoDate(TODAY);

		revision.bump();
		return { txnId: txn.id };
	}

	/** Cancel a still-pending send within its window: remove it, restore the hold. */
	cancelSend(txnId: string) {
		cancelTransaction(txnId);
		revision.bump();
	}
}

export const payments = new PaymentsState();
