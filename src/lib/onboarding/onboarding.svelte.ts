// Onboarding draft state (O01) — the rune store behind the resumable KYC wizard.
//
// The wizard composite (F05) already IS the rune state: it owns `currentIndex`,
// `visited`, the mutable `data`, the active error, and a localStorage draft keyed
// by flow id. So this module does NOT reinvent that — it WRAPS `createWizard`
// with the onboarding-specific draft shape, the six forward-gating step
// validators, and the intent methods the UI calls (consent, document, OCR,
// liveness, completion). Everything stays deterministic: no Math.random, no
// Date.now — verification + IBAN issuance derive from what the user typed and the
// fixed TODAY anchor that already lives inside `kyc.ts`.
//
// Persistence note — the Wizard store only writes its draft on a navigation
// (`goNext`/`goBack`/`goTo`); its `#persist` is private and a bare `data` write
// does NOT hit localStorage. So `patch` mirrors the store's exact draft shape
// (`{ currentIndex, data }`) to the same key, so a mid-step field edit survives a
// refresh too. The store re-hydrates from that same key on construction.

import { browser } from '$app/environment';
import { createWizard, Wizard } from '$lib/components/wizard/wizard-store.svelte';
import type { StepDef } from '$lib/components/wizard/types';
import {
	isAdult,
	isPoBox,
	postcodeValid,
	runOcr,
	LIVENESS_MAX_ATTEMPTS,
	type IdType,
	type PlanId,
	type OcrResult
} from '$lib/onboarding/kyc';
import { issueIban, type IssuedAccount } from '$lib/onboarding/iban';
import { toast } from '$lib/state/toasts.svelte';

/**
 * The onboarding draft — every field the seven-screen journey collects (the
 * wizard folds KYC consent into the identity step, so the draft is six
 * validated steps + a non-step `done`). Money is in integer minor units; dates
 * are ISO `YYYY-MM-DD`; country codes are the `COUNTRIES` codes.
 */
export interface OnboardingData {
	// ── Profile (step 1) ──
	fullName: string;
	/** Date of birth, ISO `YYYY-MM-DD`. */
	dob: string;
	/** Country of residence — a `COUNTRIES` code. */
	residency: string;

	// ── Address (step 2) ──
	line1: string;
	line2: string;
	city: string;
	postcode: string;
	/** Tax residency — a `COUNTRIES` code. */
	taxResidency: string;

	// ── Identity + consent (step 3) ──
	consentAcked: boolean;
	idType: IdType | '';
	/** The simulated uploaded file name; '' = nothing uploaded. */
	documentName: string;

	// ── Verify: liveness + OCR review (step 4) ──
	livenessAttempts: number;
	livenessPassed: boolean;
	ocr: OcrResult | null;
	ocrConfirmed: boolean;

	// ── Plan (step 5) ──
	planId: PlanId;

	// ── Funding (step 6, optional) ──
	topUpMinor: number;

	// ── Issued on completion (the `done` screen reads these) ──
	issuedIban?: string;
	issuedBic?: string;
	issuedIbanPretty?: string;
}

/** localStorage key — mirrors the store's `gok-bank-wizard-<flowId>` for flow id `onboarding`. */
const FLOW_ID = 'onboarding';
const DRAFT_KEY = `gok-bank-wizard-${FLOW_ID}`;

/** A fresh, empty draft — a new object each call so instances never share state. */
function emptyOnboarding(): OnboardingData {
	return {
		fullName: '',
		dob: '',
		residency: '',
		line1: '',
		line2: '',
		city: '',
		postcode: '',
		taxResidency: '',
		consentAcked: false,
		idType: '',
		documentName: '',
		livenessAttempts: 0,
		livenessPassed: false,
		ocr: null,
		ocrConfirmed: false,
		planId: 'standard',
		topUpMinor: 0
	};
}

/**
 * The six forward-gating steps. Back never validates (the store enforces that);
 * these only run on Continue. Copy is no-blame and in the user's first-person
 * voice. `profile`/`address` return field-maps (the offending field lights up);
 * the later steps return a single step-level message.
 */
