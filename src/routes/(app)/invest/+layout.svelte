<script lang="ts">
	// V16 · The invest section shell. It wraps every /invest/** route so the section
	// sub-nav is a persistent top band above the routed page — the discoverability
	// backbone is always in reach. Deliberately thin: the sub-nav plus a token gap,
	// then the page. Page chrome (headers, measure, section rhythm) stays on each page.
	import SectionSubnav from '$lib/components/shell/SectionSubnav.svelte';
	import { INVEST_NAV } from '$lib/components/shell/nav-model';

	let { children } = $props();
</script>

<div class="invest-shell">
	<SectionSubnav items={INVEST_NAV} ariaLabel="Investing sections" />
	{@render children()}
</div>

<style>
	.invest-shell {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}
</style>
