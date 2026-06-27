<script lang="ts">
	// F12 step-up — the reusable re-auth gate every destructive security action
	// opens before it runs. A *cancellable* gok-dialog (NOT no-dismiss — declining a
	// step-up must always be possible, and declining has no side effect) that names
	// the action, states the one-line consequence, then asks me to prove it's me with
	// a SIMULATED "Approve with passkey" (real WebAuthn is out of scope — this flips a
	// local verified flag, mirroring OrderTicket / RevealDialog). The confirm stays
	// disabled until I've verified, and the verified flag resets every time it opens.
	//
	// App-local composite (dogfooding F12): the DS ships no re-auth dialog, so this
	// fills the gap by composing gok-dialog + gok-button + tokens; it never restyles a
	// DS component. The danger confirm is outline/text in the status colour — an
	// app-local <button>, never a solid red fill (per brand).
	import { setProps, on } from '$lib/wc.svelte';

	let {
		open,
		title,
		consequence,
		confirmLabel,
		tone = 'default',
		onConfirm,
		onCancel
	}: {
		/** Whether the step-up dialog is shown (driven by the host). */
		open: boolean;
		/** The dialog heading — names the action ("Revoke iPhone 16 Pro?"). */
		title: string;
		/** One calm line: what confirming will do. */
		consequence: string;
		/** The verb on the confirm button once I've verified. */
		confirmLabel: string;
		/** `danger` renders the confirm as outline/text in the status colour. */
		tone?: 'default' | 'danger';
		/** Run after I've verified and confirmed. */
		onConfirm: () => void;
		/** Run when I dismiss the step-up (no side effect). */
		onCancel: () => void;
	} = $props();

	// Identity check — SIMULATED. Real passkey/OTP verification is out of scope. The
	// flag is reset on every close path (cancel or confirm), so each time the host
	// reopens the dialog it starts unverified — no effect-driven reset needed.
	let verified = $state(false);

	function approveWithPasskey() {
		verified = true;
	}

	function handleCancel() {
		verified = false;
		onCancel();
	}

	function confirm() {
		if (!verified) return;
		verified = false;
		onConfirm();
	}
</script>

<gok-dialog
	size="s"
	tone={tone === 'danger' ? 'danger' : undefined}
	heading={title}
	{@attach setProps({ open })}
	{@attach on('gok-cancel', handleCancel)}
	{@attach on('gok-close', handleCancel)}
>
	<div class="body">
		<p class="consequence">{consequence}</p>

		<div class="stepup">
			<p class="stepup-key gok-eyebrow">Verify it's me</p>
			{#if verified}
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
				<p class="stepup-text">
					A quick identity check keeps this action mine alone.
				</p>
				<gok-button variant="secondary" {@attach on('click', approveWithPasskey)}>
					Approve with passkey
				</gok-button>
			{/if}
		</div>
	</div>

	<div slot="footer" class="actions">
		<gok-button variant="secondary" {@attach on('click', handleCancel)}>Cancel</gok-button>
		{#if tone === 'danger'}
			<!-- Destructive confirm: outline/text in the status colour, never a solid
			     red fill. App-local <button> so the rule is honoured without restyling
			     a DS component. -->
			<button
				type="button"
				class="danger-confirm"
				disabled={!verified}
				onclick={confirm}
			>
				{confirmLabel}
			</button>
		{:else}
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !verified })}
				{@attach on('click', confirm)}
			>
				{confirmLabel}
			</gok-button>
		{/if}
	</div>
</gok-dialog>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.consequence {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.stepup {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.stepup-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.stepup-text {
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

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* Destructive confirm — outline/text in the status colour, transparent fill. */
	.danger-confirm {
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
		transition:
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.danger-confirm:hover:not(:disabled) {
		background: var(--gok-color-surface-strong);
	}

	.danger-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.danger-confirm:disabled {
		border-color: var(--gok-color-border);
		color: var(--gok-color-text-disabled);
		cursor: not-allowed;
	}
</style>
