// Command-menu state (X03, now on the DS `gok-command-menu`). The element owns the
// overlay, keyboard, and a11y; this state owns only the app side: a one-shot "please
// open" intent the shell reacts to, the live query, the persisted recents, and the
// `commands` list handed to the element (which renders it as-given in external-
// filtering mode). Navigation/actions live on each command; this state just records
// what was run for the recent list.

import { readJSON, writeJSON } from './persist';
import { search, suggestedItems, itemsByIds } from '$lib/command/registry';
import type { Command } from '$lib/command/registry';

const RECENT_KEY = 'command-recent';
const RECENT_MAX = 6;

class CommandState {
	open = $state(false); // one-shot "please open" intent the shell layout reacts to
	query = $state('');
	private recentIds = $state<string[]>(readJSON<string[]>(RECENT_KEY, []));

	get recent(): Command[] {
		return itemsByIds(this.recentIds);
	}

	// The commands handed to gok-command-menu (external-filtering renders this list as-given).
	// Empty query -> Recent + Suggested (deduped); else the ranked, section-grouped search
	// results flattened in best-score order (so the top hit is the first/active option = Enter target).
	get commands(): Command[] {
		const q = this.query.trim();
		if (!q) {
			const recentIds = new Set(this.recentIds);
			const recent = this.recent.map((c) => ({ ...c, section: 'Recent' }));
			const suggested = suggestedItems()
				.filter((c) => !recentIds.has(c.id))
				.map((c) => ({ ...c, section: 'Suggested' }));
			return [...recent, ...suggested];
		}
		return search(q).flatMap((g) => g.items);
	}

	openPalette() {
		this.query = '';
		this.open = true;
	}

	close() {
		this.open = false;
		this.query = '';
	}

	setQuery(q: string) {
		this.query = q;
	}

	recordRecent(id: string) {
		this.recentIds = [id, ...this.recentIds.filter((x) => x !== id)].slice(0, RECENT_MAX);
		writeJSON(RECENT_KEY, this.recentIds);
	}
}

export const command = new CommandState();
