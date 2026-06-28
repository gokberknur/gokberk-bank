<script lang="ts">
	// O02 · Create account — a full-page route OUTSIDE the (app) shell. This is the
	// front door before KYC: collect an email + a password (confirmed), then hand off
	// to the resumable onboarding wizard at /onboarding (where the real account opens).
	// No backend: validation is local and no-blame; interop is setProps/on, values read
	// off events, never bind: on a gok-* element.
	import { goto } from '$app/navigation';
	import { on, setProps } from '$lib/wc.svelte';

	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let submitting = $state(false);
	// A single, no-blame form-level message — never points a finger at one field.
	let formError = $state<string | null>(null);

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const emailLooksValid = $derived(/.+@.+\..+/.test(email.trim()));
	const passwordLongEnough = $derived(password.length >= 8);
	const passwordsMatch = $derived(confirm.length === 0 || password === confirm);

	function onEmail(event: Event) {
		email = (event.target as HTMLInputElement).value;
		formError = null;
	}

	function onPassword(event: Event) {
		password = (event.target as HTMLInputElement).value;
		formError = null;
	}

	function onConfirm(event: Event) {
		confirm = (event.target as HTMLInputElement).value;
		formError = null;
	}

	async function createAccount() {
		if (submitting) return;

		if (!emailLooksValid) {
			formError = 'That email doesn’t look complete yet. Check it and try again.';
			return;
		}
		if (!passwordLongEnough) {
			formError = 'A password needs at least 8 characters.';
			return;
		}
		if (password !== confirm) {
			formError = 'The two passwords don’t match yet. Re-enter them to continue.';
			return;
		}

		submitting = true;
		await sleep(450);
		submitting = false; // reward-early re-enable
		goto('/onboarding');
	}

	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Create an account · gökberk bank</title>
</svelte:head>

<div class="page">
	<section class="auth">
		<header class="masthead">
			<a class="wordmark" href="/">gökberk<span class="dot">.</span> bank</a>
		</header>

		<div class="card">
			<div class="head">
				<p class="eyebrow gok-eyebrow">Create account</p>
				<h1 class="title gok-headline-4" tabindex="-1" {@attach focusHeading}>Open my account</h1>
				<p class="sub gok-body-regular">A few details to start. I’ll verify my identity next.</p>
			</div>

			{#if formError}
				<gok-alert status="error">{formError}</gok-alert>
			{/if}

			<form class="form" aria-label="Create account" onsubmit={(e) => e.preventDefault()}>
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
					autocomplete="new-password"
					placeholder="At least 8 characters"
					{@attach setProps({ value: password })}
					{@attach on('input', onPassword)}
					{@attach on('change', onPassword)}
				></gok-input>

				<gok-input
					label="Confirm my password"
					type="password"
					autocomplete="new-password"
					placeholder="Type it once more"
					{@attach setProps({ value: confirm, error: passwordsMatch ? '' : 'These don’t match yet.' })}
					{@attach on('input', onConfirm)}
					{@attach on('change', onConfirm)}
				></gok-input>

				<gok-button
					variant="primary"
					{@attach setProps({ pending: submitting })}
					{@attach on('click', createAccount)}
				>
					Create account
				</gok-button>
			</form>

			<p class="aux-line gok-body-small">
				Already with gökberk bank? <a href="/login">Sign in</a>
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
</style>
