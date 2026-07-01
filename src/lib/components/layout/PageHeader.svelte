<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		figure,
		srLabel,
		caption,
		actions
	}: {
		/** Mono-uppercase context label (always shown). */
		eyebrow: string;
		/** Label-first page title. Used when `figure` is not provided. */
		title?: string;
		/** Figure-first hero number (e.g. a formatted amount). Switches the header to figure-first mode. */
		figure?: string;
		/** Visually-hidden prefix read before the figure (e.g. "Spent this month"), for screen readers. */
		srLabel?: string;
		/** Optional muted secondary line under the title/figure. */
		caption?: string;
		/** Optional trailing cluster on the inline-end (e.g. a gok-segmented period switch). */
		actions?: Snippet;
	} = $props();
</script>

<header class="page-header">
	<div class="ph-titles">
		<p class="ph-eyebrow gok-eyebrow">{eyebrow}</p>
		{#if figure != null}
			<h1 class="ph-figure gok-headline-1 gok-tabular-nums">
				{#if srLabel}<span class="sr-only">{srLabel} </span>{/if}{figure}
			</h1>
		{:else if title != null}
			<h1 class="ph-title gok-headline-2">{title}</h1>
		{/if}
		{#if caption}
			<p class="ph-caption">{caption}</p>
		{/if}
	</div>
	{#if actions}
		<div class="ph-actions">{@render actions()}</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}
	.ph-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}
	.ph-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}
	.ph-figure,
	.ph-title {
		margin: 0;
		color: var(--gok-color-text);
	}
	.ph-caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
	.ph-actions {
		flex: none;
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
