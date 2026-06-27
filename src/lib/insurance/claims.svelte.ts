// Insurance claims runtime state (N03) — the file-a-claim wizard's working state,
// the status-tracker reads, and the withdraw mutation, over the pure claim layers
// (`$lib/insurance/claim-rules` for the honest gating + `$lib/data/claims-data` for
// the mutable records). Like the rest of the spine this is **revision-reactive**:
// every getter that reads the claims/policies data touches `revision.value` to take
// a dependency on the shared signal, and every mutation (`fileClaim`, `withdrawClaim`)
// calls `revision.bump()` so the hub count, the tracker, and the policy views all
// re-flow at once. Deterministic — no Date.now / Math.random / argless `new Date()`;
// the size labels and ids derive only from what the user typed.
//
// The four-step wizard rides the F05 composite (`createWizard`): `wizard.data` IS the
// `$state` draft (fields write into it directly), and the steps declare their own
// forward-gating validators. The reporting-window check is *informative*, never a hard
// block — a late or lookalike claim can still be filed behind a forced acknowledgement,
// matching the no-blame contract baked into the pure rules.

import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
import type { StepDef } from '$lib/components/wizard/types';
import { claimTypesFor, claimWindowCheck, findDuplicate } from '$lib/insurance/claim-rules';
import type { ClaimType, WindowCheck } from '$lib/insurance/claim-rules';
import {
	getClaim,
	getClaims,
	getClaimsForPolicy,
	getOpenClaims,
	fileClaim,
	withdrawClaim,
	claimStage
} from '$lib/data/claims-data';
import type { Claim, ClaimStatus, Evidence, EvidenceKind } from '$lib/data/claims-data';
import { getPolicies, getPolicy } from '$lib/data/insurance-data';
import type { Policy } from '$lib/data/insurance-data';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';

// Re-export the pure types the N03 surface is authored against, so it imports
// everything it needs from this one runtime module.
export type { ClaimType } from '$lib/insurance/claim-rules';
export type { Claim, ClaimStatus, Evidence, EvidenceKind } from '$lib/data/claims-data';

// Re-export the label/stage lookups too, so surfaces read labels from this one
// module instead of reaching into the data/rules layers directly.
export { CLAIM_TYPE_LABELS } from '$lib/insurance/claim-rules';
export { CLAIM_STATUS_LABELS, CLAIM_STAGES } from '$lib/data/claims-data';

/** The in-flight claim draft (the N03 wizard's working state; persisted as a draft). */
export interface ClaimData {
	/** The policy being claimed against (a `Policy.id`). */
	policyId: string;
	/** What kind of incident this is — '' until the user picks one. */
	type: ClaimType | '';
	/** ISO `yyyy-mm-dd` the incident happened; '' until set. */
	incidentDate: string;
	/** The user's free-text account of what happened. */
	description: string;
	/** The (simulated) attached evidence files. */
	evidence: Evidence[];
	/** A forced acknowledgement when the incident falls outside the reporting window. */
	windowAcknowledged: boolean;
}

/** The flow id — completes the wizard's `gok-bank-wizard-<flowId>` draft key. */
const FLOW_ID = 'claim';

/** A fresh, empty claim draft — a new object each call so resets never share state. */
function emptyClaim(): ClaimData {
	return {
		policyId: '',
		type: '',
		incidentDate: '',
		description: '',
		evidence: [],
		windowAcknowledged: false
	};
}

/**
 * The four wizard steps (ids double as the `[step]` URL segments). Back never
 * validates (the store enforces that); these only run on Continue, in the user's
 * first-person, no-blame voice. The `incident` step is the one with real gating: it
 * requires the three core fields, then — if the policy + date put the incident
 * outside the reporting window — forces the acknowledgement before advancing.
 */
const CLAIM_STEPS: StepDef<ClaimData>[] = [
	{
		id: 'policy',
		title: 'Choose policy',
		validate: (d) => (d.policyId ? true : 'Pick the policy to claim against.')
	},
	{
		id: 'incident',
		title: 'What happened',
		validate: (d) => {
			if (!d.type) return 'Choose what kind of incident this was.';
			if (!d.incidentDate) return 'Add the date it happened.';
			if (!d.description.trim()) return 'Tell me what happened.';
			// The window check is informative: if the incident is outside the window and
			// the user hasn't ticked the acknowledgement, block here (only here) until they do.
			const policy = getPolicy(d.policyId);
			if (policy) {
				const check = claimWindowCheck(policy, d.incidentDate);
				if (!check.withinWindow && !d.windowAcknowledged) {
					return 'Please acknowledge the note above before continuing.';
				}
			}
			return true;
		}
	},
	{
		id: 'evidence',
		title: 'Add evidence'
		// Evidence is optional — nothing to gate.
	},
	{
		id: 'review',
		title: 'Review & submit'
		// The final step's Continue is the flow's submit; no validation to advance.
	}
];

/**
 * The N03 claims state — the wizard draft + the derivations the file flow reads, the
 * evidence mutators, the terminal `submit`, and the tracker reads/withdraw. The flow
 * surface drives the wizard through `claims.wizard` and reads `claims.wizard.data`
 * for the fields; everything that touches the data spine flows through here.
 */
