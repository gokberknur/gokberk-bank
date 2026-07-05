<script lang="ts">
	let {
		href,
		label
	}: {
		/** Destination of the parent surface. A hard link (native nav), not history-back. */
		href: string;
		/** Parent-surface name. The accessible name reads "Back to {label}". */
		label: string;
	} = $props();
</script>

<a class="back-link" {href}>
	<span class="back-arrow" aria-hidden="true">&larr;</span>
	<span><span class="sr-only">Back to </span>{label}</span>
</a>

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		align-self: flex-start;
		margin-block-end: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		color: var(--gok-color-text-muted);
		text-decoration: none;
		white-space: nowrap;
	}

	.back-link:hover {
		color: var(--gok-color-text);
	}

	.back-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.back-arrow {
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
