// Dividends state (V06) — the Upcoming / History toggle over the derived dividend
// data, plus the running total received. Data is derived from holdings (fixed seed),
// so no revision dependency is needed.

import {
	getUpcomingDividends,
	getDividendHistory,
	getDividendsReceivedEurMinor
} from '$lib/data/dividends-data';
import type { DividendView } from '$lib/data/dividends-data';

class DividendsState {
	view = $state<'upcoming' | 'history'>('upcoming');

	get upcoming(): DividendView[] {
		return getUpcomingDividends();
	}

	get history(): DividendView[] {
		return getDividendHistory();
	}

	get rows(): DividendView[] {
		return this.view === 'upcoming' ? this.upcoming : this.history;
	}

	get receivedEurMinor(): number {
		return getDividendsReceivedEurMinor();
	}
}

export const dividends = new DividendsState();
