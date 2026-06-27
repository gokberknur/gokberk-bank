<script lang="ts">
	// A tidy placeholder for the home surface — the real dashboard is the next task.
	// Just the greeting + a single net-worth teaser, editorial and left-aligned.
	import { session } from '$lib/state/session.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney } from '$lib/format';

	let firstName = $derived(session.name.split(/\s+/)[0]);
	let netWorth = $derived(formatMoney(accounts.netWorthEurMinor, 'EUR'));
</script>

<section class="overview">
	<p class="eyebrow gok-eyebrow">Overview</p>
	<h1 class="greeting gok-headline-2">Good to see you, {firstName}</h1>

	<gok-card class="teaser">
		<p class="teaser-label gok-eyebrow">Net worth</p>
		<p class="teaser-figure gok-tabular-nums">{netWorth}</p>
		<p class="teaser-note">Full dashboard coming next.</p>
	</gok-card>
</section>

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		max-inline-size: 64ch;
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.greeting {
		margin: 0;
		color: var(--gok-color-text);
	}

	.teaser {
		margin-block-start: var(--gok-space-300);
	}

	.teaser-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.teaser-figure {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-3-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-3-line);
		letter-spacing: var(--gok-type-headline-3-tracking);
		color: var(--gok-color-text);
	}

	.teaser-note {
		margin: 0;
		margin-block-start: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
