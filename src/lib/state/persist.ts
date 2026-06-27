// Browser-guarded persistence for the state singletons. Durable user choices
// (settings, drafts, freeze flags, watchlists) persist under `gok-bank-*` keys;
// large derived/seed data is never persisted (it re-derives from F03). Theme and
// density are the two exceptions — they keep the DS-shared keys (`gok-theme`,
// `gok-density`) so the design-system components stay in sync, and so manage
// their own storage directly rather than going through here.

import { browser } from '$app/environment';

const PREFIX = 'gok-bank-';

/** Read a JSON value under a `gok-bank-` key, or the fallback if absent/invalid. */
export function readJSON<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw == null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

/** Write a JSON value under a `gok-bank-` key (no-op on the server). */
export function writeJSON(key: string, value: unknown): void {
	if (!browser) return;
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Storage full or unavailable — the in-memory state remains the source of truth.
	}
}

/** Remove a `gok-bank-` key (used by a store's `clear()`). */
export function remove(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(PREFIX + key);
	} catch {
		// ignore
	}
}

/**
 * Subscribe to cross-tab changes for a `gok-bank-` key. The callback receives the
 * parsed new value when another tab writes it. Returns an unsubscribe function.
 */
export function subscribe<T>(key: string, onChange: (value: T) => void): () => void {
	if (!browser) return () => {};
	const fullKey = PREFIX + key;
	const handler = (e: StorageEvent) => {
		if (e.key !== fullKey || e.newValue == null) return;
		try {
			onChange(JSON.parse(e.newValue) as T);
		} catch {
			// ignore malformed cross-tab payloads
		}
	};
	window.addEventListener('storage', handler);
	return () => window.removeEventListener('storage', handler);
}
