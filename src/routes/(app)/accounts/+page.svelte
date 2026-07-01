<script lang="ts">
	// The /accounts overview (A01): a calm home-currency total across wallets, a
	// responsive grid of wallet cards, and a read-only savings-pots summary. The
	// forest-green accent stays unspent on balances here — money is ink. Manage pots
	// (A04) links into the pots surface; open a wallet (A03) opens the deep-linkable
	// `/accounts/open` dialog (a new currency wallet — no money moves).
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney, formatNumber } from '$lib/format';
	import WalletCard from '$lib/components/accounts/WalletCard.svelte';

	let total = $derived(formatMoney(accounts.walletsTotalEurMinor, 'EUR'));
	let potsSaved = $derived(formatMoney(accounts.potsTotalEurMinor, 'EUR'));

	let orderedWallets = $derived(
		[...accounts.wallets].sort(
			(a, b) => (a.id === 'sek-stockholm' ? 0 : 1) - (b.id === 'sek-stockholm' ? 0 : 1)
		)
	);

	let walletCount = $derived(accounts.wallets.length);
	let potCount = $derived(accounts.pots.length);
	let countLine = $derived(
		`${formatNumber(walletCount)} ${walletCount === 1 ? 'wallet' : 'wallets'}` +
			` · ${formatNumber(potCount)} ${potCount === 1 ? 'pot' : 'pots'}`
	);

	// Read-only pot rows: settled balance, and a quiet "X of Y" when a goal is set.
	let pots = $derived(
		accounts.pots.map((pot) => ({
			...pot,
			balance: formatMoney(pot.balanceMinor, pot.currency),
			goalLine:
				pot.goalMinor !== null
					? `${formatMoney(pot.balanceMinor, pot.currency)} of ${formatMoney(pot.goalMinor, pot.currency)}`
					: null
		}))
	);
</script>

<!-- TODO: loading/empty states per A01 when state goes async (skeleton grid; -->
<!-- only-EUR empty-state CTA; gok-alert + retry on load failure). -->
<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Accounts</p>
		<h1 class="head-title gok-headline-2">Your money</h1>

		<div class="total">
			<p class="total-label gok-eyebrow">Total across wallets</p>
			<p class="total-figure gok-tabular-nums">{total}</p>
			<p class="total-sub">{countLine}</p>
		</div>
	</header>

	<section class="wallets" aria-label="Wallets">
		<ul class="wallet-grid">
			{#each orderedWallets as wallet (wallet.id)}
				<li class="wallet-cell">
					<WalletCard {wallet} />
				</li>
			{/each}
		</ul>

		<div class="open-wallet">
			<gok-link href="/accounts/open">
				<gok-button variant="secondary">Open a wallet</gok-button>
			</gok-link>
		</div>
	</section>

	<section class="pots" aria-labelledby="pots-heading">
		<div class="pots-head">
			<h2 id="pots-heading" class="pots-title gok-headline-4">Savings pots</h2>
			<p class="pots-saved gok-tabular-nums">{potsSaved} saved</p>
		</div>

		<ul class="pots-grid">
			{#each pots as pot (pot.id)}
				<li>
					<gok-card>
						<div class="pot">
							<p class="pot-emoji" aria-hidden="true">{pot.emoji}</p>
							<h3 class="pot-name gok-headline-6">{pot.name}</h3>
							<p class="pot-balance gok-tabular-nums">{pot.balance}</p>
							{#if pot.goalLine}
								<p class="pot-goal gok-tabular-nums">{pot.goalLine}</p>
							{/if}
						</div>
					</gok-card>
				</li>
			{/each}
		</ul>

		<div class="manage-pots">
			<gok-link href="/accounts/pots">
				<gok-button variant="secondary">Manage pots</gok-button>
			</gok-link>
		</div>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.total {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin-block-start: var(--gok-space-300);
	}

	.total-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.total-figure {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-2-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		color: var(--gok-color-text);
	}

	.total-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.wallets,
	.pots {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.wallet-grid,
	.pots-grid {
		display: grid;
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.wallet-grid {
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	}

	.pots-grid {
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
	}

	.wallet-cell {
		display: flex;
	}

	.wallet-cell :global(gok-card) {
		inline-size: 100%;
	}

	.open-wallet,
	.manage-pots {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.pots-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.pots-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.pots-saved {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.pot {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.pot-emoji {
		margin: 0;
		font-size: var(--gok-type-headline-5-size);
		line-height: 1;
	}

	.pot-name {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.pot-balance {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		letter-spacing: var(--gok-type-headline-6-tracking);
		color: var(--gok-color-text);
	}

	.pot-goal {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
