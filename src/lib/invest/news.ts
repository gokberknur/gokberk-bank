// V09 · Seeded per-instrument news / research strip. Deterministic factual headlines —
// headline · source · a relative timestamp — newest first, no ratings and no hype. There
// is NO live feed in this demo: every "view source" is a stub the UI lands on a labelled
// placeholder (never a 404). Stable per symbol across runs.

import { mulberry32 } from '../data/prng';
import type { Instrument } from '../data/market';

export interface NewsItem {
	id: string;
	headline: string;
	source: string;
	/** Whole hours before now — drives a relative "3h ago" / "2d ago" label. */
	hoursAgo: number;
}

/** A small FNV-1a hash of the symbol → a stable PRNG seed (self-contained; no market dep). */
function seedOf(symbol: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < symbol.length; i++) {
		h ^= symbol.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

// Factual, calm headline templates — filled from the instrument's own metadata. No
// "rating", "top pick", "hot" or "recommended" framing anywhere (scope-discipline).
const TEMPLATES: ((i: Instrument) => string)[] = [
	(i) => `${i.name} files its latest report with the regulator`,
	(i) => `${i.exchange} publishes updated trading parameters for ${i.symbol}`,
	(i) => `${i.name} confirms its next results date`,
	(i) => `${i.region} markets: ${i.sector.toLowerCase()} in focus this session`,
	(i) => `${i.name} restates its outlook in a company filing`,
	(i) => `Index review notes ${i.symbol}'s constituent weighting`,
	(i) => `${i.name} announces a board appointment`,
	(i) => `${i.sector} names trade mixed across ${i.region}`
];

const SOURCES = ['Company filing', 'Exchange notice', 'Market wire', 'Regulatory filing', 'Sector brief'];

/** A relative "3h ago" / "2d ago" label from whole hours. */
export function agoLabel(hoursAgo: number): string {
	if (hoursAgo < 1) return 'just now';
	if (hoursAgo < 24) return `${hoursAgo}h ago`;
	const days = Math.round(hoursAgo / 24);
	return `${days}d ago`;
}

/**
 * A deterministic set of `count` headlines for an instrument, newest first. Templates and
 * sources are chosen by the seeded PRNG (deduping templates), timestamps step from a few
 * hours to a few days ago so the strip reads recent without a live clock.
 */
export function getNews(inst: Instrument, count = 5): NewsItem[] {
	const rng = mulberry32(seedOf(inst.symbol));
	const used = new Set<number>();
	const out: NewsItem[] = [];
	// Recency steps: newest first, widening gaps (hours → days).
	const steps = [3, 9, 20, 46, 92, 140];
	for (let n = 0; n < Math.min(count, TEMPLATES.length); n++) {
		let t = Math.floor(rng() * TEMPLATES.length);
		while (used.has(t)) t = (t + 1) % TEMPLATES.length;
		used.add(t);
		out.push({
			id: `news-${inst.symbol}-${n}`,
			headline: TEMPLATES[t](inst),
			source: SOURCES[Math.floor(rng() * SOURCES.length)],
			hoursAgo: steps[n] ?? steps[steps.length - 1] + n * 24
		});
	}
	return out;
}
