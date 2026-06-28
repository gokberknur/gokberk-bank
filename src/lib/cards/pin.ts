// Card PIN (C04) — a deterministic per-card 4-digit PIN plus the rules for
// changing it. The PIN is never stored on the `Card` (it's sensitive); it's
// derived from the card id and held in a small override map once changed. All
// SIMULATED — no real card network, no secure element. Deterministic: the seed
// PIN is hashed from the id (no Math.random), so a given card always shows the
// same PIN until I change it.

const overrides = new Map<string, string>();

function hash(seed: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** The card's current 4-digit PIN — a changed PIN if set, else the seed. */
export function cardPin(cardId: string): string {
	const override = overrides.get(cardId);
	if (override) return override;
	// A stable 4-digit seed from the id, nudged off any weak pattern.
	let pin = (hash(`pin:${cardId}`) % 10000).toString().padStart(4, '0');
	if (isWeakPin(pin)) pin = (((hash(`pin:${cardId}`) % 10000) + 1739) % 10000).toString().padStart(4, '0');
	return pin;
}

/** Store a changed PIN (after OTP confirm). */
export function setPin(cardId: string, pin: string): void {
	overrides.set(cardId, pin);
}

/** A weak PIN is four of a kind (1111) or a strict run up/down (1234 / 4321). */
export function isWeakPin(pin: string): boolean {
	if (!/^\d{4}$/.test(pin)) return false;
	if (/^(\d)\1{3}$/.test(pin)) return true;
	const d = pin.split('').map(Number);
	const asc = d.every((n, i) => i === 0 || n === d[i - 1] + 1);
	const desc = d.every((n, i) => i === 0 || n === d[i - 1] - 1);
	return asc || desc;
}

/** Validate a candidate new PIN; returns a no-blame message, or null if good. */
export function pinError(pin: string): string | null {
	if (!/^\d{4}$/.test(pin)) return 'A PIN is four digits.';
	if (isWeakPin(pin)) return 'That PIN is too easy to guess — I’ll pick one that isn’t a run or all the same.';
	return null;
}
