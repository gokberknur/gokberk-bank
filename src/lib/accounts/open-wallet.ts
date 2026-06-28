// Open a new currency wallet (A03) — pure. Supported currencies, a deterministic
// mock IBAN/BIC generator (valid-shaped, never a real account), and the openable
// set (supported minus what I already hold). No money moves; opening just issues an
// account. Deterministic — the IBAN is a stable function of currency + sequence.

import type { Currency } from '$lib/data/money';

export interface SupportedCurrency {
	code: Currency;
	name: string;
	flag: string;
	/** ISO country the IBAN/BIC is issued in. */
	country: string;
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
	{ code: 'EUR', name: 'Euro', flag: '🇪🇺', country: 'DE' },
	{ code: 'USD', name: 'US Dollar', flag: '🇺🇸', country: 'US' },
	{ code: 'GBP', name: 'British Pound', flag: '🇬🇧', country: 'GB' },
	{ code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪', country: 'SE' },
	{ code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', country: 'CH' },
	{ code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴', country: 'NO' },
	{ code: 'DKK', name: 'Danish Krone', flag: '🇩🇰', country: 'DK' }
];

const BY_CODE = new Map(SUPPORTED_CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code: Currency): SupportedCurrency | undefined {
	return BY_CODE.get(code);
}

/** Currencies I can still open — supported minus the ones I already hold. */
export function openableCurrencies(held: Currency[]): SupportedCurrency[] {
	const have = new Set(held);
	return SUPPORTED_CURRENCIES.filter((c) => !have.has(c.code));
}

/** A stable pseudo-number from a string (FNV-1a) — for deterministic IBAN digits. */
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

function digits(seed: number, n: number): string {
	let s = '';
	let x = seed;
	for (let i = 0; i < n; i++) {
		x = Math.imul(x, 0x01000193) >>> 0;
		s += (x % 10).toString();
	}
	return s;
}

/** A deterministic, valid-shaped (not real) IBAN for a freshly opened wallet. */
export function makeIban(code: Currency, seq: number): string {
	const meta = currencyMeta(code);
	const cc = meta?.country ?? 'DE';
	const seed = hash(`${cc}-${code}-${seq}`);
	const check = ((seed % 89) + 10).toString(); // 2-digit check shape
	const body = `GOKB${digits(seed, 14)}`;
	// group into 4s for display
	const grouped = (cc + check + body).replace(/(.{4})/g, '$1 ').trim();
	return grouped;
}

/** The matching mock BIC, e.g. GOKBCHB1XXX. */
export function makeBic(code: Currency): string {
	const cc = currencyMeta(code)?.country ?? 'DE';
	return `GOKB${cc}B1XXX`;
}
