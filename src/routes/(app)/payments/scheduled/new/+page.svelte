<script lang="ts">
	// P05 · Schedule a payment — the create wizard for a standing order / one-off
	// future payment. Four steps on the F05 wizard model (recipient+amount → how & when
	// [frequency/start/end] → projected balance → review), then a forced-decision confirm and
	// a calm success view. Scheduling a future commitment IS deliberate, so the final
	// confirm is a forced-decision gok-dialog (tone="danger", no-dismiss); a recurring
	// standing order over a threshold (≥ €1,000 or an until-cancelled mandate) is gated
	// behind a step-up re-auth first. A projected overdraw is surfaced reward-early as a
	// loud gok-alert, never a hard block — it's my call.
	//
	// Single source of truth: `wizard.data` (the create payload, bar the end-rule, which
	// is assembled from three fields). The flow runs with `persist: false` — a created
	// schedule is a one-time result, never resumed. Interop is strictly `setProps`/`on`
	// from `wc.svelte` — never `bind:` on a gok-* host. MoneyInput is a Svelte composite,
	// so its value/onchange are plain props. The start/end dates are DS gok-date-pickers
	// (each owns its label + helper line); the ISO value is read off the event detail.
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { schedule } from '$lib/payments/schedule.svelte';
	import type { Frequency, EndRule } from '$lib/payments/schedule.svelte';
	import { TODAY_ISO, addDays, isWeekend, businessDayShift } from '$lib/payments/schedule';
	import type { Currency } from '$lib/data/money';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	// A recurring standing order ≥ €1,000, or an open-ended "until I cancel" mandate,
	// forces a step-up re-auth before the commitment is set up. Real passkey / OTP is
	// out of scope — StepUp's "Approve with passkey" is SIMULATED.
	const STEP_UP_MIN_MINOR = 100_000; // €1,000.00 in minor units.
	const MAX_REFERENCE = 140;

	// ── The draft the wizard carries. The three end-* fields assemble into an EndRule. ──
	interface ScheduleDraftData {
		payeeId: string | null;
		walletId: string;
		amountMinor: number;
		reference: string;
		frequency: Frequency;
		startIso: string;
		endKind: EndRule['kind'];
		endDateIso: string;
		endCount: number;
	}

	const wallets = schedule.wallets();
	const payees = schedule.payees();
	// Default to the primary EUR wallet (else the first), so the amount field opens in
	// my home currency.
	const defaultWallet = wallets.find((w) => w.primary) ?? wallets[0];

	function freshData(): ScheduleDraftData {
		return {
			payeeId: null,
			walletId: defaultWallet?.id ?? '',
			amountMinor: 0,
			reference: '',
			frequency: 'monthly',
			// A sensible near-future default; I can move it on the start step.
			startIso: addDays(TODAY_ISO, 7),
			endKind: 'until-cancelled',
			endDateIso: addDays(TODAY_ISO, 365),
			endCount: 12
		};
	}

	// ── The four-step flow. The schedule step folds frequency, start and the end rule together. ──
	const steps: StepDef<ScheduleDraftData>[] = [
		{
			id: 'recipient',
			title: 'Recipient & amount',
			validate: (data) => {
				if (!data.payeeId) return 'Choose who I am paying to continue.';
				if (!data.walletId) return 'Choose which wallet this comes from.';
				if (data.amountMinor <= 0) return 'Enter an amount to schedule.';
				return true;
			}
		},
		{
			id: 'schedule',
			title: 'How & when',
			// PAY-U-03 — frequency, start date and (for a recurring order) the end rule, all on one
			// step. The end-rule checks only apply when it actually recurs.
			validate: (data) => {
				if (!data.startIso) return 'Pick the date the first payment goes out.';
				if (data.frequency !== 'once') {
					if (data.endKind === 'on-date' && !data.endDateIso) return 'Pick the date it stops on.';
					if (data.endKind === 'after-count' && data.endCount < 1) return 'Enter at least one payment.';
				}
				return true;
			}
		},
		{ id: 'projection', title: 'Projected balance' },
		{ id: 'review', title: 'Review' }
	];

	const wizard = createWizard<ScheduleDraftData>({
		flowId: 'schedule-create',
		steps,
		initialData: freshData(),
		// A created schedule is a one-time result — never resume a half-built mandate.
		persist: false
	});

	/** Patch the draft immutably so reactivity flows. */
	function patch(part: Partial<ScheduleDraftData>) {
		wizard.data = { ...wizard.data, ...part };
	}

	// ── Derived reads off the draft. ───────────────────────────────────────────────
	const selectedWallet = $derived(wallets.find((w) => w.id === wizard.data.walletId));
	const selectedCurrency = $derived<Currency>(selectedWallet?.currency ?? 'EUR');
	const selectedPayee = $derived(payees.find((p) => p.id === wizard.data.payeeId));
	const payeeName = $derived(selectedPayee?.name ?? '');
	const amountLabel = $derived(formatMoney(wizard.data.amountMinor, selectedCurrency));

	const FREQUENCY_LABEL: Record<Frequency, string> = {
		once: 'one-off',
		weekly: 'weekly',
		monthly: 'monthly'
	};
	const frequencyLabel = $derived(FREQUENCY_LABEL[wizard.data.frequency]);

	/** Assemble the EndRule from the three end-* fields (a one-off ends after its run). */
	function buildEnd(data: ScheduleDraftData): EndRule {
		if (data.frequency === 'once') return { kind: 'until-cancelled' };
		if (data.endKind === 'on-date') return { kind: 'on-date', dateIso: data.endDateIso };
		if (data.endKind === 'after-count') return { kind: 'after-count', count: data.endCount };
		return { kind: 'until-cancelled' };
	}
	const endRule = $derived(buildEnd(wizard.data));

	/** End rule in words, for the review ledger and the confirm dialog. */
	const endInWords = $derived.by(() => {
		if (wizard.data.frequency === 'once') return 'One-off payment';
		if (endRule.kind === 'on-date') return `Until ${formatDate(endRule.dateIso)}`;
		if (endRule.kind === 'after-count')
			return `After ${endRule.count} ${endRule.count === 1 ? 'payment' : 'payments'}`;
		return 'Until I cancel';
	});

	// Start-date business-day shift: a weekend start moves to the next business day.
	const startShiftsTo = $derived(
		isWeekend(wizard.data.startIso) ? businessDayShift(wizard.data.startIso) : null
	);
	// The picker's own helper line carries the shift/origin note (it used to be a
	// reserved <p> under the native input).
	const startHelper = $derived(
		startShiftsTo
			? `That's a weekend — the payment runs on the next business day, ${formatDate(startShiftsTo)}.`
			: `The day the first payment leaves ${selectedWallet?.name ?? 'my wallet'}.`
	);

	// ── Projection (step 3) — computed live, never stored stale. ─────────────────────
	const projectionRuns = $derived(
		schedule.project(
			wizard.data.walletId,
			wizard.data.amountMinor,
			wizard.data.startIso,
			wizard.data.frequency,
			endRule,
			4
		)
	);
	const projectionOverdraws = $derived(
		schedule.projectionOverdraws(
			wizard.data.walletId,
			wizard.data.amountMinor,
			wizard.data.startIso,
			wizard.data.frequency,
			endRule
		)
	);
	const firstOverdraw = $derived(projectionRuns.find((r) => r.overdraw));
	// The next run that actually executes (business-day shifted) — for the success view.
	const nextRunIso = $derived(projectionRuns[0]?.executesIso ?? wizard.data.startIso);

	// A recurring order over the threshold, or an open-ended mandate, needs a step-up.
	const stepUpRequired = $derived(
		wizard.data.frequency !== 'once' &&
			(wizard.data.amountMinor >= STEP_UP_MIN_MINOR || endRule.kind === 'until-cancelled')
	);

	// ── Field handlers. ──────────────────────────────────────────────────────────────
	function onPayeeChange(event: Event) {
		patch({ payeeId: (event.target as HTMLElement & { value?: string }).value || null });
	}
	function onWalletChange(event: Event) {
		patch({ walletId: (event.target as HTMLElement & { value?: string }).value ?? '' });
	}
	function onReferenceInput(event: Event) {
		const value = (event.target as HTMLInputElement).value.slice(0, MAX_REFERENCE);
		patch({ reference: value });
	}
	function onFrequencyChange(event: Event) {
		patch({ frequency: (event.target as HTMLElement & { value?: string }).value as Frequency });
	}
	function onStartInput(event: Event) {
		patch({ startIso: (event as CustomEvent<{ value: string }>).detail.value });
	}
	function onEndKindChange(event: Event) {
		patch({ endKind: (event.target as HTMLElement & { value?: string }).value as EndRule['kind'] });
	}
	function onEndDateInput(event: Event) {
		patch({ endDateIso: (event as CustomEvent<{ value: string }>).detail.value });
	}
	function onEndCountInput(event: Event) {
		const n = Number((event.target as HTMLElement & { value?: string }).value ?? '');
		patch({ endCount: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 });
	}

	// ── Confirm spine: forced-decision dialog, optionally gated by a step-up. ─────────
	let stepUpOpen = $state(false);
	let confirmOpen = $state(false);
	let created = $state(false);
	// The receipt is captured at create time so the success view survives a reset.
	let receipt = $state<{
		amount: string;
		payeeName: string;
		frequency: string;
		nextRun: string;
		endInWords: string;
	} | null>(null);

	/** Final wizard action: a step-up first when required, else straight to confirm. */
	function onReviewComplete() {
		if (stepUpRequired) stepUpOpen = true;
		else confirmOpen = true;
	}

	/** Step-up cleared — proceed to the forced-decision confirm. */
	function onStepUpConfirm() {
		stepUpOpen = false;
		confirmOpen = true;
	}
	function onStepUpCancel() {
		stepUpOpen = false;
	}
	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: create the schedule, capture a receipt, show success. */
	function doSchedule() {
		const data = wizard.data;
		const item = schedule.create({
			payeeId: data.payeeId,
			payeeName,
			walletId: data.walletId,
			amountMinor: data.amountMinor,
			currency: selectedCurrency,
			reference: data.reference.trim(),
			frequency: data.frequency,
			startIso: data.startIso,
			end: buildEnd(data)
		});
		const firstRun = schedule.upcoming(item, 1)[0] ?? data.startIso;
		receipt = {
			amount: amountLabel,
			payeeName,
			frequency: frequencyLabel,
			nextRun: formatDate(businessDayShift(firstRun)),
			endInWords
		};
		confirmOpen = false;
		created = true;
	}

	/** Move focus to the success heading when it mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	/** Start another schedule — fresh draft, back to step 1. */
	function scheduleAnother() {
		created = false;
		receipt = null;
		wizard.data = freshData();
		wizard.error = null;
		wizard.goTo(0);
	}

	function goToManage() {
		goto('/payments/scheduled');
	}
