<script lang="ts">
	// C01 wallet — the home of my cards. The card IS the object here: a scroll-snap
	// strip of card-art heroes is the whole surface, with quiet chrome around it (a
	// mono eyebrow, a one-line summary). One earned accent lives on the focus ring
	// of a selected hero; the colour budget is otherwise spent inside the card-art.
	import { cards } from '$lib/state/cards.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatNumber } from '$lib/format';
	import CardStrip from '$lib/components/cards/CardStrip.svelte';

	const all = $derived(cards.all);
	const count = $derived(all.length);

	// The wallet these cards fund (all on the EUR Main wallet in the seed).
	const walletName = $derived(
		all.length > 0 ? (accounts.wallet(all[0].walletId)?.name ?? 'Main') : 'Main'
	);

	const summary = $derived(
		`${formatNumber(count)} ${count === 1 ? 'card' : 'cards'} on my ${walletName} wallet`
	);
</script>

<svelte:head>
	<title>Cards · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Wallet</p>
		<h1 class="head-title gok-headline-2">Cards</h1>
		{#if count > 0}
			<p class="head-sub">{summary}</p>
		{/if}
	</header>

	{#if count === 0}
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-5">No cards yet</p>
				<p class="empty-body">When I add a card, it shows up here in my wallet.</p>
				<!-- Order wizard (C02) is deferred — no live CTA yet. -->
				<gok-button slot="actions" variant="secondary" disabled>Add a card</gok-button>
			</gok-empty-state>
		</section>
	{:else}
		<section aria-label="My cards">
			<CardStrip cards={all} />
		</section>
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

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.empty {
		padding-block: var(--gok-space-700);
	}

	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
</style>
