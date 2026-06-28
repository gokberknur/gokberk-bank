// Crypto wallet data (V07) — balances (seeded from the shared HOLDINGS), per-asset
// metadata (decimals, networks), and an on-chain-style activity log with simulated
// tx hashes + confirmation counts. Buy/sell settle immediately (exchange ops); send
// moves Pending→Confirming (on-chain). EUR values are integer minor units; crypto
// quantities are decimal units (consistent with the existing invest Holding model).
// Deterministic — no Math.random / Date.now. Mock; no real chain, keys, or funds.

import { TODAY, daysBeforeToday } from './time';
import { INSTRUMENTS, HOLDINGS } from './market';
import { ASSET_NETWORKS, type CryptoSymbol, type Network } from '../crypto/address';

/** Display precision per asset (mock — not the true on-chain decimals). */
export const CRYPTO_DECIMALS: Record<CryptoSymbol, number> = { BTC: 6, ETH: 5, SOL: 3, USDC: 2 };

export interface CryptoAsset {
	symbol: CryptoSymbol;
	name: string;
	networks: Network[];
	decimals: number;
	lastPriceMinor: number;
	priorCloseMinor: number;
}

export function getCryptoAssets(): CryptoAsset[] {
	return INSTRUMENTS.filter((i) => i.type === 'crypto').map((i) => ({
		symbol: i.symbol as CryptoSymbol,
		name: i.name,
		networks: ASSET_NETWORKS[i.symbol as CryptoSymbol] ?? [],
		decimals: CRYPTO_DECIMALS[i.symbol as CryptoSymbol] ?? 4,
		lastPriceMinor: i.lastPriceMinor,
		priorCloseMinor: i.priorCloseMinor
	}));
}

export function getCryptoAsset(symbol: string): CryptoAsset | undefined {
	return getCryptoAssets().find((a) => a.symbol === symbol);
}

