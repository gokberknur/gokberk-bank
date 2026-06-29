// App theme helper — gives non-UI code a way to read/flip the light/dark theme.
//
// The DS `gok-theme-switch` owns the theme via the same two signals: `data-theme`
// on `<html>` and the shared `gok-theme` localStorage key (stored as a raw string).
// It *observes* `data-theme` (a MutationObserver) + cross-tab storage, so writing
// those two ourselves re-themes the page (charts + everything read `data-theme`)
// AND keeps every mounted switch in sync. (Setting the switch's `value` property
// programmatically does NOT apply the theme — it only does so on user interaction —
// so we drive the document signals directly.)
//
// Used by the command menu's "Switch to light/dark" command.

export type Theme = 'light' | 'dark';

/** The theme currently applied to `<html data-theme>` (defaults to light). */
export function currentTheme(): Theme {
	return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Apply a theme: flip `data-theme` (re-themes the page + syncs every `gok-theme-switch`)
 *  and persist the shared `gok-theme` key in the switch's raw-string format. */
export function setTheme(theme: Theme): void {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem('gok-theme', theme);
	} catch {
		// Storage unavailable (private mode) — the attribute alone still themes the page.
	}
}

/** Flip light ⇄ dark. */
export function toggleTheme(): void {
	setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}