class ClaimsState {
	/** The file-a-claim wizard store — the Wizard.svelte shell drives the flow through this. */
	wizard = createWizard<ClaimData>({
		flowId: FLOW_ID,
		persist: true,
		steps: CLAIM_STEPS,
		initialData: emptyClaim()
	});

	// ── File-flow derivations (revision-reactive over the policies/claims spine) ──

	/** The policies a claim can be filed against — active policies only. */
	activePolicies(): Policy[] {
		revision.value;
		return getPolicies().filter((p) => p.status === 'active');
	}

	/** The policy the draft is claiming against, or undefined until one is chosen. */
	selectedPolicy(): Policy | undefined {
		revision.value;
		return getPolicy(this.wizard.data.policyId);
	}

	/** The incident types that make sense for the chosen policy's product. */
	allowedTypes(): ClaimType[] {
		return claimTypesFor(this.selectedPolicy()?.productId ?? '');
	}

	/**
	 * The live reporting-window check for the drafted policy + incident date, or null
	 * until both are set. Informative only — the surface shows the reason and offers
	 * the acknowledgement; it never hard-blocks filing.
	 */
	windowCheck(): WindowCheck | null {
		const policy = this.selectedPolicy();
		const date = this.wizard.data.incidentDate;
		if (!policy || !date) return null;
		return claimWindowCheck(policy, date);
	}

	/**
	 * An existing *open* claim on the same policy + type — a likely duplicate to flag
	 * (info, not a block), or undefined when there's no policy/type yet or no match.
	 */
	duplicate(): Claim | undefined {
		revision.value;
		const { policyId, type } = this.wizard.data;
		if (!policyId || !type) return undefined;
		return findDuplicate(getOpenClaims(), policyId, type);
	}

	// ── Evidence (immutable replacement on the draft's evidence list) ──

	/**
	 * Attach a (simulated) evidence file. The id and size label are deterministic —
	 * the id from the file's position + name, the size a stable function of the name
	 * length (no Date.now / Math.random); nothing real is uploaded.
	 */
	addEvidence(name: string, kind: EvidenceKind): void {
		const data = this.wizard.data;
		const sizeLabel = `${(name.length % 9) + 1}.${name.length % 10} MB`;
		const item: Evidence = {
			id: 'ev-' + (data.evidence.length + 1) + '-' + name,
			name,
			kind,
			sizeLabel
		};
		data.evidence = [...data.evidence, item];
	}

	/** Remove one attached evidence file by id (immutable replacement). */
	removeEvidence(id: string): void {
		const data = this.wizard.data;
		data.evidence = data.evidence.filter((e) => e.id !== id);
	}

	// ── Submit (the terminal commit) ──

	/**
	 * File the claim. Guards the draft has the three required fields (the wizard's
	 * validators already enforce these, but the commit double-checks) → throws if not.
	 * Files the claim on the data spine (it lands `submitted`, stage 1, with a
	 * deterministic reference), bumps the revision, toasts the reference, and resets
	 * the wizard draft so the flow starts clean next time. Returns the filed claim.
	 */
	submit(): Claim {
		const d = this.wizard.data;
		if (!d.policyId || !d.type || !d.incidentDate) {
			throw new Error('A claim needs a policy, an incident type, and an incident date.');
		}
		const claim = fileClaim({
			policyId: d.policyId,
			type: d.type,
			incidentDate: d.incidentDate,
			description: d.description,
			evidence: d.evidence
		});
		revision.bump();
		toast(`Claim ${claim.reference} submitted`, { status: 'success' });
		this.resetClaim();
		return claim;
	}

	/**
	 * Reset the wizard back to a fresh draft at step 0 — clears the persisted draft,
	 * re-seeds `data`, and resets the visited/error state. (The wizard store has no
	 * `reset()`; this mirrors the onboarding flow's `restart()`.)
	 */
	resetClaim(): void {
		this.wizard.clearDraft();
		this.wizard.currentIndex = 0;
		this.wizard.data = emptyClaim();
		this.wizard.visited = this.wizard.steps.map((_, i) => i === 0);
		this.wizard.error = null;
	}

	// ── List reads (the hub + policy detail; revision-reactive, newest-first) ──

	/** Every claim, newest-first — the claims hub list. */
	allClaims(): Claim[] {
		revision.value;
		return getClaims();
	}

	/** Claims still in flight (submitted / in-review) — the hub's open count + list. */
	openClaims(): Claim[] {
		revision.value;
		return getOpenClaims();
	}

	/** Every claim filed against one policy — the policy-detail claims list. */
	claimsForPolicy(policyId: string): Claim[] {
		revision.value;
		return getClaimsForPolicy(policyId);
	}

	// ── Tracker reads + withdraw ──

	/** One claim by id, or undefined — for the status tracker (revision-reactive). */
	claimById(id: string): Claim | undefined {
		revision.value;
		return getClaim(id);
	}

	/** How many of the three tracker stages a status has reached (0 for withdrawn). */
	stage(status: ClaimStatus): number {
		return claimStage(status);
	}

	/** Withdraw an open claim — moves it to `withdrawn`, re-flows reads, and announces. */
	withdraw(id: string): void {
		withdrawClaim(id);
		revision.bump();
		toast('Claim withdrawn', { status: 'neutral' });
	}
}

/** The shared singleton the N03 claims routes drive. */
export const claims = new ClaimsState();
