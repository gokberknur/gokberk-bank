<script lang="ts">
	// Shared header for the three settings surfaces (preferences, appearance,
	// notifications) — a quiet editorial mono eyebrow over a first-person heading,
	// then the shared section sub-nav across the three. Lightweight on purpose —
	// no +layout file; each page renders this header above its own content.
	import SectionSubnav from '$lib/components/shell/SectionSubnav.svelte';
	import { SETTINGS_NAV } from '$lib/components/shell/nav-model';

	interface Props {
		/** The first-person heading for this surface, e.g. "My preferences". */
		heading: string;
		/** A one-line intro under the heading. */
		intro?: string;
	}

	let { heading, intro }: Props = $props();
</script>

<header class="head">
	<p class="head-eyebrow gok-eyebrow">Settings</p>
	<h1 class="head-title gok-headline-2">{heading}</h1>
	{#if intro}
		<p class="head-sub">{intro}</p>
	{/if}
</header>

<SectionSubnav items={SETTINGS_NAV} ariaLabel="Settings sections" />

<style>
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
		max-inline-size: var(--measure-panel);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
