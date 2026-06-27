// The transactions **spine** — the single source of truth every balance and
// most insights derive from. Generated deterministically from the PRNG over a
// 14-month window ending at TODAY. Balances are reduced from these rows, never
// invented.

import { Rng } from './prng';
import type { Currency } from './money';
import { TODAY, daysBeforeToday, isoDate } from './time';
import type { Category, Transaction, TxnType } from './types';

/** Months of history to generate. */
const WINDOW_MONTHS = 14;
const WINDOW_DAYS = WINDOW_MONTHS * 30;

interface MerchantSpec {
	category: Category;
	type: TxnType;
	/** Minor-unit amount range (in the wallet's own currency). */
	min: number;
	max: number;
	names: readonly string[];
}

// Discretionary spend catalog — European merchants, sentence-case, no "Lorem".
const SPEND: readonly MerchantSpec[] = [
	{ category: 'groceries', type: 'card', min: 700, max: 9000, names: ['Lidl', 'Aldi', 'Carrefour', 'Albert Heijn', 'Tesco Express', 'Edeka', 'Coop'] },
	{ category: 'dining', type: 'card', min: 600, max: 6500, names: ['Pret a Manger', 'Vapiano', 'Five Guys', 'Le Pain Quotidien', 'Dishoom', 'Café Nero', 'Sushi Daily'] },
	{ category: 'transport', type: 'card', min: 200, max: 4800, names: ['Uber', 'Bolt', 'Deutsche Bahn', 'SNCF', 'Transport for London', 'BVG', 'Shell'] },
	{ category: 'shopping', type: 'card', min: 1500, max: 26000, names: ['Zalando', 'IKEA', 'Amazon', 'MediaMarkt', 'Decathlon', 'Uniqlo', 'Apple Store'] },
	{ category: 'entertainment', type: 'card', min: 500, max: 6500, names: ['Steam', 'Cineworld', 'Ticketmaster', 'Pathé', 'Kindle Store'] },
	{ category: 'health', type: 'card', min: 1000, max: 9000, names: ['Apotheke', 'Boots', 'PureGym', 'Basic-Fit', 'Optiek'] },
	{ category: 'travel', type: 'card', min: 5000, max: 62000, names: ['Ryanair', 'Lufthansa', 'Booking.com', 'Airbnb', 'easyJet', 'Eurostar'] },
	{ category: 'cash', type: 'card', min: 2000, max: 20000, names: ['ATM withdrawal'] }
];

// Recurring monthly commitments on the EUR home wallet.
const SUBSCRIPTIONS: readonly { name: string; min: number; max: number }[] = [
	{ name: 'Spotify', min: 1099, max: 1099 },
	{ name: 'Netflix', min: 1399, max: 1399 },
	{ name: 'iCloud+', min: 299, max: 299 },
	{ name: 'YouTube Premium', min: 1199, max: 1199 },
	{ name: 'Adobe Creative Cloud', min: 2399, max: 2399 }
];

const UTILITIES: readonly { name: string; min: number; max: number }[] = [
	{ name: 'Vodafone', min: 2500, max: 4500 },
	{ name: 'E.ON Energy', min: 4000, max: 9500 },
	{ name: 'Vattenfall', min: 3000, max: 8000 }
];

function ref(rng: Rng): string {
	const n = rng.int(100000, 999999);
	return `REF-${n}`;
}

function amountIn(rng: Rng, min: number, max: number): number {
	// Bias toward the lower end so big-ticket items are rarer.
	const t = rng.float() ** 1.7;
	return Math.round(min + t * (max - min));
}

export interface WalletGenConfig {
	id: string;
	currency: Currency;
	/**
	 * The wallet's final settled balance (minor units). The opening balance is
	 * back-solved from this so the ledger lands exactly here — the opening is just
	 * the constant of integration; the spine still determines the history's shape.
	 */
	targetCurrentMinor: number;
	/** Whether salary/rent/subscriptions land here (the EUR home wallet). */
	primary: boolean;
	/** Roughly how many discretionary card rows to emit. */
	discretionary: number;
}

/**
 * Generate one wallet's rows over the window, sorted ascending by date, with a
 * running settled balance and a few recent rows flagged pending.
 */
