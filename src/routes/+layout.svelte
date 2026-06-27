<script lang="ts">
	import '../app.css';
	import '@gokberknur/design-system/standalone.css';
	import '$lib/gok';

	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	// Native View Transitions on client navigation — the standard SvelteKit
	// pattern. The crossfade itself is styled in app.css; this only bridges
	// SvelteKit's navigation lifecycle to startViewTransition.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
