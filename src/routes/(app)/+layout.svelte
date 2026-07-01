<script lang="ts">
	// The authed app shell. It nests inside the root +layout (which already imports
	// the foundation CSS, registers the gök elements, and bridges View Transitions —
	// none of that is duplicated here). Responsive by breakpoint: full rail on
	// desktop, collapsed icon rail on tablet, hidden rail + bottom tab bar on mobile.
	// The persistent chrome (rail + navbar) is pinned out of the page crossfade via
	// its own view-transition-name, so only <main> animates between routes.
	import { MediaQuery } from 'svelte/reactivity';
	import { afterNavigate, goto } from '$app/navigation';
	import AppSidenav from '$lib/components/shell/AppSidenav.svelte';
	import AppNavbar from '$lib/components/shell/AppNavbar.svelte';
	import BottomTabBar from '$lib/components/shell/BottomTabBar.svelte';
	import { toasts } from '$lib/state/toasts.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { on } from '$lib/wc.svelte';

	let { children } = $props();

	// Soft client-side guard. This app is a pure SPA (ssr=false), so there's no
	// server gate: if I'm not signed in, bounce to /login. An effect (not render
	// logic) keeps it a redirect, never a flash of a half-built shell.
	$effect(() => {
		if (!auth.signedIn) goto('/login');
	});

	// Tablet band (40–64rem) → the rail collapses to an icon rail. Below 40rem the
	// rail is hidden entirely (the bottom bar takes over); at/above 64rem it is the
	// full rail.
	const tablet = new MediaQuery('(min-width: 40rem) and (max-width: 63.999rem)');

	// The scroll container is now `.gok-app-shell__main` (the shell pins the chrome and
	// only the content scrolls), so SvelteKit's window-based scroll handling can't reach
	// it. Reset it to the top on each route change — but let in-page anchors (e.g. the
	// skip link's #main) win when the target carries a hash.
	afterNavigate((nav) => {
		if (nav.to?.url.hash) return;
		document.getElementById('main')?.scrollTo({ top: 0 });
	});
</script>

<a href="#main" class="skip">Skip to content</a>

<div class="shell gok-app-shell" class:is-tablet={tablet.current}>
	<div class="topbar gok-app-shell__topbar">
		<AppNavbar />
	</div>

	<aside class="rail gok-app-shell__rail">
		<AppSidenav collapsed={tablet.current} />
	</aside>

	<main id="main" class="main gok-app-shell__main">
		{@render children()}
	</main>
</div>

<BottomTabBar />

<gok-toast-region placement="bottom-end">
	{#each toasts.items as t (t.id)}
		<gok-toast
			status={t.status}
			duration={t.duration}
			{@attach on('gok-dismiss', () => toasts.dismiss(t.id))}
		>
			{t.message}
			{#if t.action}
				<gok-button
					slot="action"
					variant="tertiary"
					size="s"
					{@attach on('click', () => {
						t.action?.onClick();
						toasts.dismiss(t.id);
					})}>{t.action.label}</gok-button
				>
			{/if}
		</gok-toast>
	{/each}
</gok-toast-region>

<style>
	.skip {
		position: fixed;
		inset-block-start: var(--gok-space-200);
		inset-inline-start: var(--gok-space-200);
		z-index: var(--gok-z-skip-link);
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		background: var(--gok-color-primary);
		color: var(--gok-color-text-on-primary);
		border-radius: var(--gok-radius-s);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		text-decoration: none;
		transform: translateY(calc(-100% - var(--gok-space-400)));
		transition: transform var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.skip:focus-visible {
		transform: translateY(0);
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: var(--gok-space-100);
	}

	/* The shell layout (pinned top bar + rail, scrolling content) comes from the DS
	   `.gok-app-shell` utility. We only set app chrome + the responsive rail width. */

	/* Tablet (40–64rem): the rail collapses to the icon rail, so the grid column
	   (and the brand block above it, which reads the same var) follow it down. */
	.shell.is-tablet {
		--gok-app-shell-rail-width: var(--gok-sidenav-rail-width, 3.5rem);
	}

	.topbar {
		view-transition-name: app-navbar;
		background: var(--gok-color-surface-translucent);
		backdrop-filter: blur(var(--gok-blur-chrome));
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.rail {
		view-transition-name: app-rail;
		border-inline-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: var(--gok-color-surface);
	}

	.main {
		padding-inline: var(--gok-space-500);
		padding-block: var(--gok-space-600);
	}

	/* Mobile: one column, rail hidden, bottom bar shown — pad content to clear the bar. */
	@media (max-width: 39.999rem) {
		.shell {
			grid-template-columns: 1fr;
			grid-template-areas: 'topbar' 'main';
		}

		.rail {
			display: none;
		}

		.main {
			padding-inline: var(--gok-space-400);
			padding-block-end: calc(var(--gok-space-900) + env(safe-area-inset-bottom));
		}
	}
</style>
