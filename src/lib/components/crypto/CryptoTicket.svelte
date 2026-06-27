<script lang="ts">
	// V07 · The buy / sell ticket — the crypto sibling of the V03 order ticket,
	// packaged as a reusable `gok-drawer`. It rides the same money spine: gather
	// (side → amount, in crypto units or EUR cash) → a live cost preview (price, fee,
	// gross, total, spendable) → a forced-decision confirm → success with the placed
	// transaction. Every cost is disclosed before the commit, and the commit is
	// deliberate.
	//
	// Single source of truth: `crypto.tradeDraft` + `crypto.tradePreview()`. The form
	// never holds derived money state — it patches the draft (`setTrade`) and reads
	// the fresh preview. Web-component interop is strictly `setProps`/`on` from
	// `wc.svelte` — never `bind:` on a gok-* element (the MoneyInput composite is a
	// Svelte component, so `bind:value` is fine there).
	//
	// Buy/Sell carry NO hardcoded green/red: the side is signalled by the segment
	// label + the verb on the primary, never by hue. The one earned accent is the
	// confirm/primary action.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { crypto } from '$lib/state/crypto.svelte';
	import { formatUnits, type CryptoTx } from '$lib/data/crypto-data';
	import type { CryptoSymbol } from '$lib/crypto/address';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	interface Props {
		/** The asset the ticket trades. */
		symbol: CryptoSymbol;
		/** Whether the drawer is shown (two-way; the host opens it, the ticket closes it). */
		open?: boolean;
		/** Called once with the placed transaction when the commit succeeds. */
		onPlaced?: (tx: CryptoTx) => void;
	}

	let { symbol, open = $bindable(false), onPlaced }: Props = $props();

	// ── Asset + live preview (the single source of cost truth) ──
	const asset = $derived(crypto.asset(symbol));
	const heldUnits = $derived(crypto.balanceUnits(symbol));
	const preview = $derived(crypto.tradePreview());
	const verb = $derived(crypto.tradeDraft.side === 'buy' ? 'Buy' : 'Sell');
	// The smallest step the asset trades in (10^-decimals), so the units field matches
	// the asset's display precision.
	const unitStep = $derived(asset ? (10 ** -asset.decimals).toString() : 'any');

	// The "Review" gate: a positive quantity that's affordable (buy) / held (sell).
	const canReview = $derived(
		!!asset && preview.units > 0 && !preview.insufficientFunds && !preview.insufficientUnits
	);

	// ── Phase machine: the form (with a confirm dialog over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let confirmOpen = $state(false);
	let placed = $state<{
		verb: string;
		unitsLabel: string;
		totalLabel: string;
		hash: string;
	} | null>(null);

	// The field strings are local so typing stays natural (the draft holds the parsed
	// canonical values). Seeded on the rising edge of `open`.
	let unitsDisplay = $state('');
	let cashValue = $state(0);

	// Open is the rising edge: bind the draft to this symbol (if it isn't already),
	// reset the phase + field mirrors. `untrack` keeps the effect keyed on `open`
	// alone — reading the draft inside must not make it re-run on every patch.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				if (crypto.tradeDraft.symbol !== symbol) crypto.openTrade(symbol, 'buy');
				phase = 'form';
				confirmOpen = false;
				placed = null;
				const d = crypto.tradeDraft;
				unitsDisplay = d.units > 0 ? String(d.units) : '';
				cashValue = d.cashMinor;
			}
			wasOpen = isOpen;
		});
	});

	// ── Field handlers — every one patches the single draft ──
	function onSide(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		crypto.setTrade({ side: value as 'buy' | 'sell' });
	}

	function onMode(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		crypto.setTrade({ mode: value as 'units' | 'cash' });
	}

	function onUnitsInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		unitsDisplay = raw;
		const n = Number(raw);
		crypto.setTrade({ units: Number.isFinite(n) && n > 0 ? n : 0 });
	}

	function onCashChange(minor: number) {
		crypto.setTrade({ cashMinor: minor });
	}

	// ── Confirm → place → done ──
	function openConfirm() {
		if (!canReview) return;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: place the trade, capture the tx, advance. */
	function placeNow() {
		const tx = crypto.placeTrade();
		if (!tx) return; // A blocking flag slipped in — stay on review.
		placed = {
			verb: crypto.tradeDraft.side === 'buy' ? 'Bought' : 'Sold',
			unitsLabel: `${formatUnits(tx.symbol, tx.units)} ${tx.symbol}`,
			totalLabel: formatMoney(tx.valueMinor, 'EUR'),
			hash: tx.hash
		};
		confirmOpen = false;
		phase = 'done';
		onPlaced?.(tx);
	}

	// ── Drawer dismissal ──
	function closeDrawer() {
		open = false;
	}

	function finishAndClose() {
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-drawer
	placement="end"
	heading="{verb} {symbol}"
	{@attach setProps({ open })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if phase === 'done' && placed}
		<!-- Done · the placed transaction + the essentials. -->
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Order placed</h2>

			<gok-tag size="m" dot variant="selected">{placed.verb}</gok-tag>

			<p class="done-note">Settled instantly. It's in my balances and activity now.</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Order</dt>
					<dd>{placed.verb} {symbol}</dd>
				</div>
				<div class="row">
					<dt>Amount</dt>
					<dd class="gok-tabular-nums">{placed.unitsLabel}</dd>
				</div>
				<div class="row">
					<dt>Value</dt>
					<dd class="gok-tabular-nums">{placed.totalLabel}</dd>
				</div>
				<div class="row">
					<dt>Tx</dt>
					<dd class="mono">{placed.hash}</dd>
				</div>
			</dl>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', finishAndClose)}>Done</gok-button>
			</div>
		</gok-empty-state>
	{:else}
		<!-- Form · the trade ticket, top to bottom. -->
		<div class="form">
			<!-- Side -->
			<div class="field">
				<gok-segmented
					label="Side"
					{@attach setProps({ value: crypto.tradeDraft.side })}
					{@attach on('change', onSide)}
				>
					<gok-segmented-item value="buy">Buy</gok-segmented-item>
					<gok-segmented-item value="sell">Sell</gok-segmented-item>
				</gok-segmented>
				{#if crypto.tradeDraft.side === 'sell'}
					<p class="hint">
						I hold <span class="gok-tabular-nums">{formatUnits(symbol, heldUnits)}</span>
						{symbol}.
					</p>
				{/if}
			</div>

			<!-- Amount: units ↔ cash -->
			<div class="field">
				<gok-segmented
					label="Amount"
					size="s"
					{@attach setProps({ value: crypto.tradeDraft.mode })}
					{@attach on('change', onMode)}
				>
					<gok-segmented-item value="units">{symbol}</gok-segmented-item>
					<gok-segmented-item value="cash">EUR</gok-segmented-item>
				</gok-segmented>

				{#if crypto.tradeDraft.mode === 'units'}
					<gok-input
						type="number"
						inputmode="decimal"
						label="Amount in {symbol}"
						min="0"
						step={unitStep}
						reserve-message
						{@attach setProps({ value: unitsDisplay })}
						{@attach on('input', onUnitsInput)}
						{@attach on('change', onUnitsInput)}
					></gok-input>
					<p class="mirror gok-tabular-nums" aria-live="polite">
						≈ {formatMoney(preview.grossMinor, 'EUR')}
					</p>
				{:else}
					<MoneyInput bind:value={cashValue} currency="EUR" label="Amount" onchange={onCashChange} />
					<p class="mirror gok-tabular-nums" aria-live="polite">
						≈ {formatUnits(symbol, preview.units)}
						{symbol}
					</p>
				{/if}
			</div>

			<!-- Cost preview -->
			<gok-card class="preview">
				<p class="preview-eyebrow gok-eyebrow">Cost preview</p>
				<dl class="ledger">
					<div class="row">
						<dt>Price</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.priceMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>{crypto.tradeDraft.side === 'buy' ? 'Amount' : 'Proceeds'}</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.grossMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Fee</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.feeMinor, 'EUR')}</dd>
					</div>
					<div class="row total">
						<dt>{crypto.tradeDraft.side === 'buy' ? 'Total cost' : 'You receive'}</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.totalMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Spendable</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.spendableMinor, 'EUR')}</dd>
					</div>
				</dl>
				<p class="caption">Prices indicative; crypto is volatile — I can lose money.</p>
			</gok-card>

			<!-- Reward-early blocks -->
			{#if preview.insufficientFunds}
				<gok-alert status="error">
					Not enough spendable balance — I have {formatMoney(preview.spendableMinor, 'EUR')}.
				</gok-alert>
			{:else if preview.insufficientUnits}
				<gok-alert status="error">
					I only hold <span class="gok-tabular-nums">{formatUnits(symbol, heldUnits)}</span>
					{symbol} — I can't sell more than that.
				</gok-alert>
			{/if}
		</div>

		<!-- The confirm gate lives inside the drawer so focus stays within its scope. -->
		<gok-dialog
			tone="danger"
			size="s"
			heading="Confirm {verb.toLowerCase()}"
			no-dismiss
			{@attach setProps({ open: confirmOpen })}
			{@attach on('gok-cancel', closeConfirm)}
			{@attach on('gok-close', closeConfirm)}
		>
			<p class="confirm-body">
				{verb}
				<strong class="gok-tabular-nums">{formatUnits(symbol, preview.units)} {symbol}</strong>
				for
				{#if crypto.tradeDraft.side === 'buy'}
					~<strong class="gok-tabular-nums">{formatMoney(preview.totalMinor, 'EUR')}</strong>?
				{:else}
					~<strong class="gok-tabular-nums">{formatMoney(preview.totalMinor, 'EUR')}</strong> net?
				{/if}
				The price may move before this settles.
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', placeNow)}>{verb} {symbol}</gok-button>
			</div>
		</gok-dialog>
	{/if}

	{#if phase === 'form'}
		<div slot="footer" class="form-actions">
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canReview })}
				{@attach on('click', openConfirm)}
			>
				Review {verb.toLowerCase()}
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

	.mirror {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	/* --- Cost preview card --- */
	.preview {
		display: block;
	}

	.preview-eyebrow {
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
		overflow-wrap: anywhere;
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
