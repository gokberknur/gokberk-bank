// Scheduled payments & standing orders state (P05) — the reactive bridge over the
// scheduled-items domain + the schedule maths. Reads touch `revision`; create/pause/
// resume/cancel mutate immutably + bump. Pause is reversible (optimistic + toast);
// cancel is final (the surface gates it behind a forced-decision dialog). Next-run
// and projections are computed here, never stored stale. Mirrors the other domains.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { getWallets, getPayees } from '$lib/data';
import type { Wallet, Payee } from '$lib/data';
import {
	getScheduled,
	getScheduledItem,
	createScheduled,
	pauseScheduled,
	resumeScheduled,
	cancelScheduled
} from '$lib/data/scheduled-data';
import type {
	ScheduledItem,
	ScheduledDraft,
	ScheduledStatus
} from '$lib/data/scheduled-data';
import { nextRun, occurrences, projectedBalance, anyOverdraw } from './schedule';
import type { Frequency, EndRule, ProjectedRun } from './schedule';

/** What the row badge reads — adds a derived 'completed' on top of the stored status. */
export type EffectiveStatus = ScheduledStatus | 'completed';

class ScheduleState {
	list(): ScheduledItem[] {
		revision.value;
		return getScheduled();
	}

	/** Active (not cancelled) items — what the manage table shows by default. */
	active(): ScheduledItem[] {
		revision.value;
		return getScheduled().filter((i) => i.status !== 'cancelled');
	}

	get(id: string): ScheduledItem | undefined {
		revision.value;
		return getScheduledItem(id);
	}

	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}
	payees(): Payee[] {
		revision.value;
		return getPayees();
	}

	walletFor(item: ScheduledItem): Wallet | undefined {
		revision.value;
		return getWallets().find((w) => w.id === item.walletId);
	}

	/** The next run date for an item (computed). */
	nextRunIso(item: ScheduledItem): string {
		return nextRun(item.startIso, item.frequency, undefined);
	}

	/** Upcoming run dates honouring the end rule. */
	upcoming(item: ScheduledItem, limit = 6): string[] {
		return occurrences(item.startIso, item.frequency, item.end, limit);
	}

	/** Effective status for the badge — paused/cancelled as stored, completed when
	 *  nothing's left to run, else scheduled. */
	statusOf(item: ScheduledItem): EffectiveStatus {
		if (item.status === 'cancelled') return 'cancelled';
		if (item.status === 'paused') return 'paused';
		if (this.upcoming(item, 1).length === 0) return 'completed';
		return 'scheduled';
	}

	isPaused(item: ScheduledItem): boolean {
		return item.status === 'paused';
	}

	// ── Projection (for the wizard) ───────────────────────────────────────────────
	project(
		walletId: string,
		amountMinor: number,
		startIso: string,
		freq: Frequency,
		end: EndRule,
		limit = 4
	): ProjectedRun[] {
		const w = getWallets().find((x) => x.id === walletId);
		const runs = occurrences(startIso, freq, end, limit);
		return projectedBalance(w?.availableMinor ?? 0, amountMinor, runs);
	}

	projectionOverdraws(
		walletId: string,
		amountMinor: number,
		startIso: string,
		freq: Frequency,
		end: EndRule
	): boolean {
		return anyOverdraw(this.project(walletId, amountMinor, startIso, freq, end));
	}

	// ── Mutations ────────────────────────────────────────────────────────────────
	create(draft: ScheduledDraft): ScheduledItem {
		const item = createScheduled(draft);
		revision.bump();
		toast(`Scheduled ${item.payeeName}`, { status: 'success' });
		return item;
	}

	pause(id: string): void {
		pauseScheduled(id);
		revision.bump();
		toast('Paused — I can resume it anytime', { status: 'neutral' });
	}

	resume(id: string): void {
		resumeScheduled(id);
		revision.bump();
		toast('Resumed', { status: 'success' });
	}

	cancel(id: string): void {
		const item = this.get(id);
		cancelScheduled(id);
		revision.bump();
		toast(item ? `Cancelled ${item.payeeName}` : 'Schedule cancelled', { status: 'neutral' });
	}
}

export const schedule = new ScheduleState();
export type { ScheduledItem, ScheduledDraft, ScheduledStatus } from '$lib/data/scheduled-data';
export type { Frequency, EndRule, ProjectedRun } from './schedule';
