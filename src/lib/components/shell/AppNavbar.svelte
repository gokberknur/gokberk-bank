<script lang="ts">
	// The top bar inside the content column: brand → /home, a spacer, then the
	// actions cluster (search, notifications, account menu, theme switch). Custom
	// events arrive via the `on` attachment; object/boolean props go in via
	// setProps. Search/notifications/most menu items are deliberate no-ops for now
	// (their surfaces land in later features) — never a 404.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/state/session.svelte';
	import { density } from '$lib/state/density.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { command } from '$lib/state/command.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import NavIcon from './NavIcon.svelte';

	let modLabel = $state('⌘K');
	onMount(() => {
		if (/mac/i.test(navigator.userAgent)) modLabel = '⌘K';
		else modLabel = 'Ctrl K';
	});

	function openSearch() {
		command.openPalette();
	}

	function openNotifications() {
		// TODO: ?notif drawer (F13)
	}

	function onAccountSelect(event: Event) {
		const value = (event as CustomEvent<{ value?: string }>).detail?.value;
		switch (value) {
			case 'account':
				goto('/profile');
				break;
			case 'settings':
				goto('/settings/preferences');
				break;
			case 'density':
				density.toggle();
				break;
			case 'security':
				goto('/security');
				break;
			case 'open-account':
				goto('/onboarding');
				break;
			case 'signout':
				auth.signOut();
				goto('/login');
				break;
		}
	}
</script>

<header class="navbar">
	<a class="brand" href="/home" aria-label="gökberk bank — home">
		<span class="brand__full">gökberk<span class="dot">.</span> bank</span>
		<span class="brand__mark" aria-hidden="true">g<span class="dot">.</span></span>
	</a>

	<div class="search">
		<button type="button" class="omnisearch" {@attach on('click', openSearch)}>
			<span class="omnisearch-icon" aria-hidden="true"><NavIcon name="search" /></span>
			<span class="omnisearch-text">Search the app</span>
			<kbd class="omnisearch-kbd" aria-hidden="true">{modLabel}</kbd>
		</button>
	</div>

	<div class="actions">
		<gok-button
			variant="secondary"
			class="nav-search-icon"
			accessible-label="Search"
			{@attach on('click', openSearch)}
		>
			<NavIcon slot="icon" name="search" />
		</gok-button>

		<gok-button
			variant="secondary"
			accessible-label="Notifications"
			{@attach on('click', openNotifications)}
		>
			<NavIcon slot="icon" name="bell" />
		</gok-button>

		<gok-menu accessible-label="Account menu" {@attach on('gok-select', onAccountSelect)}>
			<gok-button slot="trigger" variant="secondary" accessible-label="Account menu">
				{session.initials}
			</gok-button>

			<gok-menu-item value="account">Account</gok-menu-item>
			<gok-menu-item value="settings">Settings</gok-menu-item>
			<gok-menu-item value="security">Security</gok-menu-item>
			<gok-menu-item
				value="density"
				type="checkbox"
				{@attach setProps({ checked: density.current === 'compact' })}
			>
				Compact density
			</gok-menu-item>
			<gok-menu-item value="open-account">Open an account</gok-menu-item>
			<gok-menu-item value="signout">Sign out</gok-menu-item>
		</gok-menu>

		<gok-theme-switch compact label="Theme"></gok-theme-switch>
	</div>
</header>

<style>
	/* The top bar spans the full width of the shell. The brand is a fixed block as wide as
	   the rail below it (it reads the same `--gok-app-shell-rail-width`), with a hairline that
	   continues the rail's edge — so the logo sits squarely top-left above the side nav. */
	.navbar {
		display: flex;
		align-items: stretch;
	}

	.brand {
		flex: none;
		display: inline-flex;
		align-items: center;
		inline-size: var(--gok-app-shell-rail-width, 17rem);
		padding-inline: var(--gok-space-400);
		border-inline-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		letter-spacing: var(--gok-type-headline-6-tracking);
		color: var(--gok-color-text);
		text-decoration: none;
	}

	.brand:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
		border-radius: var(--gok-radius-s);
	}

	.dot {
		color: var(--gok-color-primary);
	}

	.brand__mark {
		display: none;
	}

	.search {
		flex: 1 1 auto;
		min-inline-size: 0;
		display: none;
		align-items: center;
		justify-content: center;
		padding-inline: var(--gok-space-500);
	}

	.omnisearch {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		inline-size: 100%;
		max-inline-size: 30rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		cursor: pointer;
		text-align: start;
	}

	.omnisearch:hover {
		background: var(--gok-color-surface-strong);
		border-color: var(--gok-color-border-strong);
	}

	.omnisearch:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	.omnisearch-icon {
		display: inline-flex;
		color: var(--gok-color-text-muted);
	}

	.omnisearch-text {
		flex: 1 1 auto;
	}

	.omnisearch-kbd {
		flex: none;
		padding-block: 0;
		padding-inline: var(--gok-space-100);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-s);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		color: var(--gok-color-text-muted);
	}

	.actions {
		flex: none;
		margin-inline-start: auto;
		min-inline-size: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		padding-inline: var(--gok-space-500);
		padding-block: var(--gok-space-300);
	}

	/* Tablet (40–64rem): the rail is a collapsed icon rail, so the brand block shrinks with
	   it — swap the wordmark for the compact mark, centered. */
	@media (min-width: 40rem) and (max-width: 63.999rem) {
		.brand {
			justify-content: center;
			padding-inline: var(--gok-space-200);
		}

		.brand__full {
			display: none;
		}

		.brand__mark {
			display: inline;
		}
	}

	/* Mobile (<40rem): the rail is hidden, so the top bar is a single full-width row —
	   the brand returns to its natural width with no divider. */
	@media (max-width: 39.999rem) {
		.brand {
			inline-size: auto;
			border-inline-end: none;
			padding-inline: var(--gok-space-400);
		}
	}

	/* Desktop (≥64rem): the centered search field appears; the actions-cluster search
	   icon steps aside so the field is the single, prominent search entry point. */
	@media (min-width: 64rem) {
		.search {
			display: flex;
		}

		.nav-search-icon {
			display: none;
		}
	}
</style>
