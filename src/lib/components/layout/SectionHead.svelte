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
		figure,
		srLabel,
		caption,
		level = 2,
		actions
	}: {
		/** Heading id, for the owning section's `aria-labelledby`. */
		id: string;
		/** Mono-uppercase context label. Always shown — it is the brand's section identity. */
		eyebrow: string;
		/** Label-first section heading. Used when `figure` is not given. */
		title?: string;
		/** Figure-first heading (a formatted amount). Switches the head to figure-first mode. */
		figure?: string;
		/** Visually-hidden prefix read before a figure, so the heading is not a bare number. */
		srLabel?: string;
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
		<!-- Figure-first when the section's subject IS the number (CV-VIS-3: the hero is the
		     characteristic number, not a label). Otherwise label-first. -->
		<svelte:element
			this={level === 3 ? 'h3' : 'h2'}
			{id}
			class="sh-title {figure != null
				? 'sh-figure gok-tabular-nums'
				: level === 3
					? 'gok-headline-6'
					: 'gok-headline-5'}"
		>
			{#if figure != null}
				{#if srLabel}<span class="sr-only">{srLabel} </span>{/if}{figure}
			{:else}
				{title}
			{/if}
		</svelte:element>
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

	/* A section whose subject is a number reads it on the metric role, not a headline role —
	   the figure is the hero, and metric is the type role built for it. */
	.sh-figure {
		font-family: var(--gok-type-metric-small-family);
		font-size: var(--gok-type-metric-small-size);
		font-weight: var(--gok-type-metric-small-weight);
		line-height: var(--gok-type-metric-small-line);
		letter-spacing: var(--gok-type-metric-small-tracking);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
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
