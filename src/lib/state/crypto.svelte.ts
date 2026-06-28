// Crypto wallet runtime state (V07) — the portfolio reads + the buy/sell ticket +
// the on-chain send ticket. Like the rest of the spine this is **revision-reactive**:
// every getter touches `revision.value` to take a dependency on the shared signal,
// and every mutation (a buy, a sell, a send) calls `revision.bump()` so balances,
// positions, the activity log, and the EUR wallet re-flow on every surface at once.
//
// Two money worlds meet here. Crypto quantities are **decimal units** (like the invest
// Holding); EUR values are integer **minor units**. Prices are quoted in EUR cents.
// To keep money exact we round to integer minor units after each `× price`, never
// letting a float product drift. The crypto data layer (`$lib/data/crypto-data`) owns
// the balances + activity and mutates them by immutable replacement; the matching EUR
// **cash** side of a buy/sell rides the F03 transactions spine via `appendTransaction`
// (modelled exactly on `rewards.redeem()` — see `placeTrade()` below). A send moves
// crypto on-chain only; no EUR moves.

import {
	getCryptoAssets,
	getCryptoAsset,
	getCryptoBalance,
	getCryptoBalances,
	getCryptoActivity,
	getCryptoActivityFor,
	formatUnits,
	recordBuy,
	recordSell,
	recordSend
} from '$lib/data/crypto-data';
import type { CryptoAsset, CryptoTx } from '$lib/data/crypto-data';
import {
	ASSET_NETWORKS,
	receiveAddress,
	validateAddress,
	inferNetwork
} from '$lib/crypto/address';
import type { CryptoSymbol, Network, AddressCheck } from '$lib/crypto/address';
import { networkFee } from '$lib/crypto/fees';
import { appendTransaction, getTransactions } from '$lib/data';
import type { Transaction } from '$lib/data';
import { TODAY, isoDate } from '$lib/data/time';
import { revision } from './revision.svelte';
import { accounts } from './accounts.svelte';
import { toast } from './toasts.svelte';

export type { CryptoAsset, CryptoTx };

/** A held crypto balance valued in EUR, with its day move (the portfolio row). */
export interface CryptoPosition {
	symbol: CryptoSymbol;
	name: string;
	/** Held quantity, decimal units. */
	units: number;
	/** Last price, EUR minor units. */
	lastPriceMinor: number;
	/** units × price, rounded to integer EUR minor units. */
	valueMinor: number;
	/** (last − prior) / prior × 10000, signed basis points. */
	dayChangeBps: number;
	/** Today's value move on this holding, signed EUR minor units. */
	dayChangeMinor: number;
}

/** Whether the ticket amount is entered as crypto units or a EUR cash figure. */
export type TradeMode = 'units' | 'cash';
/** Buy adds crypto + spends EUR; sell removes crypto + returns EUR. */
export type TradeSide = 'buy' | 'sell';

/** The in-flight buy/sell ticket (the V07 trade form's working state). */
export interface TradeDraft {
	symbol: CryptoSymbol;
	side: TradeSide;
	mode: TradeMode;
	/** Crypto quantity when `mode === 'units'`. */
	units: number;
	/** EUR cash amount, minor units, when `mode === 'cash'`. */
	cashMinor: number;
}

/** The live cost preview derived from the trade draft + the asset quote. */
export interface TradePreview {
	/** The quantity that would trade (derived from cash in cash mode). */
	units: number;
	/** Last price, EUR minor units. */
	priceMinor: number;
	/** units × price, rounded to integer EUR minor units. */
	grossMinor: number;
	/** 0.5% of gross, min €1. */
	feeMinor: number;
	/** Buy: gross + fee. Sell: gross − fee. EUR minor units. */
	totalMinor: number;
	/** Spendable buying power (the EUR Main wallet's available). */
	spendableMinor: number;
	/** Buy & the total exceeds buying power. */
	insufficientFunds: boolean;
	/** Sell & the units exceed the held balance. */
	insufficientUnits: boolean;
}

