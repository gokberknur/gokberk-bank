<script lang="ts">
	// The top bar inside the content column: brand → /home, a spacer, then the
	// actions cluster (search, notifications, account menu, theme switch). The search
	// entry is now a REAL command menu — the DS `gok-command-menu` trigger IS the
	// centered search bar (it owns its own overlay, ⌘K hotkey, and a11y). Custom
	// events arrive via the `on` attachment; object/boolean props go in via
	// setProps. Notifications/most menu items are deliberate no-ops for now (their
	// surfaces land in later features) — never a 404.
	import { goto } from '$app/navigation';
	import { session } from '$lib/state/session.svelte';
	import { density } from '$lib/state/density.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { command } from '$lib/state/command.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import NavIcon from './NavIcon.svelte';

	// Capture the DS command-menu element so the mobile/tablet actions-cluster search
	// icon can open the palette via the element's own public `show()` method (the
	// centered trigger bar itself is hidden below 64rem — see the styles).
	let menuEl = $state<(HTMLElement & { show: () => void }) | null>(null);
	function captureMenu(node: HTMLElement & { show: () => void }) {
		menuEl = node;
		return () => {
			menuEl = null;
		};
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
		<gok-command-menu
			label="Search the app"
			placeholder="Search the app — or type a command"
			empty-label="No matches — try a different word."
			hotkey="$mod+K"
			{@attach captureMenu}
			{@attach setProps({ commands: command.commands, externalFiltering: true })}
			{@attach on('gok-input', (e) => command.setQuery((e as CustomEvent<{ query: string }>).detail.query))}
			{@attach on('gok-select', (e) =>
				command.recordRecent((e as CustomEvent<{ command: { id: string } }>).detail.command.id))}
			{@attach on('gok-close', () => command.close())}
		></gok-command-menu>
	</div>

	<div class="actions">
		<gok-button
			variant="secondary"
			class="nav-search-icon"
			accessible-label="Search"
			{@attach on('click', () => menuEl?.show())}
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

	/* The centered search is the DS `gok-command-menu` trigger itself. It stays mounted
	   at all breakpoints so the actions-cluster search icon can call its `show()` on
	   mobile/tablet — where the trigger bar is hidden (::part below) but the element
	   (and its palette card) must remain in the DOM. */
	.search {
		flex: 1 1 auto;
		min-inline-size: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-inline: var(--gok-space-500);
	}

	.search gok-command-menu {
		inline-size: 100%;
		max-inline-size: 30rem;
		--gok-command-menu-inline-size: 30rem;
		--gok-command-menu-radius: var(--gok-radius-m);
	}

	/* Match the trigger to the old omnisearch bar: hairline, radius-m, surface bg,
	   muted text, with hover/focus affordances. */
	.search gok-command-menu::part(trigger) {
		inline-size: 100%;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.search gok-command-menu::part(trigger):hover {
		background: var(--gok-color-surface-strong);
		border-color: var(--gok-color-border-strong);
	}

	.search gok-command-menu::part(trigger):focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
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

	/* Desktop (≥64rem): the centered search bar is the single, prominent search entry
	   point, so the actions-cluster search icon steps aside. */
	@media (min-width: 64rem) {
		.nav-search-icon {
			display: none;
		}
	}

	/* Below the desktop breakpoint the DS trigger bar is hidden and the palette is opened by the
	   actions-cluster search icon (menuEl.show()). The command-menu must stay mounted for that to
	   work, so instead of collapsing it we take .search out of the navbar row and give the host a
	   real width, so the palette card (which derives its width from the host) renders full-size. */
	@media (max-width: 63.999rem) {
		.navbar {
			position: relative;
		}

		.search {
			position: absolute;
			inset-block-start: 100%;
			inset-inline: var(--gok-space-400);
			inline-size: min(30rem, calc(100vw - 2 * var(--gok-space-400)));
			padding: 0;
		}

		.search gok-command-menu {
			inline-size: 100%;
			--gok-command-menu-inline-size: 100%;
		}

		.search gok-command-menu::part(trigger) {
			display: none;
		}
	}
</style>