</script>

<svelte:head>
	<title>Schedule a payment · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if created}
		<!-- Success: a Scheduled status tag + the next-run preview. Calm, not loud. -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M12 7v5l3 2"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" />
					</svg>
				</span>

				<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
					<span class="gok-tabular-nums">{receipt?.amount}</span> to {receipt?.payeeName} is scheduled
				</h1>

				<gok-tag size="m" dot>Scheduled</gok-tag>

				<dl class="ledger receipt">
					<div class="row">
						<dt>How often</dt>
						<dd class="cap">{receipt?.frequency}</dd>
					</div>
					<div class="row">
						<dt>Next run</dt>
						<dd class="gok-tabular-nums">{receipt?.nextRun}</dd>
					</div>
					<div class="row">
						<dt>Ends</dt>
						<dd>{receipt?.endInWords}</dd>
					</div>
				</dl>

				<div slot="actions" class="outcome-actions">
					<gok-button variant="primary" {@attach on('click', goToManage)}>
						Manage scheduled
					</gok-button>
					<gok-button variant="secondary" {@attach on('click', scheduleAnother)}>
						Schedule another
					</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<header class="head">
			<gok-link href="/payments/scheduled">&larr; Scheduled</gok-link>
			<p class="eyebrow gok-eyebrow">Scheduled payments</p>
			<h1 class="title gok-headline-2">Schedule a payment</h1>
			<p class="lead">
				I'll set up a payment to run on a date I choose — once, or on repeat until I cancel.
			</p>
		</header>

		<Wizard {wizard} submitLabel={`Schedule ${amountLabel}`} onComplete={onReviewComplete}>
			{#if wizard.current.id === 'recipient'}
				<!-- Step 1 · recipient + amount. Reward-early: payee + amount required. -->
				<section class="step-fields" aria-label="Recipient and amount">
					<gok-select
						label="Pay a saved payee"
						placeholder="Choose a payee"
						{@attach setProps({ value: wizard.data.payeeId ?? '' })}
						{@attach on('change', onPayeeChange)}
					>
						{#each payees as payee (payee.id)}
							<gok-option value={payee.id}>
								{payee.name}{payee.handle ? ` · ${payee.handle}` : ''}
							</gok-option>
						{/each}
					</gok-select>

					<gok-select
						label="From wallet"
						{@attach setProps({ value: wizard.data.walletId })}
						{@attach on('change', onWalletChange)}
					>
						{#each wallets as wallet (wallet.id)}
							<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
						{/each}
					</gok-select>

					<MoneyInput
						value={wizard.data.amountMinor}
						currency={selectedCurrency}
						label="Amount"
						onchange={(minor) => patch({ amountMinor: minor })}
					/>

					<gok-input
						label="Reference (optional)"
						helper="Up to {MAX_REFERENCE} characters — the payee sees this."
						maxlength={MAX_REFERENCE}
						{@attach setProps({ value: wizard.data.reference })}
						{@attach on('input', onReferenceInput)}
						{@attach on('change', onReferenceInput)}
					></gok-input>
				</section>
			{:else if wizard.current.id === 'schedule'}
				<!-- Step 2 · how often, when it starts, and (recurring only) when it ends — three
				     single-control steps collapsed into one (PAY-U-03). -->
				<section class="step-fields" aria-label="How often and when">
					<gok-segmented
						label="How often should it run?"
						{@attach setProps({ value: wizard.data.frequency })}
						{@attach on('change', onFrequencyChange)}
					>
						<gok-segmented-item value="once">Once</gok-segmented-item>
						<gok-segmented-item value="weekly">Weekly</gok-segmented-item>
						<gok-segmented-item value="monthly">Monthly</gok-segmented-item>
					</gok-segmented>

					<gok-date-picker
						label="When does the first payment go out?"
						min={TODAY_ISO}
						helper={startHelper}
						{@attach setProps({ value: wizard.data.startIso })}
						{@attach on('input', onStartInput)}
						{@attach on('change', onStartInput)}
					></gok-date-picker>

					{#if wizard.data.frequency !== 'once'}
						<gok-radio-group
							label="When should it stop?"
							orientation="vertical"
							{@attach setProps({ value: wizard.data.endKind })}
							{@attach on('change', onEndKindChange)}
						>
							<gok-radio value="until-cancelled">Until I cancel</gok-radio>
							<gok-radio value="on-date">On a date</gok-radio>
							<gok-radio value="after-count">After a number of payments</gok-radio>
						</gok-radio-group>

						{#if wizard.data.endKind === 'on-date'}
							<div class="indent">
								<gok-date-picker
									label="Stop on"
									min={wizard.data.startIso}
									helper="The last payment runs on or before this date."
									{@attach setProps({ value: wizard.data.endDateIso })}
									{@attach on('input', onEndDateInput)}
									{@attach on('change', onEndDateInput)}
								></gok-date-picker>
							</div>
						{:else if wizard.data.endKind === 'after-count'}
							<div class="indent">
								<gok-input
									type="number"
									label="Number of payments"
									min="1"
									inputmode="numeric"
									{@attach setProps({ value: String(wizard.data.endCount) })}
									{@attach on('input', onEndCountInput)}
									{@attach on('change', onEndCountInput)}
								></gok-input>
							</div>
						{/if}
					{:else}
						<p class="quiet">A single payment on the date I pick — there's no recurrence to set.</p>
					{/if}
				</section>
			{:else if wizard.current.id === 'projection'}
				<!-- Step 3 · projected balance. Readable as text; overdraw is loud, not a block. -->
				<section class="step-fields wide" aria-label="Projected balance">
					{#if projectionOverdraws && firstOverdraw}
						<gok-alert status="warning">
							<span slot="title">This would overdraw {selectedWallet?.name ?? 'my wallet'}</span>
							A run on {formatDate(firstOverdraw.dateIso)} takes the projected balance below zero. I
							can still schedule it — I'll just need funds in by then.
						</gok-alert>
					{/if}

					<gok-card>
						<p slot="header" class="card-eyebrow gok-eyebrow">Next {projectionRuns.length} runs</p>

						{#if projectionRuns.length === 0}
							<p class="quiet">Nothing to project — there are no upcoming runs for this schedule.</p>
						{:else}
							<ul class="runs" aria-label="Projected runs">
								{#each projectionRuns as run (run.dateIso)}
									<li class="run" class:is-overdraw={run.overdraw}>
										<div class="run-date">
											<span class="run-day gok-tabular-nums">{formatDate(run.dateIso)}</span>
											{#if run.shifted}
												<span class="run-shift gok-tabular-nums">
													&rarr; runs {formatDate(run.executesIso)}
												</span>
											{/if}
										</div>
										<span class="run-amount gok-tabular-nums">
											&minus;{formatMoney(run.amountMinor, selectedCurrency)}
										</span>
										<span class="run-balance gok-tabular-nums">
											{formatMoney(run.balanceAfterMinor, selectedCurrency)}
											{#if run.overdraw}
												<span class="run-flag">
													<span class="run-flag-glyph" aria-hidden="true">!</span>
													overdrawn
												</span>
											{/if}
										</span>
									</li>
								{/each}
							</ul>
							<p class="runs-note">
								Each line is the run date, the amount, and my projected available balance after it.
							</p>
						{/if}
					</gok-card>
				</section>
			{:else}
				<!-- Step 4 · review — a read-only ledger + the computed next run. -->
				<section class="step-fields" aria-label="Review">
					<dl class="ledger">
						<div class="row">
							<dt>Payee</dt>
							<dd>{payeeName || '—'}</dd>
						</div>
						<div class="row">
							<dt>From</dt>
							<dd>{selectedWallet?.name ?? '—'} · {selectedCurrency}</dd>
						</div>
						<div class="row">
							<dt>Amount</dt>
							<dd class="gok-tabular-nums">{amountLabel}</dd>
						</div>
						<div class="row">
							<dt>How often</dt>
							<dd class="cap">{frequencyLabel}</dd>
						</div>
						<div class="row">
							<dt>Starts</dt>
							<dd class="gok-tabular-nums">{formatDate(wizard.data.startIso)}</dd>
						</div>
						<div class="row">
							<dt>Ends</dt>
							<dd>{endInWords}</dd>
						</div>
						<div class="row">
							<dt>Next run</dt>
							<dd class="gok-tabular-nums">{formatDate(nextRunIso)}</dd>
						</div>
						{#if wizard.data.reference.trim()}
							<div class="row">
								<dt>Reference</dt>
								<dd>{wizard.data.reference.trim()}</dd>
							</div>
						{/if}
					</dl>

					{#if stepUpRequired}
						<gok-alert status="info">
							This is a standing order — I'll verify it's me before it's set up.
						</gok-alert>
					{/if}
				</section>
			{/if}
		</Wizard>
	{/if}
</div>

<!-- Step-up gate (recurring order over the threshold / open-ended mandate). -->
<StepUp
	open={stepUpOpen}
	title={`Set up a standing order to ${payeeName}?`}
	consequence={`This sets up a ${frequencyLabel} payment of ${amountLabel}, ${endInWords.toLowerCase()}.`}
	confirmLabel="Verified — review"
	tone="danger"
	onConfirm={onStepUpConfirm}
	onCancel={onStepUpCancel}
/>

<!-- The deliberate commit: a forced-decision dialog (no-dismiss, danger tone). -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Schedule this payment"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
	{@attach on('gok-cancel', closeConfirm)}
	{@attach on('gok-close', closeConfirm)}
>
	<p class="confirm-body">
		Set up a <strong>{frequencyLabel}</strong> payment of
		<strong class="gok-tabular-nums">{amountLabel}</strong> to {payeeName}?
	</p>
	<dl class="confirm-ledger">
		<div class="row">
			<dt>Starts</dt>
			<dd class="gok-tabular-nums">{formatDate(wizard.data.startIso)}</dd>
		</div>
		<div class="row">
			<dt>Ends</dt>
			<dd>{endInWords}</dd>
		</div>
	</dl>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button variant="primary" {@attach on('click', doSchedule)}>
			Schedule {amountLabel}
		</gok-button>
	</div>
</gok-dialog>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		/* Trim the sparse header→content gap to the standard ~32px (PAY-U-04). */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step fields --- */
	.step-fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.step-fields.wide {
		max-inline-size: 40rem;
	}

	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.indent {
		padding-inline-start: var(--gok-space-300);
		border-inline-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* --- Projection runs (step 3) --- */
	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.runs {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.run {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: baseline;
		gap: var(--gok-space-200) var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.run:first-child {
		border-block-start: none;
	}

	.run-date {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.run-day {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.run-shift {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.run-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
		text-align: end;
	}

	.run-balance {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		text-align: end;
	}

	/* Overdraw: marked by a rule (firmer top border), an icon, and text — never colour
	   alone — so it reads in monochrome and forced-colors. */
	.run.is-overdraw {
		border-block-start-color: var(--gok-color-text);
	}

	.run.is-overdraw .run-balance {
		color: var(--gok-color-status-error);
		font-weight: var(--gok-font-weight-semibold);
	}

	.run-flag {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-status-error);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.run-flag-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1rem;
		block-size: 1rem;
		border: var(--gok-border-width-strong) solid currentcolor;
		border-radius: var(--gok-radius-pill);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: 1;
	}

	.runs-note {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Key/value ledgers --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.cap {
		text-transform: capitalize;
	}

	/* --- Confirm dialog --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: var(--gok-space-300) 0 0;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Success outcome --- */
	.outcome {
		padding-block: var(--gok-space-700);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 22rem;
		margin-inline: auto;
		text-align: start;
	}

	.outcome-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

	@media (max-width: 30rem) {
		.run {
			grid-template-columns: 1fr auto;
		}

		.run-amount {
			grid-column: 2;
			grid-row: 2;
		}
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
