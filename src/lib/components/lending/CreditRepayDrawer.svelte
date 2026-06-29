<script lang="ts">
	// L05 Flow B · Credit repay drawer — paying money off my revolving credit line.
	// It rides the calm money spine: choose how much (the minimum, the full statement
	// balance, or a custom amount) → pick the funding wallet → read the plainly-stated
	// interest impact → a forced-decision confirm naming the exact amount → place. The
	// statement-clearing path says it avoids interest; any residual states, as fact,
	// the interest the next cycle will charge — no hype, fully disclosed.
	//
	// The math is owned by `credit-line` (I never recompute a figure here — I read the
	// impact). Interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a
	// gok-* element (MoneyInput is an app composite, so its own `bind:value` is fine).
	//
	// The forest-green accent stays earned — it is only the single primary "Repay/Pay"
	// action.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { creditLine as cl } from '$lib/state/credit-line.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	interface Props {
		/** Whether the drawer is shown (two-way; the host opens it, the drawer closes it). */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	type Choice = 'minimum' | 'statement' | 'custom';

	// ── Live reads (the single source of amount + impact truth) ──
	const statementMinor = $derived(cl.facility.statementBalanceMinor);
	const balanceMinor = $derived(cl.facility.balanceMinor);
	const minimumMinor = $derived(cl.minimumPaymentMinor);

	// Funding wallets — the wallets the repayment can come from. The EUR home wallet
	// leads (it funds the EUR line without conversion); the rest follow, each shown
	// with its own-currency balance so I see what's actually available.
	const wallets = $derived(
		[...accounts.wallets].sort((a, b) => Number(b.primary) - Number(a.primary))
	);

	// ── Form state ──
	let choice = $state<Choice>('minimum');
	let customValue = $state(0); // MoneyInput's bindable minor-unit value
	let customMinor = $state(0); // the canonical amount off MoneyInput's onchange
	let walletId = $state('');

	// The amount I'd pay, resolved from the choice.
	const payMinor = $derived(
		choice === 'minimum' ? minimumMinor : choice === 'statement' ? statementMinor : customMinor
	);

	const selectedWallet = $derived(wallets.find((w) => w.id === walletId) ?? wallets[0]);
	const walletName = $derived(selectedWallet?.name ?? 'wallet');

	// Reward-early funds block: the chosen wallet can't cover the amount.
	const insufficient = $derived(
		!!selectedWallet && payMinor > 0 && selectedWallet.availableMinor < payMinor
	);

	const impact = $derived(cl.repayImpact(payMinor));
	const canRepay = $derived(payMinor > 0 && !!selectedWallet && !insufficient);

	// ── Phase machine: the form (with a confirm dialog over it) → done ──
	let phase = $state<'form' | 'done'>('form');
	let confirmOpen = $state(false);
	let placed = $state<{
		amountLabel: string;
		walletName: string;
		clears: boolean;
		residualLabel: string;
		interestLabel: string;
	} | null>(null);

	// Open is the rising edge: reset the form, the phase, and the gate. `untrack` keeps
	// the effect keyed on `open` alone.
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				phase = 'form';
				confirmOpen = false;
				placed = null;
				choice = 'minimum';
				customValue = 0;
				customMinor = 0;
				walletId = wallets[0]?.id ?? '';
			}
			wasOpen = isOpen;
		});
	});

	// ── Handlers ──
	function onChoiceChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? 'minimum';
		choice = value as Choice;
	}

	function onWalletChange(event: Event) {
		walletId = (event.target as HTMLElement & { value?: string }).value ?? '';
	}

	function onCustomAmount(minor: number) {
		customMinor = minor;
	}

	function openConfirm() {
		if (!canRepay) return;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: capture the figures, apply the repayment, advance. */
	function confirmRepay() {
		const amt = payMinor;
		const result = cl.commitRepay(amt);
		confirmOpen = false;
		placed = {
			amountLabel: eur(amt),
			walletName,
			clears: result.clearsStatement,
			residualLabel: eur(result.residualMinor),
			interestLabel: eur(result.nextInterestMinor)
		};
		phase = 'done';
	}

	function closeDrawer() {
		open = false;
	}

	/** Move focus to the success heading when the done view mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<gok-drawer
	placement="end"
	heading="Repay my credit line"
	{@attach setProps({ open })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	{#if phase === 'done' && placed}
		<!-- Done · the repayment made + what it means for interest. -->
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

			<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>Payment made</h2>

			<gok-tag size="m" dot variant="selected">Paid {placed.amountLabel}</gok-tag>

			<p class="done-note">
				I paid {placed.amountLabel} off my credit line from my {placed.walletName}.
				{#if placed.clears}
					That clears my statement — no interest will be charged.
				{:else}
					{placed.residualLabel} is left on my statement; about {placed.interestLabel} interest will be
					charged next cycle. My balance and available credit update straight away.
				{/if}
			</p>

			<div slot="actions" class="done-actions">
				<gok-button variant="primary" {@attach on('click', closeDrawer)}>Done</gok-button>
			</div>
		</gok-empty-state>
	{:else}
		<!-- Form · the repayment ticket, top to bottom. -->
		<div class="form">
			<p class="lead">
				A repayment comes straight off my balance and frees the same amount of credit. Paying my
				full statement balance by the due date avoids interest.
			</p>

			<!-- How much -->
			<gok-radio-group
				label="How much to pay"
				orientation="vertical"
				{@attach setProps({ value: choice })}
				{@attach on('change', onChoiceChange)}
			>
				<gok-radio class="option" class:is-selected={choice === 'minimum'} value="minimum">
					<span class="option-label">
						<span class="option-name">Minimum payment</span>
						<span class="option-meta gok-tabular-nums">{eur(minimumMinor)}</span>
					</span>
				</gok-radio>
				<gok-radio class="option" class:is-selected={choice === 'statement'} value="statement">
					<span class="option-label">
						<span class="option-name">Statement balance</span>
						<span class="option-meta gok-tabular-nums">{eur(statementMinor)}</span>
					</span>
				</gok-radio>
				<gok-radio class="option" class:is-selected={choice === 'custom'} value="custom">
					<span class="option-label">
						<span class="option-name">Custom amount</span>
						<span class="option-meta">I choose</span>
					</span>
				</gok-radio>
			</gok-radio-group>

			{#if choice === 'custom'}
				<div class="field">
					<MoneyInput
						bind:value={customValue}
						currency="EUR"
						label="Amount to pay"
						balanceMinor={balanceMinor}
						onchange={onCustomAmount}
					/>
				</div>
			{/if}

			<!-- Funding wallet -->
			<div class="field">
				<gok-select
					label="Pay from"
					{@attach setProps({ value: walletId })}
					{@attach on('change', onWalletChange)}
				>
					{#each wallets as w (w.id)}
						<gok-option value={w.id}>
							{w.name} · {formatMoney(w.availableMinor, w.currency)} available
						</gok-option>
					{/each}
				</gok-select>
			</div>

			{#if insufficient && selectedWallet}
				<gok-alert status="error" class="funds-flag">
					Not enough in {selectedWallet.name} — choose another or a smaller amount.
				</gok-alert>
			{/if}

			<!-- Interest impact (plainly stated, no hype) -->
			<gok-card class="preview">
				<p class="preview-eyebrow gok-eyebrow">What this costs</p>
				<dl class="ledger">
					<div class="row">
						<dt>I pay</dt>
						<dd class="gok-tabular-nums">{eur(payMinor)}</dd>
					</div>
					<div class="row">
						<dt>Left on statement</dt>
						<dd class="gok-tabular-nums">{eur(impact.residualMinor)}</dd>
					</div>
				</dl>
				<p class="impact" class:is-clear={impact.clearsStatement}>
					{#if impact.clearsStatement}
						This clears my statement — no interest.
					{:else}
						Paying this leaves {eur(impact.residualMinor)}; about {eur(impact.nextInterestMinor)}
						interest will be charged next cycle.
					{/if}
				</p>
			</gok-card>
		</div>

		<!-- The confirm gate lives inside the drawer so focus stays within its scope. A
		     deliberate forced decision (no-dismiss) that names the exact amount. -->
		<gok-dialog
			size="s"
			heading="Confirm my payment"
			{@attach setProps({ open: confirmOpen, noDismiss: true })}
			{@attach on('gok-cancel', closeConfirm)}
			{@attach on('gok-close', closeConfirm)}
		>
			<p class="confirm-body">
				Pay <strong class="gok-tabular-nums">{eur(payMinor)}</strong> off my credit line from my {walletName}?
			</p>
			<p class="confirm-impact">
				{#if impact.clearsStatement}
					This clears my statement, so no interest is charged.
				{:else}
					{eur(impact.residualMinor)} stays on my statement; about {eur(impact.nextInterestMinor)} interest
					will be charged next cycle.
				{/if}
			</p>

			<div slot="footer" class="confirm-actions">
				<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Back</gok-button>
				<gok-button variant="primary" {@attach on('click', confirmRepay)}>
					Pay {eur(payMinor)}
				</gok-button>
			</div>
		</gok-dialog>
	{/if}

	{#if phase === 'form'}
		<div slot="footer" class="form-actions">
			<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canRepay })}
				{@attach on('click', openConfirm)}
			>
				Repay {eur(payMinor)}
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

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	/* --- Amount options --- */
	.option-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		inline-size: 100%;
	}

	.option-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.option-meta {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.funds-flag {
		display: block;
	}

	/* --- Impact preview card --- */
	.preview {
		display: block;
	}

	.preview-eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

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

	.impact {
		margin: var(--gok-space-300) 0 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.impact.is-clear {
		color: var(--gok-color-text-muted);
	}

	/* --- Form action row (drawer footer) --- */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Confirm dialog --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-impact {
		margin: var(--gok-space-300) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
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
