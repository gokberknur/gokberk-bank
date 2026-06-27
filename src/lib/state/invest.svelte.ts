// Investing runtime state — the portfolio reads + the order ticket (draft → live
// cost preview → placement). The portfolio side is a thin reactive face over the
// pure F03 portfolio derivations: positions, summary, allocation, the performance
// series and quote helpers are all REDUCED from the market seed, so they're read
// fresh and never cached here. The ticket side holds one ephemeral draft and turns
// it into a confirmed Order (V03 money spine): a deterministic terminal state, a
// disclosed fee, and FX when the instrument's currency isn't the funding wallet's.
//
// Scope note (this slice): placing an order does NOT mutate HOLDINGS — positions,
// summary and allocation stay derived from the fixed seed. Orders only land in the
// in-memory `orders` list (so V04 can list them). Both the draft and the orders are
// ephemeral this phase: in-memory only, re-derived from the seed every boot, never
// persisted and never browser-guarded (there's nothing durable to guard).

import {
	getPositions,
	getPortfolioSummary,
	getAllocation,
	performanceSeries,
	instrumentOf
} from '$lib/data/portfolio';
import type { Position, PortfolioSummary } from '$lib/data/portfolio';
import { isMarketOpen } from '$lib/data/market';
import type {
	Instrument,
	Order,
	OrderSide,
	OrderKind,
	OrderTif,
	OrderStatus,
	Range
} from '$lib/data/market';
import { accounts } from '$lib/state/accounts.svelte';
import { toEur, midRateEur } from '$lib/data/money';
import { TODAY, isoDate } from '$lib/data/time';

/** Whether the amount is entered as a share count or a cash (notional) figure. */
export type OrderMode = 'shares' | 'notional';

/** The in-flight order-ticket draft (the V03 trade form's working state). */
export interface OrderDraft {
	symbol: string;
	side: OrderSide;
	kind: OrderKind;
	mode: OrderMode;
	/** Share count when `mode === 'shares'`. */
	quantity: number;
	/** Cash amount in EUR minor units when `mode === 'notional'`. */
	notionalEurMinor: number;
	/** Limit/stop trigger price, minor units (instrument ccy), or null for market. */
	limitMinor: number | null;
	tif: OrderTif;
}

/** The live cost preview derived from the draft + the instrument quote. */
export interface OrderPreview {
	instrument: Instrument | undefined;
	side: OrderSide;
	/** Resolved execution price, minor units, INSTRUMENT currency. */
	effectivePriceMinor: number;
	/** The quantity that would actually trade (whole-share-adjusted when needed). */
	effectiveQuantity: number;
	/** True when a fractional qty was rounded DOWN because the instrument is whole-share only. */
	wholeShareAdjusted: boolean;
	/** Estimated trade value (qty × price), EUR minor units. */
	estTotalEurMinor: number;
	feeEurMinor: number;
	/** Buy: total + fee. Sell: total − fee. EUR minor units. */
	grandTotalEurMinor: number;
	/** Present only when the instrument trades in a non-EUR currency. */
	fx: { rate: number; note: string } | null;
	buyingPowerEurMinor: number;
	buyingPowerAfterEurMinor: number;
	/** Buy & the grand total exceeds buying power. */
	insufficient: boolean;
	/** Sell & the quantity exceeds the held position. */
	exceedsHolding: boolean;
	/** Limit/stop price deviates more than 20% from the last traded price. */
	limitFarFromMarket: boolean;
}

/** A fresh, empty draft (no symbol bound yet). */
function emptyDraft(): OrderDraft {
	return {
		symbol: '',
		side: 'buy',
		kind: 'market',
		mode: 'shares',
		quantity: 0,
		notionalEurMinor: 0,
		limitMinor: null,
		tif: 'day'
	};
}

/**
 * The order fee schedule (pure): a flat €1 floor, or 0.25% of the EUR notional,
 * whichever is larger. Integer minor units throughout — €1 = 100, 0.25% = ×0.0025.
 */
export function orderFee(notionalEurMinor: number): number {
	return Math.max(100, Math.round(notionalEurMinor * 0.0025));
}

/** How far a limit/stop may sit from the last price before we flag it (20%). */
const FAR_FROM_MARKET_BPS = 0.2;

class InvestState {
	// ── Portfolio reads (deterministic from the seed; orders don't mutate them) ──

	/** All open positions, value-sorted (EUR minor units throughout). */
	get positions(): Position[] {
		return getPositions();
	}

	/** Roll-up: total value, cost, P/L, day change, total return. */
	get summary(): PortfolioSummary {
		return getPortfolioSummary();
	}

	/** Allocation by asset class, value-sorted. */
	get allocation() {
		return getAllocation();
	}

	/** The instrument by symbol, or undefined. */
	instrument(symbol: string): Instrument | undefined {
		return instrumentOf(symbol);
	}

	/** The held position for a symbol, or undefined when not held. */
	position(symbol: string): Position | undefined {
		return getPositions().find((p) => p.instrument.symbol === symbol);
	}

	/** The portfolio value series for a range (EUR minor units per session). */
	performance(range: Range) {
		return performanceSeries(range);
	}

	/** Whether the market is currently open (drives Filled vs Queued). */
	get marketOpen(): boolean {
		return isMarketOpen();
	}

	// ── Performance chart range ──

	range = $state<Range>('1Y');

	setRange(r: Range) {
		this.range = r;
	}

	// ── Order ticket: the draft ──

	// Ephemeral this phase — one in-memory draft per visit, never persisted.
	draft = $state<OrderDraft>(emptyDraft());

	/** Seed the draft for a symbol — a market, shares, zero-qty buy by default. */
	openTicket(symbol: string, side: OrderSide = 'buy') {
		this.draft = { ...emptyDraft(), symbol, side };
	}

