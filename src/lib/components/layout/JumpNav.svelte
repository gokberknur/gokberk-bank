<script lang="ts">
	// In-page jump nav for a long stacked page (CV-LAY-6: a very long page needs in-page
	// navigation, not one endless scroll). Real anchors to sections on this page, in
	// on-page order — distinct from SectionSubnav, which navigates between ROUTES.
	//
	// Calm and mono, sentence-case (the eyebrow owns the app's one uppercase), sitting on a
	// hairline rule so it reads lighter than any route-level sub-nav above it.
	//
	// Extracted from /invest, which had the only copy; /budgets is the second consumer and
	// the reason it is shared rather than pasted.
	let {
		items,
		ariaLabel = 'On this page'
	}: {
		/** Section anchors in on-page order. `id` must match the section's own id. */
		items: { id: string; label: string }[];
		/** Accessible name for the nav landmark. */
		ariaLabel?: string;
	} = $props();
</script>

<nav class="jump-nav" aria-label={ariaLabel}>
	<ul class="jump-list">
		{#each items as item (item.id)}
			<li><a class="jump-link" href="#{item.id}">{item.label}</a></li>
		{/each}
	</ul>
</nav>

<style>
	.jump-nav {
		grid-column: 1 / -1;
		margin-block-start: calc(-1 * var(--gok-space-300));
	}

	.jump-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-400);
		margin: 0;
		padding: 0;
		padding-block-end: var(--gok-space-300);
		list-style: none;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.jump-link {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		color: var(--gok-color-text-muted);
		text-decoration: none;
	}

	.jump-link:hover {
		color: var(--gok-color-text);
	}

	.jump-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}
</style>
