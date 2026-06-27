// Unified activity feed (X02) — one event stream aggregating everything the bank
// generates: money in/out + card spend (from the F03 transactions spine), security
// events (from the O03 log), and seeded application-status, market-alert and system
// events. Each event carries a `sourceRef` so the feed can deep-link to its origin.
// Deterministic; money in integer minor units; read-state lives here with mutators.

import { TODAY, daysBeforeToday } from './time';
import { getTransactions } from './index';
import type { Transaction } from './types';
import { getSecurityLog, EVENT_TYPE_LABELS } from './security-data';
import type { Currency } from './money';

export type ActivityType = 'money' | 'cards' | 'security' | 'applications' | 'market' | 'system';
export type ActivityStatus = 'ok' | 'pending' | 'blocked' | 'info';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
	money: 'Money',
	cards: 'Cards',
	security: 'Security',
	applications: 'Applications',
	market: 'Market',
	system: 'System'
};

export interface SourceRef {
	label: string;
	route: string;
}

export interface ActivityEvent {
	id: string;
	type: ActivityType;
	status: ActivityStatus;
	title: string;
	body: string;
	/** Signed minor units when the event moves money (negative = out). */
	amountMinor?: number;
	currency?: Currency;
	/** ISO timestamp. */
	timestamp: string;
	read: boolean;
	source?: SourceRef;
}

function txnTimestamp(t: Transaction): string {
	// Transactions carry date-only; synthesize a stable within-day time from the id
	// so same-day events keep a deterministic order (no Date.now / Math.random).
	let h = 0;
	for (let i = 0; i < t.id.length; i++) h = (h * 31 + t.id.charCodeAt(i)) >>> 0;
	const hour = 8 + (h % 12); // 08–19
	const min = h % 60;
	return `${t.date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

function titleFor(t: Transaction): string {
	const out = t.amountMinor < 0;
	switch (t.type) {
		case 'card':
			return `Card payment to ${t.merchant}`;
		case 'sepa':
		case 'swift':
		case 'transfer':
			return out ? `Sent to ${t.merchant}` : `Received from ${t.merchant}`;
		case 'topup':
			return `Top-up from ${t.merchant}`;
		case 'fx':
			return `Currency exchange`;
		case 'fee':
			return `${t.merchant} fee`;
		default:
			return t.merchant;
	}
}

function buildMoneyEvents(): ActivityEvent[] {
	// The most recent slice of the ledger — a feed, not the whole 1,200-row history.
	const recent = [...getTransactions()]
		.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
		.slice(0, 28);
	return recent.map((t) => ({
		id: `act-txn-${t.id}`,
		type: t.type === 'card' ? ('cards' as const) : ('money' as const),
		status: t.status === 'pending' ? ('pending' as const) : ('ok' as const),
		title: titleFor(t),
		body:
			t.status === 'pending'
				? 'Pending — this will settle shortly.'
				: t.amountMinor < 0
					? `Paid from my ${t.currency} wallet.`
					: `Into my ${t.currency} wallet.`,
		amountMinor: t.amountMinor,
		currency: t.currency,
		timestamp: txnTimestamp(t),
		read: true,
		source: { label: 'View transaction', route: `/accounts/${t.walletId}` }
	}));
}

function buildSecurityEvents(): ActivityEvent[] {
	return getSecurityLog()
		.slice(0, 6)
		.map((e) => ({
			id: `act-sec-${e.id}`,
			type: 'security' as const,
			status: e.result === 'blocked' ? ('blocked' as const) : e.result === 'info' ? ('info' as const) : ('ok' as const),
			title: EVENT_TYPE_LABELS[e.type],
			body: e.detail,
			timestamp: e.at,
			read: true,
			source: { label: 'Open security activity', route: '/security/activity' }
		}));
}

// ─── Seeded application / market / system events ──────────────────────────────
function iso(daysAgo: number, hour = 10): string {
	const d = daysBeforeToday(daysAgo);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

const SEEDED: ActivityEvent[] = [
	{ id: 'act-app-loan', type: 'applications', status: 'ok', title: 'My loan was approved', body: 'My €8,000 personal loan is active — the funds are in my EUR wallet.', timestamp: iso(0, 9), read: false, source: { label: 'View my loan', route: '/lending' } },
	{ id: 'act-app-policy', type: 'applications', status: 'ok', title: 'My travel cover is live', body: 'My annual multi-trip policy is active and ready to use.', timestamp: iso(1, 14), read: false, source: { label: 'View my policy', route: '/insurance' } },
	{ id: 'act-mkt-asml', type: 'market', status: 'info', title: 'ASML is up 3.2% today', body: 'A holding in my portfolio moved more than 3% — worth a look.', timestamp: iso(0, 11), read: false, source: { label: 'View ASML', route: '/invest/instrument/ASML' } },
	{ id: 'act-mkt-btc', type: 'market', status: 'info', title: 'Bitcoin dropped 4.1% overnight', body: 'A watched instrument moved sharply while markets were closed.', timestamp: iso(2, 7), read: true, source: { label: 'View Bitcoin', route: '/invest/instrument/BTC' } },
	{ id: 'act-sys-insights', type: 'system', status: 'info', title: 'New: spending insights', body: 'My Budgets now break spending down by category and flag subscriptions.', timestamp: iso(3, 12), read: true, source: { label: 'Open Budgets', route: '/budgets' } },
	{ id: 'act-sys-statement', type: 'system', status: 'info', title: 'My June statement is ready', body: 'My account statement for June is in my Documents vault.', timestamp: iso(1, 6), read: true, source: { label: 'Open Documents', route: '/documents' } }
];

// ─── Assembled stream + read state ────────────────────────────────────────────
function assemble(): ActivityEvent[] {
	const all = [...buildMoneyEvents(), ...buildSecurityEvents(), ...SEEDED];
	// Newest first.
	all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
	// The six newest read as unread (to show the unread state); everything older
	// keeps the flag it was built with.
	return all.map((e, i) => ({ ...e, read: i < 6 ? false : e.read }));
}

let events: ActivityEvent[] = assemble();

export function getActivity(): ActivityEvent[] {
	return events;
}

export function getActivityEvent(id: string): ActivityEvent | undefined {
	return events.find((e) => e.id === id);
}

export function unreadCount(): number {
	return events.reduce((n, e) => n + (e.read ? 0 : 1), 0);
}

/** Mark one event read (immutable replacement so rune reads re-flow). */
export function markRead(id: string): void {
	events = events.map((e) => (e.id === id ? { ...e, read: true } : e));
}

export function markAllRead(): void {
	events = events.map((e) => (e.read ? e : { ...e, read: true }));
}

export { TODAY };
