// Pure format helpers for the money-input adapter (F07). The canonical value is
// always **integer minor units**; these helpers format that into the human string
// shown at rest. Locale is en-IE (decimal ".", group ","). No float math reaches a
// stored amount — minor units are computed by integer scaling. Live parsing,
// caret-stable typing and paste sanitisation now live inside the DS `gok-money`.

import { DECIMALS, type Currency } from '$lib/data/money';

/** Decimal digits for a currency (2 for EUR/USD/GBP/SEK in this app). */
export function currencyDecimals(currency: Currency): number {
	return DECIMALS[currency];
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
