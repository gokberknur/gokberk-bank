<script lang="ts">
	// L05 Flow A · Credit-line application wizard. A shorter cousin of the mortgage
	// journey on the same shape: a local step machine (amount → offer → sign), a
	// pending soft-check, an offer ledger, and the shared D02 sign hand-off. Everything
	// derives from `cl.draft`, which is persisted, so an interrupted application resumes.
	//
	// A revolving line discloses differently from a fixed loan: a *representative* APR
	// always shown beside its worked example, plus the cash-advance rate and any annual
	// fee. Calm and fully disclosed — never an APR without its example, never hype. A
	// decline is plain and forward-looking — a reason and real alternatives, no blame,
	// no score, no offer.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:`
	// on a gok-* element; values come off events. MoneyInput is a Svelte composite, so
	// its value/onchange are plain props. The one earned accent per step is the single
	// primary action. Tokens / semantic roles only.
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { creditLine as cl } from '$lib/state/credit-line.svelte';
	import {
		REPRESENTATIVE_EXAMPLE,
		CASH_ADVANCE_APR_BPS,
		ANNUAL_FEE_MINOR,
		MAX_LIMIT_MINOR
	} from '$lib/lending/credit';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// A brief considered dwell on the soft check before the (already-deterministic)
	// outcome shows — long enough to feel real, short enough to stay calm. A plain
	// setTimeout, no timestamps.
	const CHECK_DWELL_MS = 1500;

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// Rates carry one decimal (24.9%, 29.9%) — never round an APR away, and never
	// show one without its representative example.
	const rate = (bps: number) =>
		`${(bps / 100).toLocaleString('en-IE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

	// ── The three-step machine. Offer + sign are reachable only on eligible/referred. ──
	type Step = 'amount' | 'offer' | 'sign';
	const STEP_ORDER: { id: Step; title: string }[] = [
		{ id: 'amount', title: 'Amount' },
		{ id: 'offer', title: 'Offer' },
		{ id: 'sign', title: 'Sign' }
	];
	let step = $state<Step>('amount');
	const stepIndex = $derived(STEP_ORDER.findIndex((s) => s.id === step));

	// The amount step runs its own little sub-machine: idle → checking → result.
	type CheckState = 'idle' | 'checking' | 'result';
	let checkState = $state<CheckState>('idle');

	// Eligibility recomputes live from the draft; `decided` records that I ran the check.
	const eligibility = $derived(cl.eligibility);

	// ── Restore. Money composites seed their display once, so the fields are wrapped in
	// `{#key hydrated}` and remounted after restore settles. ──
	let hydrated = $state(0);
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (cl.draft.decided) {
			// Resume where a finished decision left off: the offer (eligible/referred) or
			// the decline panel on the amount step.
			if (cl.eligibility.outcome === 'declined') {
				step = 'amount';
				checkState = 'result';
			} else {
				step = 'offer';
			}
		}
		hydrated += 1;
	});

	onDestroy(() => clearTimeout(dwellTimer));

	// ── Per-step validity (gates the primary + drives the inline hint). ──
	const amountValid = $derived(
		cl.draft.requestedLimitMinor > 0 &&
			cl.draft.grossAnnualIncomeMinor > 0 &&
			cl.draft.monthlyCommitmentsMinor >= 0
	);
	const amountHint = $derived.by(() => {
		if (cl.draft.requestedLimitMinor <= 0) return 'Enter the limit I’d like to continue.';
		if (cl.draft.grossAnnualIncomeMinor <= 0)
			return 'Enter my gross annual income so I can run the soft check.';
		return '';
	});

	// Whether the approved limit came in under what I asked for (stated plainly, no blame).
	const isLowerLimit = $derived(eligibility.offeredLimitMinor < cl.draft.requestedLimitMinor);

	// ── Navigation. ──
	function toTop() {
		if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
	}

	function checkEligibility() {
		if (!amountValid) return;
		checkState = 'checking';
		dwellTimer = setTimeout(() => {
			cl.runDecision();
			checkState = 'result';
		}, CHECK_DWELL_MS);
	}

	function continueToOffer() {
		step = 'offer';
		toTop();
	}
	function continueToSign() {
		step = 'sign';
		toTop();
	}
	function backToAmount() {
		step = 'amount';
		checkState = 'result';
		toTop();
	}
	function backToOffer() {
		step = 'offer';
		toTop();
	}
	// Re-open the form to adjust the figures and run the soft check again.
	function adjust() {
		checkState = 'idle';
		toTop();
	}

	// ── E-sign hand-off to the shared D02 signing flow. ──
	function reviewAndSign() {
		const id = cl.createAgreementDocument();
		goto('/documents/' + id + '/sign');
	}

	// Move focus to an outcome / step heading when it mounts, so the result is announced.
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Apply for a credit line · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/lending">&larr; Lending</gok-link>
		<p class="eyebrow gok-eyebrow">Credit line</p>
		<h1 class="title gok-headline-2">Apply for a credit line</h1>
		<p class="lead">
			I'll set the limit I'd like, run a soft check that won't touch my credit score, then see the
			offer in full — the representative APR beside its worked example, the cash-advance rate, and
			any annual fee — before I sign.
		</p>
	</header>

	<!-- Step indicator — quiet, by rule + number, never the accent. -->
	<ol class="steps" aria-label="Application steps">
		{#each STEP_ORDER as s, i (s.id)}
			<li
				class="steps-item"
				class:is-current={i === stepIndex}
				class:is-done={i < stepIndex}
				aria-current={i === stepIndex ? 'step' : undefined}
			>
				<span class="steps-num gok-tabular-nums">{i + 1}</span>
				<span class="steps-label">{s.title}</span>
			</li>
		{/each}
	</ol>

	{#if step === 'amount'}
		<!-- Step 1 · Amount + eligibility — the soft check runs here; its outcome decides
		     whether the offer is reachable. -->
		<form
			class="step"
			aria-labelledby="amount-heading"
			onsubmit={(event) => {
				event.preventDefault();
				checkEligibility();
			}}
		>
			<h2 id="amount-heading" class="step-title gok-headline-5">The limit I'd like</h2>

			<div class="fields">
				{#key hydrated}
					<MoneyInput
						currency="EUR"
						label="Credit limit I'd like"
						value={cl.draft.requestedLimitMinor}
						maxMinor={MAX_LIMIT_MINOR}
						onchange={(minor) => cl.patch({ requestedLimitMinor: minor })}
					/>
					<MoneyInput
						currency="EUR"
						label="My gross annual income"
						value={cl.draft.grossAnnualIncomeMinor}
						onchange={(minor) => cl.patch({ grossAnnualIncomeMinor: minor })}
					/>
					<MoneyInput
						currency="EUR"
						label="My monthly credit commitments"
						value={cl.draft.monthlyCommitmentsMinor}
						onchange={(minor) => cl.patch({ monthlyCommitmentsMinor: minor })}
					/>
				{/key}
			</div>

			<p class="consent">
				<span class="consent-mark" aria-hidden="true">
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
				Soft search — it won't affect my credit score.
			</p>

			{#if checkState === 'idle'}
				{#if !amountValid && amountHint}
					<p class="hint" role="status">{amountHint}</p>
				{/if}
				<div class="actions">
					<gok-button
						variant="primary"
						type="submit"
						{@attach setProps({ disabled: !amountValid })}
						{@attach on('click', checkEligibility)}
					>
						Check eligibility
					</gok-button>
				</div>
			{:else if checkState === 'checking'}
				<div class="pending" aria-live="polite">
					<gok-spinner size="l" accessible-label="Checking my eligibility"></gok-spinner>
					<gok-tag size="m" dot>Checking</gok-tag>
					<p class="quiet">Checking… this is a soft search and won't affect my score.</p>
				</div>
			{:else if eligibility.outcome === 'eligible'}
				<!-- Eligible: a calm positive panel (rule + icon + text, never colour alone). -->
				<div class="outcome outcome-eligible" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<path
								d="M5 12.5l4.5 4.5L19 7"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						Eligible — here's my limit
					</h3>
					<p class="outcome-reason">{eligibility.reason}</p>
					<div class="actions">
						<gok-button variant="primary" {@attach on('click', continueToOffer)}>
							Continue to my offer
						</gok-button>
						<button type="button" class="link-button" {@attach on('click', adjust)}>
							Adjust the figures
						</button>
					</div>
				</div>
			{:else if eligibility.outcome === 'referred'}
				<!-- Referred: an info panel — still proceed to an indicative offer. -->
				<div class="outcome outcome-referred" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							<path d="M12 11v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							<circle cx="12" cy="7.75" r="1.1" fill="currentColor" />
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						A closer look needed
					</h3>
					<p class="outcome-reason">{eligibility.reason}</p>
					<p class="quiet">
						I can still see the offer below — it's indicative until an underwriter confirms it.
					</p>
					<div class="actions">
						<gok-button variant="primary" {@attach on('click', continueToOffer)}>
							Continue to my offer
						</gok-button>
						<button type="button" class="link-button" {@attach on('click', adjust)}>
							Adjust the figures
						</button>
					</div>
				</div>
			{:else}
				<!-- Declined: plain, no-blame, forward-looking. No offer is shown. -->
				<div class="outcome outcome-declined" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							<path d="M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						I can't offer a credit line right now
					</h3>
					<p class="outcome-reason">{eligibility.reason}</p>

					<div class="alternatives">
						<p class="card-eyebrow gok-eyebrow">A few ways forward</p>
						<ul class="alt-list">
							<li>Ask for a lower limit to bring it within the income-based cap.</li>
							<li>A higher or more established income would change the assessment.</li>
							<li>Lowering my existing monthly commitments would help too.</li>
						</ul>
					</div>

					<div class="actions">
						<gok-button variant="primary" {@attach on('click', adjust)}>
							Adjust my application
						</gok-button>
						<gok-link href="/lending">Back to lending</gok-link>
					</div>
				</div>
			{/if}
		</form>
	{:else if step === 'offer'}
		<!-- Step 2 · Limit offer — the line disclosed in full. Representative APR ALWAYS
		     beside its worked example. -->
		<section class="step" aria-labelledby="offer-heading">
			<h2 id="offer-heading" class="step-title gok-headline-5">My credit line offer</h2>

			{#if eligibility.outcome === 'referred'}
				<gok-alert status="info">
					This offer is indicative — an underwriter will confirm it before the line opens.
				</gok-alert>
			{/if}

			<gok-card variant="filled">
				<p slot="header" class="card-eyebrow gok-eyebrow">My Flex credit line</p>
				<dl class="ledger">
					<div class="ledger-row">
						<dt class="ledger-label">Approved credit limit</dt>
						<dd class="ledger-value gok-tabular-nums">{eur(eligibility.offeredLimitMinor)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Representative APR</dt>
						<dd class="ledger-value gok-tabular-nums">{rate(eligibility.aprBps)} variable</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Cash-advance rate</dt>
						<dd class="ledger-value gok-tabular-nums">{rate(CASH_ADVANCE_APR_BPS)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Annual fee</dt>
						<dd class="ledger-value gok-tabular-nums">
							{ANNUAL_FEE_MINOR === 0 ? 'No annual fee' : eur(ANNUAL_FEE_MINOR)}
						</dd>
					</div>
				</dl>
				<!-- The representative example sits with the APR — never one without the other. -->
				<p class="example">{REPRESENTATIVE_EXAMPLE}</p>
			</gok-card>

			{#if isLowerLimit}
				<p class="quiet">
					This limit is {eur(eligibility.offeredLimitMinor)} — a little under the
					{eur(cl.draft.requestedLimitMinor)} I asked for, set by my income. I can take this limit or
					step back to adjust.
				</p>
			{/if}

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', backToAmount)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', continueToSign)}>
					Continue to sign
				</gok-button>
			</div>
		</section>
	{:else}
		<!-- Step 3 · E-sign hand-off to the shared D02 signing flow. -->
		<section class="step" aria-labelledby="sign-heading" aria-live="polite">
			<h2 id="sign-heading" class="step-title gok-headline-5" tabindex="-1" {@attach focusHeading}>
				Review and sign my credit agreement
			</h2>

			<p class="quiet">
				Everything's disclosed — my limit, the representative APR beside its example, the
				cash-advance rate, and the annual fee. The next step opens my credit agreement to read and
				sign. Nothing is binding until I sign.
			</p>

			<gok-card>
				<dl class="ledger">
					<div class="ledger-row">
						<dt class="ledger-label">Approved credit limit</dt>
						<dd class="ledger-value gok-tabular-nums">{eur(eligibility.offeredLimitMinor)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Representative APR</dt>
						<dd class="ledger-value gok-tabular-nums">{rate(eligibility.aprBps)} variable</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Cash-advance rate</dt>
						<dd class="ledger-value gok-tabular-nums">{rate(CASH_ADVANCE_APR_BPS)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">Annual fee</dt>
						<dd class="ledger-value gok-tabular-nums">
							{ANNUAL_FEE_MINOR === 0 ? 'No annual fee' : eur(ANNUAL_FEE_MINOR)}
						</dd>
					</div>
				</dl>
				<p class="example">{REPRESENTATIVE_EXAMPLE}</p>
			</gok-card>

			<p class="quiet">
				I have a <strong>14-day right to withdraw</strong> from the agreement once it's signed,
				without giving a reason — I'd repay anything I'd drawn, plus any interest accrued over those
				days.
			</p>

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', backToOffer)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', reviewAndSign)}>
					Review and sign
				</gok-button>
				<gok-link href="/lending">Back to lending</gok-link>
			</div>
		</section>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── Header ── */
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
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Step indicator ── */
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps-item {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.steps-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: 1;
	}

	.steps-label {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.steps-item.is-current {
		color: var(--gok-color-text);
	}

	.steps-item.is-current .steps-num {
		border-color: var(--gok-color-text);
	}

	.steps-item.is-done .steps-num {
		border-color: var(--gok-color-border-strong);
	}

	/* ── Step shell ── */
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		border: 0;
	}

	.step-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.step-title:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.quiet {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Consent line ── */
	.consent {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.consent-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		color: var(--gok-color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	/* ── Ledger (key/value) ── */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.ledger-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ledger-row:first-child {
		border-block-start: none;
	}

	.ledger-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ledger-value {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* The representative example reads as a quiet footnote tied to the APR above it. */
	.example {
		margin: 0;
		margin-block-start: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Pending check ── */
	.pending {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-700);
		text-align: center;
	}

	/* ── Outcome panels (rule + icon + text, never colour alone) ── */
	.outcome {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		max-inline-size: 46rem;
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-border-strong);
	}

	.outcome-eligible {
		border-block-start-color: var(--gok-color-primary);
	}

	.outcome-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: var(--gok-border-width-strong) solid currentcolor;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-text-muted);
	}

	.outcome-eligible .outcome-mark {
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.outcome-title:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.outcome-reason {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.alternatives {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.alt-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-inline-start: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* ── Utility ── */
	.link-button {
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.link-button:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}
</style>
