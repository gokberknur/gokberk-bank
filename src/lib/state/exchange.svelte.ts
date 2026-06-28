// Multi-currency FX exchange runtime state (P04) — convert between my own currency
// wallets at a live-ish, tier-margined rate. The amounts are LINKED: I type one
// side and the other is computed off the pure quote engine (`fx.ts`), so From and
// To stay in lockstep. A convert settles instantly — the bank owns both wallets —
// so it records a matched pair on the F03 spine (an FX-OUT debit on the From wallet
// and an FX-IN credit on the To wallet, mirroring payments.svelte.ts's own-wallet
// transfer), then bumps the shared `revision` signal so every surface re-flows.
//
// Everything is deterministic: the rates are fixed seed values, the margin is
// per-tier (Metal waives it), and the 30-second countdown is pure UX — a re-quote
// at zero returns the SAME numbers, it just resets the clock. No Date.now / random.

import { getWallets, getTransactions, appendTransaction } from '$lib/data';
import type { Wallet, Transaction } from '$lib/data';
import { toEur } from '$lib/data/money';
import { TODAY, isoDate } from '$lib/data/time';
import {
	quote as fxQuote,
	quoteForTarget,
	midRateScaled,
	yourRateScaled,
	marginBps as fxMarginBps,
	MIN_FROM_MINOR,
	QUOTE_TTL_SECONDS
} from '$lib/payments/fx';
import type { Quote, Currency, Tier } from '$lib/payments/fx';
import { session } from '$lib/state/session.svelte';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';

/** A high-value own-money move warrants a step-up: EUR-equivalent ≥ €10,000. */
const STEP_UP_EUR_MINOR = 1_000_000;

class ExchangeState {
	fromId = $state('eur-main');
	toId = $state('usd-travel');
	/** Amount on the From side (minor units of the From currency). */
	fromMinor = $state(0);
	/** Amount on the To side (minor units of the To currency). */
	toMinor = $state(0);
	/** Which side I last typed — the other is the computed one. */
	editing = $state<'from' | 'to'>('from');
	/** The refresh countdown (seconds). */
	secondsLeft = $state(QUOTE_TTL_SECONDS);

	// One ticking interval at a time — guards `startClock` against stacking.
	#clockRunning = false;

	// ── Derivations (revision-reactive where they read the wallet spine) ──

	/** My own currency wallets (each is an EUR/USD/GBP/SEK wallet). */
	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	/** The selected From wallet, or undefined if its id no longer resolves. */
	fromWallet(): Wallet | undefined {
		return this.wallets().find((w) => w.id === this.fromId);
	}

	/** The selected To wallet, or undefined if its id no longer resolves. */
	toWallet(): Wallet | undefined {
		return this.wallets().find((w) => w.id === this.toId);
	}

	/** The From currency (defaults to EUR before a wallet resolves). */
	fromCurrency(): Currency {
		return this.fromWallet()?.currency ?? 'EUR';
	}

	/** The To currency (defaults to EUR before a wallet resolves). */
	toCurrency(): Currency {
		return this.toWallet()?.currency ?? 'EUR';
	}

	/** The active tier (drives the margin) — the signed-in user's. */
	tier(): Tier {
		return session.tier;
	}

	/** The live quote for the current From amount, From/To pair, and tier. */
	quote(): Quote {
		return fxQuote(this.fromCurrency(), this.toCurrency(), this.fromMinor, this.tier());
	}

	/** Whether From and To are the same currency (can't exchange a pair with itself). */
	samePair(): boolean {
		return this.fromCurrency() === this.toCurrency();
	}

	/** Mid cross-rate (To per 1 From, ×1e6) — the rate-card reference. */
	midScaled(): number {
		return midRateScaled(this.fromCurrency(), this.toCurrency());
	}

	/** My cross-rate after the tier margin (To per 1 From, ×1e6). */
	yourScaled(): number {
		return yourRateScaled(this.fromCurrency(), this.toCurrency(), this.tier());
	}

	/** The applied margin in basis points (0 on Metal → "No markup"). */
	marginBps(): number {
		return fxMarginBps(this.tier());
	}

	// ── Linked amounts — set one side, compute the other off the quote ──

	/** Type the From amount; recompute the To side from the forward quote. */
	setFrom(minor: number): void {
		this.editing = 'from';
		this.fromMinor = minor;
		this.toMinor = fxQuote(this.fromCurrency(), this.toCurrency(), minor, this.tier()).receiveMinor;
	}

	/** Type the To (target) amount; recompute the From cost from the inverse quote. */
	setTo(minor: number): void {
		this.editing = 'to';
		this.toMinor = minor;
		this.fromMinor = quoteForTarget(
			this.fromCurrency(),
			this.toCurrency(),
			minor,
			this.tier()
		).fromMinor;
	}

	/** Re-derive the COMPUTED side from the typed side (after a wallet/pair change). */
	recompute(): void {
		if (this.editing === 'from') {
			this.toMinor = fxQuote(
				this.fromCurrency(),
				this.toCurrency(),
				this.fromMinor,
				this.tier()
			).receiveMinor;
		} else {
			this.fromMinor = quoteForTarget(
				this.fromCurrency(),
				this.toCurrency(),
				this.toMinor,
				this.tier()
			).fromMinor;
		}
	}

	// ── Wallet selection ──

