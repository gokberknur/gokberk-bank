<script lang="ts">
	// The top bar inside the content column: brand → /home, a spacer, then the
	// actions cluster (search, notifications, account menu, theme switch). Custom
	// events arrive via the `on` attachment; object/boolean props go in via
	// setProps. Search/notifications/most menu items are deliberate no-ops for now
	// (their surfaces land in later features) — never a 404.
	import { goto } from '$app/navigation';
	import { session } from '$lib/state/session.svelte';
	import { density } from '$lib/state/density.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { command } from '$lib/state/command.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import NavIcon from './NavIcon.svelte';

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
	<a class="brand" href="/home">gökberk<span class="dot">.</span> bank</a>

	<div class="spacer"></div>

	<div class="actions">
		<gok-button variant="secondary" accessible-label="Search" {@attach on('click', openSearch)}>
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
	.navbar {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding-inline: var(--gok-space-500);
		padding-block: var(--gok-space-300);
	}

	.brand {
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
		outline-offset: var(--gok-space-100);
		border-radius: var(--gok-radius-s);
	}

	.dot {
		color: var(--gok-color-primary);
	}

	.spacer {
		flex: 1 1 auto;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}
</style>
