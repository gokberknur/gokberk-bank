<script lang="ts">
	// Presentational nav glyph. Pure lookup → inline 24×24 SVG, stroked with
	// currentColor so it inherits the host's text colour. No logic beyond the map;
	// an unknown name falls back to the "more" glyph.
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		name: string;
		/** Forwarded onto the <svg> so the glyph can be distributed into a gok-*
		 *  shadow slot (e.g. slot="icon"). In runes mode `slot` is a plain prop;
		 *  it's applied at runtime (not as a literal attribute) because a static
		 *  slot= on a component's own root element is a Svelte compile error. */
		slot?: string;
	}

	let { name, slot }: Props = $props();

	const forwardSlot: Attachment = (node) => {
		if (slot) node.setAttribute('slot', slot);
		else node.removeAttribute('slot');
	};

	const ICONS: Record<string, string[]> = {
		home: ['M3 11.5 12 4l9 7.5', 'M5 10.5V20h14V10.5'],
		wallet: ['M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M16 12h2'],
		transfer: ['M7 8h11M14 4l4 4-4 4', 'M17 16H6M10 12l-4 4 4 4'],
		card: ['M3 7h18v10H3z', 'M3 11h18'],
		invest: ['M4 16l5-5 3 3 7-7', 'M17 7h4v4'],
		crypto: [
			'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
			'M10 8h3.5a2 2 0 0 1 0 4H10zm0 4h4a2 2 0 0 1 0 4h-4z',
			'M11 6v2M11 16v2'
		],
		lending: ['M4 10h16M12 4l8 4H4zM6 10v7M10 10v7M14 10v7M18 10v7M3 20h18'],
		insurance: ['M12 4l7 2.5V12c0 4-3 7-7 8-4-1-7-4-7-8V6.5z', 'M9 12l2 2 4-4'],
		budget: ['M12 4a8 8 0 1 0 8 8h-8z', 'M12 4v8h8a8 8 0 0 0-8-8z'],
		rewards: ['M12 4l2.3 4.8 5.2.5-3.9 3.6 1.1 5.1L12 15.9 7.2 18.6l1.1-5.1L4.4 9.8l5.2-.5z'],
		activity: ['M3 12h4l2.5-7 4 14L16 12h5'],
		documents: ['M7 4h7l4 4v12H7z', 'M14 4v4h4'],
		more: ['M6 12h.01M12 12h.01M18 12h.01'],
		search: ['M10.5 16a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z', 'M20 20l-4.2-4.2'],
		bell: ['M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6', 'M10 20a2 2 0 0 0 4 0']
	};

	let paths = $derived(ICONS[name] ?? ICONS.more);
</script>

<svg
	class="icon"
	{@attach forwardSlot}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	.icon {
		display: block;
		inline-size: var(--gok-size-icon-m);
		block-size: var(--gok-size-icon-m);
	}
</style>