const ONBOARDING_STEPS: StepDef<OnboardingData>[] = [
	{
		id: 'profile',
		title: 'About me',
		validate: (d) => {
			const errors: Record<string, string> = {};
			if (!d.fullName.trim()) errors.fullName = 'I need to enter my full name.';
			if (!d.dob) errors.dob = 'I need to enter my date of birth.';
			else if (!isAdult(d.dob)) errors.dob = 'I need to be 18 or older to open an account.';
			if (!d.residency) errors.residency = 'I need to choose where I live.';
			return Object.keys(errors).length ? errors : true;
		}
	},
	{
		id: 'address',
		title: 'Where I live',
		validate: (d) => {
			const errors: Record<string, string> = {};
			if (!d.line1.trim()) errors.line1 = 'I need to enter my street address.';
			else if (isPoBox(d.line1))
				errors.line1 = 'I can’t use a PO box — a residential address is required.';
			if (!d.city.trim()) errors.city = 'I need to enter my city.';
			if (!postcodeValid(d.residency, d.postcode))
				errors.postcode = 'That postcode doesn’t look right for the country — check and try again.';
			if (!d.taxResidency) errors.taxResidency = 'I need to choose my tax residency.';
			return Object.keys(errors).length ? errors : true;
		}
	},
	{
		id: 'identity',
		title: 'Prove it’s me',
		validate: (d) => {
			if (!d.consentAcked) return 'Please read and accept the identity check to continue.';
			if (!d.idType) return 'I need to choose which ID I’m using.';
			if (!d.documentName) return 'I need to upload a photo of my ID.';
			return true;
		}
	},
	{
		id: 'verify',
		title: 'Quick check',
		validate: (d) =>
			d.livenessPassed && d.ocrConfirmed
				? true
				: 'Finish the quick selfie check and confirm your details.'
	},
	{
		id: 'plan',
		title: 'My plan',
		// planId always carries a default ('standard'), so this never blocks.
		validate: (d) => (d.planId ? true : 'I need to choose a plan.')
	},
	{
		id: 'funding',
		title: 'Add money (optional)',
		// Skip is allowed and a zero top-up is fine — only a negative is invalid.
		validate: (d) => (d.topUpMinor >= 0 ? true : 'A top-up can’t be negative.')
	}
];

/**
 * The onboarding flow — a thin wrapper over the wizard store that adds the
 * draft's domain intents. The UI reads `wizard` (for the Wizard.svelte shell)
 * and `data` (for the fields); it mutates only through these methods.
 */
export class OnboardingFlow {
	readonly #wizard: Wizard<OnboardingData>;

