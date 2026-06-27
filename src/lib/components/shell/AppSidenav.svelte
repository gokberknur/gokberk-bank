<script lang="ts">
	// The desktop / tablet primary rail. Nav items are real <a href> (native
	// navigation); the sidenav's `value` only drives the current-item highlight.
	// Objects/booleans go in as DOM properties via setProps — never bind: on a
	// custom element.
	import { page } from '$app/state';
	import { setProps } from '$lib/wc.svelte';
	import { NAV, activeValue } from '$lib/components/shell/nav-model';
	import NavIcon from './NavIcon.svelte';

	interface Props {
		collapsed?: boolean;
	}

	let { collapsed = false }: Props = $props();

	let active = $derived(activeValue(page.url.pathname));
</script>

<gok-sidenav accessible-label="Primary" {@attach setProps({ value: active, collapsed })}>
	{#each NAV as section (section.label)}
		<gok-sidenav-section label={section.label}>
			{#each section.items as item (item.value)}
				{#if item.ready}
					<gok-sidenav-item href={item.href} value={item.value}>
						<NavIcon slot="icon" name={item.icon} />
						{item.label}
					</gok-sidenav-item>
				{:else}
					<gok-sidenav-item value={item.value} {@attach setProps({ disabled: true })}>
						<NavIcon slot="icon" name={item.icon} />
						<span class="item-label">
							{item.label}
							{#if !collapsed}
								<gok-tag class="soon" size="s" variant="readonly">Soon</gok-tag>
							{/if}
						</span>
					</gok-sidenav-item>
				{/if}
			{/each}
		</gok-sidenav-section>
	{/each}

	<div slot="foot" class="colophon">
		<p class="brand">gökberk bank</p>
		<p class="meta">Demo · v0.1</p>
	</div>
</gok-sidenav>

<style>
	.item-label {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.soon {
		flex: none;
	}

	.colophon {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block: var(--gok-space-200);
	}

	.brand {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-eyebrow-size);
		font-weight: var(--gok-type-eyebrow-weight);
		line-height: var(--gok-type-eyebrow-line);
		letter-spacing: var(--gok-type-eyebrow-tracking);
		text-transform: uppercase;
		color: var(--gok-color-text);
	}

	.meta {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		color: var(--gok-color-text-muted);
	}
</style>