export function generateWalletTxns(rng: Rng, cfg: WalletGenConfig): Transaction[] {
	const rows: Omit<Transaction, 'runningBalanceMinor'>[] = [];
	let n = 0;
	const mk = (
		daysAgo: number,
		merchant: string,
		category: Category,
		type: TxnType,
		amountMinor: number,
		notes?: string
	) => {
		const date = isoDate(daysBeforeToday(daysAgo));
		rows.push({
			id: `${cfg.id}-tx-${n++}`,
			walletId: cfg.id,
			date,
			merchant,
			category,
			type,
			status: 'settled',
			amountMinor,
			currency: cfg.currency,
			reference: ref(rng),
			notes
		});
	};

	if (cfg.primary) {
		// One salary, one rent, utilities + subscriptions, each month.
		const salaryBase = rng.int(300000, 380000);
		for (let m = 0; m < WINDOW_MONTHS; m++) {
			const monthStart = m * 30;
			mk(monthStart + rng.int(2, 5), 'Acme GmbH — salary', 'income', 'sepa', salaryBase + rng.int(-2000, 2000), 'Monthly salary');
			mk(monthStart + 28, 'Hausverwaltung — rent', 'housing', 'sepa', -rng.int(110000, 150000), 'Rent');
			const util = rng.pick(UTILITIES);
			mk(monthStart + rng.int(6, 12), util.name, 'utilities', 'sepa', -rng.int(util.min, util.max));
			for (const sub of SUBSCRIPTIONS) {
				if (rng.chance(0.85)) mk(monthStart + rng.int(8, 24), sub.name, 'subscriptions', 'card', -rng.int(sub.min, sub.max));
			}
		}
	}

	// Discretionary card spend scattered across the window.
	for (let i = 0; i < cfg.discretionary; i++) {
		const spec = rng.weighted(SPEND, [10, 9, 8, 6, 4, 3, 2, 3]);
		const daysAgo = rng.range(0, WINDOW_DAYS);
		mk(daysAgo, rng.pick(spec.names), spec.category, spec.type, -amountIn(rng, spec.min, spec.max));
	}

	// Occasional inbound transfers / top-ups to keep the wallet alive.
	const inflows = cfg.primary ? rng.int(6, 12) : rng.int(3, 8);
	for (let i = 0; i < inflows; i++) {
		const daysAgo = rng.range(0, WINDOW_DAYS);
		if (cfg.primary) {
			mk(daysAgo, rng.pick(['Refund — Zalando', 'Friends — split dinner', 'Marketplace sale']), 'transfers', 'transfer', amountIn(rng, 1500, 22000));
		} else {
			mk(daysAgo, 'Top up from Main', 'transfers', 'topup', amountIn(rng, 10000, 60000));
		}
	}

	// Sort ascending by date (stable on id for same-day determinism).
	rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

	const result: Transaction[] = rows.map((r) => ({ ...r, runningBalanceMinor: 0 }));

	// Flag the last 1–2 outflow rows as pending: they don't yet count in the
	// settled ledger. Guard pendingCount === 0 explicitly — `slice(-0)` is
	// `slice(0)`, which would (wrongly) return the whole array.
	const pendingCount = rng.int(1, 2);
	const outflowIdx = result.flatMap((r, i) => (r.amountMinor < 0 ? [i] : []));
	const pendingIdx = new Set(pendingCount === 0 ? [] : outflowIdx.slice(-pendingCount));
	for (const i of pendingIdx) result[i].status = 'pending';

	// Back-solve the opening balance so the final settled balance lands exactly on
	// the wallet's target, then walk the settled rows to assign running balances.
	const sumSettled = result.reduce((s, r) => (r.status === 'settled' ? s + r.amountMinor : s), 0);
	let balance = cfg.targetCurrentMinor - sumSettled;
	for (const r of result) {
		if (r.status === 'settled') {
			balance += r.amountMinor;
			r.runningBalanceMinor = balance;
		} else {
			// Pending rows show against the current settled balance — not yet posted.
			r.runningBalanceMinor = cfg.targetCurrentMinor;
		}
	}

	return result;
}

/** TODAY re-exported for callers that derive "this month" windows. */
export { TODAY };
