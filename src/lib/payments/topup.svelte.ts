// Top-up draft state (P09) — destination wallet, amount, funding source — plus the
// commit that adds the money. Card top-ups settle instantly (optimistic); bank /
// open-banking land pending. Reads touch the shared `revision` so the wallet
// balance the success screen links to is live. Mirrors the other payment draft states.

import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { getWallets, topUp } from '$lib/data';
import type { Wallet } from '$lib/data';
import { formatMoney } from '$lib/format';
import {
	FUNDING_SOURCES,
	getSource,
	sourceFeeMinor,
	limitError,
	withinLimits,
	LARGE_TOPUP_MINOR
} from './topup';
import type { FundingSource } from './topup';

export interface TopUpReceipt {
	walletId: string;
	walletName: string;
	currency: string;
	amountMinor: number;
	source: FundingSource;
	settled: boolean;
	txnId: string;
}

class TopUpState {
	walletId = $state('eur-main');
	amountMinor = $state(0);
	sourceId = $state('src-card');

	wallets(): Wallet[] {
		revision.value;
		return getWallets();
	}

	wallet(): Wallet | undefined {
		revision.value;
		return getWallets().find((w) => w.id === this.walletId);
	}

	sources(): FundingSource[] {
		return FUNDING_SOURCES;
	}

	source(): FundingSource {
		return getSource(this.sourceId) ?? FUNDING_SOURCES[0];
	}

	feeMinor(): number {
		return sourceFeeMinor(this.source());
	}

	isInstant(): boolean {
		return this.source().instant;
	}

	/** Reward-early limit reason ('below-min' | 'above-max' | null). */
	limitReason(): string | null {
		return limitError(this.source(), this.amountMinor);
	}

	needsStepUp(): boolean {
		return this.amountMinor >= LARGE_TOPUP_MINOR;
	}

	valid(): boolean {
		return this.amountMinor > 0 && withinLimits(this.source(), this.amountMinor);
	}

	setWallet(id: string): void {
		this.walletId = id;
	}
	setAmount(minor: number): void {
		this.amountMinor = Math.max(0, minor);
	}
	setSource(id: string): void {
		this.sourceId = id;
	}

	/** Commit the top-up. Returns a receipt, or null if invalid. */
	commit(): TopUpReceipt | null {
		if (!this.valid()) return null;
		const w = this.wallet();
		if (!w) return null;
		const src = this.source();
		const txnId = topUp(this.walletId, this.amountMinor, src.instant);
		if (!txnId) return null;
		revision.bump();
		const amount = formatMoney(this.amountMinor, w.currency);
		if (src.instant) {
			toast(`Added ${amount} to ${w.name}`, { status: 'success' });
		} else {
			toast(`${amount} top-up processing`, { status: 'info' });
		}
		return {
			walletId: w.id,
			walletName: w.name,
			currency: w.currency,
			amountMinor: this.amountMinor,
			source: src,
			settled: src.instant,
			txnId
		};
	}

	reset(): void {
		this.amountMinor = 0;
		this.sourceId = 'src-card';
	}
}

export const topup = new TopUpState();
export { FUNDING_SOURCES, LARGE_TOPUP_MINOR } from './topup';
export type { FundingSource, FundingType } from './topup';
