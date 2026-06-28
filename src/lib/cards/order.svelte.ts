// Card order / replace runtime state (C02) — the order-a-new-card / replace-a-card
// wizard's working state, the funding-wallet picker reads, the live fee/ETA
// derivations, and the two terminal commits (`placeOrder`, `placeReplacement`),
// over the pure issuing layer (`$lib/cards/issuing` for the catalog + factory) and
// the F03 data spine (`$lib/data` for `addCard` / `cancelCard` / the wallet + card
// reads). Like the rest of the spine this is **revision-reactive**: every getter
// that reads the cards/wallets spine touches `revision.value` to take a dependency
// on the shared signal, and every commit calls `revision.bump()` after `addCard` /
// `cancelCard` so the wallet, the cards hub, and the freshly-issued card all re-flow
// at once. Deterministic — the factory hashes its ids/numbers off a monotonic seed;
// nothing here reaches for Date.now / Math.random / argless `new Date()`.
//
// The four-step wizard rides the F05 composite (`createWizard`): `wizard.data` IS the
// `$state` draft (fields write into it directly). Every choice has a sensible default,
// so no step needs a forward-gating validator; instead the physical-only `delivery`
// step declares `canEnter` so the store skips it for a virtual / disposable card.

import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
import type { Wizard } from '$lib/components/wizard/wizard-store.svelte';
import type { StepDef } from '$lib/components/wizard/types';
import {
	cardTypeOption,
	deliveryOption,
	deliveryEta,
	makeCard
} from '$lib/cards/issuing';
import type { CardTypeOption, DeliveryOption } from '$lib/cards/issuing';
import { getWallets, getWallet, getCard, addCard, cancelCard } from '$lib/data';
import type { Card, Wallet } from '$lib/data';
import type { CardType, CardDesign } from '$lib/data/types';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';

// Re-export the pure catalog + types the C02 surface is authored against, so it
// imports everything it needs from this one runtime module.
export { CARD_TYPES, CARD_DESIGNS, DELIVERY_OPTIONS } from '$lib/cards/issuing';
export type { CardTypeOption, CardDesignOption, DeliveryOption } from '$lib/cards/issuing';
export type { CardType, CardDesign } from '$lib/data/types';

/** The in-flight order draft (the C02 wizard's working state; persisted as a draft). */
export interface OrderData {
	/** The kind of card to issue. */
	type: CardType;
	/** The card art treatment. */
	design: CardDesign;
	/** The funding wallet (a `Wallet.id`). */
	walletId: string;
	/** How a physical card is shipped — ignored for an instant (virtual/disposable) card. */
	delivery: 'standard' | 'tracked';
}

/** The flow id — completes the wizard's `gok-bank-wizard-<flowId>` draft key. */
const FLOW_ID = 'card-order';

/** The default funding wallet — the primary EUR home wallet. */
const DEFAULT_WALLET = 'eur-main';

/** A fresh order draft — a new object each call so resets never share state. */
function emptyOrder(): OrderData {
	return {
		type: 'physical',
		design: 'ink',
		walletId: DEFAULT_WALLET,
		delivery: 'standard'
	};
}

/**
 * The four wizard steps (ids double as the `[step]` URL segments). No step needs a
 * validator — every choice has a default — so the flow always advances. The
 * `delivery` step is physical-only: its `canEnter` returns false for an instant card,
 * and the store skips it in goNext/goBack (so a virtual/disposable order goes type →
 * design → review).
 */
const ORDER_STEPS: StepDef<OrderData>[] = [
	{ id: 'type', title: 'Card type' },
	{ id: 'design', title: 'Design' },
	{ id: 'delivery', title: 'Delivery', canEnter: (d) => d.type === 'physical' },
	{ id: 'review', title: 'Review' }
];

/**
 * The C02 card-order state — the wizard draft + the derivations the order/replace
 * flow reads (the chosen type/delivery, whether it's physical, the live ETA + fee,
 * the funding wallets), the two entry points (`startOrder` / `startReplace`), and the
 * two terminal commits. The flow surface drives the wizard through `cardOrder.wizard`
 * and reads `cardOrder.wizard.data` for the fields; everything that touches the data
 * spine flows through here.
 */
class CardOrderState {
	/** The order/replace wizard store — the Wizard.svelte shell drives the flow through this. */
	wizard: Wizard<OrderData> = createWizard<OrderData>({
		flowId: FLOW_ID,
		persist: true,
		steps: ORDER_STEPS,
		initialData: emptyOrder()
	});

	/** The card being replaced (a `Card.id`) when this is a replace flow, else null. */
	replacingId = $state<string | null>(null);

