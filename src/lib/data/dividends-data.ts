// Dividends (V06) — an upcoming calendar + paid history, derived deterministically
// from the dividend-paying instruments I hold (accumulating ETFs pay nothing out, so
// they don't appear). Each payment carries yield-on-cost against my average cost.
// Mock; quarterly cadence with per-instrument date offsets.

import { HOLDINGS } from './market';
import { instrumentOf } from './portfolio';
import { toEur, type Currency } from './money';
import { TODAY, isoDate } from './time';

export interface Dividend {
	id: string;
	symbol: string;
	name: string;
	currency: Currency;
	exDateIso: string;
	payDateIso: string;
	/** Per-share amount for this (quarterly) payment, in the instrument currency. */
	perShareMinor: number;
	/** Shares held at pay time (drives the cash amount + held flag). */
	quantity: number;
	status: 'upcoming' | 'paid';
}

export interface DividendView extends Dividend {
	/** Cash for this payment = perShare × quantity, instrument currency. */
	amountMinor: number;
	amountEurMinor: number;
	/** Annual yield on my average cost, bps — "—" in the UI when not held. */
	yieldOnCostBps: number | null;
	held: boolean;
}

function daysFromToday(n: number): string {
	const d = new Date(TODAY);
	d.setDate(d.getDate() + n);
	return isoDate(d);
}

interface Payer {
	symbol: string;
	name: string;
	currency: Currency;
	quantity: number;
	avgCostMinor: number;
	annualPerShareMinor: number;
	quarterlyPerShareMinor: number;
}

function payers(): Payer[] {
	const out: Payer[] = [];
	HOLDINGS.forEach((h) => {
		const i = instrumentOf(h.symbol);
		if (!i || i.dividendYieldBps <= 0) return; // accumulating / non-payer
		const annual = Math.round((i.lastPriceMinor * i.dividendYieldBps) / 10000);
		if (annual <= 0) return;
		out.push({
			symbol: i.symbol,
			name: i.name,
			currency: i.currency,
			quantity: h.quantity,
			avgCostMinor: h.avgCostMinor,
			annualPerShareMinor: annual,
			quarterlyPerShareMinor: Math.max(1, Math.round(annual / 4))
		});
	});
	return out;
}

function view(d: Dividend, p: Payer): DividendView {
	const amountMinor = Math.round(d.perShareMinor * d.quantity);
	const held = d.quantity > 0;
	return {
		...d,
		amountMinor,
		amountEurMinor: toEur(amountMinor, d.currency),
		yieldOnCostBps: held
			? Math.round((p.annualPerShareMinor / p.avgCostMinor) * 10000)
			: null,
		held
	};
}

/** Upcoming dividends — the next scheduled payment for each held payer, by ex-date. */
export function getUpcomingDividends(): DividendView[] {
	return payers()
		.map((p, idx) => {
			const payDate = daysFromToday(18 + idx * 13);
			const exDate = daysFromToday(18 + idx * 13 - 14);
			const d: Dividend = {
				id: `div-up-${p.symbol}`,
				symbol: p.symbol,
				name: p.name,
				currency: p.currency,
				exDateIso: exDate,
				payDateIso: payDate,
				perShareMinor: p.quarterlyPerShareMinor,
				quantity: p.quantity,
				status: 'upcoming'
			};
			return view(d, p);
		})
		.sort((a, b) => (a.exDateIso < b.exDateIso ? -1 : 1));
}

/** Paid history — the last three quarterly payments for each payer, most recent first. */
export function getDividendHistory(): DividendView[] {
	const rows: DividendView[] = [];
	payers().forEach((p, idx) => {
		for (let q = 1; q <= 3; q++) {
			const payDate = daysFromToday(-(70 * q + idx * 9));
			const exDate = daysFromToday(-(70 * q + idx * 9 + 14));
			const d: Dividend = {
				id: `div-paid-${p.symbol}-${q}`,
				symbol: p.symbol,
				name: p.name,
				currency: p.currency,
				exDateIso: exDate,
				payDateIso: payDate,
				perShareMinor: p.quarterlyPerShareMinor,
				quantity: p.quantity,
				status: 'paid'
			};
			rows.push(view(d, p));
		}
	});
	return rows.sort((a, b) => (a.payDateIso > b.payDateIso ? -1 : 1));
}

/** Total dividend cash received (history), in EUR minor units. */
export function getDividendsReceivedEurMinor(): number {
	return getDividendHistory().reduce((s, d) => s + d.amountEurMinor, 0);
}
