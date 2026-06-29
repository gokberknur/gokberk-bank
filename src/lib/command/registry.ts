// Command catalog + ranking for the app-wide command menu (X03, now on the DS
// `gok-command-menu`). Builds a flat catalog of `Command`s — navigation to every
// section (incl. deep routes), the primary actions, true app actions (theme,
// density, lock, sign out), and dynamic entities (wallets, payees, cards,
// instruments, recent transactions) — then ranks a query across them.
//
// Every command carries an `action`: navigation commands `goto(href)`; sensitive
// intents deep-link to the surface that OWNS the action, which keeps its own
// step-up (the menu never bypasses it). Pure + deterministic. The menu element runs
// in `external-filtering` mode, so this module owns search/ranking; the element owns
// the overlay, keyboard, and a11y.

import { goto } from '$app/navigation';
import { getWallets, getTransactions } from '$lib/data';
import { PAYEES } from '$lib/data/payees';
import { CARDS } from '$lib/data/cards';
import type { Card } from '$lib/data/types';
import { INSTRUMENTS } from '$lib/data/market';
import { formatMoney, formatDate } from '$lib/format';
import { density } from '$lib/state/density.svelte';
import { auth } from '$lib/state/auth.svelte';
import { toggleTheme } from '$lib/theme';

/** A command-menu entry. Mirrors the DS `GokCommand` shape we hand to the element
 *  (title/keywords/section/icon), plus a required `action` (the element runs it on
 *  select). `icon` must be a curated gok `IconName` or omitted. */
export interface Command {
	id: string;
	title: string;
	section: string;
	icon?: string;
	/** Extra searchable terms (synonyms, ids, the old sublabel detail) — matched, not shown. */
	keywords?: string[];
	action: () => void;
}

// Section eyebrows, in canonical order (tie-break when two sections share a best score).
const SECTION_ORDER = [
	'Payments',
	'Accounts',
	'Cards',
	'Invest',
	'Borrow',
	'Insurance',
	'Manage',
	'Settings',
	'Security',
	'Account',
	'Payees',
	'Markets',
	'Transactions'
];

/** Build a navigation command (the common case — selecting it routes). */
function nav(
	id: string,
	title: string,
	section: string,
	href: string,
	opts: { icon?: string; keywords?: string[] } = {}
): Command {
	return { id, title, section, icon: opts.icon, keywords: opts.keywords, action: () => goto(href) };
}