	constructor() {
		this.#wizard = createWizard<OnboardingData>({
			flowId: FLOW_ID,
			persist: true,
			steps: ONBOARDING_STEPS,
			initialData: emptyOnboarding()
		});
	}

	/** The underlying wizard store — the Wizard.svelte shell drives the flow through this. */
	get wizard(): Wizard<OnboardingData> {
		return this.#wizard;
	}

	/** The live draft (the wizard's `$state` data) — fields read/bind against this. */
	get data(): OnboardingData {
		return this.#wizard.data;
	}

	/**
	 * Merge a partial into the draft and persist. We mutate the store's `$state`
	 * object in place (fine-grained reactivity) and then mirror the store's own
	 * `{ currentIndex, data }` draft shape to localStorage — because the store
	 * only persists on a navigation, not on a bare `data` write.
	 */
	patch(partial: Partial<OnboardingData>): void {
		Object.assign(this.#wizard.data, partial);
		this.#persistDraft();
	}

	/** Record the explicit KYC consent (never pre-ticked — the UI starts it false). */
	acknowledgeConsent(v: boolean): void {
		this.patch({ consentAcked: v });
	}

	/**
	 * Attach a (simulated) uploaded document. Swapping the document invalidates
	 * any stale OCR + liveness from a previous file — those must be re-run.
	 */
	attachDocument(name: string): void {
		this.patch({
			documentName: name,
			ocr: null,
			ocrConfirmed: false,
			livenessAttempts: 0,
			livenessPassed: false
		});
	}

	/** Remove the document and clear everything that depended on it. */
	removeDocument(): void {
		this.patch({
			documentName: '',
			ocr: null,
			ocrConfirmed: false,
			livenessAttempts: 0,
			livenessPassed: false
		});
	}

	/**
	 * "Read" the uploaded document — deterministic OCR derived from the profile
	 * the user already gave. Leaves the result unconfirmed for the review ledger.
	 * No-ops if no ID type was chosen (the UI gates this behind the identity step).
	 */
	runIdentityOcr(): void {
		if (!this.data.idType) return;
		this.patch({
			ocr: runOcr(this.data.fullName, this.data.dob, this.data.residency, this.data.idType),
			ocrConfirmed: false
		});
	}

	/**
	 * Edit the OCR ledger on a mismatch. Only the four extracted fields are
	 * editable (nationality is fixed); any edit reopens the confirmation.
	 */
	editOcr(partial: Partial<OcrResult>): void {
		const current = this.data.ocr;
		if (!current) return;
		const next: OcrResult = { ...current };
		if (partial.fullName !== undefined) next.fullName = partial.fullName;
		if (partial.dob !== undefined) next.dob = partial.dob;
		if (partial.documentNumber !== undefined) next.documentNumber = partial.documentNumber;
		if (partial.expiry !== undefined) next.expiry = partial.expiry;
		this.patch({ ocr: next, ocrConfirmed: false });
	}

	/** Confirm the OCR review ledger is correct. */
	confirmOcr(): void {
		this.patch({ ocrConfirmed: true });
	}

	/**
	 * Run one liveness attempt. The happy path passes deterministically; the
	 * returned `exhausted` flag tells the UI when the attempt cap is reached so it
	 * can offer the help path. (The UI shows a "Verifying…" beat before calling.)
	 */
	attemptLiveness(): { passed: boolean; exhausted: boolean } {
		const attempts = this.data.livenessAttempts + 1;
		this.patch({ livenessAttempts: attempts, livenessPassed: true });
		return { passed: true, exhausted: attempts >= LIVENESS_MAX_ATTEMPTS };
	}

	/** True when a persisted application is mid-way — drives the "Resume" banner. */
	get hasDraft(): boolean {
		const d = this.data;
		return (
			this.#wizard.currentIndex > 0 ||
			d.fullName.trim() !== '' ||
			d.dob !== '' ||
			d.residency !== '' ||
			d.line1.trim() !== '' ||
			d.city.trim() !== '' ||
			d.postcode.trim() !== '' ||
			d.consentAcked ||
			d.documentName !== '' ||
			d.ocr !== null
		);
	}

	/**
	 * Finish the flow: guard that every step is satisfied, issue a deterministic
	 * IBAN/BIC from the applicant's name, stamp it on the draft, and announce.
	 * Does NOT touch the seeded accounts — issuance is mock and local to the draft.
	 */
	complete(): IssuedAccount {
		const allValid = this.#wizard.steps.every((s) => {
			const result = s.validate?.(this.data);
			return result === undefined || result === true;
		});
		if (!allValid) {
			throw new Error('Onboarding is not complete yet — every step must be valid first.');
		}

		const account = issueIban(this.data.fullName);
		this.patch({
			issuedIban: account.iban,
			issuedBic: account.bic,
			issuedIbanPretty: account.ibanPretty
		});
		toast('Account opened — welcome', { status: 'success' });
		return account;
	}

	/** Wipe the draft and start fresh — for an abandoned or finished application. */
	restart(): void {
		this.#wizard.clearDraft();
		this.#wizard.currentIndex = 0;
		this.#wizard.data = emptyOnboarding();
		this.#wizard.visited = this.#wizard.steps.map((_, i) => i === 0);
		this.#wizard.error = null;
	}

	/** Mirror the store's `{ currentIndex, data }` draft to localStorage (browser-only). */
	#persistDraft(): void {
		if (!browser) return;
		try {
			localStorage.setItem(
				DRAFT_KEY,
				JSON.stringify({
					currentIndex: this.#wizard.currentIndex,
					data: $state.snapshot(this.data)
				})
			);
		} catch {
			// A full/blocked store just means no draft — the flow still works in-memory.
		}
	}
}

/** Factory — a fresh, isolated flow (handy for tests that want a clean draft). */
export function createOnboardingFlow(): OnboardingFlow {
	return new OnboardingFlow();
}

/** The shared singleton the onboarding routes drive. */
export const onboarding = new OnboardingFlow();
