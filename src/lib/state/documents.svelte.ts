// Documents vault (D01) runtime state. The vault itself is **read-only** — the
// pure data layer (`$lib/data/documents-data`) owns the statements, agreements,
// policies, certificates, and terms, already sorted newest-first. So this
// singleton holds no `revision` plumbing: the only mutable, reactive things are
// the two pieces of filter UI state — the selected `category` chip and the search
// `query`. They ARE rune `$state`, so the derived getters re-flow on every change.

import { getDocuments, getDocument, DOC_CATEGORY_LABELS } from '$lib/data/documents-data';
import type { BankDocument, DocCategory } from '$lib/data/documents-data';

// Re-expose the data surface so screens import everything documents-related from
// the state layer, never reaching into the data layer directly.
export { DOC_CATEGORY_LABELS };
export type { BankDocument, DocCategory };

/** One filter chip — a category present in the vault, with its display label. */
export interface DocCategoryChip {
	category: DocCategory;
	label: string;
}

/** A count per category plus the `all` total — drives the filter-chip badges. */
export type DocCounts = Record<DocCategory | 'all', number>;

class DocumentsState {
	/** The active category filter; `'all'` shows every type. */
	category = $state<DocCategory | 'all'>('all');

	/** The case-insensitive search query (matched over title/source/summary). */
	query = $state('');

	/** The whole vault, newest-first (the data layer already sorts it). */
	get all(): BankDocument[] {
		return getDocuments();
	}

	/** Find one document by id. */
	document(id: string): BankDocument | undefined {
		return getDocument(id);
	}

	/** Switch the active category chip (drives `filtered`). */
	setCategory(c: DocCategory | 'all') {
		this.category = c;
	}

	/** Set the search query (drives `filtered`). */
	setQuery(q: string) {
		this.query = q;
	}

	/**
	 * The vault narrowed by the active `category` (unless `'all'`) AND a
	 * case-insensitive `query` match over title/source/summary. Order is preserved
	 * from `all`, so the result stays newest-first.
	 */
	get filtered(): BankDocument[] {
		const category = this.category;
		const q = this.query.trim().toLowerCase();
		return this.all.filter((d) => {
			if (category !== 'all' && d.category !== category) return false;
			if (!q) return true;
			return (
				d.title.toLowerCase().includes(q) ||
				d.source.toLowerCase().includes(q) ||
				d.summary.toLowerCase().includes(q)
			);
		});
	}

	/** The distinct categories present in the vault, with labels — the filter chips. */
	get categories(): DocCategoryChip[] {
		const seen = new Set<DocCategory>();
		const chips: DocCategoryChip[] = [];
		for (const d of this.all) {
			if (seen.has(d.category)) continue;
			seen.add(d.category);
			chips.push({ category: d.category, label: DOC_CATEGORY_LABELS[d.category] });
		}
		return chips;
	}

	/** A count per category (each starts at 0) plus the `all` total — chip badges. */
	get counts(): DocCounts {
		const counts = { all: 0 } as DocCounts;
		for (const key of Object.keys(DOC_CATEGORY_LABELS) as DocCategory[]) {
			counts[key] = 0;
		}
		for (const d of this.all) {
			counts.all += 1;
			counts[d.category] += 1;
		}
		return counts;
	}
}

export const documents = new DocumentsState();