	// ── Order-flow derivations ──

	/** The chosen card type's catalog entry (fee, ceiling, instant-vs-delivered). */
	selectedType(): CardTypeOption {
		return cardTypeOption(this.wizard.data.type);
	}

	/** The chosen delivery option (label, ETA days, fee) — only meaningful when physical. */
	selectedDelivery(): DeliveryOption {
		return deliveryOption(this.wizard.data.delivery);
	}

	/** Whether the drafted card is physical (the one type that ships). */
	isPhysical(): boolean {
		return this.wizard.data.type === 'physical';
	}

	/** The ISO arrival date for a physical card, or null for an instant card. */
	eta(): string | null {
		return this.isPhysical() ? deliveryEta(this.wizard.data.delivery) : null;
	}

	/** The total issue fee (minor units): the type fee + the delivery fee when physical. */
	feeMinor(): number {
		return this.selectedType().feeMinor + (this.isPhysical() ? this.selectedDelivery().feeMinor : 0);
	}

	// ── Funding wallet picker (revision-reactive over the wallets spine) ──

	/** The fundable wallets for the picker — EUR-capable wallets. */
	wallets(): Wallet[] {
		revision.value;
		return getWallets().filter((w) => w.currency === 'EUR');
	}

	/** A readable label for a wallet id — its name + currency (falls back to the id). */
	walletLabel(id: string): string {
		revision.value;
		const wallet = getWallet(id);
		return wallet ? `${wallet.name} · ${wallet.currency}` : id;
	}

	// ── Replace context (revision-reactive over the cards spine) ──

	/** The card being replaced when a replace flow is in progress, else undefined. */
	replacingCard(): Card | undefined {
		revision.value;
		return this.replacingId ? getCard(this.replacingId) : undefined;
	}

	// ── Entry ──

	/** Open a fresh order flow — resets the draft and clears any replace context. */
	startOrder(): void {
		this.resetOrder();
		this.replacingId = null;
	}

	/**
	 * Open a replace flow for an existing card — resets the draft, marks the card being
	 * replaced, then seeds the draft from the old card's type/design/funding wallet so
	 * the flow pre-fills with a like-for-like order.
	 */
	startReplace(cardId: string): void {
		this.resetOrder();
		this.replacingId = cardId;
		const old = getCard(cardId);
		if (old) {
			this.wizard.data = {
				...emptyOrder(),
				type: old.type,
				design: old.design,
				walletId: old.walletId
			};
		}
	}

	// ── Commit (the terminal mints) ──

	/** The factory draft for the current order — delivery only carried for a physical card. */
	#draft(): { type: CardType; design: CardDesign; walletId: string; delivery?: 'standard' | 'tracked' } {
		const d = this.wizard.data;
		return {
			type: d.type,
			design: d.design,
			walletId: d.walletId,
			delivery: this.isPhysical() ? d.delivery : undefined
		};
	}

	/**
	 * Place the order. Mints the card via the issuing factory, admits it to the spine,
	 * bumps the revision so the wallet + cards hub re-flow, toasts (an instant card is
	 * ready to use; a physical one is on its way), then resets the draft so the flow
	 * starts clean. Returns the new card.
	 */
	placeOrder(): Card {
		const card = makeCard(this.#draft());
		addCard(card);
		revision.bump();
		toast(this.isPhysical() ? 'Card on its way' : 'Card ready to use', { status: 'success' });
		this.resetOrder();
		return card;
	}

	/**
	 * Place a replacement. Mints the new card, admits it, cancels the old card (it stops
	 * working immediately), bumps the revision so every card view re-flows, toasts, then
	 * clears the replace context and resets the draft. Returns the new card.
	 */
	placeReplacement(): Card {
		const card = makeCard(this.#draft());
		addCard(card);
		if (this.replacingId) cancelCard(this.replacingId);
		revision.bump();
		toast('Replacement ordered — old card cancelled', { status: 'success' });
		this.replacingId = null;
		this.resetOrder();
		return card;
	}

	/**
	 * Reset the wizard back to a fresh draft at step 0 — clears the persisted draft,
	 * re-seeds `data`, and resets the visited/error state. (The wizard store has no
	 * `reset()`; this mirrors the claims flow's `resetClaim()`.)
	 */
	resetOrder(): void {
		this.wizard.clearDraft();
		this.wizard.currentIndex = 0;
		this.wizard.data = emptyOrder();
		this.wizard.visited = this.wizard.steps.map((_, i) => i === 0);
		this.wizard.error = null;
	}
}

/** The shared singleton the C02 order/replace routes drive. */
export const cardOrder = new CardOrderState();
