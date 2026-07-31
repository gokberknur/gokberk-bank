<script lang="ts">
	// X01 home dashboard — the calm, editorial launchpad a user lands on after
	// login. It reads "how am I doing?" at a glance: net worth, the wallets, recent
	// activity, quick actions and this-month spend. Read-only: no money moves here,
	// every onward affordance deep-links or waits as "Soon". Omitted blocks
	// (portfolio / tickers / bills) wait on F11/V01/P05.
	//
	// Layout (X06): the page sits on the shared 12-track spine, so the wallet cards
	// here land on the same column lines as the wallet cards on /accounts. At >=64rem
	// the dashboard places its sections explicitly — main column on tracks 1-8, the
	// activity rail on 9-12 spanning all four main rows. Below that everything falls to
	// one column in DOM order, which is why activity is third in the markup: on a phone
	// it rides high, right after balances rather than buried below quick actions and
	// spend (ACC-U-01).
	import { session } from '$lib/state/session.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney } from '$lib/format';
	import NetWorthHero from '$lib/components/home/NetWorthHero.svelte';
	import SectionHead from '$lib/components/layout/SectionHead.svelte';
	import WalletCard from '$lib/components/accounts/WalletCard.svelte';
	import QuickActions from '$lib/components/home/QuickActions.svelte';
	import SpendSummary from '$lib/components/home/SpendSummary.svelte';
	import RecentActivity from '$lib/components/home/RecentActivity.svelte';

	let firstName = $derived(session.name.split(/\s+/)[0]);
	let walletsTotal = $derived(formatMoney(accounts.walletsTotalEurMinor, 'EUR'));
	let orderedWallets = $derived(
		[...accounts.wallets].sort(
			(a, b) => (a.id === 'sek-stockholm' ? 0 : 1) - (b.id === 'sek-stockholm' ? 0 : 1)
		)
	);
</script>

<div class="page-grid">
	<p class="greeting gok-eyebrow">Good to see you, {firstName}</p>

	<div class="dashboard section">
		<section class="net-worth section" aria-labelledby="net-worth-heading">
			<h1 id="net-worth-heading" class="visually-hidden">Net worth</h1>
			<NetWorthHero />
		</section>

		<section class="wallets section" aria-labelledby="wallets-heading">
			<SectionHead
				id="wallets-heading"
				eyebrow="Total across wallets"
				figure={walletsTotal}
				srLabel="Total across wallets"
			>
				{#snippet actions()}
					<gok-link href="/accounts">See all &rarr;</gok-link>
				{/snippet}
			</SectionHead>

			<ul class="grid-run">
				{#each orderedWallets as wallet (wallet.id)}
					<li class="cell-third">
						<WalletCard {wallet} />
					</li>
				{/each}
			</ul>
		</section>

		<!-- Third in the DOM on purpose — see the layout note above. -->
		<aside class="activity section" aria-labelledby="activity-heading">
			<SectionHead id="activity-heading" eyebrow="Recent" title="Activity" />
			<RecentActivity />
		</aside>

		<section class="quick-actions section" aria-labelledby="quick-actions-heading">
			<SectionHead id="quick-actions-heading" eyebrow="Quick actions" title="Start something" />
			<QuickActions />
		</section>

		<section class="spend section" aria-labelledby="spend-heading">
			<SectionHead id="spend-heading" eyebrow="This month" title="Spending" />
			<SpendSummary />
		</section>
	</div>
</div>

<style>
	.greeting {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* Section rhythm between the dashboard's own blocks, rather than the tighter
	   head-to-content rhythm the spine gives a section by default. */
	.dashboard {
		row-gap: var(--gok-space-section);
	}

	/* Desktop: main column on tracks 1-8, the activity rail on 9-12 beside it. Explicit
	   placement rather than auto-flow — the rail has to span the four main-column rows,
	   or it would size to one of them and leave the hero cell padded out with dead
	   height. This is the one bespoke placement on the page; the tracks themselves still
	   come from the spine, so everything stays on the shared column lines. */
	@media (min-width: 64rem) {
		.net-worth {
			grid-column: 1 / 9;
			grid-row: 1;
		}

		.wallets {
			grid-column: 1 / 9;
			grid-row: 2;
		}

		.quick-actions {
			grid-column: 1 / 9;
			grid-row: 3;
		}

		.spend {
			grid-column: 1 / 9;
			grid-row: 4;
		}

		.activity {
			grid-column: 9 / -1;
			grid-row: 1 / span 4;
			align-self: start;
			position: sticky;
			/* Clear of the scroll container's top edge, so the rail never sits flush under the
			   pinned navbar as the main column scrolls past it. */
			inset-block-start: var(--gok-space-500);
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