/** The in-flight send ticket (the on-chain withdrawal form's working state). */
export interface SendDraft {
	symbol: CryptoSymbol;
	network: Network;
	toAddress: string;
	/** Crypto quantity to send, decimal units. */
	units: number;
}

/** The live preview derived from the send draft + the network fee schedule. */
export interface SendPreview {
	/** The quantity to send, decimal units. */
	units: number;
	/** units × price, rounded to integer EUR minor units. */
	valueMinor: number;
	/** The network fee, EUR minor units. */
	feeMinor: number;
	/** A plain confirmation ETA. */
	eta: string;
	/** The held balance, decimal units. */
	balanceUnits: number;
	/** The units exceed the held balance. */
	insufficient: boolean;
}

/** The EUR value at or above which a send asks for step-up re-auth (€1,000). */
export const SEND_STEPUP_MINOR = 100000;
/** The flat trade fee rate (0.5%) and its floor (€1) on a buy/sell. */
const TRADE_FEE_BPS = 0.005;
const TRADE_FEE_FLOOR_MINOR = 100;

/** The trade fee on a EUR gross: 0.5%, never less than €1. Integer minor units. */
function tradeFee(grossMinor: number): number {
	return Math.max(TRADE_FEE_FLOOR_MINOR, Math.round(grossMinor * TRADE_FEE_BPS));
}

/** A fresh trade draft for a symbol — a units-mode buy, nothing entered. */
function emptyTradeDraft(symbol: CryptoSymbol, side: TradeSide): TradeDraft {
	return { symbol, side, mode: 'units', units: 0, cashMinor: 0 };
}

/** A fresh send draft for a symbol, seeded to its first network. */
function emptySendDraft(symbol: CryptoSymbol): SendDraft {
	return { symbol, network: ASSET_NETWORKS[symbol][0], toAddress: '', units: 0 };
}

class CryptoState {
	// ── Portfolio reads (revision-reactive over the crypto data layer) ──────────

	/** Every tradeable crypto asset with its quote + networks. */
	get assets(): CryptoAsset[] {
		revision.value;
		return getCryptoAssets();
	}

	/** One asset by symbol, or undefined. */
	asset(symbol: string): CryptoAsset | undefined {
		revision.value;
		return getCryptoAsset(symbol);
	}

	/** My held balances as valued positions, value-sorted desc. */
	get balances(): CryptoPosition[] {
		revision.value;
		return getCryptoBalances()
			.map((b): CryptoPosition => {
				const a = getCryptoAsset(b.symbol);
				const priceMinor = a?.lastPriceMinor ?? 0;
				const priorMinor = a?.priorCloseMinor ?? 0;
				// Round to integer minor units after each × price — no float drift.
				const valueMinor = Math.round(b.units * priceMinor);
				const priorValueMinor = Math.round(b.units * priorMinor);
				const dayChangeBps =
					priorMinor > 0 ? Math.round(((priceMinor - priorMinor) / priorMinor) * 10000) : 0;
				return {
					symbol: b.symbol,
					name: a?.name ?? b.symbol,
					units: b.units,
					lastPriceMinor: priceMinor,
					valueMinor,
					dayChangeBps,
					dayChangeMinor: valueMinor - priorValueMinor
				};
			})
			.sort((x, y) => y.valueMinor - x.valueMinor);
	}

	/** Total EUR value of every held position, minor units. */
	get totalValueMinor(): number {
		revision.value;
		return this.balances.reduce((sum, p) => sum + p.valueMinor, 0);
	}

	/** Buying power for a buy = the EUR Main wallet's available balance. */
	get buyingPowerMinor(): number {
		revision.value;
		return accounts.primary.availableMinor;
	}

	/** The held quantity for a symbol, decimal units. */
	balanceUnits(symbol: string): number {
		revision.value;
		return getCryptoBalance(symbol);
	}

	/** The whole on-chain-style activity log, newest first. */
	get activity(): CryptoTx[] {
		revision.value;
		return getCryptoActivity();
	}

