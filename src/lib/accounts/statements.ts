// Statements (A06) — pure. Periodic (monthly) statements are bucketed from a wallet's
// transaction history; an on-demand statement covers any date range. Opening/closing
// balances are read off the running-balance the F03 spine already carries, so a
// statement reconciles with the ledger. Deterministic; dates ISO YYYY-MM-DD.

import { getTransactions } from '$lib/data';
import type { Transaction } from '$lib/data';
import { TODAY, isoDate } from '$lib/data/time';

export interface Statement {
	id: string;
	walletId: string;
	periodStart: string;
	periodEnd: string;
	openingBalanceMinor: number;
	closingBalanceMinor: number;
	txnCount: number;
	/** ISO date the statement was generated. */
	generatedAt: string;
	/** True for an on-demand (custom-range) statement vs a periodic monthly one. */
	custom: boolean;
}

/** The wallet's transactions within [start, end], oldest-first (statement order). */
export function statementTransactions(walletId: string, start: string, end: string): Transaction[] {
	return getTransactions(walletId)
		.filter((t) => t.date >= start && t.date <= end)
		.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

function ascending(walletId: string): Transaction[] {
	return [...getTransactions(walletId)].sort((a, b) =>
		a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1
	);
}

function build(id: string, walletId: string, start: string, end: string, custom: boolean): Statement {
	const asc = ascending(walletId);
	const inPeriod = asc.filter((t) => t.date >= start && t.date <= end);
	const before = asc.filter((t) => t.date < start);
	const opening = before.length
		? before[before.length - 1].runningBalanceMinor
		: inPeriod.length
			? inPeriod[0].runningBalanceMinor - inPeriod[0].amountMinor
			: 0;
	const closing = inPeriod.length ? inPeriod[inPeriod.length - 1].runningBalanceMinor : opening;
	return {
		id,
		walletId,
		periodStart: start,
		periodEnd: end,
		openingBalanceMinor: opening,
		closingBalanceMinor: closing,
		txnCount: inPeriod.length,
		generatedAt: isoDate(TODAY),
		custom
	};
}

function lastDayOfMonth(year: number, month1to12: number): number {
	return new Date(year, month1to12, 0).getDate();
}

/** Periodic monthly statements for a wallet — one per month that has activity,
 *  most recent first. */
export function monthlyStatements(walletId: string): Statement[] {
	const months = new Set<string>();
	for (const t of getTransactions(walletId)) months.add(t.date.slice(0, 7)); // YYYY-MM
	return [...months]
		.sort((a, b) => (a < b ? 1 : -1)) // newest first
		.map((ym) => {
			const [y, m] = ym.split('-').map(Number);
			const start = `${ym}-01`;
			const end = `${ym}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`;
			return build(`stmt-${walletId}-${ym}`, walletId, start, end, false);
		});
}

/** A custom-range statement assembled on demand. */
export function generateStatement(walletId: string, start: string, end: string): Statement {
	return build(`stmt-${walletId}-${start}_${end}`, walletId, start, end, true);
}

/** A plain "1–31 May 2026"-style label for a period. */
export function periodLabel(start: string, end: string): string {
	return `${start} → ${end}`;
}
