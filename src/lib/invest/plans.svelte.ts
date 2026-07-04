// Recurring & savings plans (V10) — the reactive bridge over the plans domain, the
// P05 schedule maths, and the per-run cost. Reads touch `revision`; create/pause/
// resume/stop mutate the domain then bump + toast. The next run and projections are
// computed here, never stored stale. Pause is reversible (optimistic + toast); stop
// is final (the surface gates it behind a forced-decision dialog). Money is integer
// minor units. Mirrors schedule.svelte.ts and the other domains.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { getWallets } from '$lib/data';
import type { Wallet } from '$lib/data';
import { getPlans, getPlan, createPlan, editPlan, pausePlan, resumePlan, stopPlan } from '$lib/data/plans-data';
import type { SavingsPlan, PlanDraft, PlanStatus, PlanCadence } from '$lib/data/plans-data';
import { nextRun, occurrences, projectedBalance, anyOverdraw } from '$lib/payments/schedule';
import type { ProjectedRun } from '$lib/payments/schedule';
import { perRunCostMinor as computePerRunCost } from '$lib/invest/plan-run';

class PlansState {
	list(): SavingsPlan[] {
		revision.value;
		return getPlans();
	}

	/** Active (not ended) plans — what the plans surface shows by default. */
	active(): SavingsPlan[] {
		revision.value;
		return getPlans().filter((p) => p.status !== 'ended');
	}

	get(id: string): SavingsPlan | undefined {
		revision.value;
		return getPlan(id);
	}

	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	walletFor(plan: SavingsPlan): Wallet | undefined {
		revision.value;
		return getWallets().find((w) => w.id === plan.walletId);
	}

	/** The next run date for a plan (computed). */
	nextRunIso(plan: SavingsPlan): string {
		return nextRun(plan.startIso, plan.cadence);
	}

	/** Upcoming run dates honouring the end rule. */
	upcoming(plan: SavingsPlan, limit = 6): string[] {
		return occurrences(plan.startIso, plan.cadence, plan.end, limit);
	}

	/** Effective status for the badge — ended/paused as stored, ended when nothing's
	 *  left to run, else active. */
	statusOf(plan: SavingsPlan): PlanStatus {
		if (plan.status === 'ended') return 'ended';
		if (plan.status === 'paused') return 'paused';
		if (this.upcoming(plan, 1).length === 0) return 'ended';
		return 'active';
	}

	/** The all-in per-run wallet debit (contribution + every leg's fee). */
	perRunCostMinor(plan: SavingsPlan): number {
		return computePerRunCost(plan);
	}

	/** Monthly-equivalent commitment across live (non-paused) plans, EUR minor units —
	 *  a weekly plan counts as its ×52/12 monthly share. */
	monthlyCommitmentMinor(): number {
		return this.active()
			.filter((p) => p.status === 'active')
			.reduce(
				(sum, p) =>
					sum + (p.cadence === 'monthly' ? p.amountMinor : Math.round((p.amountMinor * 52) / 12)),
				0
			);
	}

	/** Project the funding wallet's available balance forward across the next runs. */
	project(plan: SavingsPlan, limit = 4): ProjectedRun[] {
		return projectedBalance(
			this.walletFor(plan)?.availableMinor ?? 0,
			this.perRunCostMinor(plan),
			this.upcoming(plan, limit)
		);
	}

	/** Does any projected run overdraw the funding wallet? (reward-early warning) */
	projectionOverdraws(plan: SavingsPlan): boolean {
		return anyOverdraw(this.project(plan));
	}

	// ── Mutations ────────────────────────────────────────────────────────────────
	create(draft: PlanDraft): SavingsPlan {
		const p = createPlan(draft);
		revision.bump();
		toast(`Started ${p.name}`, { status: 'success' });
		return p;
	}

	edit(id: string, changes: { amountMinor?: number; cadence?: PlanCadence }): void {
		editPlan(id, changes);
		revision.bump();
		toast('Plan updated', { status: 'success' });
	}

	pause(id: string): void {
		pausePlan(id);
		revision.bump();
		toast('Paused — I can resume it anytime', { status: 'neutral' });
	}

	resume(id: string): void {
		resumePlan(id);
		revision.bump();
		toast('Resumed', { status: 'success' });
	}

	stop(id: string): void {
		const p = this.get(id);
		stopPlan(id);
		revision.bump();
		toast(p ? `Stopped ${p.name}` : 'Plan stopped', { status: 'neutral' });
	}
}

export const plans = new PlansState();
export type { SavingsPlan, PlanDraft, PlanStatus, PlanCadence, PlanKind } from '$lib/data/plans-data';
