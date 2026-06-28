// Card issuing (C02) — the pure catalog + factory behind the "order / replace a
// card" wizard. Card *types* (physical / virtual / disposable), their fees and
// issue mode; the *designs* on offer; *delivery* options + ETAs for a physical
// card; and a deterministic factory that mints a new `Card` for the spine. Money
// is integer minor units; everything is deterministic (ids + numbers hashed off a
// monotonic seed, dates off the fixed `TODAY` — no Date.now / Math.random). Mock:
// no real issuer, the PAN/CVV are fictional.

import { TODAY } from '$lib/data/time';
import type { Card, CardType, CardDesign, CardNetwork } from '$lib/data/types';

const HOLDER = 'GÖKBERK NUR';

export interface CardTypeOption {
	type: CardType;
	label: string;
	/** One-line plain description shown under the choice. */
	description: string;
	/** Issue fee, minor units (0 = free). */
	feeMinor: number;
	/** Issued instantly (virtual / disposable) vs delivered (physical). */
	instant: boolean;
	/** Default spend ceiling for a card of this type, minor units. */
	ceilingMinor: number;
}

export const CARD_TYPES: CardTypeOption[] = [
	{
		type: 'physical',
		label: 'Physical',
		description: 'A metal card shipped to me — tap, chip, and ATM.',
		feeMinor: 0,
		instant: false,
		ceilingMinor: 500_000
	},
	{
		type: 'virtual',
		label: 'Virtual',
		description: 'Issued instantly for online and in-wallet payments.',
		feeMinor: 0,
		instant: true,
		ceilingMinor: 300_000
	},
	{
		type: 'disposable',
		label: 'Disposable',
		description: 'A single-use number that regenerates after each payment.',
		feeMinor: 0,
		instant: true,
		ceilingMinor: 100_000
	}
];

export function cardTypeOption(type: CardType): CardTypeOption {
	return CARD_TYPES.find((t) => t.type === type) ?? CARD_TYPES[0];
}

export interface CardDesignOption {
	design: CardDesign;
	label: string;
	/** Short note on the look. */
	note: string;
}

export const CARD_DESIGNS: CardDesignOption[] = [
	{ design: 'ink', label: 'Ink', note: 'Near-black, quiet and editorial.' },
	{ design: 'mist', label: 'Mist', note: 'Soft neutral grey.' },
	{ design: 'forest', label: 'Forest', note: 'Deep green — the house accent.' }
];

export interface DeliveryOption {
	id: 'standard' | 'tracked';
	label: string;
	/** Working days to arrive. */
	etaDays: number;
	feeMinor: number;
	note: string;
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
	{ id: 'standard', label: 'Standard', etaDays: 7, feeMinor: 0, note: 'Free — arrives in about a week.' },
	{ id: 'tracked', label: 'Tracked', etaDays: 3, feeMinor: 499, note: 'Tracked courier — about three days.' }
];

export function deliveryOption(id: 'standard' | 'tracked'): DeliveryOption {
	return DELIVERY_OPTIONS.find((d) => d.id === id) ?? DELIVERY_OPTIONS[0];
}

/** ISO date a delivery option would arrive (TODAY + working days, simplified to
 *  calendar days for the demo). */
export function deliveryEta(id: 'standard' | 'tracked'): string {
	const opt = deliveryOption(id);
	const d = new Date(Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + opt.etaDays));
	return d.toISOString().slice(0, 10);
}

// ─── The factory ──────────────────────────────────────────────────────────────

let issuedSeq = 0;

function hash(seed: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** A run of `n` digits derived deterministically from a seed. */
function digits(seed: string, n: number): string {
	let out = '';
	let h = hash(seed);
	while (out.length < n) {
		out += (h % 10).toString();
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return out.slice(0, n);
}

export interface NewCardDraft {
	type: CardType;
	design: CardDesign;
	walletId: string;
	/** 'standard' | 'tracked' for a physical card; ignored otherwise. */
	delivery?: 'standard' | 'tracked';
}

/** Mint a new `Card` for the spine — deterministic id, PAN, CVV, and a four-year
 *  expiry off TODAY. Network alternates by issue order so the wallet stays varied.
 *  Controls start sensible-and-open (the user tunes them in C03). */
export function makeCard(draft: NewCardDraft): Card {
	issuedSeq += 1;
	const seed = `${draft.type}:${draft.design}:${draft.walletId}:${issuedSeq}`;
	const network: CardNetwork = issuedSeq % 2 === 0 ? 'mastercard' : 'visa';
	const prefix = network === 'visa' ? '4' : '5';
	const body = prefix + digits(seed, 15);
	const last4 = body.slice(-4);
	const pan = body.replace(/(.{4})/g, '$1 ').trim();
	const cvv = digits(seed + ':cvv', 3);
	const expMonth = String(((TODAY.getMonth() + 1 + issuedSeq) % 12) + 1).padStart(2, '0');
	const expYear = String((TODAY.getFullYear() + 4) % 100).padStart(2, '0');
	const opt = cardTypeOption(draft.type);

	return {
		id: `card-${draft.type}-${issuedSeq}`,
		type: draft.type,
		network,
		design: draft.design,
		last4,
		pan,
		cvv,
		expiry: `${expMonth}/${expYear}`,
		holder: HOLDER,
		walletId: draft.walletId,
		status: 'active',
		controls: {
			frozen: false,
			online: true,
			contactless: draft.type === 'physical',
			atm: draft.type === 'physical',
			dailyLimitMinor: draft.type === 'disposable' ? opt.ceilingMinor : null,
			ceilingMinor: opt.ceilingMinor,
			regions: [],
			homeRegion: 'DE'
		}
	};
}
