/**
 * Money helpers for E2E assertions.
 *
 * The app's source of truth for money is integer MINOR UNITS (cents) — never floats
 * (see CLAUDE.md "Market model"). The UI renders grouped, localized strings like
 * "€1,234.50" or "1 234,50 kr". When a test asserts that a disclosed amount equals a
 * committed amount, compare them in minor units, not as display strings, so grouping
 * and symbol differences don't cause false failures (or hide real cent drift).
 */

/**
 * Parse a displayed money string to integer minor units.
 * Handles a leading/trailing currency symbol or code, thousands separators (',' '.' ' '
 * or non-breaking space), and either '.' or ',' as the decimal separator.
 * Returns null if no numeric content is found.
 */
export function toMinorUnits(display: string): number | null {
	// Strip everything except digits, separators, and a leading minus.
	const cleaned = display.replace(/[^\d.,\-   ]/g, '').trim();
	const digitsOnly = cleaned.replace(/[.,\s  ]/g, '');
	if (!/\d/.test(digitsOnly)) return null;

	const negative = /^-/.test(cleaned);
	// The decimal separator is the LAST '.' or ',' that has exactly two digits after it.
	const decimalMatch = cleaned.match(/[.,](\d{2})(?!\d)/);
	let minor = 0;
	let major = digitsOnly.replace(/^-/, '');

	if (decimalMatch) {
		minor = Number(decimalMatch[1]);
		major = major.slice(0, major.length - 2);
	}
	const value = Number(major || '0') * 100 + minor;
	return negative ? -value : value;
}

/** Format minor units back to a plain "1234.50" string (no grouping) for diagnostics. */
export function fromMinorUnits(minor: number): string {
	const sign = minor < 0 ? '-' : '';
	const abs = Math.abs(minor);
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
