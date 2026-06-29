<script lang="ts">
	// App-local mobile tab bar. The design system ships no bottom-nav, so this is
	// justified app-local chrome — but it stays tokens-only and never restyles a DS
	// component. Ready tabs are real <a href> (native nav); not-ready tabs are inert
	// muted spans. Active state is carried by a rule (the accent top mark) + a
	// filled glyph + aria-current — never colour alone. The bar is shown only on the
	// mobile breakpoint; the rail takes over above it.
	import { page } from '$app/state';
	import { NAV, BOTTOM_TABS, PRIMARY_TAB_VALUES, activeValue } from '$lib/components/shell/nav-model';
	import { setProps, on } from '$lib/wc.svelte';
	import NavIcon from './NavIcon.svelte';

	let active = $derived(activeValue(page.url.pathname));
	let moreOpen = $state(false);
	// "More" carries the active mark when the user is on a section that lives under
	// it (anything not '' and not one of the four primary tabs, e.g. /cards).
	let moreActive = $derived(active !== '' && !PRIMARY_TAB_VALUES.includes(active));
</script>

<nav aria-label="Primary" class="tabbar">
	{#each BOTTOM_TABS as tab, i (tab.value)}
		{@const isActive = active === tab.value}
		{@const isCenter = i === 2}
		{#if tab.value === 'more'}
			<button
				type="button"
				class="tab more"
				class:active={moreActive}
				aria-haspopup="dialog"
				aria-expanded={moreOpen}
				onclick={() => (moreOpen = true)}
			>
				<span class="glyph"><NavIcon name={tab.icon} /></span>
				<span class="label">{tab.label}</span>
			</button>
		{:else if tab.ready}
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

<!-- Overflow sheet: every section in NAV, reachable in ≤2 taps on a phone. Only
     ever opened from the mobile bar (which is display:none ≥40rem), so it's
     implicitly desktop-hidden. -->
<gok-drawer
	placement="bottom"
	heading="More"
	{@attach setProps({ open: moreOpen })}
	{@attach on('gok-close', () => (moreOpen = false))}
	{@attach on('gok-cancel', () => (moreOpen = false))}
>
	<nav aria-label="All sections" class="sheet">
		{#each NAV as section (section.label)}
			<p class="sheet-group gok-eyebrow">{section.label}</p>
			<ul class="sheet-list">
				{#each section.items as item (item.value)}
					{@const isActive = active === item.value}
					<li>
						<a
							href={item.href}
							class="sheet-link"
							class:active={isActive}
							aria-current={isActive ? 'page' : undefined}
							onclick={() => (moreOpen = false)}
						>
							<span class="sheet-glyph"><NavIcon name={item.icon} /></span>
							<span class="sheet-label">{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>
</gok-drawer>

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

	/* The "More" tab is a <button>; reset it so it matches the <a> tabs exactly. */
	.tab.more {
		background: none;
		border: 0;
		font: inherit;
		cursor: pointer;
		inline-size: auto;
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

	/* Overflow sheet — every section, a comfortable tappable list. */
	.sheet {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block-end: env(safe-area-inset-bottom);
	}

	.sheet-group {
		display: block;
		margin-block-start: var(--gok-space-300);
		margin-block-end: var(--gok-space-100);
	}

	.sheet-group:first-child {
		margin-block-start: 0;
	}

	.sheet-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.sheet-link {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		/* ≥44px touch target. */
		min-block-size: var(--gok-space-700);
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-200);
		text-decoration: none;
		color: var(--gok-color-text);
		border-radius: var(--gok-radius-s);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		transition:
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.sheet-link:hover {
		background: var(--gok-color-surface-strong);
	}

	.sheet-link:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	/* Active = accent leading rule + accent text + aria-current, never colour alone. */
	.sheet-link.active {
		color: var(--gok-color-primary);
	}

	.sheet-link.active::before {
		content: '';
		position: absolute;
		inset-inline-start: 0;
		inset-block: 20%;
		inline-size: var(--gok-border-width-strong);
		background: var(--gok-color-primary);
		border-radius: var(--gok-radius-pill);
	}

	.sheet-link.active .sheet-glyph {
		background: var(--gok-color-primary);
		color: var(--gok-color-text-on-primary);
	}

	.sheet-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: var(--gok-space-500);
		block-size: var(--gok-space-500);
		border-radius: var(--gok-radius-s);
		flex: 0 0 auto;
	}

	@media (min-width: 40rem) {
		.tabbar {
			display: none;
		}
	}
</style>
