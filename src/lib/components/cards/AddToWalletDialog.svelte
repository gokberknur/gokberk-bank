<script lang="ts">
	// Add to Apple / Google Pay (C05) — the reassuring flow that provisions my card
	// to a mobile wallet. A single `gok-dialog` driven by `open`, with an internal
	// phase machine: choose a wallet → review what's added → prove it's me (the F12
	// step-up gate, since provisioning issues a device token) → a short, SIMULATED
	// provisioning wait → done. The eligibility gate short-circuits a frozen / expired
	// / cancelled card to a plain explanation with no provisioning controls.
	//
	// All SIMULATED — no real secure element, no real device token. The latency is a
	// fixed rune timer (a setTimeout in an $effect, never Date.now()/Math.random()),
	// and `cardSecurity.addToWallet` records the wallet + toasts "Added to Apple Pay".
	// The card detail reflects the new wallet via the reactive `cardSecurity` state.
	import { setProps, on } from '$lib/wc.svelte';
	import {
		cardSecurity,
		WALLET_OPTIONS,
		MOBILE_WALLET_LABELS,
		DEVICE_NAME,
		type MobileWallet
	} from '$lib/cards/security.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';
	import type { Card } from '$lib/data/types';

	let {
		card,
		open,
		onClose
	}: { card: Card; open: boolean; onClose: () => void } = $props();

	type Phase = 'choose' | 'review' | 'provisioning' | 'done';
	let phase = $state<Phase>('choose');
	let selected = $state<MobileWallet | null>(null);
	// The F12 re-auth gate over the commit — provisioning issues a device token, so
	// it is gated by a step-up before the (simulated) provisioning runs.
	let stepUpOpen = $state(false);

	// Reset to the start every time the dialog (re)opens, so a second visit never
	// resumes mid-flow. Only `open` is read here; the writes don't re-trigger it.
	$effect(() => {
		if (open) {
			phase = 'choose';
			selected = null;
			stepUpOpen = false;
		}
	});

	// The eligibility gate — reactive via `cardSecurity` (reads the revision signal).
	// A frozen / expired / cancelled card can't be added; the body becomes a plain,
	// no-blame explanation with no provisioning controls.
	const eligibility = $derived(cardSecurity.canProvision(card));

	// The chosen wallet's label, used across review, the step-up, and done.
	const selectedLabel = $derived(selected ? MOBILE_WALLET_LABELS[selected] : '');

	// The dialog action line follows the phase (mono UPPERCASE ledger chrome).
	const heading = $derived(
		!eligibility.eligible
			? 'Add to wallet'
			: phase === 'choose'
				? 'Add to wallet'
				: phase === 'review'
					? 'Review'
					: phase === 'provisioning'
						? 'Adding'
						: 'Added'
	);

	function isAdded(wallet: MobileWallet): boolean {
		return cardSecurity.isProvisioned(card.id, wallet);
	}

	function isSelectable(wallet: MobileWallet, availableOnDevice: boolean): boolean {
		return availableOnDevice && !isAdded(wallet);
	}

	// Selection-follows-focus in the radio group; disabled options are skipped, so a
	// reported value is always a selectable wallet.
	function onWalletChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		selected = value === 'apple' || value === 'google' ? value : null;
	}

	function continueToReview() {
		if (selected) phase = 'review';
	}

	function backToChoose() {
		phase = 'choose';
	}

	function openStepUp() {
		if (selected) stepUpOpen = true;
	}

	// Step-up confirmed → begin the (simulated) provisioning wait.
	function onStepUpConfirm() {
		stepUpOpen = false;
		phase = 'provisioning';
	}

	function onStepUpCancel() {
		stepUpOpen = false;
	}

	// The provisioning wait — a fixed ~900ms rune timer (no wall-clock, no randomness).
	// On settle it records the wallet (which toasts) and moves to done. Cleaned up if
	// the phase changes or the dialog unmounts mid-wait.
	$effect(() => {
		if (phase !== 'provisioning' || !selected) return;
		const wallet = selected;
		const id = setTimeout(() => {
			cardSecurity.addToWallet(card.id, wallet);
			phase = 'done';
		}, 900);
		return () => clearTimeout(id);
	});
</script>

<gok-dialog
	size="s"
	{@attach setProps({ open, heading })}
	{@attach on('gok-cancel', onClose)}
	{@attach on('gok-close', onClose)}
