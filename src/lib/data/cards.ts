// Cards seed + per-card spend derivation. Three cards on the EUR Main wallet —
// a physical, a virtual, and a single-use disposable — so the wallet strip and
// the per-card states (active / frozen / fresh-no-spend) all have something to
// show. PANs/CVVs are obviously fake. Spend is sliced deterministically from the
// F03 transaction spine (the card-type rows on the linked wallet).

import type { Card, Transaction } from './types';

const HOLDER = 'GÖKBERK NUR';

export const CARDS: readonly Card[] = [
	{
		id: 'card-physical',
		type: 'physical',
		network: 'visa',
		design: 'ink',
		last4: '4291',
		pan: '4291 5500 7820 4291',
		cvv: '481',
		expiry: '08/28',
		holder: HOLDER,
		walletId: 'eur-main',
		status: 'active',
		controls: {
			frozen: false,
			online: true,
			contactless: true,
			atm: true,
			dailyLimitMinor: null,
			ceilingMinor: 500000,
			regions: [],
			homeRegion: 'DE'
		}
	},
	{
		id: 'card-virtual',
		type: 'virtual',
		network: 'mastercard',
		design: 'mist',
		last4: '7732',
		pan: '5413 9000 1188 7732',
		cvv: '206',
		expiry: '04/27',
		holder: HOLDER,
		walletId: 'eur-main',
		status: 'active',
		controls: {
			frozen: false,
			online: true,
			contactless: false,
			atm: false,
			dailyLimitMinor: 100000,
			ceilingMinor: 300000,
			regions: [],
			homeRegion: 'DE'
		}
	},
	{
		id: 'card-disposable',
		type: 'disposable',
		network: 'mastercard',
		design: 'forest',
		last4: '1180',
		pan: '5299 1240 6651 1180',
		cvv: '774',
		expiry: '11/26',
		holder: HOLDER,
		walletId: 'eur-main',
		status: 'active',
		controls: {
			frozen: false,
			online: true,
			contactless: false,
			atm: false,
			dailyLimitMinor: 20000,
			ceilingMinor: 50000,
			regions: ['DE'],
			homeRegion: 'DE'
		}
	}
];

/**
 * The spend stream for a card: the card-type rows on its linked wallet. The
 * physical card carries the full card spend; the virtual carries a deterministic
 * slice; the freshly-minted disposable has none yet (so its empty state shows).
 */
export function deriveCardSpend(card: Card, walletTxns: Transaction[]): Transaction[] {
	const cardRows = walletTxns.filter((t) => t.walletId === card.walletId && t.type === 'card');
	if (card.type === 'physical') return cardRows;
	if (card.type === 'virtual') return cardRows.filter((_, i) => i % 3 === 0);
	return [];
}
