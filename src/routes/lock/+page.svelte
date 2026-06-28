<script lang="ts">
	// O02 · Lock screen — a full-page route OUTSIDE the (app) shell. The session is held,
	// not signed out: a passkey or the 6-digit code resumes it and returns to /home. The
	// frame is dimmed with a scrim to read as "paused". No backend; the code is checked by
	// the auth flow (auth.unlock), which preserves the route. Interop is setProps/on; the
	// OtpInput is an app-local Svelte composite, so bind:value is fine.
	import { goto } from '$app/navigation';
	import { on, setProps } from '$lib/wc.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { AUTH_COPY } from '$lib/auth/auth';
	import OtpInput from '$lib/components/security/OtpInput.svelte';

	let code = $state('');
	let submitting = $state(false);

	const codeComplete = $derived(code.length === 6);
	const otpStatus = $derived(codeComplete ? 'All six digits entered.' : '');
	const errorMessage = $derived(auth.error === 'bad-otp' ? AUTH_COPY.badOtp : null);

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	async function unlock() {
		if (submitting || !codeComplete) return;
		submitting = true;
		await sleep(450);
		const ok = auth.unlock(code);
		submitting = false; // reward-early re-enable
		if (ok) goto('/home');
		else code = '';
	}

	async function unlockWithPasskey() {
		if (submitting) return;
		submitting = true;
		await sleep(450);
		auth.unlockWithPasskey();
		submitting = false;
		goto('/home');
	}

	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Locked · gökberk bank</title>
</svelte:head>

<div class="page">
	<section class="auth">
		<header class="masthead">
			<span class="wordmark">gökberk<span class="dot">.</span> bank</span>
		</header>

		<div class="card">
			<div class="head">
				<p class="eyebrow gok-eyebrow">Locked</p>
				<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>I’m locked</h1>
				<p class="sub gok-body-regular">
					I stepped away, so I paused things. A passkey or my code picks up right where I left off.
				</p>
			</div>

			{#if errorMessage}
				<gok-alert status="error">{errorMessage}</gok-alert>
			{/if}

			<form class="form" aria-label="Unlock" onsubmit={(e) => e.preventDefault()}>
				<div class="otp-field">
					<span class="field-label gok-body-small">My code</span>
					<OtpInput bind:value={code} label="My 6-digit code" describedBy="lock-otp-hint" />
					<p id="lock-otp-hint" class="hint gok-footnote">{AUTH_COPY.otpHint}</p>
					<p class="sr-only" aria-live="polite">{otpStatus}</p>
				</div>

				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !codeComplete, pending: submitting })}
					{@attach on('click', unlock)}
				>
					Unlock
				</gok-button>
			</form>

			<div class="alt">
				<span class="alt-rule" aria-hidden="true"></span>
				<span class="alt-label gok-footnote">or</span>
				<span class="alt-rule" aria-hidden="true"></span>
			</div>

			<gok-button variant="secondary" class="block" {@attach on('click', unlockWithPasskey)}>
				Use my passkey
			</gok-button>

			<p class="aux-line gok-body-small">
				Not me? <a href="/login">Sign in as someone else</a>
			</p>
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
		/* A scrim over the canvas gives the held session its "paused" dimness. */
		background: var(--gok-color-scrim);
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
