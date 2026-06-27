<script lang="ts">
	// O01 · Onboarding + KYC wizard — the app's front door, OUTSIDE the (app) shell.
	// A branded full-page frame hosts the resumable F05 wizard: this host renders the
	// wordmark + a one-line trust note, then either the DONE view (once an IBAN is
	// issued) or the <Wizard> shell. The shell already owns the eyebrow, the
	// gok-progress "k of 6", the step rail, the active heading, Back/Continue, and
	// focus movement — so this only mounts the right step PANEL by `wizard.current.id`
	// and wires onComplete. Interop is strictly setProps/on; tokens/roles only.
	import { goto } from '$app/navigation';
	import { on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { getPlan } from '$lib/onboarding/kyc';
	import { formatMoney } from '$lib/format';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import ProfileStep from '$lib/components/onboarding/ProfileStep.svelte';
	import AddressStep from '$lib/components/onboarding/AddressStep.svelte';
	import IdentityStep from '$lib/components/onboarding/IdentityStep.svelte';
	import VerifyStep from '$lib/components/onboarding/VerifyStep.svelte';
	import PlanPicker from '$lib/components/onboarding/PlanPicker.svelte';
	import FundingStep from '$lib/components/onboarding/FundingStep.svelte';

	// Local completion flag. The DONE view shows when an IBAN has been issued (a
	// resumed, already-finished draft) OR the user just completed the flow.
	let done = $state(false);
	// Bumped on Restart to force a clean remount of the wizard + its seeded fields.
	let flowKey = $state(0);

	const isDone = $derived(done || Boolean(onboarding.data.issuedIban));
	const plan = $derived(getPlan(onboarding.data.planId));
	const topUpMinor = $derived(onboarding.data.topUpMinor);

	function handleComplete() {
		onboarding.complete();
		done = true;
	}

	function restart() {
		onboarding.restart();
		done = false;
		flowKey += 1;
	}

	function goHome() {
		goto('/home');
	}

	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Open an account · gökberk bank</title>
</svelte:head>

<div class="onboarding">
	<header class="masthead">
		<a class="wordmark" href="/home">gökberk<span class="dot">.</span> bank</a>
		<p class="trust">A few quick steps to open my account. Everything saves as I go.</p>
	</header>

	{#if isDone}
		<!-- DONE: calm confidence, not confetti. The issued IBAN/BIC + the plan. -->
		<section class="done">
			<p class="eyebrow gok-eyebrow">My account is open</p>
			<h1 class="done-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
				My IBAN is ready
			</h1>

			<gok-alert status="success">
				Welcome to gökberk bank. My EUR account is open and ready to use.
			</gok-alert>

			<gok-card variant="filled" class="iban-card">
				<p slot="header" class="card-eyebrow gok-eyebrow">My account</p>
				<dl class="ledger">
					<div class="row">
						<dt>IBAN</dt>
						<dd class="iban gok-tabular-nums">{onboarding.data.issuedIbanPretty}</dd>
					</div>
					<div class="row">
						<dt>BIC</dt>
						<dd class="mono">{onboarding.data.issuedBic}</dd>
					</div>
					<div class="row">
						<dt>Plan</dt>
						<dd>{plan.name}</dd>
					</div>
				</dl>
			</gok-card>

			{#if topUpMinor > 0}
				<p class="topup-line">
					My opening top-up of
					<strong class="gok-tabular-nums">{formatMoney(topUpMinor, 'EUR')}</strong>
					will land in my EUR wallet shortly.
				</p>
			{:else}
				<p class="topup-line">My balance starts at zero — I can add money whenever I'm ready.</p>
			{/if}

			<div class="done-actions">
				<gok-button variant="primary" {@attach on('click', goHome)}>Go to my home</gok-button>
			</div>
		</section>
	{:else}
		{#key flowKey}
			<Wizard wizard={onboarding.wizard} submitLabel="Open my account" onComplete={handleComplete}>
				{#if onboarding.wizard.current.id === 'profile'}
					<ProfileStep />
				{:else if onboarding.wizard.current.id === 'address'}
					<AddressStep />
				{:else if onboarding.wizard.current.id === 'identity'}
					<IdentityStep />
				{:else if onboarding.wizard.current.id === 'verify'}
					<VerifyStep />
				{:else if onboarding.wizard.current.id === 'plan'}
					<PlanPicker />
				{:else if onboarding.wizard.current.id === 'funding'}
					<FundingStep />
				{/if}
			</Wizard>
		{/key}

		{#if onboarding.hasDraft}
			<p class="restart">
				Starting fresh?
				<button type="button" class="restart-button" onclick={restart}>Restart</button>
			</p>
		{/if}
	{/if}
</div>

<style>
	.onboarding {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-600);
	}

	/* --- Masthead --- */
	.masthead {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.wordmark {
		align-self: flex-start;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		letter-spacing: var(--gok-type-headline-6-tracking);
		color: var(--gok-color-text);
		text-decoration: none;
	}

	.wordmark:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.dot {
		color: var(--gok-color-primary);
	}

	.trust {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Restart affordance (quiet text button) --- */
	.restart {
		margin: 0;
		text-align: center;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.restart-button {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.restart-button:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* --- DONE view --- */
	.done {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.done-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.done-title:focus {
		outline: none;
	}

	.iban-card {
		display: block;
	}

	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

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

	.iban {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-large-size);
		letter-spacing: 0.04em;
	}

	.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	.topup-line {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.topup-line strong {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.done-actions {
		display: flex;
		margin-block-start: var(--gok-space-200);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}

		.iban {
			font-size: var(--gok-type-body-regular-size);
		}
	}
</style>