// ---- Static catalog ------------------------------------------------------
const STATIC: Command[] = [
	// Home
	nav('nav-home', 'Home', 'Accounts', '/home', { icon: 'window', keywords: ['dashboard', 'overview'] }),

	// Payments — primary actions + nav
	nav('act-send', 'Send money', 'Payments', '/payments/transfer', { icon: 'swap', keywords: ['transfer', 'pay'] }),
	nav('act-exchange', 'Exchange currency', 'Payments', '/payments/exchange', { icon: 'swap', keywords: ['fx', 'convert'] }),
	nav('act-topup', 'Top up', 'Payments', '/payments/topup', { icon: 'plus', keywords: ['add money', 'fund'] }),
	nav('act-request', 'Request money', 'Payments', '/payments/request', { icon: 'request', keywords: ['qr', 'link'] }),
	nav('act-split', 'Split a bill', 'Payments', '/payments/split', { icon: 'users', keywords: ['share'] }),
	nav('nav-payments', 'Payments', 'Payments', '/payments', { icon: 'swap' }),
	nav('nav-payees', 'Payees', 'Payments', '/payments/payees', { icon: 'users', keywords: ['recipients', 'beneficiaries'] }),
	nav('act-addpayee', 'Add a payee', 'Payments', '/payments/payees/new', { icon: 'plus', keywords: ['new recipient'] }),
	nav('nav-scheduled', 'Scheduled payments', 'Payments', '/payments/scheduled', { icon: 'repeat', keywords: ['standing order', 'recurring'] }),
	nav('act-newscheduled', 'New scheduled payment', 'Payments', '/payments/scheduled/new', { icon: 'plus', keywords: ['standing order'] }),
	nav('nav-dd', 'Direct debits', 'Payments', '/payments/direct-debits', { icon: 'repeat', keywords: ['mandate'] }),

	// Accounts
	nav('nav-accounts', 'Accounts', 'Accounts', '/accounts', { icon: 'wallet', keywords: ['wallets', 'balances'] }),
	nav('act-openwallet', 'Open a wallet', 'Accounts', '/accounts/open', { icon: 'plus', keywords: ['new currency account'] }),
	nav('nav-pots', 'Savings pots', 'Accounts', '/accounts/pots', { icon: 'wallet', keywords: ['vault', 'save', 'goal'] }),
	nav('act-newpot', 'New savings pot', 'Accounts', '/accounts/pots/new', { icon: 'plus', keywords: ['vault', 'goal'] }),
	{
		id: 'nav-statements',
		title: 'Statements',
		section: 'Accounts',
		icon: 'file',
		keywords: ['pdf', 'export', 'document'],
		// Resolve the primary wallet at click time (avoid reading data at module load).
		action: () => {
			const w = getWallets()[0];
			goto(w ? `/accounts/${w.id}/statements` : '/accounts');
		}
	},

	// Cards
	nav('nav-cards', 'Cards', 'Cards', '/cards', { icon: 'card', keywords: ['debit', 'virtual'] }),
	nav('act-ordercard', 'Order a card', 'Cards', '/cards/order', { icon: 'plus', keywords: ['new card', 'replace', 'virtual', 'disposable'] }),

	// Invest
	nav('nav-invest', 'Investments', 'Invest', '/invest', { icon: 'circle-dot', keywords: ['portfolio', 'holdings'] }),
	nav('act-order', 'Place an order', 'Invest', '/invest', { icon: 'circle-dot', keywords: ['buy', 'sell', 'trade'] }),
	nav('nav-orders', 'Orders', 'Invest', '/invest/orders', { keywords: ['order history', 'blotter'] }),
	nav('nav-watchlists', 'Watchlists', 'Invest', '/invest/watchlists', { keywords: ['follow', 'track'] }),
	nav('nav-funds', 'Funds & ETFs', 'Invest', '/invest/funds', { keywords: ['etf', 'index', 'research'] }),
	nav('nav-dividends', 'Dividends', 'Invest', '/invest/dividends', { keywords: ['income', 'payout'] }),
	nav('nav-crypto', 'Crypto', 'Invest', '/crypto', { icon: 'circle-dot', keywords: ['bitcoin', 'ethereum'] }),

	// Borrow
	nav('nav-lending', 'Lending', 'Borrow', '/lending', { keywords: ['loans', 'borrow'] }),
	nav('act-loan', 'Apply for a loan', 'Borrow', '/lending/loans/apply', { keywords: ['personal loan', 'borrow'] }),
	nav('act-mortgage', 'Apply for a mortgage', 'Borrow', '/lending/mortgages/apply', { keywords: ['home loan', 'property'] }),
	nav('act-mortgagecalc', 'Mortgage calculator', 'Borrow', '/lending/mortgages/calculator', { keywords: ['affordability', 'estimate'] }),
	nav('act-credit', 'Apply for a credit line', 'Borrow', '/lending/credit-line/apply', { keywords: ['revolving', 'overdraft'] }),

	// Insurance
	nav('nav-insurance', 'Insurance', 'Insurance', '/insurance', { keywords: ['cover', 'protect'] }),
	nav('act-quote', 'Get an insurance quote', 'Insurance', '/insurance/quote', { keywords: ['cover', 'price'] }),
	nav('act-claim', 'File a claim', 'Insurance', '/insurance/claims/new', { keywords: ['insurance claim'] }),

	// Manage
	nav('nav-budgets', 'Budgets', 'Manage', '/budgets', { keywords: ['spending', 'analytics'] }),
	nav('nav-subscriptions', 'Subscriptions', 'Manage', '/budgets', { keywords: ['subscriptions', 'recurring', 'memberships'] }),
	nav('nav-rewards', 'Rewards', 'Manage', '/rewards', { keywords: ['cashback', 'perks'] }),
	nav('act-redeem', 'Redeem cashback', 'Manage', '/rewards', { keywords: ['cashback', 'claim'] }),
	nav('nav-activity', 'Activity', 'Manage', '/activity', { keywords: ['history', 'notifications'] }),
	nav('nav-documents', 'Documents', 'Manage', '/documents', { icon: 'file', keywords: ['statements', 'e-sign', 'vault'] }),
	nav('nav-support', 'Support', 'Manage', '/support', { icon: 'info', keywords: ['help', 'contact'] }),
	nav('act-ticket', 'Raise a ticket', 'Manage', '/support', { icon: 'info', keywords: ['help', 'contact'] }),
	nav('act-dispute', 'Open a dispute', 'Manage', '/support/disputes/new', { keywords: ['chargeback', 'fraud'] }),

	// Settings
	nav('set-profile', 'Profile', 'Settings', '/profile', { icon: 'user', keywords: ['account', 'me', 'kyc'] }),
	nav('set-limits', 'Limits', 'Settings', '/profile/limits', { icon: 'settings', keywords: ['spending limit'] }),
	nav('set-tier', 'Plan & tier', 'Settings', '/profile/tier', { keywords: ['standard', 'plus', 'metal', 'upgrade'] }),
	nav('set-prefs', 'Preferences', 'Settings', '/settings/preferences', { icon: 'settings', keywords: ['language', 'currency'] }),
	nav('set-appearance', 'Appearance', 'Settings', '/settings/appearance', { icon: 'sun', keywords: ['theme', 'dark', 'light'] }),
	nav('set-notifs', 'Notifications', 'Settings', '/settings/notifications', { icon: 'settings', keywords: ['alerts'] }),

	// Security
	nav('nav-security', 'Security', 'Security', '/security', { keywords: ['passkey', '2fa', 'devices', 'sessions'] }),
	nav('sec-2fa', 'Two-factor authentication', 'Security', '/security/2fa', { keywords: ['2fa', 'otp', 'authenticator'] }),
	nav('sec-passkeys', 'Passkeys', 'Security', '/security/passkeys', { keywords: ['webauthn', 'face id'] }),
	nav('sec-devices', 'Devices', 'Security', '/security/devices', { keywords: ['trusted devices'] }),
	nav('sec-sessions', 'Sessions', 'Security', '/security/sessions', { keywords: ['logins', 'active sessions'] }),
	nav('sec-activity', 'Security activity', 'Security', '/security/activity', { keywords: ['audit', 'log'] }),

	// Account — true actions (callbacks, not navigation)
	{ id: 'cmd-theme', title: 'Switch light / dark theme', section: 'Account', icon: 'sun', keywords: ['theme', 'dark', 'light', 'appearance'], action: () => toggleTheme() },
	{ id: 'cmd-density', title: 'Toggle compact density', section: 'Account', icon: 'window', keywords: ['comfortable', 'spacing', 'compact'], action: () => density.toggle() },
	{ id: 'cmd-lock', title: 'Lock', section: 'Account', keywords: ['lock screen', 'privacy'], action: () => goto('/lock') },
	{ id: 'cmd-signout', title: 'Sign out', section: 'Account', keywords: ['logout', 'log out'], action: () => { auth.signOut(); goto('/login'); } }
];

