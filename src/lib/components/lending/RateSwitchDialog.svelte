<script lang="ts">
	// L04 Flow B · Rate-switch dialog — moving my mortgage onto a new product. Switching
	// changes my deal (the rate, the monthly payment, and — for a new fix — the fixed-period
	// end), so it runs review → forced decision: the parent dialog lays out the new rate
	// (with its APRC beside it), the fees, and the new monthly against my current one; a
	// nested no-dismiss confirm forces the decision before `ms.commitRateSwitch` regenerates
	// the schedule. The math is owned by `mortgage-servicing` (the product is already priced
	// on today's balance, term and LTV — I read it, never recompute).
	//
	// Interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-* element.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { mortgageServicing as ms } from '$lib/state/mortgage-servicing.svelte';
	import type { MortgageProduct } from '$lib/lending/mortgage';

	interface Props {
		/** Whether the dialog is shown (two-way; the host opens it, the dialog closes it). */
		open?: boolean;
		/** The product I'm reviewing a switch to (null until one is chosen). */
		product?: MortgageProduct | null;
	}

	let { open = $bindable(false), product = null }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// bps → a two-decimal percent string (349 → "3.49%").
	const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;

	// ── Live reads (my current deal, to compare against the chosen product) ──
	const current = $derived(ms.mortgage);
	const monthlyDeltaMinor = $derived(product ? product.monthlyMinor - current.monthlyMinor : 0);

	// ── Phase machine: review (with a forced-decision confirm over it) → done ──
	let phase = $state<'review' | 'done'>('review');
	let confirmOpen = $state(false);
	let switchedLabel = $state('');

	// Open is the rising edge: reset the phase + the gate. `untrack` keeps the effect
	// keyed on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				phase = 'review';
				confirmOpen = false;
				switchedLabel = '';
			}
			wasOpen = isOpen;
		});
	});

	// ── Review → forced decision → switch ──
	function openConfirm() {
		if (!product) return;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: switch the product, then advance to the confirmation. */
	function switchNow() {
		if (!product) return;
		switchedLabel = product.label;
		ms.commitRateSwitch(product);
		confirmOpen = false;
		phase = 'done';
	}

	function closeDialog() {
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-dialog
	size="m"
	heading="Switch my rate"
	{@attach setProps({ open })}
	{@attach on('gok-cancel', closeDialog)}
	{@attach on('gok-close', closeDialog)}
>
	{#if phase === 'done'}
		<!-- Done · the switch is live; the summary + schedule have regenerated behind me. -->
		<div class="done">
			<span class="mark" aria-hidden="true">
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Rate switched</h2>

			<p class="done-note">
				I'm now on the {switchedLabel}. My monthly payment and schedule have updated straight away —
				my new deal is reflected across this page.
			</p>
		</div>

		<div slot="footer" class="done-actions">
			<gok-button variant="primary" {@attach on('click', closeDialog)}>Done</gok-button>
		</div>
	{:else if product}
		<!-- Review · the new deal, with its APRC beside the rate, against my current one. -->
		<div class="review">
			<p class="lead">
				Switching moves my mortgage onto a new product priced on today's balance and remaining term.
				My balance and term carry over; the rate, monthly payment and any fixed-period end change.
			</p>

			<dl class="ledger">
				<div class="row">
					<dt>New deal</dt>
					<dd>{product.label}</dd>
				</div>
				<div class="row">
					<dt>New rate</dt>
					<dd class="gok-tabular-nums">{pct(product.aprBps)} · {pct(product.aprcBps)} APRC</dd>
				</div>
				<div class="row">
					<dt>Fees</dt>
					<dd class="gok-tabular-nums">{eur(product.fees.totalMinor)}</dd>
				</div>
				<div class="row total">
					<dt>New monthly</dt>
					<dd class="gok-tabular-nums">{eur(product.monthlyMinor)}</dd>
				</div>
			</dl>

			<dl class="ledger now">
				<div class="row">
					<dt>My rate now</dt>
					<dd class="gok-tabular-nums">{pct(current.aprBps)}</dd>
				</div>
				<div class="row">
					<dt>My monthly now</dt>
					<dd class="gok-tabular-nums">{eur(current.monthlyMinor)}</dd>
				</div>
				<div class="row">
					<dt>Change to my monthly</dt>
					<dd class="gok-tabular-nums">
						{formatMoney(monthlyDeltaMinor, 'EUR', { signDisplay: true })}
					</dd>
				</div>
			</dl>
		</div>

		<div slot="footer" class="review-actions">
			<gok-button variant="secondary" {@attach on('click', closeDialog)}>Back</gok-button>
			<gok-button variant="primary" {@attach on('click', openConfirm)}>
				Switch to this deal
			</gok-button>
		</div>
	{/if}

	<!-- The forced decision. Always runs before the product switches. -->
	<gok-dialog
		size="s"
		heading="Confirm rate switch"
		no-dismiss
		{@attach setProps({ open: confirmOpen })}
		{@attach on('gok-cancel', closeConfirm)}
		{@attach on('gok-close', closeConfirm)}
	>
		{#if product}
			<p class="confirm-body">
				I'm switching to the <strong>{product.label}</strong> at
				<strong class="gok-tabular-nums">{pct(product.aprBps)}</strong>. My monthly payment becomes
				<strong class="gok-tabular-nums">{eur(product.monthlyMinor)}</strong> and my schedule
				regenerates from today.
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', switchNow)}>
					Switch to {product.label}
				</gok-button>
			</div>
		{/if}
	</gok-dialog>
</gok-dialog>

<style>
	.review,
	.done {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.done {
		align-items: center;
		text-align: center;
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

	.now {
		color: var(--gok-color-text-muted);
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

	.row.total {
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row.total dt,
	.row.total dd {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.review-actions,
	.confirm-actions,
	.done-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

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
		max-inline-size: 40ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
