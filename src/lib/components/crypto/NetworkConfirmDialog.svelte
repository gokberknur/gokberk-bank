<script lang="ts">
	// V07 · The network forced-decision — the heart of a crypto send. A
	// `gok-dialog tone="danger" no-dismiss` that names the network, the amount, the
	// recipient, and the network fee, and states the irreversibility plainly and
	// calmly (no scare-mongering). It traps focus and offers exactly two choices:
	// go Back, or the deliberate destructive confirm. That confirm is outline/text
	// in the status colour — an app-local <button>, NEVER a solid red fill (brand
	// rule), mirroring StepUp / OrderTicket. Confirming runs the host's onConfirm
	// (which places the send); dismissing runs onCancel with no side effect.
	import { setProps, on } from '$lib/wc.svelte';

	interface Props {
		/** Whether the dialog is shown (driven by the host). */
		open: boolean;
		/** The network the funds move on — named in the heading copy + the ledger. */
		network: string;
		/** The amount + asset, already formatted ("0.25 ETH"). */
		amountLabel: string;
		/** The EUR value of the send, already formatted. */
		valueLabel: string;
		/** The truncated recipient address ("0x12ab…cd34"). */
		recipient: string;
		/** The network fee, already formatted. */
		feeLabel: string;
		/** A plain confirmation ETA. */
		eta: string;
		/** The verb on the destructive confirm ("Send 0.25 ETH"). */
		confirmLabel: string;
		/** Run on the deliberate confirm — places the send. */
		onConfirm: () => void;
		/** Run when I go back / dismiss — no side effect. */
		onCancel: () => void;
	}

	let {
		open,
		network,
		amountLabel,
		valueLabel,
		recipient,
		feeLabel,
		eta,
		confirmLabel,
		onConfirm,
		onCancel
	}: Props = $props();
</script>

<gok-dialog
	tone="danger"
	size="s"
	heading="Confirm send"
	no-dismiss
	{@attach setProps({ open })}
>
	<div class="body">
		<p class="lead">
			I'm sending on {network}. Sends can't be reversed. The address and network must be correct.
		</p>

		<dl class="ledger">
			<div class="row">
				<dt>Amount</dt>
				<dd class="gok-tabular-nums">{amountLabel}</dd>
			</div>
			<div class="row">
				<dt>Value</dt>
				<dd class="gok-tabular-nums">{valueLabel}</dd>
			</div>
			<div class="row">
				<dt>Network</dt>
				<dd>{network}</dd>
			</div>
			<div class="row">
				<dt>To</dt>
				<dd class="mono">{recipient}</dd>
			</div>
			<div class="row">
				<dt>Network fee</dt>
				<dd class="gok-tabular-nums">{feeLabel} · {eta}</dd>
			</div>
		</dl>
	</div>

	<div slot="footer" class="actions">
		<gok-button variant="secondary" {@attach on('click', onCancel)}>Back</gok-button>
		<!-- Destructive confirm: outline/text in the status colour, transparent fill —
		     never a solid red. App-local <button> so the rule holds without restyling
		     a DS component. -->
		<button type="button" class="danger-confirm" onclick={onConfirm}>{confirmLabel}</button>
	</div>
</gok-dialog>

<style>
	.body {
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

	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
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

	.danger-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.danger-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
