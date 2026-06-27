// Insurance (N-series) — a small pan-European bancassurance catalog + a
// deterministic premium engine + an active-policies seed. Money is integer minor
// units (EUR). The defining brand rule lives in the data shape: every product
// carries its `covered` AND `excluded` lists so the UI can show them at EQUAL
// weight — exclusions are first-class, never an afterthought.

import { TODAY, isoDate } from './time';

export type InsuranceProductId = 'travel' | 'device' | 'home';
export type CoverTier = 'essential' | 'plus' | 'premier';

export interface CoverItem {
	label: string;
	/** A short qualifier, e.g. a limit ("up to €2,000") or a condition. */
	detail?: string;
}

export interface AddOn {
	id: string;
	label: string;
	monthlyMinor: number;
	/** What it moves from excluded → covered, for honest framing. */
	note: string;
}

export interface Tier {
	tier: CoverTier;
	label: string;
	baseMonthlyMinor: number;
	/** Headline sum insured / cover limit, minor units. */
	sumInsuredMinor: number;
	/** A one-line "who it's for". */
	summary: string;
}

export interface InsuranceProduct {
	id: InsuranceProductId;
	name: string;
	tagline: string;
	/** What the user describes when buying (e.g. "trip", "device", "home"). */
	insuredNoun: string;
	tiers: Tier[];
	/** Covered at the base level (every tier); higher tiers raise limits. */
	covered: CoverItem[];
	/** Excluded unless an add-on says otherwise — shown at equal weight. */
	excluded: CoverItem[];
	addOns: AddOn[];
	/** Selectable excess (deductible) amounts, minor units. Higher excess, lower premium. */
	excessOptions: number[];
}

