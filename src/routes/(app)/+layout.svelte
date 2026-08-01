<script lang="ts">
	// The authed app shell. It nests inside the root +layout (which already imports
	// the foundation CSS, registers the gök elements, and bridges View Transitions —
	// none of that is duplicated here). Responsive by breakpoint: full rail on
	// desktop, collapsed icon rail on tablet, hidden rail + bottom tab bar on mobile.
	// The persistent chrome (rail + navbar) is pinned out of the page crossfade via
	// its own view-transition-name, so only <main> animates between routes.
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import AppSidenav from '$lib/components/shell/AppSidenav.svelte';
	import AppNavbar from '$lib/components/shell/AppNavbar.svelte';
	import BottomTabBar from '$lib/components/shell/BottomTabBar.svelte';
	import NotificationsDrawer from '$lib/components/shell/NotificationsDrawer.svelte';
	import AlertsDrawer from '$lib/components/invest/AlertsDrawer.svelte';
	import { toasts } from '$lib/state/toasts.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { alerts } from '$lib/invest/alerts.svelte';
	import { on } from '$lib/wc.svelte';
	import { tablet } from '$lib/breakpoints';

	let { children } = $props();

	// Soft client-side guard. This app is a pure SPA (ssr=false), so there's no
	// server gate: if I'm not signed in, bounce to /login. An effect (not render
	// logic) keeps it a redirect, never a flash of a half-built shell.
	$effect(() => {
		if (!auth.signedIn) goto('/login');
	});

	// Tablet band (40–64rem) → the rail collapses to an icon rail. Below 40rem the
	// rail is hidden entirely (the bottom bar takes over); at/above 64rem it is the
	// full rail. `tablet` is the shared MediaQuery singleton from $lib/breakpoints.

	// The scroll container is now `.gok-app-shell__main` (the shell pins the chrome and
	// only the content scrolls), so SvelteKit's window-based scroll handling can't reach
	// it. Reset it to the top on each route change — but let in-page anchors (e.g. the
	// skip link's #main) win when the target carries a hash.
	afterNavigate((nav) => {
		if (nav.to?.url.hash) return;
		document.getElementById('main')?.scrollTo({ top: 0 });
	});

	// The notifications drawer (F13) is a URL overlay: the navbar bell sets ?notif, this shell
	// renders the drawer off it, and closing strips the param (consistent with the app's ?tab/?target idiom).
	const notifOpen = $derived(page.url.searchParams.has('notif'));
	function closeNotif() {
		const url = new URL(page.url);
		url.searchParams.delete('notif');
		goto(url, { noScroll: true, keepFocus: true });
	}

	// The price-alerts drawer (V11) is a sibling URL overlay: ?alerts opens it centred, ?alerts=SYMBOL
	// scopes the create form to that instrument. Closing strips the param (same ?tab/?target idiom).
	const alertsOpen = $derived(page.url.searchParams.has('alerts'));
	const alertsSymbol = $derived(page.url.searchParams.get('alerts') || undefined);
	function closeAlerts() {
		const url = new URL(page.url);
		url.searchParams.delete('alerts');
		goto(url, { noScroll: true, keepFocus: true });
	}

	// One quiet pass on shell mount: a pre-seeded in-band alert lands its feed line at load (no toast
	// storm). Idempotent across reloads — a fired alert's persisted `firedAt` guards a re-fire.
	onMount(() => alerts.evaluateArmed());
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
		<div class="main-inner">
			{@render children()}
		</div>
	</main>
</div>

<BottomTabBar />

<NotificationsDrawer open={notifOpen} onclose={closeNotif} />

<AlertsDrawer open={alertsOpen} symbol={alertsSymbol} onclose={closeAlerts} />

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
		line-height: var(--gok-type-body-small-line);
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
		/* Safe-area insets (viewport-fit=cover): clear the notch / Dynamic Island at the top and
		   a landscape notch on the sides. env() resolves to 0 on non-notched screens + desktop,
		   so the resting look is unchanged. */
		padding-block-start: env(safe-area-inset-top);
		padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
		background: var(--gok-color-surface-translucent);
		-webkit-backdrop-filter: blur(var(--gok-blur-chrome));
		backdrop-filter: blur(var(--gok-blur-chrome));
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.rail {
		view-transition-name: app-rail;
		border-inline-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: var(--gok-color-surface);
	}

	/* The scroll container fills the whole grid "main" cell (the DS supplies its overflow + 1fr
	   height). Keeping it full-width — rather than narrowing it to the content measure — puts the
	   scrollbar at the viewport's right edge and lets the wheel scroll from anywhere in the region.
	   `position: relative` also makes it the positioning context for its absolutely-positioned
	   descendants (screen-reader `.visually-hidden`/`.sr-only` spans, chart canvases): without it
	   those anchor to the document (ICB), landing deep on long pages and inflating the document's
	   scroll height into a phantom *window* scroll on top of the intended internal one. */
	.main {
		position: relative;
	}

	/* The content column. The measure cap + padding live here, not on the scroll container, so the
	   content stays centered and capped (patterns.md §9) while `.main` spans the full width above.

	   The cap is the design system's own container token (75rem) — the app no longer defines a
	   parallel `--measure-page` (X06). The gutter is the DS's fluid page pad,
	   `clamp(--gok-space-500, 5vw, --gok-space-900)` = 24 → 64px, so side air grows with the
	   viewport instead of staying pinned at 24px on a 1440 display. */
	.main-inner {
		inline-size: min(100%, var(--gok-container-content));
		margin-inline: auto;
		/* Fold the inline safe-area into the content gutter so nothing hides under a landscape
		   notch. env() is 0 off-notch, so max() leaves the gutter at the fluid DS value. */
		padding-inline: max(var(--gok-container-inline-pad), env(safe-area-inset-left))
			max(var(--gok-container-inline-pad), env(safe-area-inset-right));
		padding-block: var(--gok-space-700);
	}

	/* Laptop and up: more air above and below the content, matching the wider side gutter. */
	@media (min-width: 64rem) {
		.main-inner {
			padding-block: var(--gok-space-900);
		}
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

		.main-inner {
			/* Same safe-area fold at the mobile gutter — this is where a phone in landscape meets
			   the notch. env() is 0 in portrait / off-notch, so the resting gutter stays --gok-space-400. */
			padding-inline: max(var(--gok-space-400), env(safe-area-inset-left))
				max(var(--gok-space-400), env(safe-area-inset-right));
			padding-block-end: calc(var(--gok-space-900) + env(safe-area-inset-bottom));
		}
	}
</style>
