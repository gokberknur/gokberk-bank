<script lang="ts">
	// Two-factor — set up, change, or turn off the second factor. When 2FA is on I
	// can regenerate my recovery codes (behind step-up) or turn it off (behind a
	// danger step-up; blocked with an info alert when it's my only factor). When it's
	// off I enroll: pick a method, enter a simulated 6-digit code (the DS gok-otp —
	// nothing is verified server-side), then a step-up before it turns on.
	// Either way the fresh recovery codes are shown ONCE in a monospace card I dismiss
	// with "I've saved these". Every mutation runs on the step-up's confirm.
	import { security, type TwoFaMethod } from '$lib/state/security.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	const twoFa = $derived(security.twoFa);
	const enrolled = $derived(twoFa.enrolled);
	const lastFactor = $derived(security.isLastFactor);

	const METHOD_LABELS: Record<TwoFaMethod, string> = {
		app: 'Authenticator app',
		sms: 'Text message (SMS)'
	};

	// Recovery codes are surfaced once, after an enroll or a regenerate.
	let shownCodes = $state<string[] | null>(null);

	// Enroll draft (only meaningful while 2FA is off).
	let method = $state<TwoFaMethod>('app');
	let otp = $state('');
	const otpComplete = $derived(otp.replace(/\D/g, '').length === 6);

	function onMethod(e: Event) {
		method = (e as CustomEvent<{ value: string }>).detail.value as TwoFaMethod;
	}

	// One step-up gate for the page; `pending` runs on confirm.
	let su = $state<{
		open: boolean;
		title: string;
		consequence: string;
		confirmLabel: string;
		tone: 'default' | 'danger';
	}>({ open: false, title: '', consequence: '', confirmLabel: '', tone: 'default' });
	let pending: (() => void) | null = null;

	function askEnroll() {
		if (!otpComplete) return;
		su = {
			open: true,
			title: 'Turn on two-factor?',
			consequence: `This adds ${METHOD_LABELS[method].toLowerCase()} as a second step when I sign in.`,
			confirmLabel: 'Turn on 2FA',
			tone: 'default'
		};
		pending = () => {
			shownCodes = security.enrollTwoFa(method);
			otp = '';
		};
	}

	function askRegenerate() {
		su = {
			open: true,
			title: 'Generate new recovery codes?',
			consequence: 'This replaces my old recovery codes — the previous ones stop working.',
			confirmLabel: 'Generate codes',
			tone: 'default'
		};
		pending = () => {
			shownCodes = security.regenerateRecoveryCodes();
		};
	}

	function askTurnOff() {
		su = {
			open: true,
			title: 'Turn off two-factor?',
			consequence: "This removes the second step at sign-in — I'll rely on my passkeys alone.",
			confirmLabel: 'Turn off 2FA',
			tone: 'danger'
		};
		pending = () => {
			if (security.disableTwoFa()) shownCodes = null;
		};
	}

	function confirmStepUp() {
		su = { ...su, open: false };
		pending?.();
		pending = null;
	}

	function cancelStepUp() {
		su = { ...su, open: false };
		pending = null;
	}

	function dismissCodes() {
		shownCodes = null;
	}
</script>

<div class="area-head">
	<h2 class="area-title gok-headline-5">Two-factor authentication</h2>
	<p class="area-sub">
		A second step at sign-in, on top of my passkeys — so a stolen credential alone isn't enough.
	</p>
</div>

