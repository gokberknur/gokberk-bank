<script lang="ts">
	// A04 · Progress ring — the ONE place the earned forest-green accent fills. Two
	// concentric SVG circles: a hairline track (border role) and, over it, the saved
	// arc in `--gok-color-primary` drawn with stroke-dasharray on `pct`. The geometry
	// lives in a unitless 0–120 viewBox (SVG user space, not CSS px); every colour and
	// the rendered size are `--gok-*` tokens.
	//
	// It is never the only signal: the figures are also rendered as text by the caller,
	// and the ring carries role="progressbar" with aria-valuenow/min/max + an aria-label
	// (e.g. "€1,200 of €2,000, 60%"). Open-ended pots (no goal → pct null) render a
	// neutral dashed track with no percentage; a reached goal renders a mark-led check
	// in the centre over a full accent ring — never a saturated banner.
	import type { Snippet } from 'svelte';

	interface Props {
		/** Progress 0..1, or null for an open-ended pot (no goal). */
		pct: number | null;
		/** Goal met — swaps to the mark-led complete state. */
		reached?: boolean;
		/** The accessible label, e.g. "€1,200 of €2,000, 60%". Required (the ring isn't text). */
		ariaLabel: string;
		/** Larger geometry for the detail centrepiece; default is the card size. */
		large?: boolean;
		/** Centre content (the figures), rendered as text under any reached mark. */
		children?: Snippet;
	}

	let { pct, reached = false, ariaLabel, large = false, children }: Props = $props();

	// Unitless SVG geometry (user space, not CSS px). r leaves room for the stroke.
	const R = 52;
	const CIRCUMFERENCE = 2 * Math.PI * R;

	// The visible fraction: a reached ring always reads full; open-ended shows none.
	const fraction = $derived(reached ? 1 : (pct ?? 0));
	const dashoffset = $derived(CIRCUMFERENCE * (1 - fraction));

	// Whole-percent for aria-valuenow; omitted (indeterminate) when open-ended.
	const valueNow = $derived(pct == null ? undefined : Math.round((reached ? 1 : pct) * 100));
	const openEnded = $derived(pct == null);
</script>

<div
	class="ring"
	class:large
	role="progressbar"
	aria-valuemin={openEnded ? undefined : 0}
	aria-valuemax={openEnded ? undefined : 100}
	aria-valuenow={valueNow}
	aria-label={ariaLabel}
>
	<svg class="svg" viewBox="0 0 120 120" aria-hidden="true">
		<!-- Track: hairline, in the border role. Dashed when open-ended. -->
		<circle
			class="track"
			class:dashed={openEnded}
			cx="60"
			cy="60"
			r={R}
			fill="none"
		/>
		<!-- Fill: the saved arc — the earned accent. Only drawn when there's a goal. -->
		{#if !openEnded}
			<circle
				class="fill"
				cx="60"
				cy="60"
				r={R}
				fill="none"
				stroke-linecap="round"
				stroke-dasharray={CIRCUMFERENCE}
				stroke-dashoffset={dashoffset}
				transform="rotate(-90 60 60)"
			/>
		{/if}
	</svg>

	<span class="center">
		{#if reached}
			<span class="mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
					<path
						d="M5 12.5l4.5 4.5L19 7"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
		{/if}
		{#if children}
			<span class="label">{@render children()}</span>
		{/if}
	</span>
</div>

<style>
	.ring {
		position: relative;
		display: inline-grid;
		place-items: center;
		inline-size: 6.5rem;
		block-size: 6.5rem;
	}

	.ring.large {
		inline-size: 12rem;
		block-size: 12rem;
	}

	.svg {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
	}

	.track {
		stroke: var(--gok-color-border);
		stroke-width: 8;
	}

	.track.dashed {
		stroke: var(--gok-color-border-strong);
		stroke-dasharray: 2 5;
	}

	.fill {
		stroke: var(--gok-color-primary);
		stroke-width: 8;
		transition: stroke-dashoffset var(--gok-motion-duration-slow) var(--gok-motion-ease-standard);
	}

	.center {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-50, 2px);
		text-align: center;
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--gok-color-primary);
	}

	.label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-50, 2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
