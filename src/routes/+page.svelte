<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// The demo boots already signed in and has no marketing splash — send the root
	// straight into the app. replaceState keeps `/` out of history (Back won't return here).
	onMount(() => {
		goto('/home', { replaceState: true });
	});
</script>

<svelte:head>
	<title>gökberk bank</title>
</svelte:head>
