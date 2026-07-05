// V13 · Neutral curated lists — FACTUAL groupings derived at render from instrument metadata, never
// stored "top" tables and never ranked-as-endorsement. Four dimensions the user can switch between:
// asset class · sector · region · a few named themes. A theme is a saved neutral QUERY over metadata
// (a category label like "Semiconductors"), NOT a pick-list — "discovery informs, it never hypes".
// Members sort by name (a neutral order — not by size or performance, which would imply a ranking).

import { INSTRUMENTS, type Instrument } from '$lib/data/market';

export type ListDimension = 'asset' | 'sector' | 'region' | 'theme';

export interface Category {
	/** Stable key (the metadata value, or a theme id). */
	key: string;
	/** The category label shown on the tab / chip. */
	label: string;
	/** The instruments in this category, in a neutral default order (by name). */
	members: Instrument[];
}

/** The dimensions, in display order. The active one carries the page's single accent. */
export const DIMENSIONS: { key: ListDimension; label: string }[] = [
	{ key: 'asset', label: 'Asset class' },
	{ key: 'sector', label: 'Sector' },
	{ key: 'region', label: 'Region' },
	{ key: 'theme', label: 'Themes' }
];

const byName = (a: Instrument, b: Instrument) => a.name.localeCompare(b.name);

/** Group the universe by a metadata field, in first-appearance order, members sorted by name. */
function groupBy(field: 'type' | 'sector' | 'region', labels?: Record<string, string>): Category[] {
	const map = new Map<string, Instrument[]>();
	for (const inst of INSTRUMENTS) {
		const v = String(inst[field]);
		const arr = map.get(v) ?? [];
		arr.push(inst);
		map.set(v, arr);
	}
	return [...map.entries()].map(([key, members]) => ({
		key,
		label: labels?.[key] ?? key,
		members: [...members].sort(byName)
	}));
}

const ASSET_LABELS: Record<string, string> = { stock: 'Stocks', etf: 'ETFs', crypto: 'Crypto' };

/** A theme = a named neutral predicate over metadata (a category label, never a "best" pick-list). */
interface Theme {
	key: string;
	label: string;
	match: (i: Instrument) => boolean;
}

const THEMES: Theme[] = [
	{ key: 'semiconductors', label: 'Semiconductors', match: (i) => ['ASML', 'NVDA', 'AMD', 'TSM', 'SMH'].includes(i.symbol) },
	{ key: 'ai-big-data', label: 'AI & big data', match: (i) => ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMD', 'TSM', 'XAIX'].includes(i.symbol) },
	{ key: 'dividend-payers', label: 'Dividend payers', match: (i) => i.dividendYieldBps >= 300 },
	{ key: 'clean-energy', label: 'Clean energy', match: (i) => ['INRG', 'EQNR', 'TTE'].includes(i.symbol) }
];

/**
 * The neutral categories for a dimension, derived at render:
 * - asset: Stocks / ETFs / Crypto (the asset-class filter).
 * - sector: GICS-style sectors — kept to those containing at least one stock, which folds thematic
 *   ETFs (SMH → Technology, INRG → Energy) into their sector while dropping ETF-only fund categories
 *   and crypto (those are reached via Asset class). Sector is a stock concept.
 * - region: Europe / United States / Global.
 * - theme: the named neutral queries above (non-empty only).
 */
export function categoriesFor(dimension: ListDimension): Category[] {
	switch (dimension) {
		case 'asset':
			return groupBy('type', ASSET_LABELS);
		case 'sector':
			return groupBy('sector').filter((c) => c.members.some((m) => m.type === 'stock'));
		case 'region':
			return groupBy('region');
		case 'theme':
			return THEMES.map((t) => ({
				key: t.key,
				label: t.label,
				members: INSTRUMENTS.filter(t.match).sort(byName)
			})).filter((c) => c.members.length > 0);
	}
}
