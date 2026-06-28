<script lang="ts">
	// The authed app shell. It nests inside the root +layout (which already imports
	// the foundation CSS, registers the gök elements, and bridges View Transitions —
	// none of that is duplicated here). Responsive by breakpoint: full rail on
	// desktop, collapsed icon rail on tablet, hidden rail + bottom tab bar on mobile.
	// The persistent chrome (rail + navbar) is pinned out of the page crossfade via
	// its own view-transition-name, so only <main> animates between routes.
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import AppSidenav from '$lib/components/shell/AppSidenav.svelte';
	import AppNavbar from '$lib/components/shell/AppNavbar.svelte';
	import BottomTabBar from '$lib/components/shell/BottomTabBar.svelte';
	import CommandPalette from '$lib/components/shell/CommandPalette.svelte';
	import { toasts } from '$lib/state/toasts.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { command } from '$lib/state/command.svelte';
	import { on } from '$lib/wc.svelte';

	let { children } = $props();

	// The global command-palette shortcut: Cmd/Ctrl-K toggles it from anywhere — even
	// while typing in a field — so it's always one keystroke away.
	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
			event.preventDefault();
			if (command.open) command.close();
			else command.openPalette();
		}
	}

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
</script>

<svelte:window onkeydown={onWindowKeydown} />

<a href="#main" class="skip">Skip to content</a>

<div class="shell">
	<div class="rail">
		<AppSidenav collapsed={tablet.current} />
	</div>

	<div class="content">
		<div class="navbar-wrap">
			<AppNavbar />
		</div>
		<main id="main" class="main">
			{@render children()}
		</main>
	</div>
</div>

<BottomTabBar />

<CommandPalette />

<gok-toast-region placement="bottom-end">
	{#each toasts.items as t (t.id)}
		<gok-toast
			status={t.status}
			duration={t.duration}
			{@attach on('gok-dismiss', () => toasts.dismiss(t.id))}>{t.message}</gok-toast
		>
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

	.shell {
		display: flex;
		align-items: stretch;
		min-block-size: 100dvh;
	}

	.rail {
		view-transition-name: app-rail;
		flex: none;
		border-inline-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: var(--gok-color-surface);
	}

	.content {
		flex: 1 1 auto;
		min-inline-size: 0;
		display: flex;
		flex-direction: column;
	}

	.navbar-wrap {
		view-transition-name: app-navbar;
		position: sticky;
		inset-block-start: 0;
		z-index: var(--gok-z-sticky);
		background: var(--gok-color-surface-translucent);
		backdrop-filter: blur(var(--gok-blur-chrome));
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.main {
		flex: 1 1 auto;
		min-inline-size: 0;
		padding-inline: var(--gok-space-500);
		padding-block: var(--gok-space-600);
	}

	/* Mobile: rail hidden, bottom bar shown — pad the content so it clears the bar. */
	@media (max-width: 39.999rem) {
		.rail {
			display: none;
		}

		.main {
			padding-inline: var(--gok-space-400);
			padding-block-end: calc(var(--gok-space-900) + env(safe-area-inset-bottom));
		}
	}
</style>
