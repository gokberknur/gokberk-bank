// Pure parse/format helpers for the money-input composite (F07). The canonical
// value is always **integer minor units**; these helpers move between that and
// the human string the user types/sees. Locale is en-IE (decimal ".", group ",")
// but paste-sanitisation also understands European "1.234,50". No float math
// reaches a stored amount — minor units are computed by integer scaling.

import { DECIMALS, type Currency } from '$lib/data/money';

/** Decimal digits for a currency (2 for EUR/USD/GBP/SEK in this app). */
export function currencyDecimals(currency: Currency): number {
	return DECIMALS[currency];
}

/**
 * Live sanitiser for keystrokes: keep digits and a single decimal point, and cap
 * the fractional part at the currency's decimals. Returns an UN-grouped numeric
 * string (e.g. "1234.5"). Grouping is applied separately so caret math is simple.
 */
export function sanitizeLive(raw: string, decimals: number): string {
	// Keep only digits and dots; collapse to a single decimal point (the first).
	let s = raw.replace(/[^\d.]/g, '');
	const firstDot = s.indexOf('.');
	if (firstDot !== -1) {
		s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
	}
	if (decimals === 0) {
		s = s.replace(/\./g, '');
	} else if (firstDot !== -1) {
		const [intPart, fracPart = ''] = s.split('.');
		s = intPart + '.' + fracPart.slice(0, decimals);
	}
	return s;
}

/** Group the integer part with thousands separators (",") — fractional untouched. */
export function groupInteger(numeric: string): string {
	const neg = numeric.startsWith('-');
	const body = neg ? numeric.slice(1) : numeric;
	const [intPart, fracPart] = body.split('.');
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	const out = fracPart !== undefined ? `${grouped}.${fracPart}` : grouped;
	return neg ? '-' + out : out;
}

/** Convert an un-grouped numeric string ("1234.5") to integer minor units. */
export function toMinor(numeric: string, decimals: number): number {
	if (numeric === '' || numeric === '.' || numeric === '-') return 0;
	const neg = numeric.startsWith('-');
	const body = neg ? numeric.slice(1) : numeric;
	const [intPart = '0', fracPart = ''] = body.split('.');
	const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
	const minor = Number(intPart) * 10 ** decimals + Number(frac || '0');
	return neg ? -minor : minor;
}

/** Format integer minor units as a grouped, fixed-decimals string (no symbol). */
export function formatMinorPlain(minor: number, decimals: number): string {
	const neg = minor < 0;
	const abs = Math.abs(minor);
	const factor = 10 ** decimals;
	const intPart = Math.floor(abs / factor).toString();
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	if (decimals === 0) return (neg ? '-' : '') + grouped;
	const frac = (abs % factor).toString().padStart(decimals, '0');
	return (neg ? '-' : '') + `${grouped}.${frac}`;
}

/**
 * Sanitise a pasted/typed value that may use European grouping ("1.234,50") or
 * en-IE ("1,234.50") into an un-grouped numeric string. Heuristic: if both "."
 * and "," appear, the rightmost is the decimal separator and the other is
 * grouping; if only one appears, treat it as the decimal point when ≤ `decimals`
 * digits follow it, otherwise as grouping.
 */
export function parsePaste(raw: string, decimals: number): string {
	let s = raw.trim().replace(/[^\d.,-]/g, '');
	const neg = s.startsWith('-');
	s = s.replace(/-/g, '');
	const lastDot = s.lastIndexOf('.');
	const lastComma = s.lastIndexOf(',');
	let decimalSep = '';
	if (lastDot !== -1 && lastComma !== -1) {
		decimalSep = lastDot > lastComma ? '.' : ',';
	} else if (lastDot !== -1 || lastComma !== -1) {
		const sep = lastDot !== -1 ? '.' : ',';
		const after = s.length - 1 - s.lastIndexOf(sep);
		decimalSep = after <= decimals ? sep : '';
	}
	if (decimalSep) {
		const groupSep = decimalSep === '.' ? ',' : '.';
		s = s.split(groupSep).join('');
		s = s.replace(decimalSep, '.');
	} else {
		s = s.replace(/[.,]/g, '');
	}
	const clean = sanitizeLive(s, decimals);
	return neg ? '-' + clean : clean;
}