export function formatUnits(symbol: CryptoSymbol, units: number): string {
	const d = CRYPTO_DECIMALS[symbol] ?? 4;
	return units.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

// ─── Balances (mutable, seeded from the crypto HOLDINGS) ──────────────────────
let balances: Record<string, number> = (() => {
	const b: Record<string, number> = {};
	for (const h of HOLDINGS) {
		if (getCryptoAsset(h.symbol)) b[h.symbol] = h.quantity;
	}
	// Seed a small USDC balance so the multi-network asset has something to show.
	b.USDC = b.USDC ?? 320;
	return b;
})();

export function getCryptoBalance(symbol: string): number {
	return balances[symbol] ?? 0;
}

export function getCryptoBalances(): { symbol: CryptoSymbol; units: number }[] {
	return getCryptoAssets()
		.map((a) => ({ symbol: a.symbol, units: balances[a.symbol] ?? 0 }))
		.filter((b) => b.units > 0);
}

// ─── On-chain-style activity ──────────────────────────────────────────────────
export type CryptoTxType = 'buy' | 'sell' | 'send' | 'receive';
export type CryptoTxStatus = 'pending' | 'confirming' | 'confirmed' | 'failed';

export const CRYPTO_TX_TYPE_LABELS: Record<CryptoTxType, string> = {
	buy: 'Buy',
	sell: 'Sell',
	send: 'Send',
	receive: 'Receive'
};
export const CRYPTO_TX_STATUS_LABELS: Record<CryptoTxStatus, string> = {
	pending: 'Pending',
	confirming: 'Confirming',
	confirmed: 'Confirmed',
	failed: 'Failed'
};

export interface CryptoTx {
	id: string;
	type: CryptoTxType;
	symbol: CryptoSymbol;
	/** Signed-by-direction crypto units (send/sell remove, buy/receive add). */
	units: number;
	/** EUR value at the time, minor units. */
	valueMinor: number;
	network?: Network;
	status: CryptoTxStatus;
	hash: string;
	confirmations: number;
	at: string; // ISO
}

function txHash(seed: string): string {
	let h = 0x811c9dc5;
	const hex = '0123456789abcdef';
	let out = '0x';
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	for (let i = 0; i < 40; i++) {
		h = (Math.imul(h, 1103515245) + 12345) >>> 0;
		out += hex[h % 16];
	}
	return out;
}

function dIso(daysAgo: number, hour = 10): string {
	const d = daysBeforeToday(daysAgo);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

let activity: CryptoTx[] = [
	{ id: 'cx-1', type: 'buy', symbol: 'BTC', units: 0.03, valueMinor: 175260, status: 'confirmed', hash: txHash('cx-1'), confirmations: 6, at: dIso(20, 11) },
	{ id: 'cx-2', type: 'buy', symbol: 'ETH', units: 1.4, valueMinor: 277200, status: 'confirmed', hash: txHash('cx-2'), confirmations: 6, at: dIso(40, 9) },
	{ id: 'cx-3', type: 'receive', symbol: 'SOL', units: 8, valueMinor: 112640, network: 'Solana', status: 'confirmed', hash: txHash('cx-3'), confirmations: 6, at: dIso(12, 16) },
	{ id: 'cx-4', type: 'sell', symbol: 'SOL', units: 4, valueMinor: 56320, status: 'confirmed', hash: txHash('cx-4'), confirmations: 6, at: dIso(7, 13) },
	{ id: 'cx-5', type: 'send', symbol: 'ETH', units: 0.25, valueMinor: 60125, network: 'Ethereum', status: 'confirmed', hash: txHash('cx-5'), confirmations: 32, at: dIso(5, 8) },
	{ id: 'cx-6', type: 'buy', symbol: 'USDC', units: 320, valueMinor: 29440, status: 'confirmed', hash: txHash('cx-6'), confirmations: 6, at: dIso(3, 18) }
];

let seq = 100;
function nextId(): string {
	seq += 1;
	return `cx-${seq}`;
}

export function getCryptoActivity(): CryptoTx[] {
	return activity;
}

export function getCryptoActivityFor(symbol: string): CryptoTx[] {
	return activity.filter((t) => t.symbol === symbol);
}

function append(tx: CryptoTx): CryptoTx {
	activity = [tx, ...activity];
	return tx;
}

/** Buy crypto (settles immediately — exchange op). Adjusts the balance. */
export function recordBuy(symbol: CryptoSymbol, units: number, valueMinor: number): CryptoTx {
	balances = { ...balances, [symbol]: (balances[symbol] ?? 0) + units };
	const id = nextId();
	return append({ id, type: 'buy', symbol, units, valueMinor, status: 'confirmed', hash: txHash(id), confirmations: 6, at: new Date(TODAY).toISOString() });
}

export function recordSell(symbol: CryptoSymbol, units: number, valueMinor: number): CryptoTx {
	balances = { ...balances, [symbol]: Math.max(0, (balances[symbol] ?? 0) - units) };
	const id = nextId();
	return append({ id, type: 'sell', symbol, units, valueMinor, status: 'confirmed', hash: txHash(id), confirmations: 6, at: new Date(TODAY).toISOString() });
}

/** Send crypto on-chain — lands as Confirming (Pending→Confirming, never instant).
 *  The recipient receives `units`; the disclosed network fee (`feeUnits`, the same
 *  fee converted to crypto) leaves the wallet on top, so the held balance drops by
 *  the full units + fee and the disclosed fee is actually paid (CRY-Q-02). */
export function recordSend(
	symbol: CryptoSymbol,
	units: number,
	valueMinor: number,
	network: Network,
	feeUnits = 0
): CryptoTx {
	balances = { ...balances, [symbol]: Math.max(0, (balances[symbol] ?? 0) - units - feeUnits) };
	const id = nextId();
	return append({ id, type: 'send', symbol, units, valueMinor, network, status: 'confirming', hash: txHash(id), confirmations: 1, at: new Date(TODAY).toISOString() });
}

export { TODAY };
