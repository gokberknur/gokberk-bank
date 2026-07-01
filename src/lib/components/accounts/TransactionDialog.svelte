<script lang="ts">
	// A read-only transaction detail modal (A05 will add the actions). The host
	// gok-dialog is a centred modal that manages focus-trap, the scrim, and Escape;
	// we feed it `open` as a property and close on its gok-close / gok-cancel events.
	// Amount reads by sign — never by colour — and status is shown as a word plus a
	// shape rule (filled = settled, ring = pending), so it never relies on hue alone.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { disputes } from '$lib/disputes/disputes.svelte';
	import type { Currency } from '$lib/data/money';
	import type { Transaction, TxnType } from '$lib/data/types';

	let {
		txn,
		open,
		currency,
		onclose
	}: {
		txn: Transaction | null;
		open: boolean;
		currency: Currency;
		onclose: () => void;
	} = $props();

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	const TYPE_LABELS: Record<TxnType, string> = {
		card: 'Card',
		sepa: 'SEPA',
		swift: 'SWIFT',
		transfer: 'Transfer',
		fee: 'Fee',
		topup: 'Top-up',
		fx: 'Exchange'
	};

	const amount = $derived(txn ? formatMoney(txn.amountMinor, currency, { signDisplay: true }) : '');
	const balance = $derived(txn && txn.status === 'settled' ? formatMoney(txn.runningBalanceMinor, currency) : '');
	const statusLabel = $derived(txn?.status === 'pending' ? 'Pending' : 'Settled');

	// Disputes (S02) — a card outflow can be disputed; if one already exists for this
	// charge, link to its tracker instead. The raise flow starts from the transaction.
	const existingDispute = $derived(txn ? disputes.disputesForTransaction(txn.id)[0] : undefined);
	const canDispute = $derived(!!txn && txn.type === 'card' && txn.amountMinor < 0);
	const disputeHref = $derived(txn ? `/support/disputes/new?txn=${txn.id}` : '');
	const existingHref = $derived(existingDispute ? `/support/disputes/${existingDispute.id}` : '');
</script>

<gok-dialog
	size="m"
	heading="Transaction"
	{@attach setProps({ open })}
	{@attach on('gok-close', onclose)}
	{@attach on('gok-cancel', onclose)}
>
	{#if txn}
		<div class="body">
			<h3 class="merchant gok-headline-5">{txn.merchant}</h3>

			<p class="amount gok-tabular-nums">{amount}</p>

			<p class="status">
				<span class="status-dot" data-status={txn.status} aria-hidden="true"></span>
				<span>{statusLabel}</span>
			</p>

			<dl class="details">
				<div class="row">
					<dt>Date</dt>
					<dd>{formatDate(txn.date)}</dd>
				</div>
				<div class="row">
					<dt>Category</dt>
					<dd>{capitalize(txn.category)}</dd>
				</div>
				<div class="row">
					<dt>Type</dt>
					<dd>{TYPE_LABELS[txn.type]}</dd>
				</div>
				<div class="row">
					<dt>Reference</dt>
					<dd class="mono">{txn.reference}</dd>
				</div>
				{#if txn.counterpartyIban}
					<div class="row">
						<dt>Counterparty IBAN</dt>
						<dd class="mono">{txn.counterpartyIban}</dd>
					</div>
				{/if}
				<div class="row">
					{#if balance}
						<dt>Running balance</dt>
						<dd class="gok-tabular-nums">{balance}</dd>
					{/if}
				</div>
				{#if txn.notes}
					<div class="row">
						<dt>Notes</dt>
						<dd>{txn.notes}</dd>
					</div>
				{/if}
			</dl>
		</div>
	{/if}

	<div slot="footer" class="footer">
		<!-- Dispute (S02) — a real entry for an eligible card charge, or a link to the
		     existing dispute's tracker. A real <a href> so it's keyboard-navigable. -->
		{#if existingDispute}
			<gok-link href={existingHref}>View dispute</gok-link>
		{:else if canDispute}
			<gok-link href={disputeHref}>Dispute this charge</gok-link>
		{/if}

		<div class="actions">
			<gok-button variant="secondary" disabled>Repeat</gok-button>
			<gok-button variant="secondary" disabled>Split</gok-button>
			<gok-button variant="secondary" disabled>Report a problem</gok-button>
		</div>
		<gok-tag size="s">Soon</gok-tag>
	</div>
</gok-dialog>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.merchant {
		margin: 0;
		color: var(--gok-color-text);
	}

	.amount {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-3-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-3-line);
		letter-spacing: var(--gok-type-headline-3-tracking);
		color: var(--gok-color-text);
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* Distinguish by shape, not hue: settled is filled, pending is a ring. */
	.status-dot {
		inline-size: 0.625rem;
		block-size: 0.625rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid var(--gok-color-text);
	}

	.status-dot[data-status='settled'] {
		background: var(--gok-color-text);
	}

	.status-dot[data-status='pending'] {
		background: transparent;
		border-color: var(--gok-color-text-muted);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-200);
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

	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}
</style>
