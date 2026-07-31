<script lang="ts">
	// The /accounts overview (A01): a calm home-currency total across wallets, a grid of
	// wallet cards, and a read-only savings-pots summary. The forest-green accent stays
	// unspent on balances here — money is ink. Manage pots (A04) links into the pots
	// surface; open a wallet (A03) opens the deep-linkable `/accounts/open` dialog (a new
	// currency wallet — no money moves).
	//
	// Layout (X06): on the shared spine. This page was the clearest case for it — wallets
	// used to lay out on a 16rem auto-fill track and pots on a 13rem one, so two sections
	// of the same page put their cards on different column lines. Both now inherit the
	// page's tracks, and the wallet cards line up with the ones on /home.
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney, formatNumber } from '$lib/format';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SectionHead from '$lib/components/layout/SectionHead.svelte';
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
<div class="page-grid">
	<PageHeader
		eyebrow="Accounts"
		figure={total}
		srLabel="Total across wallets"
		caption={countLine}
	/>

	<section class="section" aria-label="Wallets">
		<ul class="grid-run">
			{#each orderedWallets as wallet (wallet.id)}
				<li class="cell-third wallet-cell">
					<WalletCard {wallet} />
				</li>
			{/each}
		</ul>

		<div class="row-actions">
			<gok-link href="/accounts/open">
				<gok-button variant="secondary">Open a wallet</gok-button>
			</gok-link>
		</div>
	</section>

	<section class="section" aria-labelledby="pots-heading">
		<SectionHead id="pots-heading" eyebrow="Savings" title="Savings pots">
			{#snippet actions()}
				<p class="pots-saved gok-tabular-nums">{potsSaved} saved</p>
			{/snippet}
		</SectionHead>

		<ul class="grid-run">
			{#each pots as pot (pot.id)}
				<!-- Same cell role as the wallet cards above, so the two runs share not just the
			     spine but the exact same column edges — which is the difference between "both
			     are on a grid" and the page reading as one composition. -->
				<li class="cell-third">
					<gok-card>
						<div class="pot">
							<p class="pot-emoji" aria-hidden="true">{pot.emoji}</p>
							<h3 class="pot-name gok-headline-6">{pot.name}</h3>
							<p class="pot-balance gok-tabular-nums">{pot.balance}</p>
							<!-- Reserved even when there is no goal, so the balances of a pot with a
							     goal and one without still land on the same baseline across the row. -->
							<p class="pot-goal line-delta gok-tabular-nums">{pot.goalLine ?? ''}</p>
						</div>
					</gok-card>
				</li>
			{/each}
		</ul>

		<div class="row-actions">
			<gok-link href="/accounts/pots">
				<gok-button variant="secondary">Manage pots</gok-button>
			</gok-link>
		</div>
	</section>
</div>

<style>
	.wallet-cell {
		display: flex;
	}

	.wallet-cell :global(gok-card) {
		inline-size: 100%;
	}

	.row-actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
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
		font-family: var(--gok-type-metric-small-family);
		font-size: var(--gok-type-metric-small-size);
		font-weight: var(--gok-type-metric-small-weight);
		line-height: var(--gok-type-metric-small-line);
		letter-spacing: var(--gok-type-metric-small-tracking);
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