	/** An own wallet whose id differs from `excludeId` (for keeping From ≠ To). */
	#pickOther(excludeId: string): string {
		return this.wallets().find((w) => w.id !== excludeId)?.id ?? excludeId;
	}

	/** Choose the From wallet; if it collides with To, move To aside, then recompute. */
	setFromWallet(id: string): void {
		this.fromId = id;
		if (this.toId === this.fromId) this.toId = this.#pickOther(this.fromId);
		this.recompute();
	}

	/** Choose the To wallet; if it collides with From, move From aside, then recompute. */
	setToWallet(id: string): void {
		this.toId = id;
		if (this.fromId === this.toId) this.fromId = this.#pickOther(this.toId);
		this.recompute();
	}

	/** Flip the pair, carry the To amount onto the new From side, and reset the clock. */
	swap(): void {
		const prevToMinor = this.toMinor;
		const prevFromId = this.fromId;
		this.fromId = this.toId;
		this.toId = prevFromId;
		// The old To currency is now From, so its amount carries over; recompute the rest.
		this.editing = 'from';
		this.fromMinor = prevToMinor;
		this.recompute();
		this.resetClock();
	}

	// ── Validation (reward-early) ──

	/** A non-zero amount that's still under the smallest convertible amount. */
	belowMin(): boolean {
		return this.fromMinor > 0 && this.fromMinor < MIN_FROM_MINOR;
	}

	/** The From amount exceeds what's spendable in the From wallet. */
	insufficientFunds(): boolean {
		const fw = this.fromWallet();
		return !!fw && this.fromMinor > fw.availableMinor;
	}

	/** A high-value own-money move (EUR-equivalent ≥ €10k) warrants a step-up. */
	needsStepUp(): boolean {
		return toEur(this.fromMinor, this.fromCurrency()) >= STEP_UP_EUR_MINOR;
	}

	/** Everything the convert needs: a real cross-pair, funded, at/above the floor. */
	valid(): boolean {
		return (
			!this.samePair() &&
			this.fromMinor >= MIN_FROM_MINOR &&
			!this.insufficientFunds() &&
			this.toMinor > 0
		);
	}

	// ── Countdown — a rune timer (one interval, ticked off a $state counter) ──

	/**
	 * Begin the refresh countdown. Idempotent: a second call while a clock is live
	 * no-ops. The surface calls this from an onMount `$effect`, so the nested effect
	 * here tears down with it — the interval is cleared and the guard released. At
	 * zero the clock resets and re-quotes; since prices are deterministic the numbers
	 * don't move, the countdown is purely UX.
	 */
	startClock(): void {
		if (this.#clockRunning) return;
		this.#clockRunning = true;
		$effect(() => {
			const id = setInterval(() => {
				this.secondsLeft -= 1;
				if (this.secondsLeft <= 0) {
					this.secondsLeft = QUOTE_TTL_SECONDS;
					this.recompute();
				}
			}, 1000);
			return () => {
				clearInterval(id);
				this.#clockRunning = false;
			};
		});
	}

	/** Reset the countdown to a full window. */
	resetClock(): void {
		this.secondsLeft = QUOTE_TTL_SECONDS;
	}

	// ── Commit — instant settlement (the bank owns both wallets) ──

	/**
	 * Convert the typed From amount into the To wallet. Guards `valid()` → null.
	 * Records a matched, already-settled pair on the F03 spine — an FX-OUT debit on
	 * the From wallet and an FX-IN credit on the To wallet (mirroring the own-wallet
	 * transfer in payments.svelte.ts, but cross-currency) — bumps `revision`, toasts,
	 * resets the amounts, and returns a receipt. Ids and the reference are derived
	 * deterministically (no Date.now / random).
	 */
	convert(): { reference: string; fromMinor: number; toMinor: number; from: Currency; to: Currency } | null {
		if (!this.valid()) return null;

		const fw = this.fromWallet();
		const tw = this.toWallet();
		if (!fw || !tw) return null;

		const fromMinor = this.fromMinor;
		const toMinor = this.toMinor;
		const from = fw.currency;
		const to = tw.currency;

		// Deterministic reference, shared across the matched pair (e.g. 'FX-000042').
		const reference = 'FX-' + String(getTransactions().length).padStart(6, '0');
		const date = isoDate(TODAY);

		// FX-OUT — the debit on the From wallet. Settled, so the running balance is
		// the post-move settled balance.
		const out: Transaction = {
			id: 'fx-out-' + fw.id + '-' + getTransactions().length,
			walletId: fw.id,
			date,
			merchant: 'Currency exchange',
			category: 'transfers',
			type: 'fx',
			status: 'settled',
			amountMinor: -fromMinor,
			currency: from,
			runningBalanceMinor: fw.currentMinor - fromMinor,
			reference
		};
		appendTransaction(out);

		// FX-IN — the matched credit on the To wallet.
		const incoming: Transaction = {
			id: 'fx-in-' + tw.id + '-' + getTransactions().length,
			walletId: tw.id,
			date,
			merchant: 'Currency exchange',
			category: 'transfers',
			type: 'fx',
			status: 'settled',
			amountMinor: toMinor,
			currency: to,
			runningBalanceMinor: tw.currentMinor + toMinor,
			reference
		};
		appendTransaction(incoming);

		revision.bump();
		toast(`Converted ${from} → ${to}`, { status: 'success' });

		// Clear the amounts back to a fresh From-side draft.
		this.fromMinor = 0;
		this.toMinor = 0;
		this.editing = 'from';

		return { reference, fromMinor, toMinor, from, to };
	}

	/** Discard the working amounts and reset the countdown. */
	reset(): void {
		this.fromMinor = 0;
		this.toMinor = 0;
		this.editing = 'from';
		this.resetClock();
	}
}

export const exchange = new ExchangeState();

export { MIN_FROM_MINOR, QUOTE_TTL_SECONDS } from '$lib/payments/fx';
export type { Quote, Currency, Tier } from '$lib/payments/fx';
