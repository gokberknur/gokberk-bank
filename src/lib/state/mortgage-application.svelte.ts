// Mortgage application state (L04 Flow A) — the wizard draft (property → finances →
// documents → decision → product/offer), persisted so an interrupted application
// resumes. Everything downstream (LTV, decision-in-principle, the product shelf, the
// chosen offer and its full amortization) derives from the draft + the lending engine.

import { readJSON, writeJSON } from './persist';
import { revision } from './revision.svelte';
import { amortization } from '$lib/data/lending';
import type { AmortRow } from '$lib/data/lending';
import { ltvBps } from '$lib/data/lending';
import {
	mortgageProducts,
	dipDecision,
	REQUIRED_DOCS
} from '$lib/lending/mortgage';
import type {
	MortgageProduct,
	DipResult,
	EmploymentType,
	PropertyType
} from '$lib/lending/mortgage';
import { TODAY, isoDate } from '$lib/data/time';
import { addDocument, getDocument } from '$lib/data/documents-data';
import { formatMoney } from '$lib/format';

const KEY = 'mortgage-application';
const OFFER_DOC_ID = 'doc-mortgage-offer';

export interface MortgageDraft {
	// Property
	valueMinor: number;
	depositMinor: number;
	propertyType: PropertyType;
	address: string;
	// Finances
	grossAnnualIncomeMinor: number;
	employment: EmploymentType;
	monthlyCommitmentsMinor: number;
	// Documents (id → uploaded)
	uploaded: Record<string, boolean>;
	// Term + chosen product
	termMonths: number;
	selectedProductId: string | null;
	// Decision run yet?
	decided: boolean;
}

function emptyDraft(): MortgageDraft {
	return {
		valueMinor: 35000000, // €350,000
		depositMinor: 7000000, // €70,000 (20%)
		propertyType: 'house',
		address: '',
		grossAnnualIncomeMinor: 7200000, // €72,000
		employment: 'employed',
		monthlyCommitmentsMinor: 40000, // €400
		uploaded: {},
		termMonths: 300, // 25 years
		selectedProductId: null,
		decided: false
	};
}

class MortgageApplication {
	draft = $state<MortgageDraft>(readJSON(KEY, emptyDraft()));

	private save() {
		writeJSON(KEY, this.draft);
	}

	patch(change: Partial<MortgageDraft>) {
		this.draft = { ...this.draft, ...change };
		this.save();
	}

	/** Seed from the L03 calculator (value / deposit / term), keeping the rest. */
	prefill(params: { valueMinor?: number; depositMinor?: number; termMonths?: number }) {
		const change: Partial<MortgageDraft> = {};
		if (params.valueMinor && params.valueMinor > 0) change.valueMinor = params.valueMinor;
		if (params.depositMinor && params.depositMinor >= 0) change.depositMinor = params.depositMinor;
		if (params.termMonths && params.termMonths > 0) change.termMonths = params.termMonths;
		if (Object.keys(change).length) this.patch(change);
	}

	get principalMinor(): number {
		return Math.max(0, this.draft.valueMinor - this.draft.depositMinor);
	}

	get ltv(): number {
		return ltvBps(this.draft.valueMinor, this.draft.depositMinor);
	}

	toggleDoc(id: string, uploaded: boolean) {
		this.patch({ uploaded: { ...this.draft.uploaded, [id]: uploaded } });
	}

	get requiredDocs() {
		return REQUIRED_DOCS;
	}

	get allDocsUploaded(): boolean {
		return REQUIRED_DOCS.every((d) => this.draft.uploaded[d.id]);
	}

	get uploadedCount(): number {
		return REQUIRED_DOCS.filter((d) => this.draft.uploaded[d.id]).length;
	}

	/** The decision-in-principle for the current figures (uses the headline 2yr-fixed
	 *  rate as the indicative pricing). */
	get decision(): DipResult {
		const products = this.productsRaw();
		const headlineApr = products[0]?.aprBps ?? 369;
		return dipDecision(
			this.draft.valueMinor,
			this.draft.depositMinor,
			this.draft.grossAnnualIncomeMinor,
			this.draft.monthlyCommitmentsMinor,
			this.draft.employment,
			headlineApr,
			this.draft.termMonths
		);
	}

	private productsRaw(): MortgageProduct[] {
		return mortgageProducts(this.ltv, this.principalMinor, this.draft.termMonths);
	}

	get products(): MortgageProduct[] {
		return this.productsRaw();
	}

	get selectedProduct(): MortgageProduct | null {
		const id = this.draft.selectedProductId;
		const list = this.productsRaw();
		return (id && list.find((p) => p.id === id)) || list[0] || null;
	}

	selectProduct(id: string) {
		this.patch({ selectedProductId: id });
	}

	runDecision() {
		this.patch({ decided: true });
	}

	/** The full repayment schedule for the chosen offer (e.g. 300–360 rows). */
	get offerSchedule(): AmortRow[] {
		const p = this.selectedProduct;
		if (!p) return [];
		return amortization(this.principalMinor, p.aprBps, this.draft.termMonths);
	}

	/** ISO date of a given 1-based payment month, counting from today. */
	scheduleDateIso(month: number): string {
		const d = new Date(TODAY);
		d.setMonth(d.getMonth() + month);
		return isoDate(d);
	}

	/** Mint (once) the mortgage-offer document in the vault and return its id, so the
	 *  e-sign step hands off to the shared D02 signing flow. */
	createOfferDocument(): string {
		if (getDocument(OFFER_DOC_ID)) return OFFER_DOC_ID;
		const p = this.selectedProduct;
		const rate = p ? (p.aprBps / 100).toFixed(2) : '—';
		const aprc = p ? (p.aprcBps / 100).toFixed(2) : '—';
		const monthly = p ? formatMoney(p.monthlyMinor, 'EUR') : '—';
		const total = p ? formatMoney(p.cost.totalRepayableMinor, 'EUR') : '—';
		addDocument({
			id: OFFER_DOC_ID,
			title: 'Mortgage offer',
			category: 'agreement',
			source: 'Mortgage',
			dateIso: isoDate(TODAY),
			sizeKb: 280,
			signed: false,
			summary: `My mortgage offer: ${formatMoney(this.principalMinor, 'EUR')} over ${Math.round(this.draft.termMonths / 12)} years on the ${p?.label ?? 'selected'} product at ${rate}% (APRC ${aprc}%). Monthly ${monthly}; total repayable ${total} including all fees. The full repayment schedule and itemised fees are set out in the offer.`
		});
		revision.bump();
		return OFFER_DOC_ID;
	}

	reset() {
		this.draft = emptyDraft();
		this.save();
		revision.bump();
	}
}

export const mortgageApplication = new MortgageApplication();
