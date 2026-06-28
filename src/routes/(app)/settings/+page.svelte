<script lang="ts">
	// /settings has no surface of its own — it redirects to the first area (preferences),
	// replacing history so Back doesn't bounce here. The landed page carries the shared
	// SettingsHeader nav across preferences / appearance / notifications.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/settings/preferences', { replaceState: true });
	});
</script>

<p class="redirect">Opening my settings…</p>

<style>
	.redirect {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}
</style>