// ---- Dynamic entity commands --------------------------------------------
function walletItems(): Command[] {
	return getWallets().map((w) =>
		nav(`wallet-${w.id}`, `${w.name} · ${w.currency}`, 'Accounts', `/accounts/${w.id}`, {
			icon: 'wallet',
			keywords: ['wallet', w.currency, w.iban]
		})
	);
}

function payeeItems(): Command[] {
	return PAYEES.map((p) =>
		nav(`payee-${p.id}`, p.name, 'Payees', '/payments/payees', {
			icon: 'user',
			keywords: ['pay', 'send', p.type, p.handle ?? '', p.iban ?? '']
		})
	);
}

function cardActionItems(): Command[] {
	return CARDS.map((c: Card) => ({
		id: `card-freeze-${c.id}`,
		title: `${c.controls.frozen ? 'Unfreeze' : 'Freeze'} card ·${c.last4}`,
		section: 'Cards',
		icon: 'card',
		keywords: ['card', 'lock', 'block', c.last4],
		// Deep-link to the card's own settings — the surface enforces its step-up.
		action: () => goto(`/cards/${c.id}/settings`)
	}));
}

function instrumentItems(): Command[] {
	return INSTRUMENTS.map((i) =>
		nav(`inst-${i.symbol}`, `${i.symbol} · ${i.name}`, 'Markets', `/invest/instrument/${i.symbol}`, {
			keywords: ['buy', 'sell', i.type, i.exchange]
		})
	);
}

