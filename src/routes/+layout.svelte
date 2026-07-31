<script lang="ts">
	import '../app.css';
	import '@gokberknur/design-system/standalone.css';
	import '$lib/styles/layout.css';
	import '$lib/charts/layerchart.css';
	import '$lib/gok';

	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Keep the iOS Safari chrome tint in sync with the active theme. The
	// <meta name="theme-color"> tag lives in app.html with empty content; we
	// fill it from the resolved --gok-color-bg token (applied via
	// `html { background: var(--gok-color-bg) }` in app.css), which the browser
	// hands back as a concrete rgb(...) string that iOS Safari accepts. The
	// theme toggle flips data-theme on <html>, so we re-read on that change.
	onMount(() => {
		const meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) return;

		const sync = () => {
			const raw = getComputedStyle(document.documentElement).backgroundColor;
			// The token resolves to oklch(), which older iOS Safari's theme-color parser
			// ignores. Rasterise to a 1×1 sRGB pixel and read it back as a #rrggbb hex that
			// every Safari accepts; fall back to the raw value if canvas is unavailable.
			let content = raw;
			const ctx = document.createElement('canvas').getContext('2d');
			if (ctx) {
				ctx.fillStyle = raw;
				ctx.fillRect(0, 0, 1, 1);
				const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
				content = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
			}
			meta.setAttribute('content', content);
		};

		sync();

		const observer = new MutationObserver(sync);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});

		return () => observer.disconnect();
	});

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
