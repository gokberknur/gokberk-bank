<script lang="ts">
	// V09 · News / research strip — a calm, keyboard-navigable list of seeded per-instrument
	// headlines for the Overview tab. Each hairline row reads the headline (primary) + a muted
	// "source · when" meta line, with a quiet "View source" stub. There is NO live feed in this
	// demo, so every "View source" opens ONE shared, labelled placeholder dialog the component
	// owns — never a dead-end or 404 (CV-CLK-3). The host page owns the section heading; this
	// component owns the list + the placeholder. Empty → a quiet inline line, not a big card.
	import type { NewsItem } from '$lib/invest/news';
	import { agoLabel } from '$lib/invest/news';
	import { setProps, on } from '$lib/wc.svelte';

	let { items }: { items: NewsItem[] } = $props();

	// The one shared placeholder dialog — opened by any row's "View source" stub.
	let placeholderOpen = $state(false);
</script>

{#if items.length === 0}
	<p class="empty">No recent headlines.</p>
{:else}
	<ul class="news">
		{#each items as item (item.id)}
			<li class="news-row">
				<div class="news-text">
					<p class="news-headline">{item.headline}</p>
					<p class="news-meta">{item.source} · {agoLabel(item.hoursAgo)}</p>
				</div>
				<button
					type="button"
					class="view-source"
					aria-label="View source for: {item.headline}"
					onclick={() => (placeholderOpen = true)}
				>
					View source
				</button>
			</li>
		{/each}
	</ul>
{/if}

<!-- The one shared, labelled placeholder every "View source" stub lands on. Low-stakes and
     reversible, so it stays dismissible — no forced decision, no danger tone. -->
<gok-dialog
	size="s"
	heading="No live news feed"
	{@attach setProps({ open: placeholderOpen })}
	{@attach on('gok-close', () => (placeholderOpen = false))}
	{@attach on('gok-cancel', () => (placeholderOpen = false))}
>
	<p class="placeholder-body">
		This is a demo — there's no live news source behind these headlines, so there's nothing to
		open. The list is seeded and factual, just to show how research would read here.
	</p>

	<div slot="footer" class="placeholder-actions">
		<gok-button variant="secondary" {@attach on('click', () => (placeholderOpen = false))}>
			Close
		</gok-button>
	</div>
</gok-dialog>

<style>
	/* --- Hairline list (borrows the related-strip idiom from the instrument page) --- */
	.news {
		list-style: none;
		margin: 0;
		padding: 0;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.news-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.news-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.news-headline {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.news-meta {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- The "View source" stub: a quiet, link-style button --- */
	.view-source {
		flex: none;
		align-self: flex-start;
		padding: 0;
		border: none;
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-link);
		cursor: pointer;
	}

	.view-source:hover {
		text-decoration: underline;
	}

	.view-source:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* --- Quiet inline empty (compact — no big empty-state card) --- */
	.empty {
		margin: 0;
		padding-block: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Placeholder dialog --- */
	.placeholder-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.placeholder-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		inline-size: 100%;
	}
</style>
