// The insurance spine — the bancassurance buy flow (N01) and policy management
// (N02). It mirrors two patterns already in the codebase: the invest ticket's
// "one ephemeral draft → live preview → commit" shape (here: a quote draft, a
// live `quote()` premium, then `buy()`), and the cards/revision idiom for the
// policy reads + mutations — every getter that reads the F03 policy spine touches
// `revision.value`, and every mutation replaces the data immutably (in the data
// layer) and calls `revision.bump()` so every surface re-flows at once.
//
// The defining brand rule lives in `covered`/`excluded`: an active add-on visibly
// MOVES an item out of the excluded list, so cover and exclusions are shown at
// equal weight and the add-on's effect is honest and concrete. Money is integer
// minor units throughout; everything is deterministic (no Date.now / Math.random).

import {
	INSURANCE_PRODUCTS,
	getProduct,
	quotePremium,
	getPolicies,
	getPolicy,
	addPolicy,
	cancelPolicy,
	renewPolicy
} from '$lib/data/insurance-data';
import type {
	InsuranceProductId,
	CoverTier,
	BillingPeriod,
	CoverItem,
	InsuranceProduct,
	Quote,
	Policy
} from '$lib/data/insurance-data';
import { appendTransaction, getTransactions } from '$lib/data';
import type { Transaction } from '$lib/data';
import { accounts } from '$lib/state/accounts.svelte';
import { revision } from '$lib/state/revision.svelte';
import { toast } from '$lib/state/toasts.svelte';
import { TODAY, isoDate } from '$lib/data/time';

/** The in-flight quote-ticket draft (the N01 buy wizard's working state). */
export interface QuoteDraft {
	productId: InsuranceProductId;
	tier: CoverTier;
	addOnIds: string[];
	excessMinor: number;
	billing: BillingPeriod;
	/** What's insured, in the user's words ("Annual multi-trip", "iPhone 16 Pro"). */
	insuredLabel: string;
}

/**
 * The add-on → exclusion mapping that makes "add-on moves an item from excluded
 * to covered" concrete. Keyed by add-on `id`; the value is a lowercase SUBSTRING
 * matched against each exclusion's label — when an active add-on matches, that
 * exclusion drops out of the excluded list (the add-on now covers it). Kept
 * deliberately small; any add-on not listed here simply passes through (it adds
 * cover without retiring a named exclusion).
 *   travel · winter → "Extreme & winter sports"
 *   device · loss   → "Loss (not theft)"
 *   home   · tech   → "Single items over €2,000"
 */
const ADDON_REMOVES_EXCLUSION: Record<string, string> = {
	winter: 'winter sports',
	loss: 'loss (not theft)',
	tech: 'single items over'
};

/** Build a draft seeded for a product — middle ('plus') tier, no add-ons,
 *  the first excess option, monthly billing, empty label. */
function seedDraft(productId: InsuranceProductId): QuoteDraft {
	const product = getProduct(productId);
	const tier: CoverTier = 'plus';
	const excessMinor = product?.excessOptions[0] ?? 0;
	return { productId, tier, addOnIds: [], excessMinor, billing: 'monthly', insuredLabel: '' };
}

/** The excluded list for a product MINUS anything an active add-on now covers. */
function excludedAfterAddOns(product: InsuranceProduct, addOnIds: string[]): CoverItem[] {
	const removals = addOnIds
		.map((id) => ADDON_REMOVES_EXCLUSION[id])
		.filter((s): s is string => Boolean(s));
	if (removals.length === 0) return product.excluded;
	return product.excluded.filter(
		(ex) => !removals.some((r) => ex.label.toLowerCase().includes(r))
	);
}

/** Add 12 (or n) calendar months to an ISO date, deterministically. */
function plusMonths(iso: string, months: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	return isoDate(new Date(Date.UTC(y, m - 1 + months, d)));
}

class InsuranceState {
	// ── Products + policies (reads) ─────────────────────────────────────────

	/** The full product catalog. */
	get products(): readonly InsuranceProduct[] {
		return INSURANCE_PRODUCTS;
	}

	/** A product by id, or undefined. */
	product(id: InsuranceProductId): InsuranceProduct | undefined {
		return getProduct(id);
	}

	/** All policies, read fresh so a buy / cancel / renew reflects. */
	get policies(): Policy[] {
		revision.value;
		return getPolicies();
	}

	/** A policy by id (reactive on the spine). */
	policy(id: string): Policy | undefined {
		revision.value;
		return getPolicy(id);
	}

	/** The active policies only (the "My cover" set). */
	get activePolicies(): Policy[] {
		return this.policies.filter((p) => p.status === 'active');
	}

	// ── Quote / buy flow (N01): draft → live quote → buy ────────────────────

	// Ephemeral this phase — one in-memory draft per visit, never persisted.
	quoteDraft = $state<QuoteDraft>(seedDraft(INSURANCE_PRODUCTS[0].id));

	/** The last policy this flow bought, for the success screen. */
	bought = $state<Policy | null>(null);

