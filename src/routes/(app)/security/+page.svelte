<script lang="ts">
	// /security has no surface of its own — it redirects to the first area (devices),
	// replacing history so Back doesn't bounce here.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/security/devices', { replaceState: true });
	});
</script>

<p class="redirect">Opening my devices…</p>

<style>
	.redirect {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}
</style>
