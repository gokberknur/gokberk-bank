<script lang="ts">
	// V07 · Send — the on-chain withdrawal form. It rides the money spine: gather
	// (recipient address → amount) with reward-early validation and full fee
	// disclosure, then Review opens a deliberate two-gate commit: IF the EUR value
	// is over the step-up threshold, the StepUp re-auth runs FIRST, then ALWAYS the
	// NetworkConfirmDialog (the forced-decision naming the network + irreversibility)
	// — the same order as the security center: identity, then the destructive
	// confirm. Confirming places the send (Pending→Confirming on-chain); success
	// shows the tx hash and routes back to crypto.
	//
	// Single source of truth: `crypto.sendDraft` + `crypto.sendPreview()`. The form
	// patches the draft (`setSend`) and reads the fresh preview — it never holds
	// derived money state. Interop is strictly `setProps`/`on` from `wc.svelte` —
	// never `bind:` on a gok-* element. The host owns the symbol + network; this
	// panel keeps the draft in sync with them and owns address + amount.
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { formatUnits } from '$lib/data/crypto-data';
	import { crypto } from '$lib/state/crypto.svelte';
	import { truncate } from '$lib/crypto/address';
	import type { CryptoSymbol, Network } from '$lib/crypto/address';
	import StepUp from '$lib/components/security/StepUp.svelte';
	import NetworkConfirmDialog from './NetworkConfirmDialog.svelte';

	interface Props {
		/** The asset being sent (owned by the host). */
		symbol: CryptoSymbol;
		/** The network it moves on (owned by the host). */
		network: Network;
	}

	let { symbol, network }: Props = $props();

	// ── Live draft reads (the single source of cost + validity truth) ──
	const preview = $derived(crypto.sendPreview());
	const addressCheck = $derived(crypto.sendAddressCheck);
	const mismatch = $derived(crypto.sendNetworkMismatch);
	const needsStepUp = $derived(crypto.sendNeedsStepUp);
	const balanceUnits = $derived(crypto.balanceUnits(symbol));

	// The reserved address error — reward-early: surfaced the moment a typed address
	// is invalid for the chosen network, cleared the instant it becomes valid.
	const addressError = $derived(
		crypto.sendDraft.toAddress.trim() !== '' && !addressCheck.ok ? (addressCheck.reason ?? '') : ''
	);

	// The Review gate: a valid recipient, a positive amount, within the held balance.
	const canReview = $derived(addressCheck.ok && preview.units > 0 && !preview.insufficient);

	// Formatted figures for the confirm gate.
	const amountLabel = $derived(`${formatUnits(symbol, preview.units)} ${symbol}`);
	const valueLabel = $derived(formatMoney(preview.valueMinor, 'EUR'));
	const feeLabel = $derived(formatMoney(preview.feeMinor, 'EUR'));

	// The amount string is local so typing stays natural; the draft holds the parsed
	// units. Reset whenever the asset changes (the host switched assets).
	let unitsDisplay = $state('');

	// Keep the draft bound to the host's symbol + network. Switching ASSET reopens a
	// fresh draft (clears address + amount); switching NETWORK on the same asset only
	// re-points the network, so a typed address survives (and re-validates). `untrack`
	// keeps the effect keyed on the props alone, not on every draft patch.
	let lastSymbol: CryptoSymbol | undefined;
	$effect(() => {
		const s = symbol;
		const n = network;
		untrack(() => {
			if (s !== lastSymbol) {
				crypto.openSend(s);
				unitsDisplay = '';
				lastSymbol = s;
			}
			if (crypto.sendDraft.network !== n) crypto.setSend({ network: n });
		});
	});

	// ── Phase machine: form (with two stacked gates over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let stepUpOpen = $state(false);
	let confirmOpen = $state(false);
	let receipt = $state<{
		amountLabel: string;
		network: Network;
		to: string;
		hash: string;
	} | null>(null);

	// ── Field handlers — every one patches the single draft ──
	function onAddressInput(event: Event) {
		crypto.setSend({ toAddress: (event.target as HTMLInputElement).value });
	}

	function onUnitsInput(event: Event) {
		const raw = (event.target as HTMLInputElement).value;
		unitsDisplay = raw;
		const n = Number(raw);
		crypto.setSend({ units: Number.isFinite(n) && n > 0 ? n : 0 });
	}

	function setMax() {
		unitsDisplay = String(balanceUnits);
		crypto.setSend({ units: balanceUnits });
	}

	// ── Review → (step-up?) → network forced-decision → place ──
	function openReview() {
		if (!canReview) return;
		// Identity first when over threshold, then the network forced-decision.
		if (needsStepUp) {
			stepUpOpen = true;
		} else {
			confirmOpen = true;
		}
	}

	function stepUpConfirmed() {
		stepUpOpen = false;
		confirmOpen = true;
	}

	function stepUpCancelled() {
		stepUpOpen = false; // No side effect — the send hasn't moved.
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: place the send, capture the receipt, advance. */
	function doSend() {
		const tx = crypto.placeSend();
		if (!tx) return; // A blocking flag slipped in — stay on the confirm gate.
		receipt = {
			amountLabel: `${formatUnits(symbol, Math.abs(tx.units))} ${symbol}`,
			network: tx.network ?? network,
			to: truncate(crypto.sendDraft.toAddress),
			hash: truncate(tx.hash)
		};
		confirmOpen = false;
		phase = 'done';
	}

	function backToCrypto() {
		goto('/crypto');
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

{#if phase === 'done' && receipt}
	<!-- Done · the submitted send, its terminal-for-now state, and the way back. -->
	<div class="done">
		<gok-empty-state>
			<span slot="media" class="mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
					<path
						d="M5 12.5l4.5 4.5L19 7"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Send submitted</h2>

			<gok-tag size="m" dot>Confirming on-chain</gok-tag>

			<p class="done-note">
				My send is confirming on {receipt.network}. It moves from pending to confirmed as the network
				picks it up.
			</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Amount</dt>
					<dd class="gok-tabular-nums">{receipt.amountLabel}</dd>
				</div>
				<div class="row">
					<dt>Network</dt>
					<dd>{receipt.network}</dd>
				</div>
				<div class="row">
					<dt>To</dt>
					<dd class="mono">{receipt.to}</dd>
				</div>
				<div class="row">
					<dt>Transaction</dt>
					<dd class="mono">{receipt.hash}</dd>
				</div>
			</dl>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', backToCrypto)}>Back to crypto</gok-button>
			</div>
		</gok-empty-state>
	</div>
{:else}
	<!-- Form · recipient, amount, fee disclosure, then Review. -->
	<div class="form">
		<!-- Recipient address -->
		<div class="field">
			<gok-input
				label="Recipient address"
				placeholder="Paste the {network} address"
				autocomplete="off"
				spellcheck="false"
				reserve-message
				{@attach setProps({ value: crypto.sendDraft.toAddress, error: addressError })}
				{@attach on('input', onAddressInput)}
				{@attach on('change', onAddressInput)}
			></gok-input>

			{#if mismatch}
				<gok-alert status="warning">
					This looks like a different network's address — double-check before sending.
				</gok-alert>
			{/if}
		</div>

		<!-- Amount in units -->
		<div class="field">
			<gok-input
				type="number"
				inputmode="decimal"
				label="Amount ({symbol})"
				min="0"
				step="any"
				reserve-message
				{@attach setProps({ value: unitsDisplay })}
				{@attach on('input', onUnitsInput)}
				{@attach on('change', onUnitsInput)}
			></gok-input>
			<div class="amount-meta">
				<p class="hint gok-tabular-nums" aria-live="polite">
					≈ {valueLabel}
				</p>
				<button type="button" class="max-btn" onclick={setMax}>
					Max <span class="gok-tabular-nums">{formatUnits(symbol, balanceUnits)}</span>
					{symbol}
				</button>
			</div>

			{#if preview.insufficient}
				<gok-alert status="error">
					That's more than I hold — I have
					<span class="gok-tabular-nums">{formatUnits(symbol, balanceUnits)}</span>
					{symbol}.
				</gok-alert>
			{/if}
		</div>

		<!-- Fee disclosure, before any confirm. -->
		<gok-card class="fees">
			<p class="fees-eyebrow gok-eyebrow">Network fee</p>
			<dl class="ledger">
				<div class="row">
					<dt>Sending</dt>
					<dd class="gok-tabular-nums">{amountLabel}</dd>
				</div>
				<div class="row">
					<dt>Network fee</dt>
					<dd class="gok-tabular-nums">{feeLabel}</dd>
				</div>
				<div class="row">
					<dt>Confirmation</dt>
					<dd>{preview.eta}</dd>
				</div>
			</dl>
			<p class="caption">Sends can't be reversed — the address and network must be correct.</p>
		</gok-card>
	</div>

	<div class="form-actions">
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !canReview })}
			{@attach on('click', openReview)}
		>
			Review send
		</gok-button>
	</div>

	<!-- Gate 1 · step-up (only over the threshold). Cancellable, no side effect. -->
	<StepUp
		open={stepUpOpen}
		title="Verify this send"
		consequence="A send of this size needs a quick identity check before it leaves."
		confirmLabel="Continue"
		onConfirm={stepUpConfirmed}
		onCancel={stepUpCancelled}
	/>

	<!-- Gate 2 · the network forced-decision. Always runs before the funds move. -->
	<NetworkConfirmDialog
		open={confirmOpen}
		{network}
		{amountLabel}
		{valueLabel}
		recipient={truncate(crypto.sendDraft.toAddress)}
		{feeLabel}
		eta={preview.eta}
		confirmLabel="Send {symbol}"
		onConfirm={doSend}
		onCancel={closeConfirm}
	/>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.amount-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.max-btn {
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-link);
		cursor: pointer;
	}

	.max-btn:hover {
		text-decoration: underline;
	}

	.max-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* --- Fee disclosure card --- */
	.fees {
		display: block;
	}

	.fees-eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

	.caption {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Shared key/value ledger (form card + receipt) --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
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

	.row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	/* --- Form action row --- */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-block-start: var(--gok-space-400);
	}

	/* --- Done / success --- */
	.done {
		padding-block: var(--gok-space-400);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid currentcolor;
		color: var(--gok-color-primary);
	}

	.done-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.done-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 22rem;
		margin-inline: auto;
		text-align: start;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.done-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