export const INSURANCE_PRODUCTS: readonly InsuranceProduct[] = [
	{
		id: 'travel',
		name: 'Travel cover',
		tagline: 'Medical, cancellation and baggage, across Europe and beyond.',
		insuredNoun: 'trip',
		tiers: [
			{ tier: 'essential', label: 'Essential', baseMonthlyMinor: 690, sumInsuredMinor: 100_000_00, summary: 'The core medical + cancellation safety net.' },
			{ tier: 'plus', label: 'Plus', baseMonthlyMinor: 1190, sumInsuredMinor: 250_000_00, summary: 'Higher limits, gadget cover, more cancellation.' },
			{ tier: 'premier', label: 'Premier', baseMonthlyMinor: 1890, sumInsuredMinor: 1_000_000_00, summary: 'Worldwide, top limits, business equipment.' }
		],
		covered: [
			{ label: 'Emergency medical & repatriation', detail: 'up to the sum insured' },
			{ label: 'Trip cancellation & curtailment', detail: 'up to €5,000' },
			{ label: 'Lost, stolen or delayed baggage', detail: 'up to €2,000' },
			{ label: 'Travel delay', detail: '€30 per 6 hours' }
		],
		excluded: [
			{ label: 'Known pre-existing medical conditions', detail: 'unless declared & accepted' },
			{ label: 'Extreme & winter sports', detail: 'add Winter sports' },
			{ label: 'Incidents involving alcohol or drugs' },
			{ label: 'Trips booked while a travel ban was in force' }
		],
		addOns: [
			{ id: 'winter', label: 'Winter sports', monthlyMinor: 390, note: 'Covers skiing, snowboarding and piste closure.' },
			{ id: 'gadget', label: 'Gadget cover', monthlyMinor: 290, note: 'Phones, laptops and cameras away from home.' },
			{ id: 'cancelplus', label: 'Cancellation+', monthlyMinor: 240, note: 'Raises cancellation to €10,000, any reason.' }
		],
		excessOptions: [0, 50_00, 100_00, 150_00]
	},
	{
		id: 'device',
		name: 'Device cover',
		tagline: 'Accidental damage, theft and breakdown for your tech.',
		insuredNoun: 'device',
		tiers: [
			{ tier: 'essential', label: 'Essential', baseMonthlyMinor: 499, sumInsuredMinor: 800_00, summary: 'Accidental damage + breakdown.' },
			{ tier: 'plus', label: 'Plus', baseMonthlyMinor: 799, sumInsuredMinor: 1_500_00, summary: 'Adds theft and worldwide cover.' },
			{ tier: 'premier', label: 'Premier', baseMonthlyMinor: 1199, sumInsuredMinor: 3_000_00, summary: 'Liquid damage, fast replacement, no age limit.' }
		],
		covered: [
			{ label: 'Accidental damage', detail: 'cracked screens included' },
			{ label: 'Mechanical breakdown', detail: 'after warranty ends' },
			{ label: 'Theft', detail: 'Plus & Premier' },
			{ label: 'Worldwide use', detail: 'Plus & Premier' }
		],
		excluded: [
			{ label: 'Cosmetic damage that doesn’t affect function' },
			{ label: 'Loss (not theft)', detail: 'left behind / misplaced' },
			{ label: 'Liquid damage', detail: 'Premier only' },
			{ label: 'Devices over 36 months old at purchase' }
		],
		addOns: [
			{ id: 'loss', label: 'Loss cover', monthlyMinor: 199, note: 'Covers leaving a device behind, once a year.' },
			{ id: 'family', label: 'Family devices', monthlyMinor: 449, note: 'Extends to up to 5 household devices.' }
		],
		excessOptions: [0, 25_00, 50_00, 75_00]
	},
	{
		id: 'home',
		name: 'Home contents',
		tagline: 'Your belongings, against theft, fire and water.',
		insuredNoun: 'home',
		tiers: [
			{ tier: 'essential', label: 'Essential', baseMonthlyMinor: 990, sumInsuredMinor: 25_000_00, summary: 'Theft, fire and water for your contents.' },
			{ tier: 'plus', label: 'Plus', baseMonthlyMinor: 1490, sumInsuredMinor: 50_000_00, summary: 'Accidental damage + items away from home.' },
			{ tier: 'premier', label: 'Premier', baseMonthlyMinor: 2290, sumInsuredMinor: 100_000_00, summary: 'High-value items, no single-item limit.' }
		],
		covered: [
			{ label: 'Theft & attempted theft', detail: 'forced entry' },
			{ label: 'Fire, smoke & explosion' },
			{ label: 'Escape of water & flood' },
			{ label: 'Accidental damage', detail: 'Plus & Premier' }
		],
		excluded: [
			{ label: 'General wear and tear' },
			{ label: 'Business or commercial use' },
			{ label: 'Homes left unoccupied over 30 days' },
			{ label: 'Single items over €2,000', detail: 'unless specified (Premier)' }
		],
		addOns: [
			{ id: 'away', label: 'Away from home', monthlyMinor: 340, note: 'Covers belongings you carry outside the home.' },
			{ id: 'bikes', label: 'Bicycles', monthlyMinor: 290, note: 'Covers bikes against theft, in and out of the home.' },
			{ id: 'tech', label: 'Tech bundle', monthlyMinor: 390, note: 'Raises the single-item limit for electronics.' }
		],
		excessOptions: [50_00, 100_00, 250_00, 500_00]
	}
];

export function getProduct(id: InsuranceProductId): InsuranceProduct | undefined {
	return INSURANCE_PRODUCTS.find((p) => p.id === id);
}

export function getTier(product: InsuranceProduct, tier: CoverTier): Tier {
	return product.tiers.find((t) => t.tier === tier) ?? product.tiers[0];
}

export interface Quote {
	productId: InsuranceProductId;
	tier: CoverTier;
	addOnIds: string[];
	excessMinor: number;
	monthlyMinor: number;
	/** Annual premium with a 10% pay-yearly saving. */
	annualMinor: number;
	annualSavingMinor: number;
	sumInsuredMinor: number;
}

