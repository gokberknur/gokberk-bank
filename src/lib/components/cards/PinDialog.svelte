<script lang="ts">
	// C04 · PIN view / change — one gok-dialog with an internal phase machine for the
	// two PIN moments: showing it and changing it. Both are sensitive, so showing the
	// PIN rides the step-up gate (mirroring RevealDialog), and changing it ends on a
	// one-time code. The revealed PIN sits under a depleting countdown that re-masks
	// itself — the timer is a plain ticking counter (never Date.now()), cleared on
	// close, copying RevealDialog's idiom.
	//
	// Interop is strictly `setProps`/`on` from wc.svelte — never `bind:` on a gok-*
	// element. The DS `gok-otp` is form-associated: its `value` is set as a DOM property
	// and every change arrives on its `input` event. All SIMULATED: any 6-digit code
	// passes; the real check would be a server's.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { cardSecurity } from '$lib/cards/security.svelte';
	import type { Card } from '$lib/data/types';
	import StepUp from '$lib/components/security/StepUp.svelte';

	let {
		card,
		open,
		onClose,
		seconds = 15
	}: { card: Card; open: boolean; onClose: () => void; seconds?: number } = $props();

	type Phase = 'menu' | 'reveal' | 'change' | 'otp';
	let phase = $state<Phase>('menu');

	// The step-up gate that guards "Show my PIN".
	let stepUpOpen = $state(false);

	// Change-PIN drafts (mirrored from each gok-otp's `input` event) + the OTP confirm.
	let newPin = $state('');
	let confirmPin = $state('');
	let otp = $state('');

	/** Read the joined code off a gok-otp `input`/`complete`/`change` CustomEvent. */
	const otpValue = (e: Event) => (e as CustomEvent<{ value: string }>).detail.value;

	// The reveal countdown — starts at 0 (no countdown in the other phases); `showPin`
	// sets it to `seconds` when the reveal begins, so the prop is only read in closures.
	let remaining = $state(0);

	// One-shot guard so the OTP auto-submit commits exactly once. Plain (non-reactive)
	// on purpose — it's read imperatively inside the effect, and reset on every (re)open.
	let committed = false;

	const heading = $derived(
		phase === 'change' ? 'Change my PIN' : phase === 'otp' ? 'Confirm the change' : 'My PIN'
	);

	// The live PIN, read only while revealed (the read touches the reactive revision).
	const revealedPin = $derived(phase === 'reveal' ? cardSecurity.pin(card.id) : '');
	const pinDigits = $derived(revealedPin.split(''));

	// Announce the reveal/hide politely — keyed on phase + the value, so a screen reader
	// hears the PIN once when it appears and "hidden" once when it re-masks, never the
	// per-second tick.
	const revealAnnounce = $derived(
		phase === 'reveal' && revealedPin ? `My PIN is ${revealedPin.split('').join(' ')}.` : 'My PIN is hidden.'
	);

	// ── Change-PIN validation — no-blame, on reserved message lines (no layout shift). ──
	// Only judged once a field is complete, so it never scolds mid-type.
	const newPinError = $derived(newPin.length === 4 ? cardSecurity.pinError(newPin) : null);
	const mismatch = $derived(
		newPin.length === 4 && confirmPin.length === 4 && !newPinError && newPin !== confirmPin
	);
	const changeMessage = $derived(
		newPinError ?? (mismatch ? "Those two don't match — I'll re-enter the second one to match the first." : '')
	);
	const changeValid = $derived(
		newPin.length === 4 && confirmPin.length === 4 && !newPinError && newPin === confirmPin
	);

	const otpComplete = $derived(otp.replace(/\D/g, '').length === 6);

	// Reset on every rising AND falling edge of `open` — back to the menu, drafts and
	// timer cleared. `untrack` keys the effect on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen !== wasOpen) {
				reset();
				wasOpen = isOpen;
			}
		});
	});

	function reset() {
		phase = 'menu';
		stepUpOpen = false;
		newPin = '';
		confirmPin = '';
		otp = '';
		remaining = 0;
		committed = false;
	}

	// The reveal countdown: one interval while revealed + open. It ticks a counter (no
	// wall-clock) and re-masks at zero. Re-created only when open/phase change.
	$effect(() => {
		if (!open || phase !== 'reveal') return;
		const id = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) backToMenu();
		}, 1000);
		return () => clearInterval(id);
	});

	// The OTP auto-commit: any 6 digits pass (simulated), so completing the code commits
	// the change and closes. Guarded so it fires once.
	$effect(() => {
		if (phase !== 'otp' || !otpComplete || committed) return;
		committed = true;
		cardSecurity.changePin(card.id, newPin); // toasts "PIN updated"
		onClose();
	});

	// ── Show my PIN — gated behind the step-up. ──
	function openStepUp() {
		stepUpOpen = true;
	}

	function showPinConfirmed() {
		stepUpOpen = false;
		phase = 'reveal';
		remaining = seconds;
	}

	function stepUpCancelled() {
		stepUpOpen = false; // No side effect — nothing is revealed.
	}

	// ── Change my PIN ──
	function startChange() {
		phase = 'change';
		newPin = '';
		confirmPin = '';
	}

	function toOtp() {
		if (!changeValid) return;
		otp = '';
		committed = false;
		phase = 'otp';
	}

	// Re-mask / drop the sub-phase back to the menu (also the countdown's auto-hide).
	function backToMenu() {
		phase = 'menu';
		newPin = '';
		confirmPin = '';
		otp = '';
		remaining = 0;
		committed = false;
	}

	function handleDialogClose() {
		onClose();
	}
