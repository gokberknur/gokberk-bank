// The signed-in user's identity-of-self (X04) — a fixed, deterministic mock person.
// Identity-bearing fields (legal name, DOB, residency) are read-only here: editing
// them is a KYC re-verification, not a free text edit, so the profile surface routes
// those to onboarding (O01) rather than mutating them. Contact fields are masked for
// display. No real PII — everything is invented and stable.

export type KycLevel = 'unverified' | 'basic' | 'verified';

export interface Profile {
	legalName: string;
	preferredName: string;
	/** ISO date of birth (fixed). */
	dobIso: string;
	residencyCountry: string;
	taxResidency: string;
	/** Masked for display — the real value never leaves the mock. */
	emailMasked: string;
	phoneMasked: string;
	address: {
		line1: string;
		city: string;
		postcode: string;
		country: string;
	};
	kyc: KycLevel;
	/** ISO date the identity was last verified. */
	verifiedOnIso: string;
}

export const profile: Profile = {
	legalName: 'Gökberk Nur',
	preferredName: 'Gökberk',
	dobIso: '1994-03-12',
	residencyCountry: 'Sweden',
	taxResidency: 'Sweden',
	emailMasked: 'g••••••@••••.com',
	phoneMasked: '+46 •• ••• •• 14',
	address: {
		line1: 'Hornsgatan 42',
		city: 'Stockholm',
		postcode: '118 49',
		country: 'Sweden'
	},
	kyc: 'verified',
	verifiedOnIso: '2023-02-14'
};

/** What each KYC level unlocks — shown next to the current level. */
export const KYC_LEVELS: Record<KycLevel, { label: string; unlocks: string }> = {
	unverified: { label: 'Unverified', unlocks: 'Browse only — verify to open a wallet.' },
	basic: { label: 'Basic', unlocks: 'EUR wallet and limited payments.' },
	verified: {
		label: 'Verified',
		unlocks: 'Full access — all wallets, cards, investing and lending.'
	}
};

/** Editable (non-identity) fields — the only ones the edit drawer may change. */
export interface EditableContact {
	address: Profile['address'];
}
