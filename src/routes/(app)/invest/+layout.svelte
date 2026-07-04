<script lang="ts">
	// V16 · The invest section shell. It wraps every /invest/** route so the section
	// sub-nav is a persistent top band above the routed page — the discoverability
	// backbone is always in reach. Deliberately thin: the sub-nav plus a token gap,
	// then the page. Page chrome (headers, measure, section rhythm) stays on each page.
	import InvestSubnav from '$lib/components/invest/InvestSubnav.svelte';

	let { children } = $props();
</script>

<div class="invest-shell">
	<InvestSubnav />
	{@render children()}
</div>

<style>
	.invest-shell {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}
</style>