</script>

<gok-dialog
	size="s"
	{@attach setProps({ open, heading })}
	{@attach on('gok-cancel', handleDialogClose)}
	{@attach on('gok-close', handleDialogClose)}
>
	{#if phase === 'menu'}
		<div class="menu">
			<p class="lead">
				This card's PIN for the {card.network === 'visa' ? 'Visa' : 'Mastercard'} ending {card.last4}.
			</p>
			<div class="choices">
				<gok-button variant="primary" {@attach on('click', openStepUp)}>Show my PIN</gok-button>
				<gok-button variant="secondary" {@attach on('click', startChange)}>Change my PIN</gok-button>
			</div>
		</div>
	{:else if phase === 'reveal'}
		<div class="reveal">
			<p class="field-label gok-eyebrow">My PIN</p>
			<p class="pin nums" aria-hidden="true">
				{#each pinDigits as digit, i (i)}
					<span class="pin-digit">{digit}</span>
				{/each}
			</p>

			<gok-progress
				class="bar"
				format="percent"
				label="Time until my PIN re-hides"
				{@attach setProps({ value: remaining, max: seconds, showValue: false })}
			></gok-progress>

			<p class="countdown nums" aria-hidden="true">Hides in {remaining}s</p>
		</div>

		<!-- The PIN + its re-hide, announced politely (kept off-screen, coarse). -->
		<p class="sr-only" role="status" aria-live="polite">{revealAnnounce}</p>
	{:else if phase === 'change'}
		<div class="change">
			<p class="lead">I'll pick a new 4-digit PIN, then enter it once more to confirm.</p>

			<div class="field">
				<gok-otp
					length="4"
					label="New 4-digit PIN"
					{@attach setProps({ value: newPin })}
					{@attach on('input', (e) => (newPin = otpValue(e)))}
				></gok-otp>
			</div>

			<div class="field">
				<gok-otp
					length="4"
					label="Confirm the new 4-digit PIN"
					{@attach setProps({ value: confirmPin })}
					{@attach on('input', (e) => (confirmPin = otpValue(e)))}
				></gok-otp>
			</div>

			<!-- Reserved message line — always present, so a rejection never shifts layout. -->
			<p class="msg" role="status" aria-live="polite">{changeMessage}</p>
		</div>
	{:else}
		<div class="otp">
			<p class="lead">I've sent a one-time code. I'll enter it to confirm the new PIN.</p>

			<div class="field">
				<!-- gok-otp owns its reserved message line; the helper nudges while incomplete
				     (a short code simply hasn't finished yet) and clears once filled. -->
				<gok-otp
					length="6"
					label="6-digit confirmation code"
					reserve-message
					helper={otp.length > 0 && !otpComplete
						? 'The code is 6 digits — a few more to go.'
						: ''}
					{@attach setProps({ value: otp })}
					{@attach on('input', (e) => (otp = otpValue(e)))}
				></gok-otp>
			</div>
		</div>
	{/if}

	<div slot="footer" class="footer">
		{#if phase === 'menu'}
			<gok-button variant="secondary" {@attach on('click', handleDialogClose)}>Close</gok-button>
		{:else if phase === 'reveal'}
			<gok-button variant="secondary" {@attach on('click', backToMenu)}>Hide PIN</gok-button>
		{:else if phase === 'change'}
			<gok-button variant="secondary" {@attach on('click', backToMenu)}>Back</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !changeValid })}
				{@attach on('click', toOtp)}
			>
				Continue
			</gok-button>
		{:else}
			<gok-button variant="secondary" {@attach on('click', backToMenu)}>Back</gok-button>
		{/if}
	</div>

	<!-- Step-up gate for "Show my PIN". Cancellable; declining reveals nothing. -->
	<StepUp
		open={stepUpOpen}
		title="Show my PIN"
		consequence="I'll see my 4-digit PIN for a few seconds, then it re-hides."
		confirmLabel="Show PIN"
		onConfirm={showPinConfirmed}
		onCancel={stepUpCancelled}
	/>
</gok-dialog>

<style>
	.menu,
	.reveal,
	.change,
	.otp {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.choices {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.field-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* The revealed PIN — four large mono digits, the focal moment of the reveal. */
	.pin {
		display: flex;
		gap: var(--gok-space-300);
		margin: 0;
	}

	.pin-digit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 2.5rem;
		padding-block: var(--gok-space-200);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-headline-4-size);
		line-height: var(--gok-type-headline-4-line);
		color: var(--gok-color-text);
		border-block-end: var(--gok-border-width-strong) solid var(--gok-color-border);
	}

	.bar {
		inline-size: 100%;
	}

	.countdown {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Reserved message line — sized to one line so a rejection never shifts layout. */
	.msg {
		margin: 0;
		min-block-size: var(--gok-type-body-small-line);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
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
