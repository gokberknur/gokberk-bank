// The single place minor-unit money and raw values become human strings. Locale
// is en-IE: English copy, EUR-native grouping, European date order. Everything
// is `Intl`-based and tabular-friendly; no symbol is ever hardcoded in the data
// layer — formatting is a UI concern that lives here.

import { DECIMALS, type Currency } from './data/money';

const LOCALE = 'en-IE';

const moneyCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: Currency, opts?: { signDisplay?: boolean }): Intl.NumberFormat {
	const key = `${currency}:${opts?.signDisplay ? 'sign' : 'auto'}`;
	let fmt = moneyCache.get(key);
	if (!fmt) {
		const decimals = DECIMALS[currency];
		fmt = new Intl.NumberFormat(LOCALE, {
			style: 'currency',
			currency,
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
			signDisplay: opts?.signDisplay ? 'exceptZero' : 'auto'
		});
		moneyCache.set(key, fmt);
	}
	return fmt;
}

/**
 * Format integer **minor units** as a currency string, e.g. (482050, 'EUR') →
 * "€4,820.50". Pass `signDisplay` to force a leading +/− (for deltas).
 */
export function formatMoney(minor: number, currency: Currency, opts?: { signDisplay?: boolean }): string {
	const major = minor / 10 ** DECIMALS[currency];
	return moneyFormatter(currency, opts).format(major);
}

/** The currency symbol alone, e.g. 'EUR' → "€". */
export function currencySymbol(currency: Currency): string {
	const parts = moneyFormatter(currency).formatToParts(0);
	return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

const numberFmt = new Intl.NumberFormat(LOCALE);

export function formatNumber(value: number): string {
	return numberFmt.format(value);
}

const percentFmt = new Intl.NumberFormat(LOCALE, {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 2,
	signDisplay: 'exceptZero'
});

/** Format a ratio as a signed percent, e.g. 0.0234 → "+2.34%". */
export function formatPercent(ratio: number): string {
	return percentFmt.format(ratio);
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dayMonthFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });

function toDate(value: string | Date): Date {
	return typeof value === 'string' ? new Date(value) : value;
}

/** "20 Jun 2026". */
export function formatDate(value: string | Date): string {
	return dateFmt.format(toDate(value));
}

/** "20 Jun" — for dense ledgers where the year is implied. */
export function formatDayMonth(value: string | Date): string {
	return dayMonthFmt.format(toDate(value));
}

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/**
 * Relative-time string against a reference date (default: the mock TODAY passed
 * in by callers). Kept simple: today / yesterday / N days ago, then the date.
 */
export function formatRelative(value: string | Date, now: Date): string {
	const then = toDate(value);
	const days = Math.round((then.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
	if (days >= -1 && days <= 0) return rtf.format(days, 'day'); // today / yesterday
	if (days > -7 && days < 0) return rtf.format(days, 'day');
	return formatDate(then);
}
