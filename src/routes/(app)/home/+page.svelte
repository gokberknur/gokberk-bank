<script lang="ts">
	// X01 home dashboard (first cut) — the calm, editorial launchpad a user lands
	// on after login. It reads "how am I doing?" at a glance: net worth, the wallet
	// strip, quick actions, this-month spend, and recent activity. Read-only: no
	// money moves here, every onward affordance deep-links or waits as "Soon".
	// Omitted blocks (chart / portfolio / tickers / bills) wait on F11/V01/P05.
	import { session } from '$lib/state/session.svelte';
	import NetWorthHero from '$lib/components/home/NetWorthHero.svelte';
	import WalletsStrip from '$lib/components/accounts/WalletsStrip.svelte';
	import QuickActions from '$lib/components/home/QuickActions.svelte';
	import SpendSummary from '$lib/components/home/SpendSummary.svelte';
	import RecentActivity from '$lib/components/home/RecentActivity.svelte';

	let firstName = $derived(session.name.split(/\s+/)[0]);
</script>

<div class="page">
	<header class="greeting">
		<p class="eyebrow gok-eyebrow">Overview</p>
		<h1 class="title gok-headline-2">Good to see you, {firstName}</h1>
	</header>

	<section class="net-worth" aria-labelledby="net-worth-heading">
		<h2 id="net-worth-heading" class="visually-hidden">Net worth</h2>
		<NetWorthHero />
	</section>

	<section class="wallets" aria-labelledby="wallets-heading">
		<h2 id="wallets-heading" class="visually-hidden">Wallets</h2>
		<WalletsStrip />
	</section>

	<!-- TODO: portfolio snapshot when V01 lands -->
	<!-- TODO: market tickers when V02 lands -->

	<section class="quick-actions" aria-labelledby="quick-actions-heading">
		<p class="eyebrow gok-eyebrow">Quick actions</p>
		<h2 id="quick-actions-heading" class="section-title gok-headline-5">Start something</h2>
		<QuickActions />
	</section>

	<div class="split">
		<section class="spend" aria-labelledby="spend-heading">
			<p class="eyebrow gok-eyebrow">This month</p>
			<h2 id="spend-heading" class="section-title gok-headline-5">Spending</h2>
			<SpendSummary />
		</section>

		<section class="activity" aria-labelledby="activity-heading">
			<p class="eyebrow gok-eyebrow">Recent</p>
			<h2 id="activity-heading" class="section-title gok-headline-5">Activity</h2>
			<RecentActivity />
		</section>
	</div>

	<!-- TODO: upcoming bills when P05 lands -->
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 72rem;
	}

	.greeting {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
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

	.split {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-section);
	}

	@media (min-width: 48rem) {
		.split {
			grid-template-columns: 1fr 1fr;
			gap: var(--gok-space-700);
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
