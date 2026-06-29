<script lang="ts">
	// V03 · The order ticket — the marquee invest trade form, packaged as a reusable
	// `gok-drawer`. It rides the money spine end to end: gather (side → type →
	// quantity → price → TIF) → a live cost preview → a forced-decision confirm →
	// success with the order's terminal state (Filled / Working / Queued). It is the
	// investing sibling of the SWIFT send (`P03`): every cost is disclosed before the
	// commit, and the commit is deliberate.
	//
	// Single source of truth: `invest.draft` + `invest.preview()`. The form never
	// holds derived money state — it patches the draft (`setDraft`) and reads the
	// fresh preview. Web-component interop is strictly `setProps`/`on` from
	// `wc.svelte` — never `bind:` on a gok-* element (the MoneyInput composite is a
	// Svelte component, so `bind:value` is fine there).
	//
	// The step-up over €1,000 is SIMULATED ("Approve with passkey" sets a local
	// verified flag) — real passkey/OTP verification is F12. Buy/Sell carry NO
	// hardcoded green/red: the side is signalled by the segment label + the verb on
	// the primary, never by hue.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatNumber } from '$lib/format';
	import { invest } from '$lib/state/invest.svelte';
	import type { Order, OrderStatus } from '$lib/data/market';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	interface Props {
		/** The instrument the ticket trades. */
		symbol: string;
		/** Whether the drawer is shown (two-way; the host opens it, the ticket closes it). */
		open?: boolean;
		/** Called once with the placed order when the commit succeeds. */
		onPlaced?: (order: Order) => void;
	}

	let { symbol, open = $bindable(false), onPlaced }: Props = $props();

	// The amount at which the commit needs a quick identity check before it lands.
	const STEP_UP_MIN_MINOR = 100_000; // €1,000.00 in minor units.

	// ── Instrument + live preview (the single source of cost truth) ──
	const instrument = $derived(invest.instrument(symbol));
	const heldQty = $derived(invest.position(symbol)?.quantity ?? 0);
	const preview = $derived(invest.preview());
	const verb = $derived(invest.draft.side === 'buy' ? 'Buy' : 'Sell');
	const priceCurrency = $derived(instrument?.currency ?? 'EUR');

	// The "Review order" gate: a real, affordable, fully-specified order. Far-from-
	// market is a warning, NOT a block — the investor may proceed anyway.
	const canReview = $derived.by(() => {
		const d = invest.draft;
		if (!instrument) return false;
		if (preview.effectiveQuantity <= 0) return false;
		if (preview.insufficient || preview.exceedsHolding) return false;
		if ((d.kind === 'limit' || d.kind === 'stop') && (d.limitMinor === null || d.limitMinor <= 0))
			return false;
		return true;
	});

	const stepUpRequired = $derived(preview.grandTotalEurMinor >= STEP_UP_MIN_MINOR);

	// ── Phase machine: the form (with a confirm dialog over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let confirmOpen = $state(false);
	let stepUpVerified = $state(false);
	let placed = $state<{
		verb: string;
		qtyLabel: string;
		totalLabel: string;
		refId: string;
		status: OrderStatus;
	} | null>(null);

	// The field strings are local so typing stays natural (the draft holds the parsed
	// canonical values). Seeded on the rising edge of `open`.
	let sharesDisplay = $state('');
	let notionalValue = $state(0);
	let limitValue = $state(0);

	// Open is the rising edge: bind the draft to this symbol (if it isn't already),
	// reset the phase + field mirrors. `untrack` keeps the effect keyed on `open`
	// alone — reading the draft inside must not make it re-run on every patch.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				if (invest.draft.symbol !== symbol) invest.openTicket(symbol);
				phase = 'form';
				confirmOpen = false;
				stepUpVerified = false;
				placed = null;
				const d = invest.draft;
				sharesDisplay = d.quantity > 0 ? String(d.quantity) : '';
				notionalValue = d.notionalEurMinor;
				limitValue = d.limitMinor ?? 0;
			}
			wasOpen = isOpen;
		});
	});

	// ── Field handlers — every one patches the single draft ──
	function onSide(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		invest.setDraft({ side: value as 'buy' | 'sell' });
	}

	function onKind(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		invest.setDraft({ kind: value as 'market' | 'limit' | 'stop' });
	}

	function onMode(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		invest.setDraft({ mode: value as 'shares' | 'notional' });
	}

	function onSharesInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		sharesDisplay = raw;
		const n = Number(raw);
		invest.setDraft({ quantity: Number.isFinite(n) && n > 0 ? n : 0 });
	}

	function onNotionalChange(minor: number) {
		invest.setDraft({ notionalEurMinor: minor });
	}

	function onLimitChange(minor: number) {
		invest.setDraft({ limitMinor: minor > 0 ? minor : null });
	}

	function onTif(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		invest.setDraft({ tif: value as 'day' | 'gtc' });
	}

	// ── Confirm → place → done ──
	function openConfirm() {
		if (!canReview) return;
		stepUpVerified = false;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** SIMULATED step-up (real passkey/OTP is F12). Marks identity verified. */
	function approveWithPasskey() {
		stepUpVerified = true;
	}

	/** The deliberate commit: place the order, capture its terminal state, advance. */
	function placeNow() {
		if (stepUpRequired && !stepUpVerified) return;
		const order = invest.placeOrder();
		if (!order) return; // A blocking flag slipped in — stay on review.
		placed = {
			verb: invest.draft.side === 'buy' ? 'Buy' : 'Sell',
			qtyLabel: formatNumber(order.quantity),
			totalLabel: formatMoney(order.totalEurMinor, 'EUR'),
			refId: order.id,
			status: order.status
		};
		confirmOpen = false;
		phase = 'done';
		onPlaced?.(order);
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
		invest.resetTicket();
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	// ── Done: status presentation (rule + word, never hue alone) ──
	const STATUS_LABEL: Record<OrderStatus, string> = {
		filled: 'Filled',
		working: 'Working',
		queued: 'Queued',
		cancelled: 'Cancelled',
		rejected: 'Rejected'
	};
	const STATUS_NOTE: Record<OrderStatus, string> = {
		filled: 'Executed against the market.',
		working: 'Resting until it triggers or I cancel it.',
		queued: 'The market is closed — this runs at the next open.',
		cancelled: 'Cancelled — nothing was bought or sold.',
		rejected: 'Rejected — nothing was bought or sold.'
	};
</script>

<gok-drawer
	placement="end"
	heading="{verb} {symbol}"
	{@attach setProps({ open })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if phase === 'done' && placed}
		<!-- Done · the terminal state + the essentials + reversibility-light actions. -->
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

			<gok-tag size="m" dot variant={placed.status === 'filled' ? 'selected' : 'default'}>
				{STATUS_LABEL[placed.status]}
			</gok-tag>

			<p class="done-note">{STATUS_NOTE[placed.status]}</p>

			<dl class="ledger receipt">
				<div class="row">
					<dt>Order</dt>
					<dd>{placed.verb} {symbol}</dd>
				</div>
				<div class="row">
					<dt>Quantity</dt>
					<dd class="gok-tabular-nums">{placed.qtyLabel}</dd>
				</div>
				<div class="row">
					<dt>Estimated total</dt>
					<dd class="gok-tabular-nums">{placed.totalLabel}</dd>
				</div>
				<div class="row">
					<dt>Reference</dt>
					<dd class="mono">{placed.refId}</dd>
				</div>
			</dl>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', finishAndClose)}>Done</gok-button>
				<gok-button variant="secondary" disabled>
					View orders
					<gok-tag slot="suffix" size="s">Soon</gok-tag>
				</gok-button>
			</div>
		</gok-empty-state>
	{:else}
		<!-- Form · the trade ticket, top to bottom. -->
		<div class="form">
			<!-- Side -->
			<div class="field">
				<gok-segmented
					label="Side"
					{@attach setProps({ value: invest.draft.side })}
					{@attach on('change', onSide)}
				>
					<gok-segmented-item value="buy">Buy</gok-segmented-item>
					<gok-segmented-item value="sell">Sell</gok-segmented-item>
				</gok-segmented>
				{#if invest.draft.side === 'sell'}
					<p class="hint">
						I hold <span class="gok-tabular-nums">{formatNumber(heldQty)}</span>
						{symbol}.
					</p>
				{/if}
			</div>

			<!-- Order type -->
			<div class="field">
				<gok-select
					label="Order type"
					{@attach setProps({ value: invest.draft.kind })}
					{@attach on('change', onKind)}
				>
					<gok-option value="market">Market</gok-option>
					<gok-option value="limit">Limit</gok-option>
					<gok-option value="stop">Stop</gok-option>
				</gok-select>
			</div>

			<!-- Quantity: shares ↔ amount -->
			<div class="field">
				<gok-segmented
					label="Quantity"
					size="s"
					{@attach setProps({ value: invest.draft.mode })}
					{@attach on('change', onMode)}
				>
					<gok-segmented-item value="shares">Shares</gok-segmented-item>
					<gok-segmented-item value="notional">Amount</gok-segmented-item>
				</gok-segmented>

				{#if invest.draft.mode === 'shares'}
					<gok-input
						type="number"
						inputmode="decimal"
						label="Number of shares"
						min="0"
						step={instrument?.fractionalAllowed ? 'any' : '1'}
						helper={instrument?.fractionalAllowed ? 'Fractional shares allowed.' : 'Whole shares only.'}
						reserve-message
						{@attach setProps({ value: sharesDisplay })}
						{@attach on('input', onSharesInput)}
						{@attach on('change', onSharesInput)}
					></gok-input>
					<p class="mirror gok-tabular-nums" aria-live="polite">
						≈ {formatMoney(preview.estTotalEurMinor, 'EUR')}
					</p>
				{:else}
					<MoneyInput
						bind:value={notionalValue}
						currency="EUR"
						label="Amount"
						onchange={onNotionalChange}
					/>
					<p class="mirror gok-tabular-nums" aria-live="polite">
						≈ {formatNumber(preview.effectiveQuantity)} shares
					</p>
				{/if}

				{#if preview.wholeShareAdjusted}
					<p class="hint">
						Rounded down to <span class="gok-tabular-nums">{formatNumber(preview.effectiveQuantity)}</span>
						whole shares.
					</p>
				{/if}
			</div>

			<!-- Limit / Stop price (conditional) -->
			{#if invest.draft.kind !== 'market'}
				<div class="field">
					<MoneyInput
						bind:value={limitValue}
						currency={priceCurrency}
						label={invest.draft.kind === 'limit' ? 'Limit price' : 'Stop price'}
						onchange={onLimitChange}
					/>
					{#if preview.limitFarFromMarket}
						<gok-alert status="warning">
							This price is more than 20% from the last traded price. I can place it anyway — it may
							just rest unfilled.
						</gok-alert>
					{/if}
				</div>
			{/if}

			<!-- Time in force -->
			<div class="field">
				<gok-segmented
					label="Time in force"
					size="s"
					{@attach setProps({ value: invest.draft.tif })}
					{@attach on('change', onTif)}
				>
					<gok-segmented-item value="day">Day</gok-segmented-item>
					<gok-segmented-item value="gtc">GTC</gok-segmented-item>
				</gok-segmented>
			</div>

			<!-- Cost preview -->
			<gok-card class="preview">
				<p class="preview-eyebrow gok-eyebrow">Cost preview</p>
				<dl class="ledger">
					<div class="row">
						<dt>Estimated price</dt>
						<dd class="gok-tabular-nums">
							{formatMoney(preview.effectivePriceMinor, priceCurrency)}
						</dd>
					</div>
					<div class="row">
						<dt>Estimated total</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.estTotalEurMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Fee</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.feeEurMinor, 'EUR')}</dd>
					</div>
					{#if preview.fx}
						<div class="row">
							<dt>FX rate</dt>
							<dd class="fx">
								<span class="gok-tabular-nums">
									1 {priceCurrency} ≈ {preview.fx.rate.toFixed(4)} EUR
								</span>
								<span class="fx-note">{preview.fx.note}</span>
							</dd>
						</div>
					{/if}
					<div class="row total">
						<dt>{invest.draft.side === 'buy' ? 'Total cost' : 'Net proceeds'}</dt>
						<dd class="gok-tabular-nums">{formatMoney(preview.grandTotalEurMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Buying power</dt>
						<dd class="gok-tabular-nums power">
							{formatMoney(preview.buyingPowerEurMinor, 'EUR')}
							<span class="arrow" aria-hidden="true">→</span>
							{formatMoney(preview.buyingPowerAfterEurMinor, 'EUR')}
						</dd>
					</div>
				</dl>

				{#if invest.draft.kind === 'market'}
					<p class="caption">Prices indicative — the market may move before this fills.</p>
				{/if}
			</gok-card>

			<!-- Reward-early blocks -->
			{#if preview.insufficient}
				<gok-alert status="error">
					Not enough buying power — I have {formatMoney(preview.buyingPowerEurMinor, 'EUR')}.
				</gok-alert>
			{:else if preview.exceedsHolding}
				<gok-alert status="error">
					I only hold <span class="gok-tabular-nums">{formatNumber(heldQty)}</span>
					{symbol} — I can't sell more than that.
				</gok-alert>
			{/if}
		</div>

		<!-- The confirm gate lives inside the drawer so focus stays within its scope. -->
		<gok-dialog
			tone="danger"
			size="s"
			heading="Confirm order"
			no-dismiss
			{@attach setProps({ open: confirmOpen })}
		>
			<p class="confirm-body">
				{verb}
				<strong class="gok-tabular-nums">{formatNumber(preview.effectiveQuantity)}</strong>
				{symbol} for ~<strong class="gok-tabular-nums">
					{formatMoney(preview.grandTotalEurMinor, 'EUR')}</strong
				>?
				{#if invest.draft.kind === 'market'}
					The final price may differ — markets move.
				{:else}
					This rests as a {invest.draft.kind} order until it triggers.
				{/if}
			</p>

			{#if stepUpRequired}
				<!-- Step-up: required for an order ≥ €1,000. SIMULATED (real passkey is F12). -->
				<div class="stepup">
					<p class="stepup-key gok-eyebrow">Verify it's me</p>
					{#if stepUpVerified}
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
						<p class="stepup-body">
							An order of this size needs a quick identity check before it's placed.
						</p>
						<gok-button variant="secondary" {@attach on('click', approveWithPasskey)}>
							Approve with passkey
						</gok-button>
					{/if}
				</div>
			{/if}

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: stepUpRequired && !stepUpVerified })}
					{@attach on('click', placeNow)}
				>
					{verb} {symbol}
				</gok-button>
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
				Review order
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

	.fx {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		align-items: flex-end;
	}

	.fx-note {
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
		text-align: end;
	}

	.power {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-200);
	}

	.arrow {
		color: var(--gok-color-text-muted);
	}

	/* --- Form action row (drawer footer) --- */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Confirm dialog body + step-up --- */
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

	.stepup {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.stepup-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.stepup-body {
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
