// V08 · Chart preferences — the single reactive source for which technical indicators are
// drawn on the price chart, and which series (if any) is overlaid for the "Compare with"
// rebased view. Mirrors the app's other `*.svelte.ts` state
// singletons (toasts, schedule, command): a runed class, one exported instance. Persisted
// via the shared `persist.ts` helper (browser-guarded, `gok-bank-` prefixed) so this
// preference sits alongside the others; default is an EMPTY set — a calm, clean chart the
// user opts into, never a rainbow by default.
//
// The active set is held as a plain `Set` and REASSIGNED on every change (never mutated in
// place) so reactive reads (`isOn`, `active.size`, iteration) re-run. It persists as a JSON
// array of keys; on load the array is filtered to the current catalogue, so a stale key from
// an older build can never resurrect a since-removed indicator.

import { readJSON, writeJSON } from '$lib/state/persist';
import { INDICATORS, type IndicatorKey } from '$lib/charts/indicator-series';

const STORAGE_KEY = 'chart-indicators';
const COMPARE_KEY = 'chart-compare';

/** The catalogue's keys, as a lookup — anything not in here is dropped on load. */
const VALID = new Set<string>(INDICATORS.map((i) => i.key));

/** Read the persisted keys (an array, `[]` if absent/invalid), filter to the current
 *  catalogue, and build the active set. Any unknown key is dropped. */
function load(): Set<IndicatorKey> {
	const stored = readJSON<string[]>(STORAGE_KEY, []);
	const keys = Array.isArray(stored)
		? stored.filter((k): k is IndicatorKey => typeof k === 'string' && VALID.has(k))
		: [];
	return new Set(keys);
}

class ChartPrefs {
	/** The active indicator keys. Reassigned (never mutated in place) so reads re-run. */
	active = $state<Set<IndicatorKey>>(load());

	/** Whether an indicator is currently drawn. */
	isOn(key: IndicatorKey): boolean {
		return this.active.has(key);
	}

	/** Flip an indicator on/off and persist. Builds a fresh set immutably (never mutates the
	 *  reactive one in place) and reassigns, so every read of `active` re-runs. */
	toggle(key: IndicatorKey): void {
		const next = this.active.has(key)
			? new Set([...this.active].filter((k) => k !== key))
			: new Set([...this.active, key]);
		this.active = next;
		writeJSON(STORAGE_KEY, [...next]);
	}

	/** The active comparison selection — a series id to overlay (rebased), or 'none'.
	 *  'none' = the single-series candle view. Persisted like `active`. */
	compare = $state<string>(readJSON<string>(COMPARE_KEY, 'none'));

	/** Set (or clear, with 'none') the comparison overlay and persist. */
	setCompare(id: string): void {
		this.compare = id;
		writeJSON(COMPARE_KEY, id);
	}
}

export const chartPrefs = new ChartPrefs();
