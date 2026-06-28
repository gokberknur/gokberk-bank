// Command palette registry (X03) — builds the searchable index from the mock data
// (wallets, payees, transactions, instruments, settings pages) and a static action
// registry, then ranks a query across them. Navigation items route; action items also
// route to the surface that owns the action, so sensitive intents keep their own
// step-up (the palette never bypasses it). Pure + deterministic.

import { getWallets } from '$lib/data';
import { PAYEES } from '$lib/data/payees';
import { CARDS } from '$lib/data/cards';
import type { Card } from '$lib/data/types';
import { INSTRUMENTS } from '$lib/data/market';
import { getTransactions } from '$lib/data';
import { formatMoney, formatDate } from '$lib/format';

export type SearchGroup =
	| 'Actions'
	| 'Accounts'
	| 'Payees'
	| 'Transactions'
	| 'Instruments'
	| 'Settings';

export interface SearchItem {
	id: string;
	group: SearchGroup;
	label: string;
	sublabel?: string;
	/** Navigation target (every item resolves to a route; the surface owns any action). */
	href: string;
	/** Extra match text not shown in the label. */
	keywords?: string;
	/** A sensitive action — the destination surface still enforces its own step-up. */
	sensitive?: boolean;
}

const GROUP_ORDER: SearchGroup[] = [
	'Actions',
	'Accounts',
	'Payees',
	'Instruments',
	'Transactions',
	'Settings'
];

// ---- Static action + settings registries --------------------------------
const ACTIONS: SearchItem[] = [
	{ id: 'act-send', group: 'Actions', label: 'Send money', href: '/payments/send', keywords: 'transfer pay', sensitive: true },
	{ id: 'act-exchange', group: 'Actions', label: 'Exchange currency', href: '/payments/exchange', keywords: 'fx convert' },
	{ id: 'act-topup', group: 'Actions', label: 'Top up', href: '/payments/topup', keywords: 'add money fund' },
	{ id: 'act-request', group: 'Actions', label: 'Request money', href: '/payments/request', keywords: 'qr link' },
	{ id: 'act-split', group: 'Actions', label: 'Split a bill', href: '/payments/split', keywords: 'share' },
	{ id: 'act-scheduled', group: 'Actions', label: 'Scheduled payments', href: '/payments/scheduled', keywords: 'standing order recurring' },
	{ id: 'act-dd', group: 'Actions', label: 'Direct debits', href: '/payments/direct-debits', keywords: 'mandate' },
	{ id: 'act-openwallet', group: 'Actions', label: 'Open a wallet', href: '/accounts/open', keywords: 'new currency account' },
	{ id: 'act-pots', group: 'Actions', label: 'Savings pots', href: '/accounts/pots', keywords: 'vault save goal' },
	{ id: 'act-order', group: 'Actions', label: 'Place an order', href: '/invest', keywords: 'buy sell trade invest' },
	{ id: 'act-funds', group: 'Actions', label: 'Browse funds & ETFs', href: '/invest/funds', keywords: 'etf research' },
	{ id: 'act-mortgage', group: 'Actions', label: 'Apply for a mortgage', href: '/lending/mortgages/apply', keywords: 'loan borrow home' },
	{ id: 'act-credit', group: 'Actions', label: 'Apply for a credit line', href: '/lending/credit-line/apply', keywords: 'borrow revolving' }
];

const NAV: SearchItem[] = [
	{ id: 'nav-home', group: 'Actions', label: 'Go to Home', href: '/home', keywords: 'dashboard overview' },
	{ id: 'nav-accounts', group: 'Actions', label: 'Go to Accounts', href: '/accounts', keywords: 'wallets' },
	{ id: 'nav-payments', group: 'Actions', label: 'Go to Payments', href: '/payments' },
	{ id: 'nav-cards', group: 'Actions', label: 'Go to Cards', href: '/cards' },
	{ id: 'nav-invest', group: 'Actions', label: 'Go to Investments', href: '/invest' },
	{ id: 'nav-crypto', group: 'Actions', label: 'Go to Crypto', href: '/crypto' },
	{ id: 'nav-lending', group: 'Actions', label: 'Go to Lending', href: '/lending' },
	{ id: 'nav-insurance', group: 'Actions', label: 'Go to Insurance', href: '/insurance' },
	{ id: 'nav-budgets', group: 'Actions', label: 'Go to Budgets', href: '/budgets' },
	{ id: 'nav-rewards', group: 'Actions', label: 'Go to Rewards', href: '/rewards' },
	{ id: 'nav-activity', group: 'Actions', label: 'Go to Activity', href: '/activity' },
	{ id: 'nav-documents', group: 'Actions', label: 'Go to Documents', href: '/documents' },
	{ id: 'nav-support', group: 'Actions', label: 'Go to Support', href: '/support' }
];

