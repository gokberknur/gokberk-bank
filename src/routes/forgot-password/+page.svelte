<script lang="ts">
	// O02 · Forgot password — a full-page route OUTSIDE the (app) shell. Anti-enumeration
	// is the whole point: "Send code" ALWAYS reports the same thing (AUTH_COPY.resetSent),
	// so the screen never reveals whether an email is registered. Then a 6-digit code + a
	// new password; on a good code it lands back on /login. No backend: the code is checked
	// locally against MOCK_OTP (we must NOT call auth.verifyOtp here — that would sign in).
	// Interop is setProps/on; the OtpInput is an app-local composite, so bind:value is fine.
	import { goto } from '$app/navigation';
	import { on, setProps } from '$lib/wc.svelte';
	import { AUTH_COPY, MOCK_OTP } from '$lib/auth/auth';
	import OtpInput from '$lib/components/security/OtpInput.svelte';

	type Stage = 'request' | 'reset' | 'done';

	let stage = $state<Stage>('request');
	let email = $state('');
	let code = $state('');
	let password = $state('');
	let submitting = $state(false);
	let resetError = $state<string | null>(null);

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const codeComplete = $derived(code.length === 6);
	const passwordLongEnough = $derived(password.length >= 8);
	const canReset = $derived(codeComplete && passwordLongEnough);
	const otpStatus = $derived(codeComplete ? 'All six digits entered.' : '');

	function onEmail(event: Event) {
		email = (event.target as HTMLInputElement).value;
	}

	function onPassword(event: Event) {
		password = (event.target as HTMLInputElement).value;
		resetError = null;
	}

	// Always the same outcome, whatever the email — never confirm it exists.
	async function sendCode() {
		if (submitting) return;
		submitting = true;
		await sleep(450);
		submitting = false;
		stage = 'reset';
	}

	async function resetPassword() {
		if (submitting || !canReset) return;
		submitting = true;
		await sleep(450);
		if (code.trim() !== MOCK_OTP) {
			resetError = AUTH_COPY.badOtp;
			code = '';
			submitting = false; // reward-early re-enable
			return;
		}
		submitting = false;
		stage = 'done';
		// A calm beat on the success, then back to sign in.
		setTimeout(() => goto('/login'), 1400);
	}

	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Reset my password · gökberk bank</title>
</svelte:head>

<div class="page">
	<section class="auth">
		<header class="masthead">
			<a class="wordmark" href="/">gökberk<span class="dot">.</span> bank</a>
		</header>

		<div class="card">
			{#if stage === 'request'}
				<div class="head">
					<p class="eyebrow gok-eyebrow">Reset password</p>
					<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>
						Reset my password
					</h1>
					<p class="sub gok-body-regular">
						I’ll enter my email and send myself a 6-digit code to set a new password.
					</p>
				</div>

				<form class="form" aria-label="Request a reset code" onsubmit={(e) => e.preventDefault()}>
					<gok-input
						label="My email"
						type="email"
						autocomplete="username"
						placeholder="me@example.com"
						{@attach setProps({ value: email })}
						{@attach on('input', onEmail)}
						{@attach on('change', onEmail)}
					></gok-input>

					<gok-button
						variant="primary"
						{@attach setProps({ pending: submitting })}
						{@attach on('click', sendCode)}
					>
						Send code
					</gok-button>
				</form>

				<p class="aux-line gok-body-small"><a href="/login">Back to sign in</a></p>
			{:else if stage === 'reset'}
				<div class="head">
					<p class="eyebrow gok-eyebrow">Check my email</p>
					<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>Enter the code</h1>
				</div>

				<gok-alert status="info">{AUTH_COPY.resetSent}</gok-alert>

				{#if resetError}
					<gok-alert status="error">{resetError}</gok-alert>
				{/if}

				<form class="form" aria-label="Set a new password" onsubmit={(e) => e.preventDefault()}>
					<div class="otp-field">
						<span class="field-label gok-body-small">My code</span>
						<OtpInput bind:value={code} label="My 6-digit code" describedBy="reset-otp-hint" />
						<p id="reset-otp-hint" class="hint gok-footnote">{AUTH_COPY.otpHint}</p>
						<p class="sr-only" aria-live="polite">{otpStatus}</p>
					</div>

					<gok-input
						label="My new password"
						type="password"
						autocomplete="new-password"
						placeholder="At least 8 characters"
						{@attach setProps({ value: password })}
						{@attach on('input', onPassword)}
						{@attach on('change', onPassword)}
					></gok-input>

					<gok-button
						variant="primary"
						{@attach setProps({ disabled: !canReset, pending: submitting })}
						{@attach on('click', resetPassword)}
					>
						Set new password
					</gok-button>
				</form>

				<p class="aux-line gok-body-small"><a href="/login">Back to sign in</a></p>
			{:else}
				<div class="head">
					<p class="eyebrow gok-eyebrow">All set</p>
					<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>
						My password is updated
					</h1>
				</div>

				<gok-alert status="success">
					My new password is saved. Taking me back to sign in.
				</gok-alert>

				<p class="aux-line gok-body-small"><a href="/login">Continue to sign in</a></p>
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

	.field-label {
		color: var(--gok-color-text);
	}

	.hint {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.aux-line {
		margin: 0;
		text-align: center;
		color: var(--gok-color-text-muted);
	}

	.aux-line a {
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.aux-line a:focus-visible {
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
