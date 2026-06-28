<script lang="ts">
	// Sticky primary-action bar (app-local gap-composite). The DS has no sticky CTA
	// pattern; this extracts the one already proven inline on the instrument/crypto
	// trade pages so primary actions stay reachable without scroll-hunting. Composes
	// gok-* + tokens only; never restyles a DS component.
	import type { Snippet } from 'svelte';

	let {
		label,
		context,
		actions
	}: {
		/** Accessible label for the bar, e.g. "Trade AAPL" or "Card actions". */
		label: string;
		/** Optional left-side context group (symbol + price, balance, …). */
		context?: Snippet;
		/** The action group — one primary, optionally one quiet secondary. */
		actions: Snippet;
	} = $props();
</script>

<section class="cta-bar" aria-label={label}>
	{#if context}
		<div class="cta-context">{@render context()}</div>
	{/if}
	<div class="cta-actions">{@render actions()}</div>
</section>

<style>
	.cta-bar {
		position: sticky;
		inset-block-end: var(--gok-space-300);
		z-index: var(--gok-z-sticky);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
		background: var(--gok-color-surface-translucent);
		backdrop-filter: blur(var(--gok-blur-chrome));
	}

	.cta-context {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	.cta-actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* Mobile: lift clear of the fixed bottom tab bar and let the actions fill the width. */
	@media (max-width: 40rem) {
		.cta-bar {
			inset-block-end: calc(var(--gok-space-900) + env(safe-area-inset-bottom));
		}

		.cta-actions {
			flex: 1 1 auto;
		}

		.cta-actions :global(gok-button) {
			flex: 1 1 0;
		}
	}
</style>