	/** The activity log filtered to one asset. */
	activityFor(symbol: string): CryptoTx[] {
		revision.value;
		return getCryptoActivityFor(symbol);
	}

	// ── Buy / sell ticket: the draft ────────────────────────────────────────────

	/** The buy/sell ticket's working draft — ephemeral, never persisted. */
	tradeDraft = $state<TradeDraft>(emptyTradeDraft('BTC', 'buy'));

	/** Open the trade ticket for a symbol + side — units mode, nothing entered. */
	openTrade(symbol: CryptoSymbol, side: TradeSide) {
		this.tradeDraft = emptyTradeDraft(symbol, side);
	}

	/** Merge a partial patch into the trade draft. */
	setTrade(patch: Partial<TradeDraft>) {
		this.tradeDraft = { ...this.tradeDraft, ...patch };
	}

	// ── Buy / sell ticket: the live preview ─────────────────────────────────────

	/**
	 * Derive the cost preview from the trade draft + the asset quote. In cash mode
	 * the units are derived from the EUR figure (cash ÷ price). Money is rounded to
	 * integer minor units after each × price so nothing drifts.
	 */
	tradePreview(): TradePreview {
		const d = this.tradeDraft;
		const a = getCryptoAsset(d.symbol);
		const priceMinor = a?.lastPriceMinor ?? 0;

		// In cash mode the units fall out of the EUR figure ÷ the (cents) price.
		const units = d.mode === 'cash' ? (priceMinor > 0 ? d.cashMinor / priceMinor : 0) : d.units;

		const grossMinor = Math.round(units * priceMinor);
		const feeMinor = tradeFee(grossMinor);
		const totalMinor = d.side === 'buy' ? grossMinor + feeMinor : grossMinor - feeMinor;
		const spendableMinor = accounts.primary.availableMinor;

		return {
			units,
			priceMinor,
			grossMinor,
			feeMinor,
			totalMinor,
			spendableMinor,
			insufficientFunds: d.side === 'buy' && totalMinor > spendableMinor,
			insufficientUnits: d.side === 'sell' && units > getCryptoBalance(d.symbol)
		};
	}

	// ── Buy / sell ticket: placement (the EUR cash spine) ───────────────────────

	/**
	 * Commit the trade. Guards on the preview (a positive quantity, enough cash on a
	 * buy, enough held on a sell) → returns null otherwise. Then it does two things:
	 * moves the EUR **cash** on the F03 transactions spine (modelled on `rewards.redeem`
	 * — a `Transaction` against the Main wallet, signed by direction) and records the
	 * crypto leg in the data layer. A buy DEBITS the wallet by the total (gross + fee)
	 * and adds the crypto; a sell CREDITS the wallet by the net (gross − fee) and
	 * removes the crypto. Bumps the revision, toasts success, returns the crypto tx.
	 */
	placeTrade(): CryptoTx | null {
		const p = this.tradePreview();
		const d = this.tradeDraft;
		if (p.units <= 0 || p.insufficientFunds || p.insufficientUnits) return null;

		const wallet = accounts.primary;
		const display = `${formatUnits(d.symbol, p.units)} ${d.symbol}`;

		if (d.side === 'buy') {
			// Debit the EUR Main wallet by the all-in total (a settled outflow).
			const debit: Transaction = {
				id: 'crypto-buy-' + wallet.id + '-' + getTransactions().length,
				walletId: wallet.id,
				date: isoDate(TODAY),
				merchant: 'Crypto purchase',
				category: 'transfers',
				type: 'fx',
				status: 'settled',
				amountMinor: -p.totalMinor, // negative → outflow
				currency: 'EUR',
				runningBalanceMinor: wallet.currentMinor - p.totalMinor,
				reference: `Bought ${display}`
			};
			appendTransaction(debit);
			const tx = recordBuy(d.symbol, p.units, p.grossMinor);
			revision.bump();
			toast(`Bought ${display}`, { status: 'success' });
			return tx;
		}

		// Sell: credit the EUR Main wallet by the net proceeds (a settled inflow).
		const credit: Transaction = {
			id: 'crypto-sell-' + wallet.id + '-' + getTransactions().length,
			walletId: wallet.id,
			date: isoDate(TODAY),
			merchant: 'Crypto sale',
			category: 'transfers',
			type: 'fx',
			status: 'settled',
			amountMinor: p.totalMinor, // positive → inflow (gross − fee)
			currency: 'EUR',
			runningBalanceMinor: wallet.currentMinor + p.totalMinor,
			reference: `Sold ${display}`
		};
		appendTransaction(credit);
		const tx = recordSell(d.symbol, p.units, p.grossMinor);
		revision.bump();
		toast(`Sold ${display}`, { status: 'success' });
		return tx;
	}