>
	{#if !eligibility.eligible}
		<!-- Eligibility gate: a calm explanation, no provisioning controls. -->
		<div class="body">
			<gok-alert status="info">{eligibility.reason}</gok-alert>
		</div>
	{:else if phase === 'choose'}
		<div class="body">
			<p class="lede">
				A device-only number stands in for my card, so the wallet never holds my real
				details. I'll pick where to add my card •• {card.last4}.
			</p>
			<gok-radio-group
				label="Add my card to"
				orientation="vertical"
				{@attach setProps({ value: selected ?? '' })}
				{@attach on('change', onWalletChange)}
			>
				{#each WALLET_OPTIONS as option (option.wallet)}
					<gok-radio
						class="wallet"
						class:is-selected={option.wallet === selected}
						value={option.wallet}
						{@attach setProps({
							disabled: !isSelectable(option.wallet, option.availableOnDevice),
							checked: option.wallet === selected
						})}
					>
						<span class="wallet-label">
							<span class="wallet-name">
								{option.label}
								{#if isAdded(option.wallet)}
									<gok-tag size="s" variant="readonly">Added</gok-tag>
								{/if}
							</span>
							{#if isAdded(option.wallet)}
								<span class="wallet-note">Already in this wallet.</span>
							{:else if !option.availableOnDevice}
								<span class="wallet-note">{option.unavailableNote}</span>
							{/if}
						</span>
					</gok-radio>
				{/each}
			</gok-radio-group>
		</div>
	{:else if phase === 'review'}
		<div class="body">
			<dl class="ledger">
				<div class="row">
					<dt class="row-key gok-eyebrow">Card</dt>
					<dd class="row-val nums">•• {card.last4}</dd>
				</div>
				<div class="row">
					<dt class="row-key gok-eyebrow">Wallet</dt>
					<dd class="row-val">{selectedLabel}</dd>
				</div>
				<div class="row">
					<dt class="row-key gok-eyebrow">Device</dt>
					<dd class="row-val">{DEVICE_NAME}</dd>
				</div>
			</dl>
			<p class="trust">
				A device-only number replaces my card number — my real card details aren't
				shared.
			</p>
		</div>
	{:else if phase === 'provisioning'}
		<!-- The provisioning wait — the dialog body announces busy. -->
		<div class="body" aria-busy="true">
			<p class="lede">Adding my card •• {card.last4} to {selectedLabel} on {DEVICE_NAME}.</p>
		</div>
	{:else}
		<!-- Done — the success state. Announced politely. -->
		<div class="body">
			<div class="done" role="status" aria-live="polite">
				<span class="done-check" aria-hidden="true">
					<svg viewBox="0 0 16 16" width="16" height="16" fill="none">
						<path
							d="M3 8.5l3 3 7-8"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				<gok-tag size="s" variant="selected">Added to {selectedLabel}</gok-tag>
				<p class="done-line">
					My card •• {card.last4} is ready to pay with {selectedLabel} on {DEVICE_NAME}.
				</p>
			</div>
		</div>
	{/if}

	<div slot="footer" class="actions">
		{#if !eligibility.eligible}
			<gok-button variant="primary" {@attach on('click', onClose)}>Close</gok-button>
		{:else if phase === 'choose'}
			<gok-button variant="secondary" {@attach on('click', onClose)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: selected === null })}
				{@attach on('click', continueToReview)}
			>
				Continue
			</gok-button>
		{:else if phase === 'review'}
			<gok-button variant="secondary" {@attach on('click', backToChoose)}>Back</gok-button>
			<gok-button variant="primary" {@attach on('click', openStepUp)}>
				Add to {selectedLabel}
			</gok-button>
		{:else if phase === 'provisioning'}
			<gok-button variant="primary" {@attach setProps({ disabled: true })}>
				<gok-spinner size="s" aria-hidden="true"></gok-spinner>
				Adding…
			</gok-button>
		{:else}
			<gok-button variant="primary" {@attach on('click', onClose)}>Done</gok-button>
		{/if}
	</div>
</gok-dialog>

<!-- The F12 re-auth gate over the commit. `onConfirm` runs after I verify. -->
<StepUp
	open={stepUpOpen}
	title="Add to {selectedLabel}?"
	consequence="This adds my card •• {card.last4} to {selectedLabel} on {DEVICE_NAME}."
	confirmLabel="Add to {selectedLabel}"
	onConfirm={onStepUpConfirm}
	onCancel={onStepUpCancel}
/>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.lede {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* The wallet option's stacked label: name (+ Added tag) over a quiet note. */
	.wallet-label {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.wallet-name {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.wallet-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.row-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.row-val {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.trust {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.done {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-300);
	}

	.done-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.done-line {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	.nums {
		font-variant-numeric: tabular-nums;
	}
</style>
