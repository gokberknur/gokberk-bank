// Funds explorer state (V06) — filter + sort over the static fund universe, plus the
// selected fund for the fact sheet. The data is fixed (no revision dependency); this
// just holds the view controls the screen binds to.

import { getFunds, getFund, isFundTradeable } from '$lib/data/funds-data';
import type { Fund, AssetClass, FundRegion } from '$lib/data/funds-data';

export type FundSortKey =
	| 'name'
	| 'ongoingChargeBps'
	| 'oneYearReturnBps'
	| 'fundSizeEurMinor'
	| 'riskBand';

class FundsState {
	assetClass = $state<'all' | AssetClass>('all');
	region = $state<'all' | FundRegion>('all');
	riskBand = $state<'all' | number>('all');
	sortKey = $state<FundSortKey>('fundSizeEurMinor');
	sortDir = $state<'asc' | 'desc'>('desc');

	get filtered(): Fund[] {
		const list = getFunds().filter(
			(f) =>
				(this.assetClass === 'all' || f.assetClass === this.assetClass) &&
				(this.region === 'all' || f.region === this.region) &&
				(this.riskBand === 'all' || f.riskBand === this.riskBand)
		);
		const dir = this.sortDir === 'asc' ? 1 : -1;
		const key = this.sortKey;
		return [...list].sort((a, b) => {
			if (key === 'name') return a.name < b.name ? -dir : a.name > b.name ? dir : 0;
			return (a[key] - b[key]) * dir;
		});
	}

	get isFiltered(): boolean {
		return this.assetClass !== 'all' || this.region !== 'all' || this.riskBand !== 'all';
	}

	/** Toggle a column's sort (same key flips direction; new key sorts desc). */
	toggleSort(key: FundSortKey) {
		if (this.sortKey === key) {
			this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			this.sortKey = key;
			this.sortDir = key === 'name' ? 'asc' : 'desc';
		}
	}

	clearFilters() {
		this.assetClass = 'all';
		this.region = 'all';
		this.riskBand = 'all';
	}

	fund(ticker: string): Fund | undefined {
		return getFund(ticker);
	}

	tradeable(ticker: string): boolean {
		return isFundTradeable(ticker);
	}
}

export const funds = new FundsState();
