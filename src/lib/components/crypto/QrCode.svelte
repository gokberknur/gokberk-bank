<script lang="ts">
	// V07 · A monochrome, locally-rendered QR-like glyph for the receive address.
	// It paints the boolean matrix from `qrMatrix(value)` as a CSS grid — filled
	// modules in the token ink, empty modules in the token surface — so the code is
	// pure monochrome (no hue, no hardcoded hex). It is ILLUSTRATIVE: the canonical,
	// copyable value is always the address text shown alongside it. The grid is
	// `role="img"` with a naming label; a visually-hidden note points to that text
	// as the source of truth. Cells are decorative (aria-hidden).
	import { qrMatrix } from '$lib/crypto/qr';

	interface Props {
		/** The address the glyph encodes (also the visible canonical text). */
		value: string;
		/** The accessible name — names the asset + network the code is for. */
		label: string;
		/** A visually-hidden note pointing at the canonical address text. */
		note?: string;
	}

	let { value, label, note }: Props = $props();

	// One stable matrix per address — recomputed only when the address changes.
	const matrix = $derived(qrMatrix(value));
</script>

<div class="qr">
	<div class="qr-grid" role="img" aria-label={label} style="--qr-n: {matrix.length}">
		{#each matrix as row, r (r)}
			{#each row as cell, c (c)}
				<span class="qr-cell" data-on={cell ? 'on' : 'off'} aria-hidden="true"></span>
			{/each}
		{/each}
	</div>
	{#if note}
		<span class="visually-hidden">{note}</span>
	{/if}
</div>

<style>
	.qr {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
	}

	.qr-grid {
		display: grid;
		grid-template-columns: repeat(var(--qr-n), 1fr);
		inline-size: 12rem;
		aspect-ratio: 1;
		padding: var(--gok-space-300);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	/* Monochrome: empty modules read the surface, filled modules the ink. */
	.qr-cell {
		inline-size: 100%;
		aspect-ratio: 1;
		background: var(--gok-color-surface);
	}

	.qr-cell[data-on='on'] {
		background: var(--gok-color-text);
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}
</style>
