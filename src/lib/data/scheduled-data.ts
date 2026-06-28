// Scheduled payments & standing orders (P05) — self-contained mock domain (its own
// array + getters + mutators, like requests/disputes). Each item stores its rule
// (frequency + start + end); the *next run* is computed from schedule.ts at read
// time, never stored stale. Dates are anchored near the fixed TODAY (2026-06-20).

import type { Currency } from './money';
import { isoDate, daysBeforeToday } from './time';
import type { EndRule, Frequency } from '$lib/payments/schedule';

export type ScheduledStatus = 'scheduled' | 'paused' | 'cancelled';

export interface ScheduledItem {
	id: string;
	payeeId: string | null;
	payeeName: string;
	walletId: string;
	amountMinor: number;
	currency: Currency;
	reference: string;
	frequency: Frequency;
	startIso: string;
	end: EndRule;
	status: ScheduledStatus;
	createdIso: string;
	/** Runs already executed (for "after N" progress / history). */
	runsDone: number;
}

const created = isoDate(daysBeforeToday(40));

const items: ScheduledItem[] = [
	{
		id: 'sch-rent',
		payeeId: null,
		payeeName: 'Hausverwaltung Berlin',
		walletId: 'eur-main',
		amountMinor: 120_000,
		currency: 'EUR',
		reference: 'Rent — Hornsgatan 42',
		frequency: 'monthly',
		startIso: '2026-07-01',
		end: { kind: 'until-cancelled' },
		status: 'scheduled',
		createdIso: created,
		runsDone: 0
	},
	{
		id: 'sch-savings',
		payeeId: null,
		payeeName: 'Savings sweep',
		walletId: 'eur-main',
		amountMinor: 5_000,
		currency: 'EUR',
		reference: 'Weekly set-aside',
		frequency: 'weekly',
		startIso: '2026-06-22',
		end: { kind: 'until-cancelled' },
		status: 'scheduled',
		createdIso: created,
		runsDone: 3
	},
	{
		id: 'sch-laptop',
		payeeId: null,
		payeeName: 'Amélie Laurent',
		walletId: 'eur-main',
		amountMinor: 34_000,
		currency: 'EUR',
		reference: 'Desk + chair',
		frequency: 'once',
		startIso: '2026-06-26',
		end: { kind: 'until-cancelled' },
		status: 'scheduled',
		createdIso: isoDate(daysBeforeToday(3)),
		runsDone: 0
	},
	{
		id: 'sch-gym',
		payeeId: null,
		payeeName: 'Stockholm Climbing',
		walletId: 'eur-main',
		amountMinor: 8_900,
		currency: 'EUR',
		reference: 'Membership',
		frequency: 'monthly',
		startIso: '2026-06-15',
		end: { kind: 'until-cancelled' },
		status: 'paused',
		createdIso: isoDate(daysBeforeToday(90)),
		runsDone: 3
	}
];

export function getScheduled(): ScheduledItem[] {
	return items;
}

export function getScheduledItem(id: string): ScheduledItem | undefined {
	return items.find((i) => i.id === id);
}

export interface ScheduledDraft {
	payeeId: string | null;
	payeeName: string;
	walletId: string;
	amountMinor: number;
	currency: Currency;
	reference: string;
	frequency: Frequency;
	startIso: string;
	end: EndRule;
}

export function createScheduled(draft: ScheduledDraft): ScheduledItem {
	const item: ScheduledItem = {
		id: `sch-custom-${items.length}`,
		...draft,
		status: 'scheduled',
		createdIso: isoDate(daysBeforeToday(0)),
		runsDone: 0
	};
	items.unshift(item);
	return item;
}

function patch(id: string, p: Partial<ScheduledItem>): void {
	const i = items.findIndex((x) => x.id === id);
	if (i !== -1) items[i] = { ...items[i], ...p };
}

export function pauseScheduled(id: string): void {
	patch(id, { status: 'paused' });
}

export function resumeScheduled(id: string): void {
	patch(id, { status: 'scheduled' });
}

export function cancelScheduled(id: string): void {
	patch(id, { status: 'cancelled' });
}
