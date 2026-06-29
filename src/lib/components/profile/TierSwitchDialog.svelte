<script lang="ts">
	// X04 · The forced-decision plan switch — a no-dismiss gok-dialog that names the
	// change and states the new monthly fee as plain fact before I commit. An upgrade is
	// a normal primary confirm; a downgrade carries a quieter danger framing because I
	// give something up — the dialog names what (my FX margin returns), and the confirm
	// is outline/text in the status colour, never a solid red fill (per brand). It's a
	// demo: the body says so, plainly, so the fee never reads as a real charge.
	//
	// Interop is setProps/on — never bind: on the gok-* host. The close guard ignores any
	// composed event that retargets up from a nested element, so only the dialog's own
	// cancel closes it.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { getTier, isUpgrade } from '$lib/profile/tiers';
	import type { Tier } from '$lib/profile/tiers';

	let {
		open,
		from,
		to,
		onConfirm,
		onCancel
	}: {
		/** Whether the switch dialog is shown (host-driven). */
		open: boolean;
		/** The tier I'm on now. */
		from: Tier;
		/** The tier I'd move to — null when nothing is pending. */
		to: Tier | null;
		/** Run on a confirmed switch. */
		onConfirm: () => void;
		/** Run when I back out — no change. */
		onCancel: () => void;
	} = $props();

	const upgrade = $derived(to ? isUpgrade(from, to) : false);
	const target = $derived(to ? getTier(to) : null);

	/** The new monthly fee, as plain fact — "Free" or "€16.99 / month". */
	function feeLabel(minor: number): string {
		return minor === 0 ? 'Free' : `${formatMoney(minor, 'EUR')} / month`;
	}

	/** An FX margin in basis points as a calm percentage, or "no markup" at zero. */
	function marginLabel(bps: number): string {
		return bps === 0 ? 'no markup' : `${bps / 100}%`;
	}

	function close() {
		onCancel();
	}
</script>

<gok-dialog
	size="s"
	no-dismiss
	tone={upgrade ? undefined : 'danger'}
	heading={to ? `Switch to ${to}?` : 'Switch plan?'}
	{@attach setProps({ open })}
	{@attach on('gok-cancel', close)}
	{@attach on('gok-close', close)}
>
	{#if to && target}
		<div class="body">
			<p class="line">
				{#if target.monthlyFeeMinor === 0}
					<strong>{from}</strong> drops to <strong>{to}</strong>, which is
					<strong>Free</strong> — no monthly fee.
				{:else}
					<strong>{to}</strong> is
					<strong class="gok-tabular-nums">{feeLabel(target.monthlyFeeMinor)}</strong>, billed
					monthly.
				{/if}
				No real charge — this is a demo.
			</p>

			{#if !upgrade}
				<!-- Downgrade · name what I give up, plainly. -->
				<p class="line lost">
					My FX margin returns to
					<strong class="gok-tabular-nums">{marginLabel(target.fxMarginBps)}</strong>, and I move off
					{from}'s perks.
				</p>
			{:else if target.fxMarginBps === 0}
				<!-- Upgrade to Metal · the standout, stated as fact. -->
				<p class="line">
					My FX moves to the mid-market rate with <strong>no markup</strong>, everywhere.
				</p>
			{/if}
		</div>

		<div slot="footer" class="actions">
			<gok-button variant="secondary" {@attach on('click', () => onCancel())}>Cancel</gok-button>
			{#if upgrade}
				<gok-button variant="primary" {@attach on('click', () => onConfirm())}>
					Switch to {to}
				</gok-button>
			{:else}
				<!-- Downgrade confirm: outline/text in the status colour, transparent fill —
				     an app-local <button> so the rule holds without restyling a DS component. -->
				<button type="button" class="status-confirm" onclick={() => onConfirm()}>
					Switch to {to}
				</button>
			{/if}
		</div>
	{/if}
</gok-dialog>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.line {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.line strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.lost {
		color: var(--gok-color-text-muted);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* Downgrade confirm — outline/text in the status colour, transparent fill. */
	.status-confirm {
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

	.status-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.status-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
