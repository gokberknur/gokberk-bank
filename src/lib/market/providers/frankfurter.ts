// V14 · FX provider — Frankfurter (keyless, CORS-clean via api.frankfurter.dev, verified
// browser-direct). ECB reference rates, end-of-day → `source: 'delayed'`. Pure fetch → map
// to the seed's scaled-int FX (`to` per 1 `from` ×RATE_SCALE); THROWS on failure — the
// adapter owns fallback + provenance.

import { RATE_SCALE } from '../types';
import type { Currency } from '$lib/data/money';

const BASE = 'https://api.frankfurter.dev/v1';

export async function frankfurterRate(
	from: Currency,
	to: Currency,
	signal?: AbortSignal
): Promise<{ rateScaled: number; date: string }> {
	if (from === to) return { rateScaled: RATE_SCALE, date: '' };
	const r = await fetch(`${BASE}/latest?base=${from}&symbols=${to}`, { signal });
	if (!r.ok) throw new Error(`frankfurter ${r.status}`);
	const j = await r.json();
	const rate = j?.rates?.[to];
	if (typeof rate !== 'number') throw new Error('frankfurter: no rate in payload');
	return { rateScaled: Math.round(rate * RATE_SCALE), date: String(j.date ?? '') };
}
