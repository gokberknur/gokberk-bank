# Theming & the `--gok-*` token-bridge

This is the crux of using LayerChart in this app. Read it before theming any chart.

## Why LayerChart is dramatically simpler to theme than ECharts/Lightweight

The old `src/lib/charts/theme.ts` had to do two hard things:

1. **`resolveColor()`** — paint a token onto a probe `<span>`, then rasterize onto a 1×1 canvas to
   collapse `light-dark(oklch(…))` down to concrete `rgb()`, because **ECharts' zrender and
   Lightweight Charts can only parse hex/rgb/hsl** and throw on `light-dark()`/`oklch()`.
2. **`onThemeChange()`** — a `data-theme` MutationObserver that re-ran `chartTheme()` and
   `chart.setOption(...)` on every theme flip, because the resolved `rgb()` values were baked in and
   wouldn't update on their own.

**LayerChart renders SVG by default.** Its marks set real DOM `fill`/`stroke` (CSS/attributes), which
the browser resolves natively — `var(--gok-*)`, `light-dark()`, `oklch()`, and `color-mix()` all just
work. And when `data-theme` flips, those `var(--gok-*)` references **re-cascade automatically** — the
browser recomputes every color with zero JavaScript.

So for LayerChart you **delete both mechanisms**: no probe-canvas resolver, no MutationObserver. Pass
tokens as CSS strings and let the cascade do the rest.

> **Canvas-mode caveat.** Only if you set `layer="canvas"` (very large datasets) does the rasterizer
> reintroduce the old problem for wide-gamut/`light-dark()` values. In that narrow case, reuse the
> existing `resolveColor` from the old `theme.ts` to pass concrete `rgb()`, and re-add a lightweight
> `onThemeChange` to recompute. **Default to SVG** and you never need either.

## Step 1 — map LayerChart's variables to `--gok-*` tokens (once, globally)

LayerChart themes off five CSS variables on the **`.lc-root-container`** class. Add this block to the
app's global stylesheet loaded once at the root `+layout.svelte` (e.g. `src/app.css`, or a dedicated
`src/lib/charts/layerchart.css` imported there):

```css
/* Non-Tailwind projects must declare the layer order so LayerChart's `base` and
   `components` layers stay predictably overridable. Put this before any LayerChart styles. */
@layer theme, base, components, utilities;

/* Bridge LayerChart's theme variables to our tokens. No dark-mode block is needed:
   --gok-* are already light-dark(), so these follow `data-theme` for free. */
.lc-root-container {
	--color-primary: var(--gok-color-primary);       /* default mark color (lines/bars) */
	--color-surface-100: var(--gok-color-surface);   /* canvas / lightest surface        */
	--color-surface-200: var(--gok-color-surface-strong); /* tooltip / hovered surface   */
	--color-surface-300: var(--gok-color-border);    /* hairlines / darkest surface      */
	--color-surface-content: var(--gok-color-text);  /* text / content ink               */
}
```

| LayerChart var | Controls | Mapped to |
|---|---|---|
| `--color-primary` | default mark color (lines, bars, arcs) | `--gok-color-primary` |
| `--color-surface-100` | lightest surface / background | `--gok-color-surface` |
| `--color-surface-200` | medium surface (tooltip bg, hover) | `--gok-color-surface-strong` |
| `--color-surface-300` | darker surface / hairline | `--gok-color-border` |
| `--color-surface-content` | text / content | `--gok-color-text` |

Out of the box LayerChart uses **`currentColor`** as the primary — so a chart also inherits color from
its container's CSS `color` if you don't set `--color-primary`.

## Step 2 — pass role colors as `var(--gok-*)` strings on marks/series

For anything beyond the single primary — the focal accent, up/down, per-category ramp — pass the token
string straight into `stroke`, `fill`, `series[].color`, or `cRange`. Keep a tiny app helper so wrappers
don't hardcode token names. Suggested `src/lib/charts/tokens.ts` (the LayerChart-era replacement for the
color half of `theme.ts`):

```ts
/** Chart color roles as live CSS `var(--gok-*)` strings. SVG resolves these natively and
 *  re-themes on `data-theme` with no JS — pass them straight into fill/stroke/series.color/cRange. */
export const chartTokens = {
	accent: 'var(--gok-color-primary)',
	text: 'var(--gok-color-text)',
	muted: 'var(--gok-color-text-muted)',
	border: 'var(--gok-color-border)',
	surface: 'var(--gok-color-surface)',
	surfaceStrong: 'var(--gok-color-surface-strong)',
	up: 'var(--gok-color-status-success)',
	down: 'var(--gok-color-status-error)'
} as const;

/** Graded neutral-ink ramp of `n` swatches for multi-series / allocation charts. Ported from
 *  theme.ts:categoricalRamp — keeps brand discipline: the accent is NOT a chart category, so a
 *  donut/stack reads as receding ink steps over the surface (darkest first), never a rainbow.
 *  Returns CSS color-mix() strings; SVG resolves them live, so no pre-resolution is needed. */
export function categoricalRamp(n: number): string[] {
	return Array.from({ length: n }, (_, i) => {
		const t = n <= 1 ? 0 : i / n;
		const pct = Math.round((1 - t) * 70 + 18);
		return `color-mix(in oklab, var(--gok-color-text) ${pct}%, var(--gok-color-surface))`;
	});
}
```

Usage:

```svelte
<!-- focal single series -->
<LineChart {data} x="date" y="value" props={{ spline: { stroke: chartTokens.accent } }} />

<!-- categorical: neutral ramp, never the accent -->
<PieChart {data} key="name" value="value" cRange={categoricalRamp(data.length)} />

<!-- direction by role (paired with shape/text elsewhere) -->
c={(d) => (d.close < d.open ? 'down' : 'up')}
cDomain={['down', 'up']}
cRange={[chartTokens.down, chartTokens.up]}
```

## Motion & accessibility (keep these)

- **`prefersReducedMotion()`** still applies. Keep it (from `theme.ts`, or move it into `tokens.ts`)
  and gate LayerChart's motion props on it — e.g. `motion={prefersReducedMotion() ? false : 'spring'}`
  on `Arc`/`ArcChart`, and skip tweened transitions. LayerChart animates via `motion`/tween props, not
  a global flag, so set them per component.
- **`role="img"` + text `label`** on the wrapper's outer element, exactly as the ECharts wrappers do —
  the SVG is decorative; the accessible name is the summary string. Keep an adjacent text figure.
- **Hairline, flat chrome:** hidden vertical gridlines, hairline horizontal splitlines
  (`--gok-color-border` via `--color-surface-300`), muted mono axis labels, tooltip on
  `surface-strong` with `box-shadow: none`. Configure via `props={{ xAxis, yAxis, tooltip }}` and
  `class`/`style` overrides on `:where(.lc-*)`.

## Fonts

Axis/tooltip text inherits font from the container. Set the chart wrapper's CSS `font-family` to
`var(--gok-font-family-mono)` for numerals/axes (matching the current mono-tick convention) and let it
cascade, rather than threading a font token through props.
