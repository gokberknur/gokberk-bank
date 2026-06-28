<script lang="ts">
	// A04 · Pots grid — the savings-goals home. A calm summary header totals everything
	// I've set aside, with one earned-green primary into the create flow; below it, a
	// responsive grid of pot cards. No pots yet → a single empty state with the same CTA.
	// Money stays ink here; the only accent is the create button and each card's ring.
	import { pots } from '$lib/accounts/pots.svelte';
	import { formatMoney, formatNumber } from '$lib/format';
	import PotCard from '$lib/components/accounts/PotCard.svelte';

	const all = $derived(pots.all());
	const total = $derived(formatMoney(pots.totalEurMinor(), 'EUR'));
	const count = $derived(all.length);
	const countLine = $derived(`${formatNumber(count)} ${count === 1 ? 'pot' : 'pots'}`);
</script>

<svelte:head>
	<title>Pots · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/accounts">&larr; Accounts</gok-link>
		<p class="eyebrow gok-eyebrow">Accounts</p>
		<h1 class="title gok-headline-2">Pots</h1>

		<div class="summary">
			<div class="total">
				<p class="total-label gok-eyebrow">Set aside</p>
				<p class="total-figure gok-tabular-nums">{total}</p>
				{#if count > 0}
					<p class="total-sub">{countLine}</p>
				{/if}
			</div>
			<gok-link href="/accounts/pots/new">
				<gok-button variant="primary">Create a pot</gok-button>
			</gok-link>
		</div>
	</header>

	{#if count === 0}
		<gok-empty-state>
			<p class="empty-title gok-headline-5">Create my first pot</p>
			<p class="empty-body">
				A pot keeps money for a goal apart from my spending — a deposit, a trip, a rainy day. I move
				money in and out anytime; nothing is locked.
			</p>
			<gok-link slot="actions" href="/accounts/pots/new">
				<gok-button variant="primary">Create a pot</gok-button>
			</gok-link>
		</gok-empty-state>
	{:else}
		<ul class="grid">
			{#each all as pot (pot.id)}
				<li class="cell">
					<PotCard {pot} />
				</li>
			{/each}
		</ul>
	{/if}
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

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-400);
		margin-block-start: var(--gok-space-300);
	}

	.total {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cell {
		display: flex;
	}

	.cell :global(gok-card) {
		inline-size: 100%;
	}

	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		max-inline-size: 38rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
</style>