	/** Merge a partial patch into the working draft. */
	setDraft(patch: Partial<OrderDraft>) {
		this.draft = { ...this.draft, ...patch };
	}

	/** Discard the working draft back to empty. */
	resetTicket() {
		this.draft = emptyDraft();
	}

	// ── Order ticket: the live cost preview ──

	/**
	 * Derive the cost preview from the current draft + the instrument quote.
	 * Reads `accounts.primary` (the EUR Main wallet) for buying power, so it
	 * re-flows reactively with the rest of the spine.
	 */
	preview(): OrderPreview {
		const d = this.draft;
		const inst = instrumentOf(d.symbol);
		const buyingPowerEurMinor = accounts.primary.availableMinor;

		// No instrument resolved → a zeroed, inert preview.
		if (!inst) {
			return {
				instrument: undefined,
				side: d.side,
				effectivePriceMinor: 0,
				effectiveQuantity: 0,
				wholeShareAdjusted: false,
				estTotalEurMinor: 0,
				feeEurMinor: 0,
				grandTotalEurMinor: 0,
				fx: null,
				buyingPowerEurMinor,
				buyingPowerAfterEurMinor: buyingPowerEurMinor,
				insufficient: false,
				exceedsHolding: false,
				limitFarFromMarket: false
			};
		}

		// Effective price: the limit/stop trigger when set, else the last traded price.
		const effectivePriceMinor =
			(d.kind === 'limit' || d.kind === 'stop') && d.limitMinor !== null
				? d.limitMinor
				: inst.lastPriceMinor;
		// Same price expressed in the funding (EUR) currency, for the notional → qty math.
		const priceEurMinor = toEur(effectivePriceMinor, inst.currency);

		// Resolve the raw quantity from the active mode.
		const rawQuantity =
			d.mode === 'notional'
				? priceEurMinor > 0
					? d.notionalEurMinor / priceEurMinor
					: 0
				: d.quantity;

		// Respect the instrument's fractional rule: whole-share names round DOWN.
		const effectiveQuantity = inst.fractionalAllowed ? rawQuantity : Math.floor(rawQuantity);
		const wholeShareAdjusted = !inst.fractionalAllowed && effectiveQuantity !== rawQuantity;

		// Estimated value: qty × price in instrument ccy, then converted to EUR once.
		const estTotalEurMinor = toEur(
			Math.round(effectiveQuantity * effectivePriceMinor),
			inst.currency
		);
		const feeEurMinor = orderFee(estTotalEurMinor);
		const grandTotalEurMinor =
			d.side === 'buy' ? estTotalEurMinor + feeEurMinor : estTotalEurMinor - feeEurMinor;

		// FX disclosure when the instrument doesn't trade in EUR.
		const fx =
			inst.currency !== 'EUR'
				? {
						rate: midRateEur(inst.currency),
						note: `Converted at the ${inst.currency}/EUR mid-rate; the final rate may differ.`
					}
				: null;

		// Buying power after the move: a buy spends it, a sell returns it.
		const buyingPowerAfterEurMinor =
			d.side === 'buy'
				? buyingPowerEurMinor - grandTotalEurMinor
				: buyingPowerEurMinor + grandTotalEurMinor;

		// Reward-early flags (drive the UI's alerts + the placement guard).
		const insufficient = d.side === 'buy' && grandTotalEurMinor > buyingPowerEurMinor;
		const held = this.position(d.symbol)?.quantity ?? 0;
		const exceedsHolding = d.side === 'sell' && effectiveQuantity > held;
		const limitFarFromMarket =
			(d.kind === 'limit' || d.kind === 'stop') &&
			d.limitMinor !== null &&
			inst.lastPriceMinor > 0 &&
			Math.abs(d.limitMinor - inst.lastPriceMinor) / inst.lastPriceMinor > FAR_FROM_MARKET_BPS;

		return {
			instrument: inst,
			side: d.side,
			effectivePriceMinor,
			effectiveQuantity,
			wholeShareAdjusted,
			estTotalEurMinor,
			feeEurMinor,
			grandTotalEurMinor,
			fx,
			buyingPowerEurMinor,
			buyingPowerAfterEurMinor,
			insufficient,
			exceedsHolding,
			limitFarFromMarket
		};
	}

	// ── Order ticket: placement ──

	// Placed orders, in memory only this phase (V04 lists them); never persisted.
	orders = $state<Order[]>([]);

	/** The placed orders, newest first. */
	get recentOrders(): Order[] {
		return [...this.orders].reverse();
	}

	/**
	 * Commit the current draft as an Order. Guards on the blocking preview flags
	 * (insufficient buying power on a buy, over-holding on a sell) → returns null.
	 * The terminal state is derived deterministically: a market order fills when the
	 * market is open and queues when it's closed; a limit/stop rests as working.
	 * NOTE: this does NOT mutate HOLDINGS in this slice — the portfolio reads stay
	 * derived from the fixed seed; only the orders list grows.
	 */
	placeOrder(): Order | null {
		const p = this.preview();
		if (p.insufficient || p.exceedsHolding) return null;

		const d = this.draft;
		const status: OrderStatus =
			d.kind === 'market' ? (this.marketOpen ? 'filled' : 'queued') : 'working';

		const order: Order = {
			id: 'ord-' + this.orders.length,
			symbol: d.symbol,
			side: d.side,
			kind: d.kind,
			quantity: p.effectiveQuantity,
			priceMinor: d.kind === 'market' ? null : d.limitMinor,
			tif: d.tif,
			status,
			totalEurMinor: p.grandTotalEurMinor,
			placedAt: isoDate(TODAY)
		};
		this.orders.push(order);
		return order;
	}
}

export const invest = new InvestState();
