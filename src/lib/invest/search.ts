// V13 · Instrument search — a pure, case- AND diacritic-insensitive matcher over the universe,
// shared by the /invest/discover combobox AND the F14 command palette so "nestle" finds "Nestlé",
// "loreal" finds "L'Oréal", "diseno" finds "Industria de Diseño Textil". Matches symbol + name,
// deduped by symbol (the universe already is), ranked symbol-exact > symbol-prefix > name-prefix >
// substring. Deterministic; no state; no float.

import { INSTRUMENTS, type Instrument } from '$lib/data/market';

/**
 * Case-, diacritic-, and apostrophe-insensitive fold: "Nestlé" → "nestle", "L'Oréal" → "loreal".
 * NFD splits an accented letter into base + combining mark; stripping the marks (U+0300–U+036F)
 * leaves the base. Apostrophes — straight (U+0027) and the typographic curly quote (U+2019) the seed
 * actually uses in "L'Oréal" — are elided too, so a user typing "loreal" (never the apostrophe) matches.
 */
export function fold(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’]/g, '')
		.toLowerCase();
}

/**
 * Match score for a pre-folded query `q` against one instrument (0 = no match). Symbol beats name;
 * prefix beats substring — so typing a ticker jumps straight to it, and a name prefix ranks above a
 * mid-string hit.
 */
export function scoreInstrument(inst: Instrument, q: string): number {
	const sym = fold(inst.symbol);
	const name = fold(inst.name);
	if (sym === q) return 1000;
	if (sym.startsWith(q)) return 800;
	if (name.startsWith(q)) return 600;
	if (name.includes(q)) return 450;
	if (sym.includes(q)) return 400;
	return 0;
}

/**
 * Instruments matching a free-text query on symbol or name (case + diacritic-insensitive), ranked
 * best-first and capped at `limit`. Ties break alphabetically by symbol for a stable order.
 */
export function searchInstruments(query: string, limit = 12): Instrument[] {
	const q = fold(query.trim());
	if (!q) return [];
	return INSTRUMENTS.map((inst) => ({ inst, score: scoreInstrument(inst, q) }))
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score || a.inst.symbol.localeCompare(b.inst.symbol))
		.slice(0, limit)
		.map((s) => s.inst);
}
