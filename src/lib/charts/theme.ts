// The chart token-bridge (F11). The design system ships no chart primitive, so
// the bank wraps ECharts / Lightweight Charts in thin Svelte components that read
// the live `--gok-*` token layer through here — so every chart looks unmistakably
// gök (monochrome canvas, one earned accent, hairline axes) and re-themes with the
// rest of the app when `data-theme` flips. No raw library palette ever ships.

export interface ChartTheme {
	/** Primary ink for labels/series text. */
	text: string;
	/** Muted ink for axis labels, secondary series. */
	muted: string;
	/** Hairline axes / gridlines. */
	border: string;
	/** Canvas / tooltip surface. */
	surface: string;
	/** Slightly stronger surface (tooltip, hovered slice). */
	surfaceStrong: string;
	/** The single earned accent — the focal series only. */
	accent: string;
	/** Positive / up (gains). */
	up: string;
	/** Negative / down (losses). */
	down: string;
	fontText: string;
	fontMono: string;
}

function readVar(name: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

/**
 * Resolve the current chart palette from the `--gok-*` roles on the document.
 * Read fresh each time (and after a `data-theme` change) so light/dark re-theme
 * is live. Fallbacks are the brand defaults so a chart never renders unstyled.
 */
export function chartTheme(): ChartTheme {
	return {
		text: readVar('--gok-color-text', '#101012'),
		muted: readVar('--gok-color-text-muted', '#6b6b70'),
		border: readVar('--gok-color-border', '#e6e6e4'),
		surface: readVar('--gok-color-surface', '#fafaf9'),
		surfaceStrong: readVar('--gok-color-surface-strong', '#f0f0ee'),
		accent: readVar('--gok-color-primary', '#1a5a34'),
		up: readVar('--gok-color-status-success', '#1a7a3a'),
		down: readVar('--gok-color-status-error', '#b42318'),
		fontText: readVar('--gok-font-family-text', 'system-ui, sans-serif'),
		fontMono: readVar('--gok-font-family-mono', 'ui-monospace, monospace')
	};
}

/**
 * Run `cb` whenever the document theme (`data-theme`) changes — each chart wrapper
 * subscribes so it can recompute `chartTheme()` and re-apply without a remount.
 * Returns a teardown for `onMount`/`$effect` cleanup.
 */
export function onThemeChange(cb: () => void): () => void {
	if (typeof document === 'undefined') return () => {};
	const observer = new MutationObserver(() => cb());
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	return () => observer.disconnect();
}

/** Whether the user asked for reduced motion — wrappers disable chart animation. */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Build a muted-to-accent ramp of `n` swatches for multi-series/allocation charts.
 *  Keeps the brand discipline: the accent leads, the rest are neutral steps — never
 *  a rainbow. Returns CSS color strings (accent first, then graded muted/border). */
export function categoricalRamp(theme: ChartTheme, n: number): string[] {
	if (n <= 1) return [theme.accent];
	const out = [theme.accent];
	for (let i = 1; i < n; i++) {
		// Interpolate opacity of the ink over the surface so later categories recede.
		const t = i / n;
		out.push(`color-mix(in oklab, ${theme.text} ${Math.round((1 - t) * 70 + 12)}%, ${theme.surface})`);
	}
	return out;
}
