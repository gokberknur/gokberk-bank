<script lang="ts">
	// ADR-006 · The one shared "indicative / delayed data" label. Consumed verbatim across
	// the invest surfaces to replace the ad-hoc "Prices indicative…" caption strings that
	// were scattered per-page. Deliberately quiet: an info glyph + the label (+ an optional
	// trailing plain-text note), muted caption weight, no badge chrome — it sits inline next
	// to a price or an estimate without competing with it. Tokens only.
	let { label = 'Indicative', detail }: { label?: string; detail?: string } = $props();
</script>

<span class="indicative">
	<gok-icon name="info" size="s" aria-hidden="true"></gok-icon>
	<span class="indicative-text">{label}{#if detail}{' · '}{detail}{/if}</span>
</span>

<style>
	.indicative {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}
</style>