	// ── Send ticket: the draft ──────────────────────────────────────────────────

	/** The on-chain send ticket's working draft — ephemeral, never persisted. */
	sendDraft = $state<SendDraft>(emptySendDraft('BTC'));

	/** Open the send ticket for a symbol, seeded to its first network. */
	openSend(symbol: CryptoSymbol) {
		this.sendDraft = emptySendDraft(symbol);
	}

	/** Merge a partial patch into the send draft. */
	setSend(patch: Partial<SendDraft>) {
		this.sendDraft = { ...this.sendDraft, ...patch };
	}

	/** Whether the recipient address is valid for the chosen network. */
	get sendAddressCheck(): AddressCheck {
		return validateAddress(this.sendDraft.network, this.sendDraft.toAddress);
	}

	/**
	 * True when the address clearly belongs to a DIFFERENT network than the one
	 * chosen — a warning, not a hard block (the validity check is the block).
	 */
	get sendNetworkMismatch(): boolean {
		const inferred = inferNetwork(this.sendDraft.toAddress);
		return inferred !== null && inferred !== this.sendDraft.network;
	}

	// ── Send ticket: the live preview ───────────────────────────────────────────

	/** Derive the send preview from the draft + the network fee schedule. */
	sendPreview(): SendPreview {
		const d = this.sendDraft;
		const a = getCryptoAsset(d.symbol);
		const priceMinor = a?.lastPriceMinor ?? 0;
		const fee = networkFee(d.network);
		const balanceUnits = getCryptoBalance(d.symbol);

		return {
			units: d.units,
			valueMinor: Math.round(d.units * priceMinor), // round after × price
			feeMinor: fee.feeMinor,
			eta: fee.eta,
			balanceUnits,
			insufficient: d.units > balanceUnits
		};
	}

	/** Whether the send's EUR value is large enough to need step-up re-auth (≥ €1,000). */
	get sendNeedsStepUp(): boolean {
		return this.sendPreview().valueMinor >= SEND_STEPUP_MINOR;
	}

	/** My deterministic receive address for an asset on a network. */
	receiveAddressFor(symbol: CryptoSymbol, network: Network): string {
		return receiveAddress(symbol, network);
	}

	// ── Send ticket: placement (crypto leaves; no EUR moves) ────────────────────

	/**
	 * Commit the send. Guards on a valid recipient address + a positive quantity
	 * that's within the held balance → returns null otherwise. Records the crypto
	 * leg (it lands Confirming on-chain); NO EUR moves. Bumps the revision, toasts
	 * an info "submitted" note, returns the crypto tx.
	 */
	placeSend(): CryptoTx | null {
		const d = this.sendDraft;
		const p = this.sendPreview();
		if (!this.sendAddressCheck.ok || p.units <= 0 || p.insufficient) return null;

		const priceMinor = getCryptoAsset(d.symbol)?.lastPriceMinor ?? 0;
		const feeUnits = priceMinor > 0 ? p.feeMinor / priceMinor : 0;
		const tx = recordSend(d.symbol, p.units, p.valueMinor, d.network, feeUnits);
		revision.bump();
		toast('Send submitted — confirming on-chain', { status: 'info' });
		return tx;
	}
}

export const crypto = new CryptoState();