const SETTINGS: SearchItem[] = [
	{ id: 'set-profile', group: 'Settings', label: 'Profile', href: '/profile', keywords: 'account me kyc' },
	{ id: 'set-limits', group: 'Settings', label: 'Limits', href: '/profile/limits', keywords: 'spending' },
	{ id: 'set-tier', group: 'Settings', label: 'Plan & tier', href: '/profile/tier', keywords: 'standard plus metal upgrade' },
	{ id: 'set-prefs', group: 'Settings', label: 'Preferences', href: '/settings/preferences', keywords: 'language currency' },
	{ id: 'set-appearance', group: 'Settings', label: 'Appearance', href: '/settings/appearance', keywords: 'theme dark light' },
	{ id: 'set-notifs', group: 'Settings', label: 'Notifications', href: '/settings/notifications' },
	{ id: 'set-security', group: 'Settings', label: 'Security', href: '/security', keywords: 'passkey 2fa devices sessions' }
];

// ---- Dynamic index builders ---------------------------------------------
function walletItems(): SearchItem[] {
	return getWallets().map((w) => ({
		id: `wallet-${w.id}`,
		group: 'Accounts' as const,
		label: `${w.name} · ${w.currency}`,
		sublabel: w.iban,
		href: `/accounts/${w.id}`,
		keywords: `wallet ${w.currency}`
	}));
}

function payeeItems(): SearchItem[] {
	return PAYEES.map((p) => ({
		id: `payee-${p.id}`,
		group: 'Payees' as const,
		label: p.name,
		sublabel: p.handle ?? p.iban ?? p.type.toUpperCase(),
		href: '/payments/payees',
		keywords: `pay send ${p.type} ${p.handle ?? ''}`
	}));
}

function cardActionItems(): SearchItem[] {
	return CARDS.map((c: Card) => ({
		id: `card-freeze-${c.id}`,
		group: 'Actions' as const,
		label: `${c.controls.frozen ? 'Unfreeze' : 'Freeze'} card ·${c.last4}`,
		href: '/cards',
		keywords: `card lock ${c.last4}`,
		sensitive: true
	}));
}

function instrumentItems(): SearchItem[] {
	return INSTRUMENTS.map((i) => ({
		id: `inst-${i.symbol}`,
		group: 'Instruments' as const,
		label: `${i.symbol} · ${i.name}`,
		sublabel: i.exchange,
		href: `/invest/instrument/${i.symbol}`,
		keywords: `buy sell ${i.type}`
	}));
}

function transactionItems(): SearchItem[] {
	return getTransactions()
		.slice(0, 40)
		.map((t) => ({
			id: `txn-${t.id}`,
			group: 'Transactions' as const,
			label: t.merchant,
			sublabel: `${formatDate(t.date)} · ${formatMoney(t.amountMinor, t.currency, { signDisplay: true })}`,
			href: `/accounts/${t.walletId}`,
			keywords: 'transaction payment'
		}));
}

/** The full searchable index, rebuilt per query (cheap; all sources are local). */
export function buildIndex(): SearchItem[] {
	return [
		...ACTIONS,
		...cardActionItems(),
		...NAV,
		...walletItems(),
		...payeeItems(),
		...instrumentItems(),
		...transactionItems(),
		...SETTINGS
	];
}

// ---- Ranking -------------------------------------------------------------
function scoreItem(item: SearchItem, q: string): number {
	const label = item.label.toLowerCase();
	const hay = `${label} ${item.sublabel ?? ''} ${item.keywords ?? ''}`.toLowerCase();
	if (label.startsWith(q)) return 1000 - label.length;
	if (label.includes(` ${q}`)) return 800; // word-boundary in label
	if (label.includes(q)) return 700;
	if (hay.includes(q)) return 400;
	// subsequence fuzzy across the haystack
	let i = 0;
	for (const ch of hay) {
		if (ch === q[i]) i++;
		if (i === q.length) return 250;
	}
	return 0;
}

export interface SearchGroupResult {
	group: SearchGroup;
	items: SearchItem[];
}

/** Ranked, grouped results for a query (empty query → no results; the state shows
 *  recent + suggested instead). Caps each group so the list stays scannable. */
export function search(query: string, perGroup = 6): SearchGroupResult[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const scored = buildIndex()
		.map((item) => ({ item, score: scoreItem(item, q) }))
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

	const byGroup = new Map<SearchGroup, SearchItem[]>();
	for (const { item } of scored) {
		const list = byGroup.get(item.group) ?? [];
		if (list.length < perGroup) list.push(item);
		byGroup.set(item.group, list);
	}
	return GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => ({
		group,
		items: byGroup.get(group)!
	}));
}

/** Default suggestions for the empty-query state. */
export function suggestedItems(): SearchItem[] {
	const ids = ['act-send', 'act-exchange', 'act-topup', 'act-order'];
	return ACTIONS.filter((a) => ids.includes(a.id));
}

/** Resolve a list of item ids back to items (for the recent list). */
export function itemsByIds(ids: string[]): SearchItem[] {
	const index = new Map(buildIndex().map((i) => [i.id, i]));
	return ids.map((id) => index.get(id)).filter((i): i is SearchItem => !!i);
}
