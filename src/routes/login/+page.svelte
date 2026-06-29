<script lang="ts">
	// O02 · Sign in — a full-page route OUTSIDE the (app) shell (sibling of /onboarding),
	// so it renders as a centered, branded card with no rail or navbar. Two stages on the
	// same screen: credentials, then an inline 2FA step-up (a 6-digit code OR my passkey).
	// `auth.pendingEmail` being non-null is the signal that the password step passed —
	// that's what flips this to the 2FA stage. Interop is strictly setProps/on with values
	// read off events; the DS gok-otp takes `value` as a DOM property and reports changes
	// on its `input` event.
	import { goto } from '$app/navigation';
	import { on, setProps } from '$lib/wc.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { AUTH_COPY, SEEDED_EMAIL } from '$lib/auth/auth';

	// The seeded email is prefilled as a demo convenience; the password is mine to type.
	let email = $state(SEEDED_EMAIL);
	let password = $state('');
	let code = $state('');
	// A short, simulated wait so the primary's busy state is honest, not a flicker.
	let submitting = $state(false);

	// pendingEmail !== null ⇒ the credentials passed; show the 2FA step.
	const onSecondStep = $derived(auth.pendingEmail !== null);
	const codeComplete = $derived(code.length === 6);

	// No-blame error copy, mapped from the flow's error flag.
	const errorMessage = $derived.by(() => {
		switch (auth.error) {
			case 'bad-credentials':
				return AUTH_COPY.badCredentials;
			case 'rate-limited':
				return AUTH_COPY.rateLimited;
			case 'bad-otp':
				return AUTH_COPY.badOtp;
			default:
				return null;
		}
	});

	// A polite, screen-reader-only status for the OTP step.
	const otpStatus = $derived(codeComplete ? 'All six digits entered.' : '');

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	function onEmail(event: Event) {
		email = (event.target as HTMLInputElement).value;
		auth.clearError();
	}

	function onPassword(event: Event) {
		password = (event.target as HTMLInputElement).value;
		auth.clearError();
	}

	async function attemptCredentials() {
		if (submitting) return;
		submitting = true;
		await sleep(450);
		const ok = auth.submitCredentials(email, password);
		submitting = false; // reward-early: re-enable the moment we know
		if (ok) code = '';
	}

	async function verifyCode() {
		if (submitting || !codeComplete) return;
		submitting = true;
		await sleep(450);
		const ok = auth.verifyOtp(code);
		submitting = false;
		if (ok) goto('/home');
		else code = ''; // clear so I can retype cleanly
	}

	async function usePasskey() {
		if (submitting) return;
		submitting = true;
		await sleep(450);
		auth.passkey();
		submitting = false;
		goto('/home');
	}

	// Move focus to the heading as each stage appears, so the change is announced.
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Sign in · gökberk bank</title>
</svelte:head>

<div class="page">
	<section class="auth">
		<header class="masthead">
			<a class="wordmark" href="/">gökberk<span class="dot">.</span> bank</a>
		</header>

		<div class="card">
			{#if onSecondStep}
				<!-- Stage 2 · step-up: a 6-digit code or my passkey. -->
				<div class="head">
					<p class="eyebrow gok-eyebrow">Two-step</p>
					<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>Confirm it's me</h1>
					<p class="sub gok-body-regular">
						I sent a 6-digit code to {auth.pendingEmail}. Enter it below, or use my passkey.
					</p>
				</div>

				{#if errorMessage}
					<gok-alert status="error">{errorMessage}</gok-alert>
				{/if}

				<form class="form" aria-label="Two-step verification" onsubmit={(e) => e.preventDefault()}>
					<div class="otp-field">
						<gok-otp
							label="My 6-digit code"
							helper={AUTH_COPY.otpHint}
							reserve-message
							{@attach setProps({ value: code })}
							{@attach on('input', (e) => (code = (e as CustomEvent<{ value: string }>).detail.value))}
						></gok-otp>
						<p class="sr-only" aria-live="polite">{otpStatus}</p>
					</div>

					<gok-button
						variant="primary"
						{@attach setProps({ disabled: !codeComplete, pending: submitting })}
						{@attach on('click', verifyCode)}
					>
						Verify
					</gok-button>
				</form>

				<div class="alt">
					<span class="alt-rule" aria-hidden="true"></span>
					<span class="alt-label gok-footnote">or</span>
					<span class="alt-rule" aria-hidden="true"></span>
				</div>

				<gok-button variant="secondary" class="block" {@attach on('click', usePasskey)}>
					Use my passkey
				</gok-button>
			{:else}
				<!-- Stage 1 · credentials. -->
				<div class="head">
					<p class="eyebrow gok-eyebrow">Sign in</p>
					<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>
						Sign in to my bank
					</h1>
					<p class="sub gok-body-regular">Welcome back.</p>
				</div>

				{#if errorMessage}
					<gok-alert status="error">{errorMessage}</gok-alert>
				{/if}

				<form class="form" aria-label="Sign in" onsubmit={(e) => e.preventDefault()}>
					<gok-input
						label="My email"
						type="email"
						autocomplete="username"
						placeholder="me@example.com"
						{@attach setProps({ value: email })}
						{@attach on('input', onEmail)}
						{@attach on('change', onEmail)}
					></gok-input>

					<gok-input
						label="My password"
						type="password"
						autocomplete="current-password"
						placeholder="My password"
						{@attach setProps({ value: password })}
						{@attach on('input', onPassword)}
						{@attach on('change', onPassword)}
					></gok-input>

					<gok-button
						variant="primary"
						{@attach setProps({ pending: submitting })}
						{@attach on('click', attemptCredentials)}
					>
						Sign in
					</gok-button>
				</form>

				<div class="aux">
					<a href="/forgot-password">Forgot my password?</a>
					<p class="aux-line gok-body-small">
						New to gökberk bank? <a href="/register">Create an account</a>
					</p>
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-block-size: 100dvh;
		padding-inline: var(--gok-space-400);
		padding-block: var(--gok-space-700);
	}

	.auth {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--gok-space-600);
		inline-size: 100%;
		max-inline-size: 26rem;
	}

	.masthead {
		display: flex;
		justify-content: center;
	}

	.wordmark {
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

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		inline-size: 100%;
		padding: var(--gok-space-600);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.title:focus {
		outline: none;
	}

	.sub {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.otp-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	/* The primary stays the single earned accent; this just makes the secondary
	   passkey button fill the column to read as a true alternative. */
	.block {
		display: block;
	}

	.alt {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.alt-rule {
		flex: 1 1 auto;
		block-size: var(--gok-border-width-hairline);
		background: var(--gok-color-border);
	}

	.alt-label {
		color: var(--gok-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.aux {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		text-align: center;
	}

	.aux-line {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.aux a {
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.aux a:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
