<script lang="ts">
	// The security center shell (O03) — a quiet editorial header (mono eyebrow + a
	// first-person title) and a horizontal sub-nav across the five areas. The active
	// area carries aria-current="page" (state-driven, never colour-alone): the
	// underline rule + the ink weight read it, and the one earned accent marks it.
	// On mobile (390px) the sub-nav scrolls horizontally. Each area renders below.
	import { page } from '$app/state';
	import { security } from '$lib/state/security.svelte';
	import { formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';

	let { children } = $props();

	const areas = [
		{ href: '/security/devices', label: 'Devices' },
		{ href: '/security/sessions', label: 'Sessions' },
		{ href: '/security/passkeys', label: 'Passkeys' },
		{ href: '/security/2fa', label: '2FA' },
		{ href: '/security/activity', label: 'Activity' }
	];

	const pathname = $derived(page.url.pathname);
	function isActive(href: string): boolean {
		return pathname === href || pathname.startsWith(href + '/');
	}

	// Posture snapshot (IDN-D-04) — the "am I protected?" verdict + four live signals,
	// read from the security spine so it re-flows with every mutation and persists
	// across all five sub-areas.
	const passkeyCount = $derived(security.passkeys.length);
	const passkeysOn = $derived(passkeyCount > 0);
	const twoFa = $derived(security.twoFa);
	const twoFaOn = $derived(twoFa.enrolled);
	const methodLabel = $derived(
		twoFa.method === 'app' ? 'Authenticator app' : twoFa.method === 'sms' ? 'Text message' : ''
	);
	const deviceCount = $derived(security.devices.length);
	const currentSession = $derived(security.sessions.find((s) => s.current));
	const protectedNow = $derived(twoFaOn && passkeysOn);
</script>

<svelte:head>
	<title>Security · gökberk bank</title>
</svelte:head>

<div class="security">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Security</p>
		<h1 class="head-title gok-headline-2">Keeping my account safe</h1>
		<p class="head-sub">
			My devices, sessions, passkeys and two-factor — everything that protects this account, in
			one calm place.
		</p>
	</header>

	<section class="posture" aria-label="Security posture">
		<p class="posture-verdict">
			{#if protectedNow}
				<gok-icon name="success" aria-hidden="true"></gok-icon>
				<span>My account is protected</span>
			{:else}
				<gok-icon name="warning" aria-hidden="true"></gok-icon>
				<span>My sign-in needs review</span>
			{/if}
		</p>

		<dl class="posture-stats">
			<div class="stat">
				<dt>Passkeys</dt>
				<dd>
					<gok-icon name={passkeysOn ? 'check' : 'warning'} size="s" aria-hidden="true"></gok-icon>
					<span class="gok-tabular-nums">{passkeysOn ? `On · ${passkeyCount}` : 'Off'}</span>
				</dd>
			</div>

			<div class="stat">
				<dt>Two-factor</dt>
				<dd>
					<gok-icon name={twoFaOn ? 'check' : 'warning'} size="s" aria-hidden="true"></gok-icon>
					<span>{twoFaOn ? `On · ${methodLabel}` : 'Off'}</span>
				</dd>
			</div>

			<div class="stat">
				<dt>Trusted devices</dt>
				<dd class="gok-tabular-nums">{deviceCount}</dd>
			</div>

			<div class="stat">
				<dt>Last sign-in</dt>
				<dd class="gok-tabular-nums">
					{currentSession
						? `${formatRelative(currentSession.startedAt, TODAY)} · ${currentSession.location}`
						: '—'}
				</dd>
			</div>
		</dl>
	</section>

	<nav class="subnav" aria-label="Security areas">
		<ul class="subnav-list">
			{#each areas as area (area.href)}
				<li>
					<a
						class="subnav-link"
						href={area.href}
						aria-current={isActive(area.href) ? 'page' : undefined}
					>
						{area.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<section class="area">
		{@render children()}
	</section>
</div>

<style>
	.security {
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
		max-inline-size: 42rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* Posture snapshot — a quiet bordered block answering "am I protected?" at a
	   glance: a verdict line (icon + words carry the state, never colour alone) over
	   a four-signal stat grid. Hairline + flat, no shadow — reassurance, not an alert. */
	.posture {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		padding: var(--gok-space-400);
	}

	.posture-verdict {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.posture-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: var(--gok-space-300);
		margin: 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.stat dt {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.stat dd {
		display: flex;
		align-items: center;
		gap: var(--gok-space-100);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
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

	.area {
		display: block;
	}
</style>
