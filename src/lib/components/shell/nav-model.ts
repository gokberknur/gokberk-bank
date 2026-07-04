// The section/route map shared by the desktop rail (AppSidenav) and the mobile
// bottom-tab bar. The whole information architecture is listed up front so the
// shell reads as one complete bank; surfaces that aren't built yet are marked
// `ready: false` and render disabled ("Soon") until their feature ships — flip
// the flag in the same change as the surface.

export interface NavItem {
	label: string;
	href: string;
	/** Single-select value carried on the sidenav model (the first path segment). */
	value: string;
	/** Icon key → AppSidenav maps it to a slotted SVG glyph. */
	icon: string;
	/** Whether the destination surface exists yet. */
	ready: boolean;
}

export interface NavSection {
	label: string;
	items: NavItem[];
}

export const NAV: NavSection[] = [
	{
		label: 'Banking',
		items: [
			{ label: 'Home', href: '/home', value: 'home', icon: 'home', ready: true },
			{ label: 'Accounts', href: '/accounts', value: 'accounts', icon: 'wallet', ready: true },
			{ label: 'Payments', href: '/payments', value: 'payments', icon: 'transfer', ready: true },
			{ label: 'Cards', href: '/cards', value: 'cards', icon: 'card', ready: true }
		]
	},
	{
		label: 'Invest',
		items: [
			{ label: 'Investments', href: '/invest', value: 'invest', icon: 'invest', ready: true },
			{ label: 'Crypto', href: '/crypto', value: 'crypto', icon: 'crypto', ready: true }
		]
	},
	{
		label: 'Borrow & protect',
		items: [
			{ label: 'Lending', href: '/lending', value: 'lending', icon: 'lending', ready: true },
			{ label: 'Insurance', href: '/insurance', value: 'insurance', icon: 'insurance', ready: true }
		]
	},
	{
		label: 'Manage',
		items: [
			{ label: 'Budgets', href: '/budgets', value: 'budgets', icon: 'budget', ready: true },
			{ label: 'Rewards', href: '/rewards', value: 'rewards', icon: 'rewards', ready: true },
			{ label: 'Activity', href: '/activity', value: 'activity', icon: 'activity', ready: true },
			{ label: 'Documents', href: '/documents', value: 'documents', icon: 'documents', ready: true },
			{ label: 'Support', href: '/support', value: 'support', icon: 'support', ready: true }
		]
	}
];

/**
 * The five canonical mobile tabs (Pay centered). `value` matches the rail.
 * 'More' is not a route — it's an overflow trigger that opens the all-sections sheet
 * in BottomTabBar, so every section in NAV is reachable on a phone (≤2 taps). There is
 * no /more page; `ready: true` marks the overflow as built (the href is unused for it).
 */
export const BOTTOM_TABS: NavItem[] = [
	{ label: 'Home', href: '/home', value: 'home', icon: 'home', ready: true },
	{ label: 'Accounts', href: '/accounts', value: 'accounts', icon: 'wallet', ready: true },
	{ label: 'Pay', href: '/payments', value: 'payments', icon: 'transfer', ready: true },
	{ label: 'Invest', href: '/invest', value: 'invest', icon: 'invest', ready: true },
	{ label: 'More', href: '/more', value: 'more', icon: 'more', ready: true }
];

/** The mobile tab `value`s that are first-class tabs; anything else lives under "More". */
export const PRIMARY_TAB_VALUES: readonly string[] = ['home', 'accounts', 'payments', 'invest'];

/**
 * A section sub-nav item (V16). Like {@link NavItem} but icon-less — the invest
 * sub-nav is a text rail (the SettingsHeader precedent), so it carries no glyph.
 * `external` marks a cross-section link that points outside `/invest` (Crypto).
 */
export interface SubNavItem {
	label: string;
	href: string;
	value: string;
	/** Whether the destination surface exists yet — `false` renders disabled ("Soon"). */
	ready: boolean;
	/** A cross-section link (e.g. Crypto → /crypto), lit only on an exact section match. */
	external?: boolean;
}

/**
 * The invest section sub-nav (V16) — rendered by `(app)/invest/+layout.svelte`, not the
 * shell rail. Lists every invest surface in a sensible order so each is one tap; unbuilt
 * sections (`ready: false`) render disabled "Soon" until their feature ships (flip the flag
 * in the same change as the surface). Crypto is a cross-section link out to `/crypto`.
 */
export const INVEST_NAV: SubNavItem[] = [
	{ label: 'Overview', href: '/invest', value: 'overview', ready: true },
	{ label: 'Discover', href: '/invest/discover', value: 'discover', ready: true },
	{ label: 'Plans', href: '/invest/plans', value: 'plans', ready: true },
	{ label: 'Orders', href: '/invest/orders', value: 'orders', ready: true },
	{ label: 'Watchlists', href: '/invest/watchlists', value: 'watchlists', ready: true },
	{ label: 'Funds', href: '/invest/funds', value: 'funds', ready: true },
	{ label: 'Dividends', href: '/invest/dividends', value: 'dividends', ready: true },
	{ label: 'Crypto', href: '/crypto', value: 'crypto', ready: true, external: true }
];

/** Flat list of every nav item (both groupings deduped by value). */
const ALL_ITEMS: NavItem[] = NAV.flatMap((s) => s.items);

/**
 * The active item's `value` for a pathname, by longest matching href prefix —
 * so `/accounts/eur-main` still highlights "Accounts". Returns '' when nothing
 * matches (e.g. an overlay route).
 */
export function activeValue(pathname: string): string {
	let best = '';
	let bestLen = -1;
	for (const item of ALL_ITEMS) {
		if ((pathname === item.href || pathname.startsWith(item.href + '/')) && item.href.length > bestLen) {
			best = item.value;
			bestLen = item.href.length;
		}
	}
	return best;
}

/**
 * The active invest sub-nav item's `href` for a pathname, by longest matching prefix —
 * so `/invest/plans/x` lights "Plans" and `/invest/instrument/x` lights "Overview".
 * Returns '' when nothing matches. Crypto (`/crypto`) lights only under `/crypto`.
 */
export function activeInvestHref(pathname: string): string {
	let best = '';
	let bestLen = -1;
	for (const item of INVEST_NAV) {
		if ((pathname === item.href || pathname.startsWith(item.href + '/')) && item.href.length > bestLen) {
			best = item.href;
			bestLen = item.href.length;
		}
	}
	return best;
}
