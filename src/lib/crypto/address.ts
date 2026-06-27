// Crypto networks + deterministic mock addresses + reward-early address validation
// (format/charset/length, not real cryptographic checksums — this is a demo). Used
// by Receive (show my address) and Send (validate the recipient + infer a mismatched
// network). No real keys, no real chain. Deterministic from a seed.

export type CryptoSymbol = 'BTC' | 'ETH' | 'SOL' | 'USDC';
export type Network = 'Bitcoin' | 'Ethereum' | 'Solana';

/** The networks each asset can move on (USDC is multi-network). */
export const ASSET_NETWORKS: Record<CryptoSymbol, Network[]> = {
	BTC: ['Bitcoin'],
	ETH: ['Ethereum'],
	SOL: ['Solana'],
	USDC: ['Ethereum', 'Solana']
};

function hash(seed: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Deterministic stream of chars from `alphabet`, length `n`, seeded by `seed`. */
function chars(seed: string, alphabet: string, n: number): string {
	let out = '';
	let h = hash(seed);
	for (let i = 0; i < n; i++) {
		h = (Math.imul(h, 1103515245) + 12345) >>> 0;
		out += alphabet[h % alphabet.length];
	}
	return out;
}

const HEX = '0123456789abcdef';
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/** My deterministic receive address for an asset on a network (mock). */
export function receiveAddress(symbol: CryptoSymbol, network: Network): string {
	const seed = `${symbol}:${network}:gok`;
	switch (network) {
		case 'Bitcoin':
			return 'bc1' + chars(seed, BECH32, 39);
		case 'Ethereum':
			return '0x' + chars(seed, HEX, 40);
		case 'Solana':
			return chars(seed, BASE58, 44);
	}
}

export interface AddressCheck {
	ok: boolean;
	/** A no-blame reason when invalid. */
	reason?: string;
}

const ETH_RE = /^0x[0-9a-fA-F]{40}$/;
const BTC_RE = /^(bc1[0-9a-z]{30,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Validate a recipient address for a chosen network (format only — demo). */
export function validateAddress(network: Network, address: string): AddressCheck {
	const a = address.trim();
	if (!a) return { ok: false };
	switch (network) {
		case 'Bitcoin':
			return BTC_RE.test(a) ? { ok: true } : { ok: false, reason: 'That doesn’t look like a Bitcoin address — check and try again.' };
		case 'Ethereum':
			return ETH_RE.test(a) ? { ok: true } : { ok: false, reason: 'That doesn’t look like an Ethereum address (it should start 0x).' };
		case 'Solana':
			return SOL_RE.test(a) ? { ok: true } : { ok: false, reason: 'That doesn’t look like a Solana address — check and try again.' };
	}
}

/** Best-guess the network an address belongs to — to warn on a mismatch. */
export function inferNetwork(address: string): Network | null {
	const a = address.trim();
	if (ETH_RE.test(a)) return 'Ethereum';
	if (/^(bc1|[13])/.test(a) && BTC_RE.test(a)) return 'Bitcoin';
	if (SOL_RE.test(a)) return 'Solana';
	return null;
}

/** Shorten an address/hash for display: bc1qxy…3k9f. */
export function truncate(value: string, lead = 6, tail = 4): string {
	if (value.length <= lead + tail + 1) return value;
	return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
