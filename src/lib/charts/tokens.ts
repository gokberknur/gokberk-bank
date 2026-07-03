// Chart colour roles + helpers for the LayerChart v2 era (F11). This replaces the colour
// half of the old `theme.ts` probe-canvas bridge: because LayerChart renders SVG, colours are
// passed as live `var(--gok-*)` strings and re-theme on `data-theme` through the CSS cascade —
// no probe canvas, no MutationObserver. The variable→token mapping itself lives in
// `layerchart.css` on `.lc-root-container`.

/** Chart colour roles as live CSS `var(--gok-*)` strings. SVG resolves these natively and
 *  re-themes on `data-theme` with zero JS — pass straight into fill/stroke/series.color/cRange. */
export const chartTokens = {
	/** The single earned accent — the focal series only, never a chart category. */
	accent: 'var(--gok-color-primary)',
	/** Primary ink for labels / content. */
	text: 'var(--gok-color-text)',
	/** Muted ink for axis labels / secondary series. */
	muted: 'var(--gok-color-text-muted)',
	/** Hairline axes / gridlines. */
	border: 'var(--gok-color-border)',
	/** Canvas surface. */
	surface: 'var(--gok-color-surface)',
	/** Slightly stronger surface (tooltip, hovered slice). */
	surfaceStrong: 'var(--gok-color-surface-strong)',
	/** Positive / up (gains) — always paired with shape + text, never hue alone. */
	up: 'var(--gok-color-status-success)',
	/** Negative / down (losses) — always paired with shape + text, never hue alone. */
	down: 'var(--gok-color-status-error)'
} as const;

/** A soft accent tint (flat low-opacity fill under a line/area) that binds reliably and
 *  re-themes for free — use this instead of `fill-opacity`, which doesn't reach the path. */
export const accentFill = 'color-mix(in oklab, var(--gok-color-primary) 12%, transparent)';

/** Graded neutral-ink ramp of `n` swatches for multi-series / allocation charts. Brand
 *  discipline: the forest-green accent is spent once per context and must NOT be a chart
 *  category, so a donut/stack reads as receding ink steps over the surface (darkest first),
 *  never a rainbow (CV-VIS-1). Returns live `color-mix()` strings — SVG resolves them, so
 *  no pre-resolution is needed and they re-theme on `data-theme`. */
export function categoricalRamp(n: number): string[] {
	return Array.from({ length: n }, (_, i) => {
		const t = n <= 1 ? 0 : i / n;
		const pct = Math.round((1 - t) * 70 + 18);
		return `color-mix(in oklab, var(--gok-color-text) ${pct}%, var(--gok-color-surface))`;
	});
}

/** Whether the user asked for reduced motion — gate LayerChart `motion` props on it. */
export function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
