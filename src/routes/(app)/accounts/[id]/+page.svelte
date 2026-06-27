<script lang="ts">
	// A02 — the wallet detail surface and the flagship gok-table showcase. The
	// header carries the balance and the copyable IBAN/BIC; the toolbar drives the
	// filter/search view; the grid renders the (large) ledger via gok-table's own
	// pagination. The forest-green accent is spent once — on the table's selected
	// row rule — so balances and amounts stay ink. The balance-history chart (F11)
	// is deferred; later money surfaces (P02/P04/A06, A05) render as disabled
	// "Soon" affordances rather than linking to a 404.
	import { page } from '$app/state';
	import { accounts } from '$lib/state/accounts.svelte';
	import { transactions } from '$lib/state/transactions.svelte';
	import { formatMoney } from '$lib/format';
	import { copyText } from '$lib/accounts/copy';
	import { on } from '$lib/wc.svelte';
	import type { Transaction } from '$lib/data/types';
	import TxnToolbar from '$lib/components/accounts/TxnToolbar.svelte';
	import TransactionGrid from '$lib/components/accounts/TransactionGrid.svelte';
	import TransactionDrawer from '$lib/components/accounts/TransactionDrawer.svelte';

	const wallet = $derived(page.params.id ? accounts.wallet(page.params.id) : undefined);

	// Re-scope the ledger whenever the wallet id changes.
	$effect(() => {
		if (wallet) transactions.scopeTo(wallet.id);
	});

	let selected = $state<Transaction | null>(null);

	// Transient "Copied" feedback for the identifier rows.
	let copied = $state<'iban' | 'bic' | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy(kind: 'iban' | 'bic', text: string) {
		const ok = await copyText(text);
		if (!ok) return;
		copied = kind;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = null), 1500);
	}

	const available = $derived(wallet ? formatMoney(wallet.availableMinor, wallet.currency) : '');
	const current = $derived(wallet ? formatMoney(wallet.currentMinor, wallet.currency) : '');
	const held = $derived(wallet ? formatMoney(wallet.holdMinor, wallet.currency) : '');
</script>

{#if !wallet}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Wallet not found</p>
			<p class="missing-body">This wallet doesn’t exist, or it has been closed.</p>
			<gok-link slot="actions" href="/accounts">Back to accounts</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/accounts">&larr; Accounts</gok-link>

			<p class="currency gok-eyebrow">{wallet.currency} wallet</p>
			<h1 class="name gok-headline-2">{wallet.name}</h1>

			<div class="balance">
				<p class="available gok-tabular-nums">{available}</p>
				{#if wallet.holdMinor > 0}
					<p class="held gok-tabular-nums">Current {current} · {held} held</p>
				{/if}
			</div>

			<dl class="ids">
				<div class="id-row">
					<dt class="id-label gok-eyebrow">IBAN</dt>
					<dd class="id-value">
						<span class="id-text gok-tabular-nums">{wallet.iban}</span>
						<gok-button
							variant="ghost"
							size="s"
							accessible-label="Copy IBAN"
							{@attach on('click', () => copy('iban', wallet.iban))}
						>
							{copied === 'iban' ? 'Copied' : 'Copy'}
						</gok-button>
					</dd>
				</div>
				<div class="id-row">
					<dt class="id-label gok-eyebrow">BIC</dt>
					<dd class="id-value">
						<span class="id-text gok-tabular-nums">{wallet.bic}</span>
						<gok-button
							variant="ghost"
							size="s"
							accessible-label="Copy BIC"
							{@attach on('click', () => copy('bic', wallet.bic))}
						>
							{copied === 'bic' ? 'Copied' : 'Copy'}
						</gok-button>
					</dd>
				</div>
			</dl>

			<p class="copy-status" role="status" aria-live="polite">
				{#if copied === 'iban'}IBAN copied{:else if copied === 'bic'}BIC copied{/if}
			</p>

			<div class="head-actions">
				<gok-button variant="secondary" disabled>Send</gok-button>
				<gok-button variant="secondary" disabled>Exchange</gok-button>
				<gok-button variant="secondary" disabled>Statements</gok-button>
				<gok-tag size="s">Soon</gok-tag>
			</div>
		</header>

		<!-- TODO: F11 balance-history chart -->

		<TxnToolbar />

		<TransactionGrid
			rows={transactions.rows}
			currency={wallet.currency}
			total={transactions.total}
			scopedTotal={transactions.scopedTotal}
			selectedId={selected?.id ?? null}
			onselect={(t) => (selected = t)}
		/>

		<TransactionDrawer
			txn={selected}
			open={selected !== null}
			currency={wallet.currency}
			onclose={() => (selected = null)}
		/>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.missing {
		padding-block: var(--gok-space-700);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.currency {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.balance {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin-block-start: var(--gok-space-200);
	}

	.available {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-2-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		color: var(--gok-color-text);
	}

	.held {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ids {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-600);
		margin: 0;
		margin-block-start: var(--gok-space-300);
	}

	.id-row {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.id-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.id-value {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.id-text {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.copy-status {
		margin: 0;
		min-block-size: var(--gok-type-body-small-line);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.head-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-300);
	}
</style>
