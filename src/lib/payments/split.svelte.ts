// Split-a-bill draft state (P08) — total, people, method, and the per-row shares
// with a live remainder. Reuses the P07 request engine: sending mints one request
// per non-self person for their share. No money leaves my account (I'm collecting),
// so there's no spine here — the deliberate act is sending the requests. All maths
// is integer minor units via split.ts; shares always sum to the total.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { session } from '$lib/state/session.svelte';
import { getWallets, getPayees } from '$lib/data';
import type { Wallet, Payee } from '$lib/data';
import type { Currency } from '$lib/data/money';
import { formatMoney } from '$lib/format';
import { requests } from './requests.svelte';
import type { PaymentRequest } from './requests.svelte';
import {
	splitEqual,
	splitByPercent,
	remainderMinor,
	percentTotal,
	equalRemainderRow
} from './split';
import type { SplitMethod } from './split';

export interface SplitPerson {
	key: string;
	name: string;
	isSelf: boolean;
	payeeId: string | null;
	/** This person's share (minor units) — the canonical per-row value. */
	shareMinor: number;
	/** Percent for percent-mode editing (0..100). */
	pct: number;
}

let seq = 0;
function selfPerson(): SplitPerson {
	return { key: 'self', name: session.name, isSelf: true, payeeId: null, shareMinor: 0, pct: 0 };
}

class SplitState {
	totalMinor = $state(0);
	walletId = $state('eur-main');
	note = $state('');
	method = $state<SplitMethod>('equal');
	people = $state<SplitPerson[]>([selfPerson()]);

	// ── Destination ──────────────────────────────────────────────────────────────
	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}
	wallet(): Wallet | undefined {
		revision.value;
		return getWallets().find((w) => w.id === this.walletId);
	}
	currency(): Currency {
		return (this.wallet()?.currency ?? 'EUR') as Currency;
	}

	/** Payees not already added as people — for the multi-select. */
	availablePayees(): Payee[] {
		revision.value;
		const added = new Set(this.people.map((p) => p.payeeId).filter(Boolean));
		return getPayees().filter((p) => !added.has(p.id));
	}

	// ── People mutations (each reapplies the active method) ───────────────────────
	addPayee(payeeId: string): void {
		const payee = getPayees().find((p) => p.id === payeeId);
		if (!payee || this.people.some((p) => p.payeeId === payeeId)) return;
		this.people = [
			...this.people,
			{ key: `p-${seq++}`, name: payee.name, isSelf: false, payeeId, shareMinor: 0, pct: 0 }
		];
		this.#reapply();
	}

	addByName(name: string): void {
		const clean = name.trim();
		if (!clean) return;
		this.people = [
			...this.people,
			{ key: `p-${seq++}`, name: clean, isSelf: false, payeeId: null, shareMinor: 0, pct: 0 }
		];
		this.#reapply();
	}

	removePerson(key: string): void {
		if (key === 'self') return; // I'm always a payer
		this.people = this.people.filter((p) => p.key !== key);
		this.#reapply();
	}

	// ── Total / wallet / note / method ────────────────────────────────────────────
	setTotal(minor: number): void {
		this.totalMinor = Math.max(0, minor);
		this.#reapply();
	}
	setWallet(id: string): void {
		this.walletId = id;
	}
	setNote(note: string): void {
		this.note = note;
	}
	setMethod(m: SplitMethod): void {
		this.method = m;
		if (m === 'percent') {
			// seed even percentages
			const n = this.people.length;
			const even = n > 0 ? Math.round(100 / n) : 0;
			this.people = this.people.map((p) => ({ ...p, pct: even }));
		}
		this.#reapply();
	}

	/** Amount-mode: set one person's share directly. */
	setShare(key: string, minor: number): void {
		this.people = this.people.map((p) =>
			p.key === key ? { ...p, shareMinor: Math.max(0, minor) } : p
		);
	}

	/** Percent-mode: set one person's percent, recompute all shares from percents. */
	setPct(key: string, pct: number): void {
		const clamped = Math.max(0, Math.min(100, pct));
		const next = this.people.map((p) => (p.key === key ? { ...p, pct: clamped } : p));
		const shares = splitByPercent(this.totalMinor, next.map((p) => p.pct));
		this.people = next.map((p, i) => ({ ...p, shareMinor: shares[i] }));
	}

	/** Recompute shares for equal/percent modes (amount mode keeps user values). */
	#reapply(): void {
		if (this.method === 'equal') {
			const shares = splitEqual(this.totalMinor, this.people.length);
			this.people = this.people.map((p, i) => ({ ...p, shareMinor: shares[i] ?? 0 }));
		} else if (this.method === 'percent') {
			const shares = splitByPercent(this.totalMinor, this.people.map((p) => p.pct));
			this.people = this.people.map((p, i) => ({ ...p, shareMinor: shares[i] ?? 0 }));
		}
		// amount mode: leave shares as the user set them
	}

	// ── Derivations ───────────────────────────────────────────────────────────────
	shares(): number[] {
		return this.people.map((p) => p.shareMinor);
	}
	remainder(): number {
		return remainderMinor(this.totalMinor, this.shares());
	}
	balanced(): boolean {
		return this.totalMinor > 0 && this.remainder() === 0;
	}
	/** The row carrying the equal-split rounding remainder, or -1. */
	roundingRow(): number {
		return this.method === 'equal' ? equalRemainderRow(this.totalMinor, this.people.length) : -1;
	}
	percentTotalValue(): number {
		return percentTotal(this.people.map((p) => p.pct));
	}
	/** Non-self people with a share to request. */
	requestable(): SplitPerson[] {
		return this.people.filter((p) => !p.isSelf && p.shareMinor > 0);
	}
	valid(): boolean {
		return this.balanced() && this.requestable().length >= 1;
	}

	// ── Send (mint one P07 request per non-self person) ───────────────────────────
	sendRequests(): PaymentRequest[] | null {
		if (!this.valid()) return null;
		const currency = this.currency();
		const label = this.note.trim() || 'Split';
		const made = this.requestable().map((person) =>
			requests.create({
				amountMinor: person.shareMinor,
				currency,
				note: `${label} · ${person.name}`,
				walletId: this.walletId,
				expiryIso: null,
				payerChoosesAmount: false
			})
		);
		revision.bump();
		const totalRequested = made.reduce((s, r) => s + r.amountMinor, 0);
		toast(
			`Sent ${made.length} ${made.length === 1 ? 'request' : 'requests'} for ${formatMoney(totalRequested, currency)}`,
			{ status: 'success' }
		);
		return made;
	}

	reset(): void {
		this.totalMinor = 0;
		this.note = '';
		this.method = 'equal';
		this.people = [selfPerson()];
	}
}

export const split = new SplitState();
export type { SplitMethod } from './split';
