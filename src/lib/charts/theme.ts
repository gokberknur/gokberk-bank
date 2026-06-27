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

let _probeCanvas: HTMLCanvasElement | null = null;

/**
 * Resolve a CSS colour expression to a concrete `rgb()/rgba()` string. The token
 * roles are stored as `light-dark(oklch(…), oklch(…))`, which `getComputedStyle`
 * returns VERBATIM for a custom property (custom props aren't computed like real
 * colour properties). Charting libraries (ECharts' zrender, Lightweight Charts)
 * can only parse hex/rgb(a)/hsl — a raw `light-dark()`/`oklch()` throws and aborts
 * the chart. Two steps get us to sRGB:
 *  1. Paint the value onto a connected probe's real `color` property and read it
 *     back — the browser resolves `light-dark()` (honouring the inherited
 *     color-scheme so the right branch wins) and `var()` refs. Chrome keeps the
 *     result in its source space though (e.g. still `oklch(…)`).
 *  2. Rasterise that onto a 1×1 canvas and read the pixel — the rasteriser MUST
 *     emit concrete sRGB bytes, collapsing oklch/color-mix/color() to `rgb()`.
 */
function resolveColor(value: string, fallback: string): string {
	if (typeof document === 'undefined' || !document.body) return fallback;
	// Step 1 — resolve light-dark()/var() via a connected probe.
	let resolved = value;
	const probe = document.createElement('span');
	probe.style.color = value;
	if (probe.style.color) {
		probe.style.position = 'absolute';
		probe.style.pointerEvents = 'none';
		probe.setAttribute('aria-hidden', 'true');
		document.body.appendChild(probe);
		resolved = getComputedStyle(probe).color || value;
		document.body.removeChild(probe);
	}
	// Step 2 — rasterise to collapse any wide-gamut space to sRGB bytes.
	const canvas = (_probeCanvas ??= document.createElement('canvas'));
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return resolved || fallback;
	ctx.clearRect(0, 0, 1, 1);
	ctx.fillStyle = '#000';
	ctx.fillStyle = resolved; // a rejected value leaves the sentinel, not a throw
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
	return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

/** Read a colour token and resolve it to a concrete `rgb()` the chart libs accept. */
function readColor(name: string, fallback: string): string {
	return resolveColor(readVar(name, fallback), fallback);
}

/**
 * Resolve the current chart palette from the `--gok-*` roles on the document.
 * Read fresh each time (and after a `data-theme` change) so light/dark re-theme
 * is live. Fallbacks are the brand defaults so a chart never renders unstyled.
 */
export function chartTheme(): ChartTheme {
	return {
		text: readColor('--gok-color-text', '#101012'),
		muted: readColor('--gok-color-text-muted', '#6b6b70'),
		border: readColor('--gok-color-border', '#e6e6e4'),
		surface: readColor('--gok-color-surface', '#fafaf9'),
		surfaceStrong: readColor('--gok-color-surface-strong', '#f0f0ee'),
		accent: readColor('--gok-color-primary', '#1a5a34'),
		up: readColor('--gok-color-status-success', '#1a7a3a'),
		down: readColor('--gok-color-status-error', '#b42318'),
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
