<script lang="ts">
	// The card-number reveal — a sensitive, deliberate act, so it rides the step-up
	// idiom (mirroring the payments confirm) in two phases:
	//   1. verify   — "Approve with passkey" (SIMULATED here; real OTP / passkey is
	//                  F08 / F12). Nothing is shown until it resolves.
	//   2. revealed — full PAN / expiry / CVV, each copyable, under a depleting
	//                  countdown. At zero the dialog auto-closes and re-masks.
	//
	// The countdown is a rune timer (a ticking counter, never Date.now()) that
	// PAUSES whenever the revealed panel is hovered or holds focus (WCAG 2.2.1 —
	// the user controls the timing while they read or copy). Escape / close also
	// re-masks by resetting to the verify phase.
	import { toast } from '$lib/state/toasts.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import type { Card } from '$lib/data/types';

	let {
		card,
		open,
		onClose,
		seconds = 20
	}: { card: Card; open: boolean; onClose: () => void; seconds?: number } = $props();

	type Phase = 'verify' | 'revealed';
	let phase = $state<Phase>('verify');
	// Starts at 0 (the verify phase shows no countdown); `approve` sets it to
	// `seconds` when the reveal begins, so the prop is only read inside closures.
	let remaining = $state(0);

	// Pause while the user is reading or copying — hover or focus within the panel.
	let hovered = $state(false);
	let focusWithin = $state(false);
	const paused = $derived(hovered || focusWithin);

	const heading = $derived(phase === 'verify' ? "Verify it's you" : 'Card number');
	const maskedPan = $derived(`•••• •••• •••• ${card.last4}`);

	// A coarse, polite announcement — it changes only at thresholds, so a screen
	// reader isn't spammed every second, yet the auto-hide is never a surprise.
	const announce = $derived(
		phase !== 'revealed'
			? ''
			: remaining <= 0
				? 'Card number hidden.'
				: remaining <= 5
					? `Card number hides in ${remaining} seconds.`
					: remaining <= 10
						? 'Card number hides in 10 seconds.'
						: ''
	);

	// SIMULATED step-up — real passkey / OTP verification is F08 / F12. On success
	// we move to the revealed phase and (re)start the countdown.
	function approve() {
		phase = 'revealed';
		remaining = seconds;
	}

	// Reset to masked and ask the parent to close (it owns `open`). Used by the
	// footer, the dialog's own dismiss (gok-cancel / gok-close), and the auto-hide.
	function closeAndReset() {
		phase = 'verify';
		remaining = seconds;
		hovered = false;
		focusWithin = false;
		onClose();
	}

	// The countdown: one interval while revealed + open. It ticks a counter (no
	// wall-clock), holds while `paused`, and auto-closes at zero. Re-created only
	// when `open`/`phase` change — never on every tick — so the timer is stable.
	$effect(() => {
		if (!open || phase !== 'revealed') return;
		const id = setInterval(() => {
			if (paused) return;
			remaining -= 1;
			if (remaining <= 0) closeAndReset();
		}, 1000);
		return () => clearInterval(id);
	});

	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast('Copied', { status: 'success' });
		} catch {
			// Clipboard unavailable or denied — fail quietly rather than surface the
			// sensitive value anywhere else.
		}
	}
</script>

<gok-dialog
	size="s"
	{@attach setProps({ open, heading })}
	{@attach on('gok-cancel', closeAndReset)}
	{@attach on('gok-close', closeAndReset)}
>
	{#if phase === 'verify'}
		<div class="verify">
			<p class="verify-body">
				Confirm it's you to show the full number for your {card.network === 'visa'
					? 'Visa'
					: 'Mastercard'} ending {card.last4}.
			</p>
			<gok-button variant="primary" {@attach on('click', approve)}>
				Approve with passkey
			</gok-button>
		</div>
	{:else}
		<!-- The revealed panel: hover / focus here pauses the auto-hide. -->
		<div
			class="panel"
			role="group"
			aria-label="Card details"
			onpointerenter={() => (hovered = true)}
			onpointerleave={() => (hovered = false)}
			onfocusin={() => (focusWithin = true)}
			onfocusout={() => (focusWithin = false)}
		>
			<dl class="fields">
				<div class="field">
					<dt class="field-label gok-eyebrow">Card number</dt>
					<dd class="field-value">
						<span class="field-text nums">{card.pan}</span>
						<gok-button
							variant="secondary"
							size="s"
							accessible-label="Copy card number"
							{@attach on('click', () => copy(card.pan))}
						>
							Copy
						</gok-button>
					</dd>
				</div>

				<div class="field">
					<dt class="field-label gok-eyebrow">Expiry</dt>
					<dd class="field-value">
						<span class="field-text nums">{card.expiry}</span>
						<gok-button
							variant="secondary"
							size="s"
							accessible-label="Copy expiry"
							{@attach on('click', () => copy(card.expiry))}
						>
							Copy
						</gok-button>
					</dd>
				</div>

				<div class="field">
					<dt class="field-label gok-eyebrow">CVV</dt>
					<dd class="field-value">
						<span class="field-text nums">{card.cvv}</span>
						<gok-button
							variant="secondary"
							size="s"
							accessible-label="Copy CVV"
							{@attach on('click', () => copy(card.cvv))}
						>
							Copy
						</gok-button>
					</dd>
				</div>
			</dl>

			<p class="countdown nums">
				{paused ? 'Paused while you read' : `Hides in ${remaining}s`}
			</p>
		</div>

		<!-- Coarse polite announcement of the auto-hide (kept off-screen). -->
		<p class="sr-only" role="status" aria-live="polite">{announce}</p>
	{/if}

	<div slot="footer" class="footer">
		{#if phase === 'verify'}
			<p class="masked nums" aria-hidden="true">{maskedPan}</p>
		{/if}
		<gok-button variant="secondary" {@attach on('click', closeAndReset)}>
			{phase === 'revealed' ? 'Done' : 'Cancel'}
		</gok-button>
	</div>
</gok-dialog>

<style>
	.verify {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.verify-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.field-value {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		margin: 0;
	}

	.field-text {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		letter-spacing: 0.04em;
		color: var(--gok-color-text);
	}

	.countdown {
		margin: 0;
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		inline-size: 100%;
	}

	.masked {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		letter-spacing: 0.08em;
	}

	.nums {
		font-variant-numeric: tabular-nums;
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		overflow: hidden;
		white-space: nowrap;
	}
</style>