<div class="stack">
	{#if shownCodes}
		<!-- Recovery codes, shown once. Monospace, each used at most once. -->
		<gok-card>
			<div class="codes">
				<div class="codes-head">
					<p class="codes-eyebrow gok-eyebrow">Recovery codes</p>
					<h3 class="codes-title gok-headline-6">Save these somewhere safe</h3>
					<p class="codes-note">
						Each code works once if I ever lose my device. They won't be shown again.
					</p>
				</div>
				<ul class="code-grid">
					{#each shownCodes as code (code)}
						<li class="code gok-tabular-nums">{code}</li>
					{/each}
				</ul>
				<div class="codes-actions">
					<gok-button variant="primary" {@attach on('click', dismissCodes)}>
						I've saved these
					</gok-button>
				</div>
			</div>
		</gok-card>
	{/if}

	{#if enrolled}
		<!-- Status -->
		<gok-card>
			<div class="status">
				<span class="status-mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
						<path
							d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linejoin="round"
						/>
						<path
							d="M9 12l2 2 4-4"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				<div class="status-text">
					<p class="status-title">Two-factor is on</p>
					<p class="status-meta">Method · {twoFa.method ? METHOD_LABELS[twoFa.method] : '—'}</p>
				</div>
			</div>
		</gok-card>

		{#if lastFactor}
			<gok-alert status="info" open>
				<span slot="title">This is my only way to sign in</span>
				I can't turn off two-factor while it's the only thing that signs me in. To turn it off, I'll
				add a passkey first.
			</gok-alert>
		{/if}

		<div class="actions">
			<gok-button variant="secondary" {@attach on('click', askRegenerate)}>
				Regenerate recovery codes
			</gok-button>
			<button
				type="button"
				class="danger-outline"
				disabled={lastFactor}
				onclick={askTurnOff}
			>
				Turn off 2FA
			</button>
		</div>
	{:else}
		<!-- Enroll flow: method → simulated code → step-up. -->
		<gok-card>
			<div class="enroll">
				<div class="enroll-field">
					<gok-segmented
						label="Second-factor method"
						{@attach setProps({ value: method })}
						{@attach on('change', onMethod)}
					>
						<gok-segmented-item value="app">Authenticator app</gok-segmented-item>
						<gok-segmented-item value="sms">Text message</gok-segmented-item>
					</gok-segmented>
				</div>

				<div class="enroll-field">
					<gok-otp
						label="6-digit verification code"
						helper={`Enter the 6-digit code from my ${method === 'app' ? 'authenticator app' : 'text message'}.`}
						{@attach setProps({ value: otp })}
						{@attach on('input', (e) => (otp = (e as CustomEvent<{ value: string }>).detail.value))}
					></gok-otp>
				</div>

				<div class="enroll-actions">
					<gok-button
						variant="primary"
						{@attach setProps({ disabled: !otpComplete })}
						{@attach on('click', askEnroll)}
					>
						Verify and turn on
					</gok-button>
				</div>
			</div>
		</gok-card>
	{/if}
</div>

<StepUp
	open={su.open}
	title={su.title}
	consequence={su.consequence}
	confirmLabel={su.confirmLabel}
	tone={su.tone}
	onConfirm={confirmStepUp}
	onCancel={cancelStepUp}
/>

<style>
	.area-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin-block-end: var(--gok-space-400);
	}

	.area-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.area-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	/* Status */
	.status {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.status-mark {
		display: inline-flex;
		flex: none;
		color: var(--gok-color-primary);
	}

	.status-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.status-title {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.status-meta {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Actions row */
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.danger-outline {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.5rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-error);
		border-radius: var(--gok-radius-s);
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		transition: background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.danger-outline:hover:not(:disabled) {
		background: var(--gok-color-surface-strong);
	}

	.danger-outline:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.danger-outline:disabled {
		border-color: var(--gok-color-border);
		color: var(--gok-color-text-disabled);
		cursor: not-allowed;
	}

	/* Enroll */
	.enroll {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.enroll-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.enroll-actions {
		display: flex;
	}

	/* Recovery codes */
	.codes {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.codes-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.codes-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.codes-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.codes-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.code-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.code {
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-s);
		background: var(--gok-color-surface-strong);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-regular-size);
		letter-spacing: 0.06em;
		text-align: center;
		color: var(--gok-color-text);
	}

	.codes-actions {
		display: flex;
	}

	@media (max-width: 24.375rem) {
		.code-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