function transactionItems(): Command[] {
	return getTransactions()
		.slice(0, 40)
		.map((t) =>
			nav(`txn-${t.id}`, t.merchant, 'Transactions', `/accounts/${t.walletId}`, {
				keywords: [
					'transaction',
					'payment',
					formatDate(t.date),
					formatMoney(t.amountMinor, t.currency, { signDisplay: true })
				]
			})
		);
}

/** The full catalog, rebuilt per query (cheap; all sources are local). */
export function buildIndex(): Command[] {
	return [
		...STATIC,
		...cardActionItems(),
		...walletItems(),
		...payeeItems(),
		...instrumentItems(),
		...transactionItems()
	];
}

// ---- Ranking -------------------------------------------------------------
function scoreItem(cmd: Command, q: string): number {
	const title = cmd.title.toLowerCase();
	const hay = `${title} ${(cmd.keywords ?? []).join(' ')}`.toLowerCase();
	if (title.startsWith(q)) return 1000 - title.length;
	if (title.includes(` ${q}`)) return 800; // word-boundary in title
	if (title.includes(q)) return 700;
	if (hay.includes(q)) return 400;
	// subsequence fuzzy across the haystack
	let i = 0;
	for (const ch of hay) {
		if (ch === q[i]) i++;
		if (i === q.length) return 250;
	}
	return 0;
}

export interface CommandGroup {
	section: string;
	items: Command[];
}

/** Ranked, section-grouped results for a query (empty query → no results; the state
 *  shows recent + suggested instead). Caps each section so the list stays scannable.
 *  Sections are ordered by their best member's score so the globally top-scored hit
 *  is the first row — the default Enter target (PLT-Q-02). */
export function search(query: string, perGroup = 6): CommandGroup[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const scored = buildIndex()
		.map((item) => ({ item, score: scoreItem(item, q) }))
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

	const bySection = new Map<string, Command[]>();
	const bestScore = new Map<string, number>();
	for (const { item, score } of scored) {
		const list = bySection.get(item.section) ?? [];
		if (list.length < perGroup) list.push(item);
		bySection.set(item.section, list);
		// `scored` is score-desc, so the first time we see a section that's its best score.
		if (!bestScore.has(item.section)) bestScore.set(item.section, score);
	}
	return [...bySection.keys()]
		.sort(
			(a, b) =>
				bestScore.get(b)! - bestScore.get(a)! ||
				SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b)
		)
		.map((section) => ({ section, items: bySection.get(section)! }));
}

/** Default suggestions for the empty-query state. */
export function suggestedItems(): Command[] {
	const ids = ['act-send', 'act-exchange', 'act-topup', 'act-order'];
	const index = new Map(STATIC.map((c) => [c.id, c]));
	return ids.map((id) => index.get(id)).filter((c): c is Command => !!c);
}

/** Resolve a list of command ids back to commands (for the recent list). */
export function itemsByIds(ids: string[]): Command[] {
	const index = new Map(buildIndex().map((c) => [c.id, c]));
	return ids.map((id) => index.get(id)).filter((c): c is Command => !!c);
}