	/** Seed the draft for a product and clear any prior purchase. */
	startQuote(productId: InsuranceProductId) {
		this.quoteDraft = seedDraft(productId);
		this.bought = null;
	}

	/** Merge a partial patch into the working draft. */
	setQuoteDraft(patch: Partial<QuoteDraft>) {
		this.quoteDraft = { ...this.quoteDraft, ...patch };
	}

	/** Toggle an add-on on or off in the draft. */
	toggleAddOn(id: string) {
		const has = this.quoteDraft.addOnIds.includes(id);
		const addOnIds = has
			? this.quoteDraft.addOnIds.filter((a) => a !== id)
			: [...this.quoteDraft.addOnIds, id];
		this.quoteDraft = { ...this.quoteDraft, addOnIds };
	}

	/** Reset the draft back to a fresh seed for the same product. */
	resetQuote() {
		this.quoteDraft = seedDraft(this.quoteDraft.productId);
	}

	/** The live premium for the current draft. */
	quote(): Quote {
		const d = this.quoteDraft;
		return quotePremium(d.productId, d.tier, d.addOnIds, d.excessMinor);
	}

	/** The product the draft is quoting. */
	get quoteProduct(): InsuranceProduct | undefined {
		return getProduct(this.quoteDraft.productId);
	}

	/** What's covered — the product's covered list, passed through unchanged. */
	get covered(): CoverItem[] {
		return this.quoteProduct?.covered ?? [];
	}

	/** What's NOT covered — the product's exclusions minus anything the draft's
	 *  active add-ons now cover (so selecting an add-on visibly retires one). */
	get excluded(): CoverItem[] {
		const product = this.quoteProduct;
		if (!product) return [];
		return excludedAfterAddOns(product, this.quoteDraft.addOnIds);
	}

	/** The recurring premium for the draft's billing period (minor units). */
	recurringPremiumMinor(): number {
		const q = this.quote();
		return this.quoteDraft.billing === 'annual' ? q.annualMinor : q.monthlyMinor;
	}

	/**
	 * Commit the draft as a bound Policy. Guards on a non-empty insured label →
	 * returns null. Adds the policy to the spine, charges the FIRST premium to the
	 * primary EUR wallet, bumps the revision, records `bought`, and returns it.
	 */
	buy(): Policy | null {
		const d = this.quoteDraft;
		if (d.insuredLabel.trim() === '') return null;

		const product = getProduct(d.productId);
		if (!product) return null;

		const seq = getPolicies().length;
		const premiumMinor = this.recurringPremiumMinor();
		const startDate = isoDate(TODAY);

		const policy: Policy = {
			id: 'pol-' + d.productId + '-' + seq,
			policyNumber: 'POL-' + d.productId.toUpperCase() + '-' + (1000 + seq),
			productId: d.productId,
			tier: d.tier,
			addOnIds: [...d.addOnIds],
			excessMinor: d.excessMinor,
			billing: d.billing,
			premiumMinor,
			insuredLabel: d.insuredLabel.trim(),
			startDate,
			renewalDate: plusMonths(startDate, 12),
			status: 'active'
		};
		addPolicy(policy);

		// Charge the first premium to the primary EUR wallet on the F03 spine: a
		// settled outflow (negative amount), typed as a `fee` in the `subscriptions`
		// category so it reads as a recurring cover charge, not a one-off transfer.
		const wallet = accounts.primary;
		const charge: Transaction = {
			id: 'ins-' + d.productId + '-' + getTransactions().length,
			walletId: wallet.id,
			date: startDate,
			merchant: 'gök Insurance — ' + product.name,
			category: 'subscriptions',
			type: 'fee',
			status: 'settled',
			amountMinor: -premiumMinor, // negative → outflow
			currency: wallet.currency,
			runningBalanceMinor: wallet.currentMinor - premiumMinor,
			reference: policy.policyNumber
		};
		appendTransaction(charge);

		revision.bump();
		this.bought = policy;
		return policy;
	}

	// ── Manage (N02) ────────────────────────────────────────────────────────

	/** Cancel a policy (forced-decision in the UI); reflects everywhere. */
	cancel(id: string) {
		cancelPolicy(id);
		revision.bump();
		toast('Policy cancelled', { status: 'neutral' });
	}

	/** Renew a policy — push the renewal date out a year. */
	renew(id: string) {
		renewPolicy(id);
		revision.bump();
		toast('Policy renewed', { status: 'success' });
	}

	/** A policy's covered / excluded lists, resolved the SAME way as the quote
	 *  (the policy's own add-ons), so the detail view shows them at equal weight. */
	coverFor(policy: Policy): { covered: CoverItem[]; excluded: CoverItem[] } {
		const product = getProduct(policy.productId);
		if (!product) return { covered: [], excluded: [] };
		return {
			covered: product.covered,
			excluded: excludedAfterAddOns(product, policy.addOnIds)
		};
	}
}

export const insurance = new InsuranceState();
