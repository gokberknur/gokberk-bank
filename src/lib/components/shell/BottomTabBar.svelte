<script lang="ts">
	// App-local mobile tab bar. The design system ships no bottom-nav, so this is
	// justified app-local chrome — but it stays tokens-only and never restyles a DS
	// component. Ready tabs are real <a href> (native nav); not-ready tabs are inert
	// muted spans. Active state is carried by a rule (the accent top mark) + a
	// filled glyph + aria-current — never colour alone. The bar is shown only on the
	// mobile breakpoint; the rail takes over above it.
	import { page } from '$app/state';
	import { BOTTOM_TABS, activeValue } from '$lib/components/shell/nav-model';
	import NavIcon from './NavIcon.svelte';

	let active = $derived(activeValue(page.url.pathname));
</script>

<nav aria-label="Primary" class="tabbar">
	{#each BOTTOM_TABS as tab, i (tab.value)}
		{@const isActive = active === tab.value}
		{@const isCenter = i === 2}
		{#if tab.ready}
			<a
				href={tab.href}
				class="tab"
				class:active={isActive}
				class:center={isCenter}
				aria-current={isActive ? 'page' : undefined}
			>
				<span class="glyph"><NavIcon name={tab.icon} /></span>
				<span class="label">{tab.label}</span>
			</a>
		{:else}
			<span class="tab disabled" class:center={isCenter} aria-disabled="true">
				<span class="glyph"><NavIcon name={tab.icon} /></span>
				<span class="label">{tab.label}</span>
			</span>
		{/if}
	{/each}
</nav>

<style>
	.tabbar {
		position: fixed;
		inset-block-end: 0;
		inset-inline: 0;
		z-index: var(--gok-z-sticky);
		display: flex;
		align-items: stretch;
		justify-content: space-around;
		gap: var(--gok-space-100);
		padding-inline: var(--gok-space-200);
		padding-block-start: var(--gok-space-100);
		padding-block-end: calc(var(--gok-space-100) + env(safe-area-inset-bottom));
		background: var(--gok-color-surface);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.tab {
		position: relative;
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--gok-space-100);
		/* ≥44px touch target, kept on the space scale (48px). */
		min-block-size: var(--gok-space-800);
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-100);
		text-decoration: none;
		color: var(--gok-color-text-muted);
		border-radius: var(--gok-radius-s);
		transition:
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.tab:hover {
		color: var(--gok-color-text);
	}

	.tab:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	/* Active = an accent leading mark (rule) + accent text + aria-current, so the
	   state never rides on colour alone. */
	.tab.active {
		color: var(--gok-color-primary);
	}

	.tab.active::before {
		content: '';
		position: absolute;
		inset-block-start: 0;
		inset-inline: 30%;
		block-size: var(--gok-border-width-strong);
		background: var(--gok-color-primary);
		border-radius: var(--gok-radius-pill);
	}

	.tab.active .glyph {
		background: var(--gok-color-primary);
		color: var(--gok-color-text-on-primary);
	}

	.glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: var(--gok-space-500);
		block-size: var(--gok-space-500);
		border-radius: var(--gok-radius-s);
	}

	.label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
	}

	/* The centre "Pay" tab — the one earned emphasis: a raised, accented disc. */
	.tab.center .glyph {
		background: var(--gok-color-primary);
		color: var(--gok-color-text-on-primary);
		inline-size: var(--gok-space-600);
		block-size: var(--gok-space-600);
		border-radius: var(--gok-radius-pill);
		transform: translateY(calc(-1 * var(--gok-space-200)));
		border: var(--gok-border-width-regular) solid var(--gok-color-surface);
	}

	.tab.center .label {
		color: var(--gok-color-text);
	}

	.tab.disabled {
		color: var(--gok-color-text-disabled);
		pointer-events: none;
	}

	.tab.disabled.center .glyph {
		background: var(--gok-color-surface-strong);
		color: var(--gok-color-text-disabled);
	}

	@media (min-width: 40rem) {
		.tabbar {
			display: none;
		}
	}
</style>
