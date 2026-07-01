// KYC + onboarding domain logic (O01) — countries, ID types, account plans, the
// consent disclosure, a deterministic OCR mock + liveness outcome, and the field
// validators (age ≥ 18, PO-box block, country postcode masks). All mock — no real
// PII, no real documents. Deterministic: age is measured against the fixed TODAY.

import { TODAY } from '../data/time';

// ─── Countries (residency + tax residency), with a light postcode rule ────────
export interface Country {
	code: string;
	name: string;
	/** A human hint for the postcode field. */
	postcodeHint: string;
	/** Validate a postcode for this country (lenient — demo). */
	postcodeOk: (value: string) => boolean;
}

export const COUNTRIES: readonly Country[] = [
	{ code: 'SE', name: 'Sweden', postcodeHint: '5 digits, e.g. 118 21', postcodeOk: (v) => /^\d{3}\s?\d{2}$/.test(v.trim()) },
	{ code: 'IE', name: 'Ireland', postcodeHint: 'Eircode, e.g. D02 AF30', postcodeOk: (v) => /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i.test(v.trim()) },
	{ code: 'DE', name: 'Germany', postcodeHint: '5 digits, e.g. 10115', postcodeOk: (v) => /^\d{5}$/.test(v.trim()) },
	{ code: 'FR', name: 'France', postcodeHint: '5 digits, e.g. 75008', postcodeOk: (v) => /^\d{5}$/.test(v.trim()) },
	{ code: 'ES', name: 'Spain', postcodeHint: '5 digits, e.g. 28013', postcodeOk: (v) => /^\d{5}$/.test(v.trim()) },
	{ code: 'NL', name: 'Netherlands', postcodeHint: '4 digits + 2 letters, e.g. 1011 AB', postcodeOk: (v) => /^\d{4}\s?[A-Z]{2}$/i.test(v.trim()) },
	{ code: 'PT', name: 'Portugal', postcodeHint: '4-3 digits, e.g. 1250-096', postcodeOk: (v) => /^\d{4}-?\d{3}$/.test(v.trim()) }
];

export function getCountry(code: string): Country | undefined {
	return COUNTRIES.find((c) => c.code === code);
}

// ─── Identity documents ───────────────────────────────────────────────────────
export type IdType = 'passport' | 'national-id' | 'driving-licence';

export const ID_TYPES: { value: IdType; label: string }[] = [
	{ value: 'passport', label: 'Passport' },
	{ value: 'national-id', label: 'National ID' },
	{ value: 'driving-licence', label: 'Driving licence' }
];

// ─── Account plans (the X04 tier table, inlined for onboarding) ───────────────
export type PlanId = 'standard' | 'plus' | 'metal';

export interface Plan {
	id: PlanId;
	name: string;
	monthlyMinor: number;
	tagline: string;
	perks: string[];
}

export const ACCOUNT_PLANS: readonly Plan[] = [
	{
		id: 'standard',
		name: 'Standard',
		monthlyMinor: 0,
		tagline: 'Everything I need to bank, free.',
		perks: ['Free EUR account + IBAN', 'Contactless + virtual cards', 'Fee-free spending in 30+ currencies (fair-use)', 'Instant SEPA transfers']
	},
	{
		id: 'plus',
		name: 'Plus',
		monthlyMinor: 799,
		tagline: 'More cover and higher limits.',
		perks: ['Everything in Standard', 'Purchase protection + extended warranty', 'Higher ATM limits', 'Priority in-app support']
	},
	{
		id: 'metal',
		name: 'Metal',
		monthlyMinor: 1699,
		tagline: 'The full kit, with travel cover.',
		perks: ['Everything in Plus', 'Metal card', 'Worldwide travel insurance', '1% cashback on selected spend (fair-use)']
	}
];

export function getPlan(id: PlanId): Plan {
	return ACCOUNT_PLANS.find((p) => p.id === id) ?? ACCOUNT_PLANS[0];
}

// ─── KYC consent disclosure (what / why / retention) ──────────────────────────
export interface ConsentSection {
	heading: string;
	body: string;
}

export const CONSENT_SECTIONS: readonly ConsentSection[] = [
	{ heading: 'What I’m sharing', body: 'My name, date of birth, address, and a photo of a government ID plus a short selfie video to prove the ID is mine. That’s it — nothing is collected that isn’t needed to open the account.' },
	{ heading: 'Why it’s needed', body: 'EU rules require a bank to verify who I am before opening an account (anti-money-laundering / know-your-customer). It protects me and keeps the bank honest.' },
	{ heading: 'How long it’s kept', body: 'My identity records are held for the life of the account and for five years after it closes, as the law requires, then deleted. I can ask what’s held about me at any time.' },
	{ heading: 'My choice', body: 'Sharing this is my decision. I can stop here and nothing is saved. If I continue, I’m giving explicit consent for the checks above — never pre-ticked, never assumed.' }
];

export const CONSENT_ACK = 'I’ve read the above and I consent to gökberk bank verifying my identity.';

// ─── Deterministic OCR mock (extracted from what the user already typed) ──────
export interface OcrResult {
	fullName: string;
	dob: string;
	documentNumber: string;
	expiry: string;
	nationality: string;
}

function docNumber(seed: string): string {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	const letters = String.fromCharCode(65 + (h % 26), 65 + ((h >> 5) % 26));
	return `${letters}${(h % 9000000 + 1000000).toString()}`;
}

/** "Read" the document — deterministic, derived from the profile the user gave. */
export function runOcr(fullName: string, dob: string, countryCode: string, idType: IdType): OcrResult {
	const country = getCountry(countryCode);
	// Passports expire in 10 years; cards in ~5 — measured from a fixed anchor.
	const years = idType === 'passport' ? 7 : 4;
	const exp = new Date(TODAY);
	exp.setFullYear(exp.getFullYear() + years);
	return {
		fullName: fullName.trim(),
		dob,
		documentNumber: docNumber(fullName + dob),
		expiry: exp.toISOString().slice(0, 10),
		nationality: country?.name ?? 'Sweden'
	};
}

// ─── Liveness (mock) ──────────────────────────────────────────────────────────
/** The retry cap before we route to a help path (CPO call: N = 3). */
export const LIVENESS_MAX_ATTEMPTS = 3;

// ─── Validators ───────────────────────────────────────────────────────────────
export function ageOn(dobIso: string, on: Date = TODAY): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dobIso)) return null;
	const dob = new Date(dobIso + 'T00:00:00');
	if (Number.isNaN(dob.getTime())) return null;
	let age = on.getFullYear() - dob.getFullYear();
	const m = on.getMonth() - dob.getMonth();
	if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
	return age;
}

export function isAdult(dobIso: string): boolean {
	const age = ageOn(dobIso);
	return age !== null && age >= 18;
}

/** Reject obvious PO-box / packstation addresses (a KYC requirement). */
export function isPoBox(line: string): boolean {
	return /\b(p\.?\s?o\.?\s?box|post\s?office\s?box|postfach|packstation|boîte\s?postale)\b/i.test(line);
}

export function postcodeValid(countryCode: string, value: string): boolean {
	const c = getCountry(countryCode);
	return c ? c.postcodeOk(value) : value.trim().length > 0;
}
