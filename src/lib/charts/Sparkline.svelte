<script lang="ts">
	// Tiny inline sparkline (F11) — wallet / card rows. A thin adapter over the DS
	// `gok-sparkline`: no axes, labels, or tooltip, just the shape of a trend. Tone
	// follows up/down (auto from first-vs-last) or the accent when no trend is asked
	// for. `gok-sparkline` reads `--gok-*` tokens natively and re-themes on its own.
	import { setProps } from '$lib/wc.svelte';

	interface Props {
		/** Raw series values (e.g. minor units) — only the shape matters here. */
		values: number[];
		/** CSS height of the spark box. */
		height?: string;
		/** Text alternative summarising the trend (the canvas is decorative). */
		label: string;
		/** Force a colour: 'up'/'down', 'auto' (first-vs-last), or omit for accent. */
		trend?: 'up' | 'down' | 'auto';
	}

	let { values, height = '2.5rem', label, trend }: Props = $props();

	const tone = $derived(
		trend === 'up'
			? 'positive'
			: trend === 'down'
				? 'negative'
				: trend === 'auto'
					? (values.at(-1) ?? 0) < (values[0] ?? 0)
						? 'negative'
						: 'positive'
					: 'neutral'
	);
</script>

<gok-sparkline
	{tone}
	{label}
	style="--gok-sparkline-height: {height}; --gok-sparkline-width: 100%;"
	{@attach setProps({ values })}
></gok-sparkline>

<style>
	gok-sparkline {
		display: block;
	}
</style>
