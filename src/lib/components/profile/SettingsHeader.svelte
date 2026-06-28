<script lang="ts">
	// Shared header for the three settings surfaces (preferences, appearance,
	// notifications) — a quiet editorial mono eyebrow over a first-person heading,
	// then a horizontal sub-nav across the three. The active area carries
	// aria-current="page" (state-driven, never colour alone): the underline rule
	// turns to the one earned accent and the label to ink. Lightweight on purpose —
	// no +layout file; each page renders this header above its own content.
	import { page } from '$app/state';

	interface Props {
		/** The first-person heading for this surface, e.g. "My preferences". */
		heading: string;
		/** A one-line intro under the heading. */
		intro?: string;
	}

	let { heading, intro }: Props = $props();

	const areas = [
		{ href: '/settings/preferences', label: 'Preferences' },
		{ href: '/settings/appearance', label: 'Appearance' },
		{ href: '/settings/notifications', label: 'Notifications' }
	];

	const pathname = $derived(page.url.pathname);
</script>

<header class="head">
	<p class="head-eyebrow gok-eyebrow">Settings</p>
	<h1 class="head-title gok-headline-2">{heading}</h1>
	{#if intro}
		<p class="head-sub">{intro}</p>
	{/if}
</header>

<nav class="subnav" aria-label="Settings areas">
	<ul class="subnav-list">
		{#each areas as area (area.href)}
			<li>
				<a
					class="subnav-link"
					href={area.href}
					aria-current={pathname === area.href ? 'page' : undefined}
				>
					{area.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

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
		max-inline-size: 42rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* Sub-nav: a row of links with a hairline baseline. The active area's rule turns
	   to the accent and its label to ink — read from aria-current, not colour alone. */
	.subnav {
		overflow-x: auto;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		scrollbar-width: none;
	}

	.subnav::-webkit-scrollbar {
		display: none;
	}

	.subnav-list {
		display: flex;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.subnav-link {
		display: inline-block;
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		border-block-end: var(--gok-border-width-strong) solid transparent;
		margin-block-end: calc(-1 * var(--gok-border-width-hairline));
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
		text-decoration: none;
		white-space: nowrap;
		transition: color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.subnav-link:hover {
		color: var(--gok-color-text);
	}

	.subnav-link[aria-current='page'] {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
		border-block-end-color: var(--gok-color-primary);
	}

	.subnav-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}
</style>
