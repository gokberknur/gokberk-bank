<script lang="ts">
	// M02 · The redeem-cashback flow, packaged as a reusable `gok-drawer`. It rides
	// the money spine end to end: gather (destination wallet → amount) → a live
	// review ledger → a forced-decision confirm → success with the credited amount,
	// destination, and a reference. It is the loyalty-layer sibling of the invest
	// OrderTicket and the SEPA send: the amount is capped at the available cashback,
	// every figure is disclosed before the commit, and the commit is deliberate.
	//
	// Single source of truth: `rewards.redeemDraft` + `rewards.redeemPreview()`. The
	// form never holds derived money state — it patches the draft (`setRedeem`) and
	// reads the fresh preview. Web-component interop is strictly `setProps`/`on`
	// from `wc.svelte` — never `bind:` on a gok-* element (the MoneyInput composite
	// is a Svelte component, so `bind:value` is fine there).
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { rewards } from '$lib/state/rewards.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	interface Props {
		/** Whether the drawer is shown (two-way; the host opens it, the flow closes it). */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	// The wallets the cashback can land in; the primary EUR wallet is the default.
	const wallets = $derived(accounts.wallets);

	// The live preview is the single source of cost truth — amount, what's available,
	// whether it's valid, and the destination label.
	const preview = $derived(rewards.redeemPreview());
	const availableLabel = $derived(formatMoney(preview.availableMinor, 'EUR'));
	const amountLabel = $derived(formatMoney(preview.amountMinor, 'EUR'));

	// ── Phase machine: the form (with a confirm dialog over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let confirmOpen = $state(false);
	let committing = $state(false);
	let amountValue = $state(0);
	let receipt = $state<{ amount: string; destination: string; refId: string } | null>(null);

	// Open is the rising edge: seed a fresh draft (amount 0, primary wallet), reset
	// the phase + field mirror. `untrack` keeps the effect keyed on `open` alone —
	// reading the draft inside must not make it re-run on every patch.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				rewards.openRedeem();
				phase = 'form';
				confirmOpen = false;
				committing = false;
				amountValue = 0;
				receipt = null;
			}
			wasOpen = isOpen;
		});
	});

	// ── Field handlers — every one patches the single draft ──
	function onDestination(event: Event) {
		const value = (event.target as HTMLElement & { value: string }).value;
		rewards.setRedeem({ destinationWalletId: value });
	}

	function onAmountChange(minor: number) {
		rewards.setRedeem({ amountMinor: minor });
	}

	// ── Confirm → redeem → done ──
	function openConfirm() {
		if (preview.insufficient) return;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: redeem, capture the receipt, advance to success. */
	function redeemNow() {
		if (committing) return; // single-flight: a double-click must not commit twice
		committing = true;
		const entry = rewards.redeem();
		if (!entry) {
			committing = false; // amount slipped out of bounds — stay on review, allow retry
			return;
		}
		receipt = {
			amount: formatMoney(entry.amountMinor ?? 0, 'EUR'),
			destination: preview.destinationLabel,
			refId: entry.id
		};
		confirmOpen = false;
		phase = 'done';
	}

	// ── Drawer dismissal ──
	function closeDrawer(e?: Event) {
		// While the forced-decision confirm is open, the drawer must not be dismissed
		// by its own Escape/scrim — gok-cancel is cancelable, so preventDefault keeps it
		// open (DS contract). The confirm owns the decision.
		if (confirmOpen) {
			e?.preventDefault();
			return;
		}
		open = false;
	}

	function finishAndClose() {
		open = false;
		rewards.resetRedeem();
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-drawer
	placement="end"
	heading="Redeem cashback"
	{@attach setProps({ open })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if phase === 'done' && receipt}
		<!-- Done · the credit + the essentials + a quiet close. -->
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>
				Cashback redeemed
			</h2>

			<gok-tag size="m" dot>Credited</gok-tag>

			<p class="done-note">
				<span class="gok-tabular-nums">{receipt.amount}</span> is on its way to my {receipt.destination}
				wallet.
			</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Amount</dt>
					<dd class="gok-tabular-nums">{receipt.amount}</dd>
				</div>
				<div class="row">
					<dt>To</dt>
					<dd>{receipt.destination}</dd>
				</div>
				<div class="row">
					<dt>Reference</dt>
					<dd class="mono">{receipt.refId}</dd>
				</div>
			</dl>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', finishAndClose)}>Done</gok-button>
			</div>
		</gok-empty-state>
	{:else}
		<!-- Form · choose where + how much, with a live review ledger. -->
		<div class="form">
			<div class="field">
				<gok-select
					label="Redeem to"
					{@attach setProps({ value: rewards.redeemDraft.destinationWalletId })}
					{@attach on('change', onDestination)}
				>
					{#each wallets as wallet (wallet.id)}
						<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
					{/each}
				</gok-select>
			</div>

			<div class="field">
				<MoneyInput
					bind:value={amountValue}
					currency="EUR"
					label="Amount"
					balanceMinor={preview.availableMinor}
					onchange={onAmountChange}
				/>
				<p class="hint gok-tabular-nums">Available {availableLabel}</p>
				{#if preview.insufficient && preview.amountMinor > 0}
					<p class="note" role="status" aria-live="polite">
						That's more than my available cashback. Redeem {availableLabel} or less.
					</p>
				{/if}
			</div>

			<!-- The review ledger: read-only, always reflecting the live draft. -->
			<gok-card class="review">
				<p class="review-eyebrow gok-eyebrow">Review</p>
				<dl class="ledger">
					<div class="row">
						<dt>Redeem</dt>
						<dd class="gok-tabular-nums">{amountLabel}</dd>
					</div>
					<div class="row">
						<dt>To</dt>
						<dd>{preview.destinationLabel} wallet</dd>
					</div>
					<div class="row total">
						<dt>Cashback left</dt>
						<dd class="gok-tabular-nums">
							{formatMoney(Math.max(0, preview.availableMinor - preview.amountMinor), 'EUR')}
						</dd>
					</div>
				</dl>
			</gok-card>
		</div>

		<!-- The forced-decision gate lives inside the drawer so focus stays in scope. -->
		<gok-dialog
			tone="danger"
			size="s"
			heading="Confirm redemption"
			no-dismiss
			{@attach setProps({ open: confirmOpen })}
		>
			<p class="confirm-body">
				Redeem <strong class="gok-tabular-nums">{amountLabel}</strong> cashback to my
				{preview.destinationLabel} wallet?
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: preview.insufficient || committing })}
					{@attach on('click', redeemNow)}
				>
					Redeem {amountLabel}
				</gok-button>
			</div>
		</gok-dialog>
	{/if}

	{#if phase === 'form'}
		<div slot="footer" class="form-actions">
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: preview.insufficient })}
				{@attach on('click', openConfirm)}
			>
				Review
			</gok-button>
		</div>
	{/if}
</gok-drawer>

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

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	/* --- Review card --- */
	.review {
		display: block;
	}

	.review-eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

	/* --- The key/value ledger (shared with the receipt) --- */
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

	.row.total {
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row.total dt,
	.row.total dd {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	/* --- Form action row (drawer footer) --- */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Confirm dialog body --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Done / success --- */
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
