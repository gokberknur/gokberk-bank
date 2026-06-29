<script lang="ts">
	// L01 · Personal loan application — a regulated apply journey on the money spine.
	// GATHER (amount & term → purpose → finances) rides the F05 wizard composite;
	// then a synchronous, affordability-driven soft check resolves to one of the
	// OUTCOME phases (approved → offer → e-sign → done, or a calm referred/declined).
	//
	// The tone is the whole point: calm, exact, never judgemental. Every cost is
	// disclosed on the offer before signing; a decline carries a plain reason +
	// real alternatives drawn from the affordability model — no score, no blame.
	//
	// State: `lending.loanDraft` is the live source of truth the UI reads; the
	// wizard's `data` mirrors it only so a half-finished application survives a
	// reload (resume). Web-component interop is strictly `setProps`/`on` — never
	// `bind:` on a gok-* element (MoneyInput is a Svelte composite, so its bind is
	// fine). Tokens/semantic roles only; one earned accent per screen.
	import { onDestroy } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { lending } from '$lib/state/lending.svelte';
	import type { LoanDraft, Employment } from '$lib/state/lending.svelte';
	import { LOAN_BOUNDS, LOAN_PURPOSES } from '$lib/data/lending';
	import type { LoanPurpose } from '$lib/data/lending';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// The brief dwell on the pending screen before the (already-deterministic)
	// outcome shows — long enough to feel considered, short enough to stay calm.
	const CHECK_DWELL_MS = 1100;

	// Slider stops: €1,000–€50,000 by €500; 12–84 months by 6. Held in minor units
	// (amount) and months (term) so the slider value IS the draft value, no scaling.
	const AMOUNT_STEP_MINOR = 50_000; // €500
	const TERM_STEP = 6;

	/** Outcome phases; the gather wizard lives inside `apply`. */
	type Phase = 'apply' | 'checking' | 'approved' | 'referred' | 'declined' | 'done';
	let phase = $state<Phase>('apply');

	const EMPLOYMENT_OPTIONS: { value: Employment; label: string }[] = [
		{ value: 'employed', label: 'Employed' },
		{ value: 'self-employed', label: 'Self-employed' },
		{ value: 'other', label: 'Something else' }
	];

	// ── The wizard: three gather steps validating against the live draft. ──
	const steps: StepDef<LoanDraft>[] = [
		{ id: 'amount', title: 'Amount & term' },
		{ id: 'purpose', title: 'Purpose' },
		{ id: 'finances', title: 'My finances' }
	];

	const wizard = createWizard<LoanDraft>({
		flowId: 'loan-apply',
		steps,
		initialData: { ...lending.loanDraft }
	});

	// Resume hydration, synchronously (SSR is off, so the constructor has already
	// merged any saved draft). Push it into the live store before any field reads
	// it, so the UI and the persisted draft agree from the first paint.
	lending.setLoanDraft($state.snapshot(wizard.data));

	/** Patch the live draft (the UI's truth) and the wizard mirror (persisted). */
	function patchDraft(patch: Partial<LoanDraft>) {
		lending.setLoanDraft(patch);
		wizard.data = { ...wizard.data, ...patch };
	}

	// Money fields are Svelte composites — seed each once from the (possibly
	// resumed) live draft, then mirror changes back through `patchDraft`.
	let incomeValue = $state(lending.loanDraft.grossAnnualIncomeMinor);
	let housingValue = $state(lending.loanDraft.monthlyHousingMinor);
	let commitmentsValue = $state(lending.loanDraft.monthlyCommitmentsMinor);

	// ── Step 1: amount & term sliders + the live estimate. ──
	const amountMinor = $derived(lending.loanDraft.amountMinor);
	const termMonths = $derived(lending.loanDraft.termMonths);

	// Filled-track share (0–100%) for the accent gradient — the active track is the
	// one earned accent on this step.
	const amountFill = $derived(
		((amountMinor - LOAN_BOUNDS.minMinor) / (LOAN_BOUNDS.maxMinor - LOAN_BOUNDS.minMinor)) * 100
	);
	const termFill = $derived(
		((termMonths - LOAN_BOUNDS.minTermMonths) /
			(LOAN_BOUNDS.maxTermMonths - LOAN_BOUNDS.minTermMonths)) *
			100
	);

	const estimate = $derived(lending.loanEstimate());

	function onAmountInput(event: Event) {
		patchDraft({ amountMinor: Number((event.target as HTMLInputElement).value) });
	}
	function onTermInput(event: Event) {
		patchDraft({ termMonths: Number((event.target as HTMLInputElement).value) });
	}

	// ── Step 2: purpose + an optional note behind progressive disclosure. ──
	function onPurposeChange(event: Event) {
		patchDraft({ purpose: (event.target as HTMLSelectElement).value as LoanPurpose });
	}

	// The optional note seeds the gok-input once on mount via the DS `default-value`
	// reset baseline — a non-reactive read of the resumed draft, so typing never re-seeds it.
	const initialNote = lending.loanDraft.note;
	function onNoteInput(event: Event) {
		patchDraft({ note: (event.target as HTMLInputElement).value });
	}

	// ── Step 3: finances. ──
	function onEmploymentChange(event: Event) {
		patchDraft({ employment: (event.target as HTMLSelectElement).value as Employment });
	}
	function onIncomeChange(minor: number) {
		patchDraft({ grossAnnualIncomeMinor: minor });
		if (incomeError && minor > 0) incomeError = '';
	}
	function onHousingChange(minor: number) {
		patchDraft({ monthlyHousingMinor: minor });
	}
	function onCommitmentsChange(minor: number) {
		patchDraft({ monthlyCommitmentsMinor: minor });
	}

	// Reward-early income gate, surfaced on the field's reserved message line.
	let incomeError = $state('');

	// ── Run the soft check. ──
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;

	/** Final wizard action: validate income, then dwell briefly and resolve. */
	function runCheck() {
		if (lending.loanDraft.grossAnnualIncomeMinor <= 0) {
			incomeError = 'Enter my gross annual income so I can run the check.';
			wizard.error = 'I need my gross annual income before I can run the check.';
			return;
		}
		wizard.error = null;
		phase = 'checking';
		dwellTimer = setTimeout(() => {
			// runSoftCheck resolves only to an outcome (approved / referred / declined),
			// all of which are valid phases; the wider LoanDecision return is narrowed here.
			const outcome = lending.runSoftCheck();
			if (outcome === 'approved' || outcome === 'referred' || outcome === 'declined') {
				phase = outcome;
			}
		}, CHECK_DWELL_MS);
	}

	onDestroy(() => clearTimeout(dwellTimer));

	// ── Outcome data. ──
	const offer = $derived(lending.loanOffer());
	const affordability = $derived(lending.affordabilityResult());

	// ── E-sign (D02): forced-decision dialog + simulated step-up. ──
	let signOpen = $state(false);
	let agreed = $state(false);
	let stepUpVerified = $state(false);
	let reference = $state('');

	const canSign = $derived(agreed && stepUpVerified);

	function openSign() {
		agreed = false;
		stepUpVerified = false;
		signOpen = true;
	}
	function closeSign() {
		signOpen = false;
	}
	function onAgreeChange(event: Event) {
		agreed = (event.target as HTMLInputElement & { checked: boolean }).checked;
	}
	/** SIMULATED step-up (real passkey/OTP is F12) — marks identity verified. */
	function approveWithPasskey() {
		stepUpVerified = true;
	}
	/** The commit: record the signature, capture the reference, move to done. */
	function signAgreement() {
		if (!canSign) return;
		reference = lending.submitLoan();
		signOpen = false;
		phase = 'done';
	}

	// ── Adjust: return to the wizard with the draft intact. ──
	function adjustApplication() {
		lending.decision = 'idle';
		phase = 'apply';
	}

	/** Format APR basis points as a plain percent, e.g. 690 → "6.9". */
	function pct(bps: number): string {
		return (bps / 100).toLocaleString('en-IE', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 2
		});
	}

	/** Move focus to an outcome heading when it mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Apply for a loan · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if phase === 'apply'}
		<header class="head">
			<gok-link href="/lending">&larr; Lending</gok-link>
			<p class="eyebrow gok-eyebrow">Personal loan</p>
			<h1 class="title gok-headline-2">My loan</h1>
		</header>

		<Wizard {wizard} submitLabel="Run check" onComplete={runCheck}>
			{#if wizard.current.id === 'amount'}
				<!-- Step 1 · amount & term sliders feeding a live, indicative estimate. -->
				<div class="step">
					<div class="slider-field">
						<div class="slider-head">
							<label class="slider-label" for="amount-slider">How much do I need?</label>
							<output class="slider-value gok-tabular-nums" for="amount-slider">
								{formatMoney(amountMinor, 'EUR')}
							</output>
						</div>
						<input
							id="amount-slider"
							class="slider"
							type="range"
							min={LOAN_BOUNDS.minMinor}
							max={LOAN_BOUNDS.maxMinor}
							step={AMOUNT_STEP_MINOR}
							value={amountMinor}
							style="--fill: {amountFill}%"
							aria-valuetext={formatMoney(amountMinor, 'EUR')}
							oninput={onAmountInput}
						/>
						<div class="slider-bounds gok-tabular-nums">
							<span>{formatMoney(LOAN_BOUNDS.minMinor, 'EUR')}</span>
							<span>{formatMoney(LOAN_BOUNDS.maxMinor, 'EUR')}</span>
						</div>
					</div>

					<div class="slider-field">
						<div class="slider-head">
							<label class="slider-label" for="term-slider">Over how long?</label>
							<output class="slider-value gok-tabular-nums" for="term-slider">
								{termMonths} months
							</output>
						</div>
						<input
							id="term-slider"
							class="slider"
							type="range"
							min={LOAN_BOUNDS.minTermMonths}
							max={LOAN_BOUNDS.maxTermMonths}
							step={TERM_STEP}
							value={termMonths}
							style="--fill: {termFill}%"
							aria-valuetext="{termMonths} months"
							oninput={onTermInput}
						/>
						<div class="slider-bounds gok-tabular-nums">
							<span>{LOAN_BOUNDS.minTermMonths} months</span>
							<span>{LOAN_BOUNDS.maxTermMonths} months</span>
						</div>
					</div>

					<gok-card variant="outlined" class="estimate">
						<p slot="header" class="card-eyebrow gok-eyebrow">My estimate</p>
						<dl class="ledger" aria-live="polite">
							<div class="row">
								<dt>Representative APR</dt>
								<dd class="gok-tabular-nums">{pct(estimate.aprBps)}%</dd>
							</div>
							<div class="row row-lead">
								<dt>Monthly payment</dt>
								<dd class="gok-tabular-nums">{formatMoney(estimate.monthlyMinor, 'EUR')}</dd>
							</div>
							<div class="row">
								<dt>Total repayable</dt>
								<dd class="gok-tabular-nums">{formatMoney(estimate.totalRepayableMinor, 'EUR')}</dd>
							</div>
						</dl>
						<p slot="footer" class="card-caption">Your rate is confirmed after the check.</p>
					</gok-card>
				</div>
			{:else if wizard.current.id === 'purpose'}
				<!-- Step 2 · purpose + an optional note behind "More options". -->
				<div class="step fields">
					<gok-select
						label="What's the loan for?"
						{@attach setProps({ value: lending.loanDraft.purpose })}
						{@attach on('change', onPurposeChange)}
					>
						{#each LOAN_PURPOSES as purpose (purpose.value)}
							<gok-option value={purpose.value}>{purpose.label}</gok-option>
						{/each}
					</gok-select>

					<details class="disclosure">
						<summary class="disclosure-summary">More options</summary>
						<div class="disclosure-body">
							<gok-input
								label="Anything I'd like to add (optional)"
								placeholder="A short note about this loan"
								autocomplete="off"
								reserve-message
								helper="Just for my records — it won't change the decision."
								default-value={initialNote}
								{@attach on('input', onNoteInput)}
							></gok-input>
						</div>
					</details>
				</div>
			{:else}
				<!-- Step 3 · finances. Reward-early: income is required to run the check. -->
				<div class="step fields">
					<gok-select
						label="Employment status"
						{@attach setProps({ value: lending.loanDraft.employment })}
						{@attach on('change', onEmploymentChange)}
					>
						{#each EMPLOYMENT_OPTIONS as option (option.value)}
							<gok-option value={option.value}>{option.label}</gok-option>
						{/each}
					</gok-select>

					<div class="income">
						<MoneyInput
							bind:value={incomeValue}
							currency="EUR"
							label="Gross annual income"
							onchange={onIncomeChange}
						/>
						<!-- Reserved message line: always present so a late error never shifts the row. -->
						<p class="field-error" role="alert">{incomeError}</p>
					</div>

					<MoneyInput
						bind:value={housingValue}
						currency="EUR"
						label="Monthly housing cost"
						onchange={onHousingChange}
					/>

					<MoneyInput
						bind:value={commitmentsValue}
						currency="EUR"
						label="Existing monthly credit commitments"
						onchange={onCommitmentsChange}
					/>

					<p class="consent">
						This is a soft search — it won't affect my credit score.
					</p>
				</div>
			{/if}
		</Wizard>
	{:else if phase === 'checking'}
		<!-- Pending: a calm, politely-announced wait over a deterministic outcome. -->
		<section class="outcome" aria-live="polite">
			<div class="checking">
				<gok-spinner size="l" accessible-label="Running my soft check"></gok-spinner>
				<gok-tag size="m" dot>Checking</gok-tag>
				<gok-alert status="info">
					Checking — this usually takes under a minute. It's a soft search, so it won't affect my
					credit score.
				</gok-alert>
			</div>
		</section>
	{:else if phase === 'approved'}
		<!-- Offer: the fully-disclosed ledger. Every cost is on the page before sign. -->
		<section class="outcome">
			<header class="head">
				<p class="eyebrow gok-eyebrow">My offer</p>
				<h1 class="title gok-headline-2" tabindex="-1" {@attach focusHeading}>I can offer this</h1>
				<p class="lead">Here's the full cost, confirmed. Nothing changes until I sign.</p>
			</header>

			<gok-card variant="filled" class="offer">
				<p slot="header" class="card-eyebrow gok-eyebrow">Loan offer</p>
				<dl class="ledger">
					<div class="row row-lead">
						<dt>Monthly payment</dt>
						<dd class="gok-tabular-nums">{formatMoney(offer.monthlyMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Amount</dt>
						<dd class="gok-tabular-nums">{formatMoney(offer.principalMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Confirmed APR</dt>
						<dd class="gok-tabular-nums">{pct(offer.aprBps)}%</dd>
					</div>
					<div class="row">
						<dt>Term</dt>
						<dd class="gok-tabular-nums">{offer.termMonths} months</dd>
					</div>
					<div class="row">
						<dt>Total amount repayable</dt>
						<dd class="gok-tabular-nums">{formatMoney(offer.totalRepayableMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Total cost of credit</dt>
						<dd class="gok-tabular-nums">{formatMoney(offer.totalInterestMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>First payment</dt>
						<dd class="gok-tabular-nums">{formatDate(offer.firstPaymentDate)}</dd>
					</div>
				</dl>
			</gok-card>

			<div class="rep-example">
				<p class="card-eyebrow gok-eyebrow">Representative example</p>
				<p class="rep-body gok-tabular-nums">
					A {formatMoney(offer.representativeExample.principalMinor, 'EUR')} loan over
					{offer.representativeExample.termMonths} months at
					{pct(offer.representativeExample.aprBps)}% APR representative is
					{formatMoney(offer.representativeExample.monthlyMinor, 'EUR')} a month — total repayable
					{formatMoney(offer.representativeExample.totalRepayableMinor, 'EUR')}.
				</p>
			</div>

			<div class="outcome-actions">
				<gok-button variant="primary" {@attach on('click', openSign)}>Continue to sign</gok-button>
				<gok-button variant="secondary" {@attach on('click', adjustApplication)}>
					Adjust my application
				</gok-button>
			</div>
		</section>
	{:else if phase === 'referred' || phase === 'declined'}
		<!-- Calm, no-blame outcome: a plain reason + real alternatives. No score. -->
		<section class="outcome">
			<header class="head">
				<p class="eyebrow gok-eyebrow">My application</p>
				<h1 class="title gok-headline-2" tabindex="-1" {@attach focusHeading}>
					{#if phase === 'referred'}
						This needs a closer look
					{:else}
						I can't offer this right now
					{/if}
				</h1>
				<p class="lead">
					{#if phase === 'referred'}
						Based on what I shared, this one needs a quick manual review before it can go ahead.
						Nothing's gone wrong.
					{:else}
						Based on what I shared, I can't offer this loan right now. Here are a few ways forward.
					{/if}
				</p>
			</header>

			<div class="alternatives">
				<p class="card-eyebrow gok-eyebrow">What I can try</p>
				<ul class="alt-list">
					{#if affordability.maxLoanMinor > 0}
						<li>
							Borrow up to
							<strong class="gok-tabular-nums">{formatMoney(affordability.maxLoanMinor, 'EUR')}</strong>
							— closer to what I can comfortably afford.
						</li>
					{/if}
					<li>Choose a longer term to lower the monthly payment.</li>
					<li>Check again later, once my income or outgoings have changed.</li>
				</ul>
			</div>

			<gok-alert status="neutral">
				No credit score is shown and nothing here affects it. If something doesn't look right, my
				<gok-link href="/support">support team</gok-link> can help.
			</gok-alert>

			<div class="outcome-actions">
				<gok-button variant="primary" {@attach on('click', adjustApplication)}>
					Adjust my application
				</gok-button>
				<gok-link href="/lending">Back to lending</gok-link>
			</div>
		</section>
	{:else}
		<!-- Done: success, the withdrawal right stated plainly, and the reference. -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M5 12.5l4.5 4.5L19 7"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>

				<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
					My loan is signed
				</h1>

				<gok-tag size="m" dot>Approved</gok-tag>

				<dl class="ledger done-ledger">
					<div class="row">
						<dt>Funds</dt>
						<dd>In my EUR wallet by tomorrow</dd>
					</div>
					<div class="row">
						<dt>Agreement</dt>
						<dd>Saved to my documents (Soon)</dd>
					</div>
					<div class="row">
						<dt>Reference</dt>
						<dd class="mono">{reference}</dd>
					</div>
				</dl>

				<p class="withdrawal">
					I have a 14-day right to withdraw from this credit agreement. If I change my mind within
					14 days, I can cancel and repay what I've drawn, with no penalty.
				</p>

				<gok-link slot="actions" href="/lending">Back to lending</gok-link>
			</gok-empty-state>
		</section>
	{/if}
</div>

<!-- E-sign (D02): a forced-decision agreement with a consent box + step-up. -->
<gok-dialog
	tone="danger"
	size="m"
	heading="Sign my credit agreement"
	no-dismiss
	{@attach setProps({ open: signOpen })}
	{@attach on('gok-cancel', closeSign)}
	{@attach on('gok-close', closeSign)}
>
	<p class="sign-body">
		I'm signing a credit agreement for
		<strong class="gok-tabular-nums">{formatMoney(offer.principalMinor, 'EUR')}</strong>
		over {offer.termMonths} months at {pct(offer.aprBps)}% APR. I'll repay
		<strong class="gok-tabular-nums">{formatMoney(offer.monthlyMinor, 'EUR')}</strong>
		a month, {formatMoney(offer.totalRepayableMinor, 'EUR')} in total. I keep a 14-day right to
		withdraw.
	</p>

	<gok-checkbox
		class="sign-consent"
		{@attach setProps({ checked: agreed })}
		{@attach on('change', onAgreeChange)}
	>
		I've read and agree to the credit agreement.
	</gok-checkbox>

	<div class="stepup">
		<p class="stepup-key gok-eyebrow">Verify it's me</p>
		{#if stepUpVerified}
			<p class="stepup-done">
				<span class="stepup-check" aria-hidden="true">
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none">
						<path
							d="M3 8.5l3 3 7-8"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				Verified with passkey
			</p>
		{:else}
			<p class="stepup-body">Signing needs a quick identity check before it's binding.</p>
			<gok-button variant="secondary" {@attach on('click', approveWithPasskey)}>
				Approve with passkey
			</gok-button>
		{/if}
	</div>

	<div slot="footer" class="sign-actions">
		<gok-button variant="secondary" {@attach on('click', closeSign)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !canSign })}
			{@attach on('click', signAgreement)}
		>
			Sign agreement
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
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.fields {
		max-inline-size: 32rem;
		gap: var(--gok-space-400);
	}

	/* --- Step 1 · sliders --- */
	.slider-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.slider-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.slider-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.slider-value {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	/*
	 * The range track is painted from a token gradient: accent up to the thumb
	 * (the one earned accent on this step), hairline border beyond it. The thumb
	 * is a token-sized disc; focus paints the standard ring. We style the native
	 * control directly — there's no DS slider to compose, so this is allowed
	 * app-local chrome built only from --gok-* roles.
	 */
	.slider {
		inline-size: 100%;
		margin: 0;
		background: transparent;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
	}

	.slider:focus-visible {
		outline: none;
	}

	.slider::-webkit-slider-runnable-track {
		block-size: 0.25rem;
		border-radius: var(--gok-radius-pill);
		background: linear-gradient(
			to right,
			var(--gok-color-primary) var(--fill),
			var(--gok-color-border) var(--fill)
		);
	}

	.slider::-moz-range-track {
		block-size: 0.25rem;
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-border);
	}

	.slider::-moz-range-progress {
		block-size: 0.25rem;
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-primary);
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		margin-block-start: -0.5rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
		background: var(--gok-color-surface);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.slider::-moz-range-thumb {
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
		background: var(--gok-color-surface);
	}

	.slider:focus-visible::-webkit-slider-thumb {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.slider:focus-visible::-moz-range-thumb {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.slider-bounds {
		display: flex;
		justify-content: space-between;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Cards (estimate + offer) --- */
	.estimate,
	.offer {
		display: block;
	}

	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.card-caption {
		margin: 0;
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

	/* The headline figure of each ledger reads a touch larger — still neutral. */
	.row-lead dd {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		line-height: var(--gok-type-headline-5-line);
	}

	.row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	/* --- Step 3 · finances --- */
	.income {
		display: flex;
		flex-direction: column;
	}

	/* The reserved message line keeps its height whether or not it holds an error. */
	.field-error {
		min-block-size: var(--gok-type-body-small-line);
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	.consent {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Progressive disclosure (native details, token-styled) --- */
	.disclosure {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		padding-block-start: var(--gok-space-300);
	}

	.disclosure-summary {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.disclosure-summary:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.disclosure-body {
		margin-block-start: var(--gok-space-300);
	}

	/* --- Outcomes --- */
	.outcome {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.checking {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-700);
		text-align: center;
	}

	.checking gok-alert {
		display: block;
		max-inline-size: 32rem;
	}

	/* The active title / headline figure stays neutral; only the primary earns green. */
	.title:focus,
	.outcome-title:focus {
		outline: none;
	}

	.rep-example,
	.alternatives {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.rep-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.alt-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding-inline-start: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.alt-list strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.outcome-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	/* --- Done --- */
	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid currentcolor;
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.done-ledger {
		inline-size: 100%;
		max-inline-size: 24rem;
		margin-inline: auto;
		text-align: start;
	}

	.withdrawal {
		max-inline-size: 32rem;
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- E-sign dialog --- */
	.sign-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.sign-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.sign-consent {
		display: block;
		margin-block-start: var(--gok-space-400);
	}

	.stepup {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-400);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.stepup-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.stepup-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.stepup-done {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.stepup-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.sign-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
