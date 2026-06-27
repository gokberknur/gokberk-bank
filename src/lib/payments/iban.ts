// IBAN / BIC helpers — pure, framework-free, deterministic. The send + add-payee
// flows lean on these to validate account numbers *before* a payee is saved, so a
// mistyped IBAN never makes it into the directory. Validation is a real mod-97
// checksum (ISO 13616), not a length/regex guess — a single transposed digit
// fails it, which is the whole point of the "reward-early" field error.

/** Strip spaces and upper-case — the normalised form we store and checksum. */
export function normalizeIban(raw: string): string {
	return raw.replace(/\s+/g, '').toUpperCase();
}

/** Group the normalised IBAN into space-separated blocks of four, for display. */
export function formatIban(raw: string): string {
	return normalizeIban(raw).replace(/(.{4})/g, '$1 ').trim();
}

/** Mask an IBAN to its last four digits, e.g. "•••• 3456". Empty in → "". */
export function maskIban(raw: string): string {
	const iban = normalizeIban(raw);
	if (!iban) return '';
	return '•••• ' + iban.slice(-4);
}

// A structural pre-check: 2 country letters, 2 check digits, then alphanumerics.
const IBAN_SHAPE = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;

/**
 * Validate an IBAN by the ISO 13616 **mod-97** checksum: move the first four
 * characters to the end, map letters A–Z → 10–35, then take the whole number mod
 * 97 — a valid IBAN leaves a remainder of 1. The mod is computed in 7-digit
 * chunks so the (very large) integer never overflows `Number`.
 */
export function ibanChecksum(raw: string): boolean {
	const iban = normalizeIban(raw);
	if (iban.length < 15 || iban.length > 34) return false;
	if (!IBAN_SHAPE.test(iban)) return false;

	const rearranged = iban.slice(4) + iban.slice(0, 4);

	let expanded = '';
	for (const ch of rearranged) {
		expanded += ch >= 'A' && ch <= 'Z' ? (ch.charCodeAt(0) - 55).toString() : ch;
	}

	let remainder = 0;
	for (let i = 0; i < expanded.length; i += 7) {
		remainder = Number(remainder.toString() + expanded.slice(i, i + 7)) % 97;
	}
	return remainder === 1;
}

// BIC/SWIFT: 4 bank + 2 country + 2 location, then an optional 3-char branch.
const BIC_SHAPE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/** Validate a BIC's 8-or-11-character format. (Empty is treated as valid — BIC is optional here.) */
export function bicFormat(raw: string): boolean {
	const bic = raw.replace(/\s+/g, '').toUpperCase();
	if (!bic) return true;
	return BIC_SHAPE.test(bic);
}
