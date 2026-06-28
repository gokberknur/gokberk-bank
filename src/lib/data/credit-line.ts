// The revolving credit line being managed (L05 Flow B). One open facility, seeded
// with a current balance, this month's statement, and a due date a couple of weeks
// out. Mutable in memory — a repayment reduces the balance and frees available credit;
// re-seeds every boot. The apply flow (Flow A) is its own journey and doesn't create
// this facility (mirrors the mortgage: servicing is pre-seeded).

import { REPRESENTATIVE_APR_BPS } from '$lib/lending/credit';
import { TODAY, isoDate } from './time';

export interface CreditTxn {
	id: string;
	dateIso: string;
	merchant: string;
	amountMinor: number;
}

export interface CreditFacility {
	id: string;
	name: string;
	limitMinor: number;
	/** Current outstanding balance. */
	balanceMinor: number;
	/** This statement's balance (what avoids interest if cleared by the due date). */
	statementBalanceMinor: number;
	aprBps: number;
	statementDateIso: string;
	dueDateIso: string;
	openedIso: string;
	transactions: CreditTxn[];
}

function daysFromToday(n: number): string {
	const d = new Date(TODAY);
	d.setDate(d.getDate() + n);
	return isoDate(d);
}

const TRANSACTIONS: CreditTxn[] = [
	{ id: 'cl-1', dateIso: daysFromToday(-3), merchant: 'SAS — flight', amountMinor: 42000 },
	{ id: 'cl-2', dateIso: daysFromToday(-7), merchant: 'Zalando', amountMinor: 8950 },
	{ id: 'cl-3', dateIso: daysFromToday(-11), merchant: 'Scandic Hotels', amountMinor: 38000 },
	{ id: 'cl-4', dateIso: daysFromToday(-16), merchant: 'Apple', amountMinor: 1999 },
	{ id: 'cl-5', dateIso: daysFromToday(-19), merchant: 'Circle K — fuel', amountMinor: 6700 },
	{ id: 'cl-6', dateIso: daysFromToday(-23), merchant: 'Hello Fresh', amountMinor: 4351 }
];

let facility: CreditFacility = {
	id: 'credit-line-flex',
	name: 'Flex credit line',
	limitMinor: 500000, // €5,000
	balanceMinor: 124000, // €1,240
	statementBalanceMinor: 124000,
	aprBps: REPRESENTATIVE_APR_BPS,
	statementDateIso: daysFromToday(-2),
	dueDateIso: daysFromToday(18),
	openedIso: '2024-09-12',
	transactions: TRANSACTIONS
};

export function getCreditFacility(): CreditFacility {
	return facility;
}

export function getCreditFacilityById(id: string): CreditFacility | undefined {
	return id === facility.id ? facility : undefined;
}

/** Apply a repayment — reduces the outstanding balance and the statement balance,
 *  freeing available credit. */
export function repayCredit(amountMinor: number): CreditFacility {
	const pay = Math.min(amountMinor, facility.balanceMinor);
	facility = {
		...facility,
		balanceMinor: Math.max(0, facility.balanceMinor - pay),
		statementBalanceMinor: Math.max(0, facility.statementBalanceMinor - pay)
	};
	return facility;
}
