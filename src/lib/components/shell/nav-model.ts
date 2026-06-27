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
			{ label: 'Crypto', href: '/crypto', value: 'crypto', icon: 'crypto', ready: false }
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
			{ label: 'Activity', href: '/activity', value: 'activity', icon: 'activity', ready: false },
			{ label: 'Documents', href: '/documents', value: 'documents', icon: 'documents', ready: true },
			{ label: 'Support', href: '/support', value: 'support', icon: 'support', ready: true }
		]
	}
];

/** The five canonical mobile tabs (Pay centered). `value` matches the rail. */
export const BOTTOM_TABS: NavItem[] = [
	{ label: 'Home', href: '/home', value: 'home', icon: 'home', ready: true },
	{ label: 'Accounts', href: '/accounts', value: 'accounts', icon: 'wallet', ready: true },
	{ label: 'Pay', href: '/payments', value: 'payments', icon: 'transfer', ready: true },
	{ label: 'Invest', href: '/invest', value: 'invest', icon: 'invest', ready: true },
	{ label: 'More', href: '/more', value: 'more', icon: 'more', ready: false }
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
