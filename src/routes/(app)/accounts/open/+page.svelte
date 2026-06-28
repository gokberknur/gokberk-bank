<script lang="ts">
	// A03 · Open a new currency wallet — a calm, deep-linkable `gok-dialog` hosted on
	// its own route (`/accounts/open`). Opening a wallet moves no money (it issues a
	// fresh account at zero), so this is low-stakes and reversible: a *plain* dialog,
	// no danger tone, no step-up. Two faces on one surface — pick a currency, then a
	// quiet success panel with the new IBAN/BIC once the account is issued.
	//
	// First-person singular throughout: I'm opening MY wallet, I see MY new IBAN. The
	// forest-green accent is spent once, on the success check — identifiers stay ink.
	// Interop is strictly `setProps`/`on` — never `bind:` on a gok-* host; the picked
	// currency is read off the select's `change` event.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { copyText } from '$lib/accounts/copy';
	import { toast } from '$lib/state/toasts.svelte';
	import type { Wallet } from '$lib/data';
	import type { Currency } from '$lib/data/money';

	// The currencies I don't yet hold — the picker's options. Read once at mount; the
	// success panel (not the picker) renders after a wallet is opened, so this set
	// never needs to re-narrow mid-flow.
	const openable = accounts.openableCurrencies();
	const hasOptions = openable.length > 0;

	// ── Draft + flow state ──────────────────────────────────────────────────────
	// `code` is the picked currency (defaults to the first openable). `opened` holds
	// the freshly-issued wallet — its presence swaps the dialog body to the success
	// panel. `announce` backs an sr-only live region for the copy affordance.
	let code = $state<Currency | ''>(openable[0]?.code ?? '');
	let opened = $state<Wallet | null>(null);
	let announce = $state('');

	const selected = $derived(openable.find((c) => c.code === code));

	// The dialog is opened on mount (for the enter transition); its heading both
	// labels the dialog for assistive tech and carries the success state. We never
	// flip `open` back to false ourselves — leaving the route unmounts the dialog —
	// because a programmatic close makes gok-dialog re-emit `gok-close`, which would
	// fire a *second*, competing navigation. `leaving` guards to exactly one goto.
	let open = $state(false);
	let leaving = false;
	onMount(() => {
		open = true;
	});

	const heading = $derived(opened ? 'Wallet opened' : 'Open a wallet');

	/** Navigate away once — the route unmount tears the dialog down. */
	function leave(href: string) {
		if (leaving) return;
		leaving = true;
		goto(href);
	}

	// Closing — before OR after confirm — returns to /accounts (the X, Escape, the
	// backdrop, Cancel, and Done all route here). Closing before the confirm creates
	// nothing; the wallet is only issued by `confirm()`.
	function dismiss() {
		leave('/accounts');
	}

	function onCurrency(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		code = value as Currency;
	}

	// Issue the wallet (optimistic — `openWallet` toasts "{code} wallet opened" and
	// returns the new account with its deterministic mock IBAN/BIC). Guarded so a
	// double-fire can't mint two wallets.
	function confirm() {
		if (!code || opened) return;
		opened = accounts.openWallet(code);
	}

	async function copyIban() {
		if (!opened) return;
		const ok = await copyText(opened.iban);
		if (!ok) return;
		toast('IBAN copied', { status: 'success' });
		announce = 'IBAN copied to clipboard';
	}

	function goToWallet() {
		if (!opened) return;
		leave(`/accounts/${opened.id}`);
	}
</script>

<svelte:head>
	<title>Open a wallet · gökberk bank</title>
</svelte:head>

<gok-dialog
	size="s"
	{@attach setProps({ open, heading })}
	{@attach on('gok-cancel', dismiss)}
	{@attach on('gok-close', dismiss)}
>
	{#if opened}
		<!-- Success · a calm confirmation, the new identifiers as facts, two ways on. -->
		<div class="success">
			<span class="success-glyph" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="24" height="24" fill="none">
					<path
						d="M5 12.5l4.5 4.5L19 6.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>

			<p class="success-body">
				My {opened.currency} wallet is open, with its own IBAN. No money moved — it starts at zero.
			</p>

			<dl class="facts">
				<div class="fact">
					<dt>IBAN</dt>
					<dd class="fact-value">
						<span class="ident gok-tabular-nums">{opened.iban}</span>
						<gok-button variant="secondary" size="s" {@attach on('click', copyIban)}>
							Copy<span class="sr-only"> IBAN</span>
						</gok-button>
					</dd>
				</div>
				<div class="fact">
					<dt>BIC</dt>
					<dd><span class="ident gok-tabular-nums">{opened.bic}</span></dd>
				</div>
			</dl>

			<p class="sr-only" role="status" aria-live="polite">{announce}</p>
		</div>

		<div slot="footer" class="actions">
			<gok-button variant="secondary" {@attach on('click', dismiss)}>Done</gok-button>
			<gok-button variant="primary" {@attach on('click', goToWallet)}>Go to wallet</gok-button>
		</div>
	{:else if hasOptions}
		<!-- Pick · a labelled currency select, the no-cost note, the one-line summary. -->
		<div class="pick">
			<gok-select
				label="Which currency?"
				{@attach setProps({ value: code })}
				{@attach on('change', onCurrency)}
			>
				{#each openable as currency (currency.code)}
					<gok-option value={currency.code}>
						{currency.flag}
						{currency.code} · {currency.name}
					</gok-option>
				{/each}
			</gok-select>

			<p class="note">Free to open · no minimum balance.</p>

			{#if selected}
				<p class="summary">A new {selected.code} wallet with its own IBAN.</p>
			{/if}
		</div>

		<div slot="footer" class="actions">
			<gok-button variant="secondary" {@attach on('click', dismiss)}>Cancel</gok-button>
			<gok-button variant="primary" {@attach setProps({ disabled: !code })} {@attach on('click', confirm)}>
				Open {code} wallet
			</gok-button>
		</div>
	{:else}
		<!-- Empty · I already hold every supported currency — nothing left to open. -->
		<gok-empty-state>
			<p class="empty-title gok-headline-5">I hold every available currency</p>
			<p class="empty-body">
				There's no new currency wallet left to open — I already hold one in each currency the bank
				supports.
			</p>
			<gok-button slot="actions" variant="primary" {@attach on('click', dismiss)}>Done</gok-button>
		</gok-empty-state>
	{/if}
</gok-dialog>

<style>
	/* --- Pick step --- */
	.pick {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* --- Success step --- */
	.success {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.success-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.75rem;
		block-size: 2.75rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.success-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* --- IBAN/BIC facts ledger --- */
	.facts {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.fact {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.fact:first-child {
		border-block-start: none;
	}

	.fact dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.fact dd {
		margin: 0;
		text-align: end;
	}

	.fact-value {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	.ident {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* --- Empty step --- */
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Footer actions --- */
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Shared --- */
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
