<script lang="ts">
	// X01 home dashboard — the calm, editorial launchpad a user lands on after
	// login. It reads "how am I doing?" at a glance: net worth, the wallets, recent
	// activity, quick actions and this-month spend. The five sections are flat grid
	// children: at full width (>=64rem) grid-template-areas place the main sections
	// in a 2fr column with activity in a sticky 1fr right rail; below 64rem they
	// collapse to a single column where activity rides high (right after balances,
	// not buried below — ACC-U-01). Read-only: no money moves here, every onward
	// affordance deep-links or waits as "Soon". Omitted blocks (portfolio / tickers
	// / bills) wait on F11/V01/P05.
	import { session } from '$lib/state/session.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney } from '$lib/format';
	import NetWorthHero from '$lib/components/home/NetWorthHero.svelte';
	import WalletCard from '$lib/components/accounts/WalletCard.svelte';
	import QuickActions from '$lib/components/home/QuickActions.svelte';
	import SpendSummary from '$lib/components/home/SpendSummary.svelte';
	import RecentActivity from '$lib/components/home/RecentActivity.svelte';

	let firstName = $derived(session.name.split(/\s+/)[0]);
	let walletsTotal = $derived(formatMoney(accounts.walletsTotalEurMinor, 'EUR'));
</script>

<div class="page">
	<p class="greeting gok-eyebrow">Good to see you, {firstName}</p>

	<div class="dashboard">
		<section class="net-worth" aria-labelledby="net-worth-heading">
			<h1 id="net-worth-heading" class="visually-hidden">Net worth</h1>
			<NetWorthHero />
		</section>

		<section class="wallets" aria-labelledby="wallets-heading">
			<div class="wallets-head">
				<div class="wallets-total">
					<p class="eyebrow gok-eyebrow">Total across wallets</p>
					<h2 id="wallets-heading" class="wallets-figure gok-tabular-nums">{walletsTotal}</h2>
				</div>
				<p class="wallets-more">
					<gok-link href="/accounts">See all &rarr;</gok-link>
				</p>
			</div>

			<ul class="wallet-grid">
				{#each accounts.wallets as wallet (wallet.id)}
					<li class="wallet-cell">
						<WalletCard {wallet} />
					</li>
				{/each}
			</ul>
		</section>

		<!-- Recent activity rides high on mobile (single column) — right after balances, not
		     buried below quick actions + spend (ACC-U-01). On desktop the grid areas below put
		     it back in the sticky right rail. -->
		<aside class="activity" aria-labelledby="activity-heading">
			<p class="eyebrow gok-eyebrow">Recent</p>
			<h2 id="activity-heading" class="section-title gok-headline-5">Activity</h2>
			<RecentActivity />
		</aside>

		<!-- TODO: portfolio snapshot when V01 lands -->
		<!-- TODO: market tickers when V02 lands -->

		<section class="quick-actions" aria-labelledby="quick-actions-heading">
			<p class="eyebrow gok-eyebrow">Quick actions</p>
			<h2 id="quick-actions-heading" class="section-title gok-headline-5">Start something</h2>
			<QuickActions />
		</section>

		<section class="spend" aria-labelledby="spend-heading">
			<p class="eyebrow gok-eyebrow">This month</p>
			<h2 id="spend-heading" class="section-title gok-headline-5">Spending</h2>
			<SpendSummary />
		</section>
	</div>

	<!-- TODO: upcoming bills when P05 lands -->
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.greeting {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.dashboard {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-section);
	}

	.net-worth,
	.wallets,
	.quick-actions,
	.spend,
	.activity {
		min-inline-size: 0;
	}

	.quick-actions,
	.spend,
	.activity {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.section-title {
		margin: 0;
		margin-block-end: var(--gok-space-200);
		color: var(--gok-color-text);
	}

	.wallets {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.wallets-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.wallets-total {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.wallets-figure {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		letter-spacing: var(--gok-type-headline-4-tracking);
		color: var(--gok-color-text);
	}

	.wallets-more {
		margin: 0;
	}

	/* A filling auto-fill grid: cards stretch to fill the column width instead of
	   leaving a right gap (mirrors /accounts). */
	.wallet-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.wallet-cell {
		display: flex;
	}

	.wallet-cell :global(gok-card) {
		inline-size: 100%;
	}

	@media (min-width: 64rem) {
		.dashboard {
			grid-template-columns: minmax(0, 2fr) minmax(20rem, 1fr);
			grid-template-areas:
				'networth activity'
				'wallets  activity'
				'quick    activity'
				'spend    activity';
			align-items: start;
			gap: var(--gok-space-section);
		}

		.net-worth {
			grid-area: networth;
		}

		.wallets {
			grid-area: wallets;
		}

		.quick-actions {
			grid-area: quick;
		}

		.spend {
			grid-area: spend;
		}

		.activity {
			grid-area: activity;
			position: sticky;
			top: var(--gok-space-section);
		}
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}
</style>
