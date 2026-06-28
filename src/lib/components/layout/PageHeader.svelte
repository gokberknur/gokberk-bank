<script lang="ts">
	// Page header (app-local gap-composite). Standardizes the eyebrow + title +
	// caption band hand-copied across ~58 routes, and trims the oversized
	// header→content gap that reads as a whitespace void on mobile. Composes gok-*
	// + tokens only; never restyles a DS component.
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		caption,
		titleClass = 'gok-headline-3',
		trim = true,
		actions
	}: {
		/** Mono uppercase eyebrow (the one intentional uppercase). */
		eyebrow: string;
		/** Page title. */
		title: string;
		/** Optional one-line supporting caption. */
		caption?: string;
		/** Title type class (defaults to the page headline scale). */
		titleClass?: string;
		/** Pull the next sibling up to trim the header→content void (default true).
		 *  Assumes the parent lays children out with the section gap. */
		trim?: boolean;
		/** Optional inline actions, right-aligned on desktop. */
		actions?: Snippet;
	} = $props();
</script>

<header class="page-header" class:trim>
	<div class="ph-text">
		<p class="gok-eyebrow ph-eyebrow">{eyebrow}</p>
		<h1 class="ph-title {titleClass}">{title}</h1>
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

	.ph-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	/* Trim the header→first-content gap: the host .page lays children out at the
	 * section gap (64px), which reads as a void below a sparse first block. A
	 * negative block-end margin nets the spacing down to ~32px without touching
	 * the calm rhythm between the content blocks themselves. */
	.page-header.trim {
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.ph-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.ph-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.ph-caption {
		margin: 0;
		color: var(--gok-color-text-muted);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
	}

	.ph-actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		flex-wrap: wrap;
	}
</style>
