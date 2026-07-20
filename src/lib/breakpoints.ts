// The app's responsive breakpoints, in ONE place. The mobile/tablet edges were previously
// copy-pasted as raw media strings across the shell and several components; centralising them
// keeps "what counts as mobile" a single decision and lets JS (MediaQuery) and CSS agree.
//
// The bands (matching the shell grid + patterns.md §9): mobile < 40rem (bottom tab bar, no rail),
// tablet 40–63.999rem (icon-rail), desktop ≥ 64rem (full rail). 40rem = 640px at the 16px root.

import { MediaQuery } from 'svelte/reactivity';

/** Phone: below the point where the desktop/tablet rail takes over from the bottom tab bar. */
export const MOBILE_MAX = '(max-width: 39.999rem)';
/** Tablet: rail collapses to an icon-only strip. */
export const TABLET = '(min-width: 40rem) and (max-width: 63.999rem)';

// Shared reactive singletons — one matchMedia listener each, app-wide. Read `.current` in a
// component (template or $derived) and it tracks reactively. The `false` fallback keeps any
// non-browser evaluation desktop-first (harmless in this SPA, but correct).
export const mobile = new MediaQuery(MOBILE_MAX, false);
export const tablet = new MediaQuery(TABLET, false);

/**
 * The responsive `gok-drawer` placement, per patterns.md §9: "drawers = right on desktop,
 * bottom-sheet on mobile". Reads the reactive `mobile` singleton, so a drawer bound to it
 * (`placement={sheetPlacement()}`) re-anchors if the viewport crosses the breakpoint. One rule,
 * one place — every functional overlay in the app shares it.
 */
export function sheetPlacement(): 'bottom' | 'end' {
	return mobile.current ? 'bottom' : 'end';
}
