// V14 · 15-minute in-memory TTL cache + provider cooldown (ADR-006 rule 4). Keyed by
// method+symbol+range. A fresh entry is returned with no network hit; a 429 arms a
// per-provider cooldown so we stop hammering a rate-limited feed. This is the LIVE path
// only, so `Date.now()` is fine here (the seed stays deterministic and never touches this).

const TTL_MS = 15 * 60 * 1000;

interface Entry {
	value: unknown;
	at: number;
}

const store = new Map<string, Entry>();
const cooldownUntil = new Map<string, number>();

/** A cached value if it's still within the 15-min TTL, else null. */
export function getFresh<T>(key: string): T | null {
	const e = store.get(key);
	if (e && Date.now() - e.at < TTL_MS) return e.value as T;
	return null;
}

export function put(key: string, value: unknown): void {
	store.set(key, { value, at: Date.now() });
}

/** True while a provider is in its post-429 cooldown window. */
export function inCooldown(provider: string): boolean {
	const until = cooldownUntil.get(provider);
	return until != null && Date.now() < until;
}

/** Arm a cooldown so a rate-limited provider isn't re-hit inside the window. */
export function setCooldown(provider: string, ms: number): void {
	cooldownUntil.set(provider, Date.now() + ms);
}
