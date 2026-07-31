<script lang="ts">
	// The one section head. 63 files hand-rolled this block — eyebrow, heading, sometimes a
	// caption, sometimes a trailing link — each with its own internal gaps, which is why
	// sections that should read as siblings did not. This is the sibling to PageHeader:
	// PageHeader opens a route (h1, figure-first or label-first), SectionHead opens a block
	// inside one (h2 by default).
	//
	// The mono-uppercase eyebrow is the brand's signature section identity and is always shown.
	// `id` is required so the owning <section> can point aria-labelledby at the heading — the
	// pattern every route already uses.
	import type { Snippet } from 'svelte';

	let {
		id,
		eyebrow,
		title,
		caption,
		level = 2,
		actions
	}: {
		/** Heading id, for the owning section's `aria-labelledby`. */
		id: string;
		/** Mono-uppercase context label. Always shown — it is the brand's section identity. */
		eyebrow: string;
		/** The section heading. */
		title: string;
		/** Optional muted secondary line under the heading. */
		caption?: string;
		/** Heading rank. Defaults to 2; drop to 3 for a block nested inside another section. */
		level?: 2 | 3;
		/** Optional trailing cluster on the inline-end (a "See all" link, a period switch). */
		actions?: Snippet;
	} = $props();
</script>

<div class="section-head">
	<div class="sh-titles">
		<p class="sh-eyebrow gok-eyebrow">{eyebrow}</p>
		{#if level === 3}
			<h3 {id} class="sh-title gok-headline-6">{title}</h3>
		{:else}
			<h2 {id} class="sh-title gok-headline-5">{title}</h2>
		{/if}
		{#if caption}
			<p class="sh-caption">{caption}</p>
		{/if}
	</div>
	{#if actions}
		<div class="sh-actions">{@render actions()}</div>
	{/if}
</div>

<style>
	/* Spans the whole spine: a head is never a cell, it introduces the row of cells below it.
	   `grid-column` is inert outside a grid, so the component is still safe in a flex column. */
	.section-head {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	/* Eyebrow → heading is a content relationship (4px), not layout rhythm. The distance from
	   the head to the content below it is the section's row-gap, set once by the spine. */
	.sh-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.sh-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.sh-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.sh-caption {
		margin: 0;
		max-inline-size: var(--measure-read);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.sh-actions {
		flex: none;
	}
</style>
