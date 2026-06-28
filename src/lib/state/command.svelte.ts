// Command palette state (X03) — open/close, the query, the ranked results (or recent +
// suggested when empty), and a flat list for keyboard roving. Recent destinations are
// persisted. Navigation itself is done by the palette component (goto on the chosen
// item's href); this state just records what was run.

import { readJSON, writeJSON } from './persist';
import { search, suggestedItems, itemsByIds } from '$lib/command/registry';
import type { SearchItem, SearchGroupResult } from '$lib/command/registry';

const RECENT_KEY = 'command-recent';
const RECENT_MAX = 6;

class CommandState {
	open = $state(false);
	query = $state('');
	selectedIndex = $state(0);
	private recentIds = $state<string[]>(readJSON<string[]>(RECENT_KEY, []));

	/** Ranked, grouped results for the current query ([] when the query is empty). */
	get results(): SearchGroupResult[] {
		return search(this.query);
	}

	get suggested(): SearchItem[] {
		return suggestedItems();
	}

	get recent(): SearchItem[] {
		return itemsByIds(this.recentIds);
	}

	get hasQuery(): boolean {
		return this.query.trim().length > 0;
	}

	/** The empty-query groups (Recent + Suggested), shown when nothing is typed. */
	get emptyGroups(): SearchGroupResult[] {
		const groups: SearchGroupResult[] = [];
		if (this.recent.length) groups.push({ group: 'Actions', items: this.recent });
		groups.push({ group: 'Actions', items: this.suggested });
		return groups;
	}

	/** The flat, ordered item list the keyboard roves over (matches what's rendered). */
	get flat(): SearchItem[] {
		const groups = this.hasQuery ? this.results : this.emptyGroups;
		return groups.flatMap((g) => g.items);
	}

	get selected(): SearchItem | undefined {
		return this.flat[this.selectedIndex];
	}

	openPalette() {
		this.open = true;
		this.query = '';
		this.selectedIndex = 0;
	}

	close() {
		this.open = false;
		this.query = '';
		this.selectedIndex = 0;
	}

	setQuery(q: string) {
		this.query = q;
		this.selectedIndex = 0;
	}

	/** Move the selection, clamped to the rendered list. */
	move(delta: number) {
		const n = this.flat.length;
		if (n === 0) return;
		this.selectedIndex = (this.selectedIndex + delta + n) % n;
	}

	/** Record a run for the recent list (newest first, deduped, capped). */
	recordRecent(id: string) {
		this.recentIds = [id, ...this.recentIds.filter((x) => x !== id)].slice(0, RECENT_MAX);
		writeJSON(RECENT_KEY, this.recentIds);
	}
}

export const command = new CommandState();
