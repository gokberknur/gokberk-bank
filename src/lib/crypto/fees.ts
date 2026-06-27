// Mock network-fee schedule for crypto sends (pure). A send always discloses the
// network fee before the forced-decision confirm. Fees are in EUR minor units and
// are illustrative — Bitcoin dearer, Solana near-free. Deterministic.

import type { Network } from './address';

export interface NetworkFee {
	feeMinor: number;
	/** A plain ETA for the confirmation. */
	eta: string;
}

const SCHEDULE: Record<Network, NetworkFee> = {
	Bitcoin: { feeMinor: 240, eta: '~10–30 min' },
	Ethereum: { feeMinor: 180, eta: '~1–3 min' },
	Solana: { feeMinor: 1, eta: '~seconds' }
};

export function networkFee(network: Network): NetworkFee {
	return SCHEDULE[network];
}
