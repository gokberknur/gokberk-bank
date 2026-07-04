// V14 feature flags (ADR-006). Live is additive — every flag-off path returns the seed.
// NO API keys ship in this PUBLIC repo (CPO scope call): crypto (Binance) + FX
// (Frankfurter) are keyless; CoinGecko breadth and Twelve Data equities are deferred, so
// equities/funds always resolve to the seed. `liveMaster` is the global kill-switch.

import type { AssetClass } from './types';

export const flags = {
	liveMaster: true,
	cryptoLive: true, // Binance REST (WebSocket streaming deferred to a follow-up)
	fxLive: true, // Frankfurter ECB end-of-day
	equitiesLive: false, // OFF until a keyed Twelve Data candle test passes the gate
	fundsLive: false // never — no free source
} as const;

/** Whether live data is enabled for an asset class right now. */
export function classLive(cls: AssetClass): boolean {
	if (!flags.liveMaster) return false;
	switch (cls) {
		case 'crypto':
			return flags.cryptoLive;
		case 'equity':
			return flags.equitiesLive;
		case 'fund':
			return flags.fundsLive;
	}
}
