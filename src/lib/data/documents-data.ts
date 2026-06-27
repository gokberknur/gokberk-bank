// Documents vault (D01) — the canonical store of everything the bank generates:
// monthly statements, the loan agreement, insurance policy schedules + certificates,
// and the terms pack. Signed copies (agreements/policies) carry `signed: true`.
// Deterministic; dates derive from the fixed TODAY anchor. Mock content only — the
// in-app viewer renders a summary, "download" is simulated.

import { TODAY, isoDate } from './time';

export type DocCategory = 'statement' | 'agreement' | 'policy' | 'certificate' | 'terms';

export interface BankDocument {
	id: string;
	title: string;
	category: DocCategory;
	/** Where it came from, e.g. "Main · EUR", "Personal loan", "Travel cover". */
	source: string;
	/** ISO date issued. */
	dateIso: string;
	/** Indicative file size, KB. */
	sizeKb: number;
	/** A signed, timestamped copy (agreements + policy schedules). */
	signed: boolean;
	/** A short human summary shown in the in-app viewer. */
	summary: string;
}

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
	statement: 'Statement',
	agreement: 'Agreement',
	policy: 'Policy',
	certificate: 'Certificate',
	terms: 'Terms'
};

function monthLabel(date: Date): string {
	return date.toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function monthsAgo(n: number): Date {
	const d = new Date(TODAY);
	d.setMonth(d.getMonth() - n, 1);
	return d;
}

// Six monthly Main-account statements, newest first.
const STATEMENTS: BankDocument[] = Array.from({ length: 6 }, (_, i) => {
	const d = monthsAgo(i);
	return {
		id: `doc-stmt-${isoDate(d).slice(0, 7)}`,
		title: `Account statement — ${monthLabel(d)}`,
		category: 'statement' as const,
		source: 'Main · EUR',
		dateIso: isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))),
		sizeKb: 180 + i * 6,
		signed: false,
		summary: `My EUR account statement for ${monthLabel(d)} — opening and closing balance, every transaction, and any fees.`
	};
});

const FIXED_DOCS: BankDocument[] = [
	{
		id: 'doc-loan-agreement',
		title: 'Personal loan credit agreement',
		category: 'agreement',
		source: 'Personal loan',
		dateIso: isoDate(monthsAgo(10)),
		sizeKb: 320,
		signed: true,
		summary:
			'My signed €8,000 personal loan agreement over 36 months at 7.9% APR — the full pre-contract terms, repayment schedule, and my 14-day right to withdraw.'
	},
	{
		id: 'doc-travel-schedule',
		title: 'Travel cover — policy schedule',
		category: 'policy',
		source: 'Travel cover',
		dateIso: isoDate(monthsAgo(4)),
		sizeKb: 210,
		signed: true,
		summary:
			'My annual multi-trip travel policy schedule — cover levels, limits, what is and isn’t covered, my excess, and the renewal date.'
	},
	{
		id: 'doc-travel-certificate',
		title: 'Travel cover — certificate of insurance',
		category: 'certificate',
		source: 'Travel cover',
		dateIso: isoDate(monthsAgo(4)),
		sizeKb: 90,
		signed: false,
		summary: 'Proof of my travel cover — the certificate I can show an airline, hotel, or border officer.'
	},
	{
		id: 'doc-device-schedule',
		title: 'Device cover — policy schedule',
		category: 'policy',
		source: 'Device cover',
		dateIso: isoDate(monthsAgo(7)),
		sizeKb: 195,
		signed: true,
		summary: 'My device policy schedule for an iPhone 16 Pro — accidental damage, theft, and breakdown cover, with my excess and limits.'
	},
	{
		id: 'doc-card-statement',
		title: 'Card statement — last month',
		category: 'statement',
		source: 'Card ·· 4291',
		dateIso: isoDate(monthsAgo(0)),
		sizeKb: 120,
		signed: false,
		summary: 'My physical card statement for the last billing period — every purchase, grouped by date.'
	},
	{
		id: 'doc-terms',
		title: 'Account terms & conditions',
		category: 'terms',
		source: 'gökberk bank',
		dateIso: isoDate(monthsAgo(14)),
		sizeKb: 410,
		signed: false,
		summary: 'The terms that govern my account — fees, my rights, how I’m protected, and how to complain.'
	}
];

const DOCUMENTS: BankDocument[] = [...STATEMENTS, ...FIXED_DOCS].sort((a, b) =>
	a.dateIso < b.dateIso ? 1 : a.dateIso > b.dateIso ? -1 : 0
);

export function getDocuments(): BankDocument[] {
	return DOCUMENTS;
}

export function getDocument(id: string): BankDocument | undefined {
	return DOCUMENTS.find((d) => d.id === id);
}