/**
 * Premium = tier base + selected add-ons − an excess discount (a higher excess
 * lowers the premium: €0.20/month per €100 of excess, capped at 30% of base).
 * Deterministic; all minor units.
 */
export function quotePremium(
	productId: InsuranceProductId,
	tier: CoverTier,
	addOnIds: string[],
	excessMinor: number
): Quote {
	const product = getProduct(productId)!;
	const t = getTier(product, tier);
	const addOnTotal = product.addOns
		.filter((a) => addOnIds.includes(a.id))
		.reduce((s, a) => s + a.monthlyMinor, 0);
	const rawDiscount = Math.round((excessMinor / 100_00) * 20);
	const excessDiscount = Math.min(rawDiscount, Math.round(t.baseMonthlyMinor * 0.3));
	const monthlyMinor = Math.max(199, t.baseMonthlyMinor + addOnTotal - excessDiscount);
	const annualFull = monthlyMinor * 12;
	const annualMinor = Math.round(annualFull * 0.9);
	return {
		productId,
		tier,
		addOnIds,
		excessMinor,
		monthlyMinor,
		annualMinor,
		annualSavingMinor: annualFull - annualMinor,
		sumInsuredMinor: t.sumInsuredMinor
	};
}

export type BillingPeriod = 'monthly' | 'annual';
export type PolicyStatus = 'active' | 'lapsed' | 'cancelled';

export interface Policy {
	id: string;
	policyNumber: string;
	productId: InsuranceProductId;
	tier: CoverTier;
	addOnIds: string[];
	excessMinor: number;
	billing: BillingPeriod;
	/** The recurring premium for the chosen billing period, minor units. */
	premiumMinor: number;
	/** What's insured, e.g. "Annual multi-trip" / "iPhone 16 Pro". */
	insuredLabel: string;
	startDate: string;
	renewalDate: string;
	status: PolicyStatus;
}

function plusMonths(iso: string, months: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const x = new Date(Date.UTC(y, m - 1 + months, d));
	return isoDate(x);
}

function monthsAgo(n: number): string {
	const x = new Date(TODAY);
	x.setMonth(x.getMonth() - n);
	return isoDate(x);
}

let policies: Policy[] = [
	{
		id: 'pol-travel',
		policyNumber: 'TRV-204417',
		productId: 'travel',
		tier: 'plus',
		addOnIds: ['gadget'],
		excessMinor: 50_00,
		billing: 'annual',
		premiumMinor: quotePremium('travel', 'plus', ['gadget'], 50_00).annualMinor,
		insuredLabel: 'Annual multi-trip · Europe',
		startDate: monthsAgo(4),
		renewalDate: plusMonths(monthsAgo(4), 12),
		status: 'active'
	},
	{
		id: 'pol-device',
		policyNumber: 'DEV-118702',
		productId: 'device',
		tier: 'premier',
		addOnIds: [],
		excessMinor: 25_00,
		billing: 'monthly',
		premiumMinor: quotePremium('device', 'premier', [], 25_00).monthlyMinor,
		insuredLabel: 'iPhone 16 Pro',
		startDate: monthsAgo(7),
		renewalDate: plusMonths(monthsAgo(7), 12),
		status: 'active'
	}
];

export function getPolicies(): Policy[] {
	return policies;
}

export function getPolicy(id: string): Policy | undefined {
	return policies.find((p) => p.id === id);
}

/** Add a freshly-bought policy (from the N01 buy flow). Returns it. */
export function addPolicy(policy: Policy): Policy {
	policies = [policy, ...policies];
	return policy;
}

/** Cancel a policy (immutable replacement so rune reads re-flow). */
export function cancelPolicy(id: string): void {
	policies = policies.map((p) => (p.id === id ? { ...p, status: 'cancelled' } : p));
}

/** Renew: push the renewal date out a year (immutable). */
export function renewPolicy(id: string): void {
	policies = policies.map((p) => (p.id === id ? { ...p, renewalDate: plusMonths(p.renewalDate, 12) } : p));
}
