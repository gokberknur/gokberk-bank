// Pots / vaults state (A04) — the reactive bridge over the pots data layer. Reads
// touch the shared `revision` signal; every mutation (create, add, withdraw, rule
// change, close) is an immutable replacement in the data layer + a `revision.bump()`
// so the pot grid, the ring, and the wallet balances all re-flow together. Add and
// withdraw are instant reversible internal transfers — optimistic + a toast, never a
// forced-decision dialog. Mirrors the cards / watchlists state idiom.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import {
	getPots,
	getPotsTotalEurMinor,
	getWallets,
	addToPot,
	withdrawFromPot,
	createPot,
	setPotRoundUps,
	setPotAutoSave,
	togglePotAutoSavePause,
	deletePot,
	potRoundUpAccruedMinor
} from '$lib/data';
import type { Pot, PotAutoSave, Wallet } from '$lib/data';
import type { Currency } from '$lib/data/money';
import { formatMoney } from '$lib/format';

export interface PotDraft {
	walletId: string;
	name: string;
	currency: Currency;
	goalMinor: number | null;
	targetDate: string | null;
	roundUps: boolean;
	emoji: string;
}

class PotsState {
	all(): Pot[] {
		revision.value;
		return getPots();
	}

	get(id: string): Pot | undefined {
		revision.value;
		return getPots().find((p) => p.id === id);
	}

	/** EUR value of everything set aside across pots. */
	totalEurMinor(): number {
		revision.value;
		return getPotsTotalEurMinor();
	}

	/** Own wallets — for the create-pot owning-wallet picker and Add headroom. */
	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	walletFor(pot: Pot): Wallet | undefined {
		revision.value;
		return getWallets().find((w) => w.id === pot.walletId);
	}

	/** Spendable headroom in the pot's wallet (the most I can add right now). */
	walletAvailableMinor(pot: Pot): number {
		return this.walletFor(pot)?.availableMinor ?? 0;
	}

	/** Progress 0..1, or null for an open-ended pot (no goal). Capped at 1. */
	pct(pot: Pot): number | null {
		if (pot.goalMinor == null || pot.goalMinor <= 0) return null;
		return Math.min(1, pot.balanceMinor / pot.goalMinor);
	}

	/** Whole-percent for display ("60%"). null for open-ended. */
	pctLabel(pot: Pot): number | null {
		const p = this.pct(pot);
		return p == null ? null : Math.round(p * 100);
	}

	reached(pot: Pot): boolean {
		return pot.goalMinor != null && pot.balanceMinor >= pot.goalMinor;
	}

	/** Remaining to the goal (minor units); 0 if reached or open-ended. */
	toGoMinor(pot: Pot): number {
		if (pot.goalMinor == null) return 0;
		return Math.max(0, pot.goalMinor - pot.balanceMinor);
	}

	roundUpAccrued(id: string): number {
		revision.value;
		return potRoundUpAccruedMinor(id);
	}

	// ── Validation (reward-early) ───────────────────────────────────────────────
	canAdd(pot: Pot, amountMinor: number): boolean {
		return amountMinor > 0 && amountMinor <= this.walletAvailableMinor(pot);
	}

	canWithdraw(pot: Pot, amountMinor: number): boolean {
		return amountMinor > 0 && amountMinor <= pot.balanceMinor;
	}

	// ── Mutations ────────────────────────────────────────────────────────────────
	create(draft: PotDraft): Pot {
		const pot = createPot(draft);
		revision.bump();
		toast(`Created ${pot.name}`, { status: 'success' });
		return pot;
	}

	/** Add money wallet → pot. Returns true on success; toasts either way. */
	add(id: string, amountMinor: number): boolean {
		const pot = this.get(id);
		if (!pot) return false;
		const ok = addToPot(id, amountMinor);
		if (!ok) {
			toast(`That's more than ${this.walletFor(pot)?.name ?? 'my wallet'} has spare`, {
				status: 'warning'
			});
			return false;
		}
		revision.bump();
		const reached = this.reached(this.get(id) ?? pot);
		toast(
			reached
				? `${pot.name} — goal reached 🎉`.replace(' 🎉', '')
				: `Added ${formatMoney(amountMinor, pot.currency)} to ${pot.name}`,
			{ status: 'success' }
		);
		return true;
	}

	/** Withdraw money pot → wallet. Returns true on success; toasts either way. */
	withdraw(id: string, amountMinor: number): boolean {
		const pot = this.get(id);
		if (!pot) return false;
		const ok = withdrawFromPot(id, amountMinor);
		if (!ok) {
			toast(`${pot.name} doesn't hold that much`, { status: 'warning' });
			return false;
		}
		revision.bump();
		toast(`Moved ${formatMoney(amountMinor, pot.currency)} back to my wallet`, {
			status: 'success'
		});
		return true;
	}

	setRoundUps(id: string, on: boolean): void {
		setPotRoundUps(id, on);
		revision.bump();
	}

	setAutoSave(id: string, rule: PotAutoSave | null): void {
		setPotAutoSave(id, rule);
		revision.bump();
		toast(rule ? 'Auto-save updated' : 'Auto-save turned off', { status: 'neutral' });
	}

	toggleAutoSavePause(id: string): void {
		togglePotAutoSavePause(id);
		revision.bump();
		const paused = this.get(id)?.autoSave?.paused;
		toast(paused ? 'Auto-save paused' : 'Auto-save resumed', { status: 'neutral' });
	}

	remove(id: string): void {
		const pot = this.get(id);
		deletePot(id);
		revision.bump();
		toast(pot ? `Closed ${pot.name}` : 'Pot closed', { status: 'neutral' });
	}
}

export const pots = new PotsState();
export type { Pot, PotAutoSave, PotFrequency } from '$lib/data/types';
