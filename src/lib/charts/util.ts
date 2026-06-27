// Small chart-internal helpers (F11). The token bridge (`theme.ts`) and the
// accent-led `categoricalRamp` emit CSS color strings — and the ramp uses
// `color-mix()`, which ECharts' renderer (zrender) cannot parse. So before any
// color reaches a chart option we resolve it to a concrete `rgb(...)` the library
// understands, by letting the browser compute it on a throwaway element.

/**
 * Resolve any CSS color string (including `color-mix()` / `light-dark()` / custom
 * properties already substituted by `theme.ts`) to the concrete `rgb()`/`rgba()`
 * the browser computes. ECharts/zrender only parses hex/rgb(a)/hsl(a)/named — not
 * `color-mix()` — so ramp swatches must pass through here first. SSR-safe.
 */
export function resolveColor(value: string): string {
	if (typeof document === 'undefined') return value;
	const probe = document.createElement('span');
	probe.style.color = value;
	probe.style.display = 'none';
	document.body.appendChild(probe);
	const resolved = getComputedStyle(probe).color;
	probe.remove();
	return resolved || value;
}

/** Resolve a whole ramp (see `resolveColor`). */
export function resolveColors(values: string[]): string[] {
	return values.map(resolveColor);
}
