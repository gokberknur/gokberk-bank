// Unified activity feed (X02) runtime state. The event stream itself lives in the
// pure data layer (`$lib/data/activity-data`), already aggregated and newest-first.
// Read-state (which events I've seen) is mutable there, so this singleton is
// **revision-reactive** like the rewards/cards/payments spines: every getter that
// reads the stream touches `revision.value` to take a dependency on the shared
// signal, and every mutation (open one event, mark all read) calls `revision.bump()`
// so the feed, the unread badge, and the grouped buckets re-flow on every surface at
// once. On top of that sit two pieces of pure filter UI state — the active `type`
// chip and the `unread-only` toggle — which are rune `$state`, so the derived getters
// re-flow on every change too (the documents-vault filter idiom).

import {
	getActivity,
	getActivityEvent,
	unreadCount,
	markRead,
	markAllRead,
	ACTIVITY_TYPE_LABELS
} from '$lib/data/activity-data';
import type { ActivityEvent, ActivityType, ActivityStatus } from '$lib/data/activity-data';
import { TODAY } from '$lib/data/time';
import { formatDate } from '$lib/format';
import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';

// Re-expose the data surface so screens import everything feed-related from the
// state layer, never reaching into the data layer directly.
export { ACTIVITY_TYPE_LABELS };
export type { ActivityEvent, ActivityType, ActivityStatus };

/** One filter chip — a type present in the stream, with its display label. */
export interface ActivityTypeChip {
	type: ActivityType;
	label: string;
}

/** A count per type — drives the filter-chip badges (counted over the whole stream). */
export type ActivityTypeCounts = Record<ActivityType, number>;

/** One day bucket in the grouped feed: a date key, a friendly label, its events. */
export interface ActivityGroup {
	/** A stable `YYYY-MM-DD` key for the bucket (keyed `{#each}` and dedupe). */
	key: string;
	/** "Today" / "Yesterday", else a formatted date ("19 Jun 2026"). */
	label: string;
	/** The events that fall on this day, newest-first. */
	events: ActivityEvent[];
}

/** Local `YYYY-MM-DD` key for a Date (local parts, to match the mock TODAY anchor). */
function dayKey(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

class FeedState {
	/** The active type filter; `'all'` shows every kind of event. */
	typeFilter = $state<ActivityType | 'all'>('all');

	/** When on, the feed shows only events I haven't read yet. */
	unreadOnly = $state(false);

	/** The whole stream, newest-first (the data layer already sorts it). */
	get all(): ActivityEvent[] {
		revision.value;
		return getActivity();
	}

	/** Find one event by id. */
	event(id: string): ActivityEvent | undefined {
		revision.value;
		return getActivityEvent(id);
	}

	/** Switch the active type chip (drives `filtered`). */
	setType(t: ActivityType | 'all') {
		this.typeFilter = t;
	}

	/** Flip the unread-only toggle (drives `filtered`). */
	toggleUnreadOnly() {
		this.unreadOnly = !this.unreadOnly;
	}

	/** Set the unread-only toggle explicitly (drives `filtered`). */
	setUnreadOnly(v: boolean) {
		this.unreadOnly = v;
	}

	/**
	 * The stream narrowed by the active `typeFilter` (unless `'all'`) AND the
	 * `unreadOnly` toggle (only `!read`). Order is preserved from `all`, so the
	 * result stays newest-first.
	 */
	get filtered(): ActivityEvent[] {
		const type = this.typeFilter;
		const unreadOnly = this.unreadOnly;
		return this.all.filter((e) => {
			if (type !== 'all' && e.type !== type) return false;
			if (unreadOnly && e.read) return false;
			return true;
		});
	}

	/**
	 * The **filtered** feed grouped into day buckets — newest day first, events
	 * newest-first within each day. The label reads "Today" / "Yesterday" for the
	 * two most recent days (compared against the mock TODAY), else a formatted date.
	 */
	get grouped(): ActivityGroup[] {
		const todayKey = dayKey(TODAY);
		const yesterdayKey = dayKey(new Date(TODAY.getTime() - 24 * 60 * 60 * 1000));
		const groups: ActivityGroup[] = [];
		const byKey = new Map<string, ActivityGroup>();
		for (const e of this.filtered) {
			const date = new Date(e.timestamp);
			const key = dayKey(date);
			let group = byKey.get(key);
			if (!group) {
				const label = key === todayKey ? 'Today' : key === yesterdayKey ? 'Yesterday' : formatDate(date);
				group = { key, label, events: [] };
				byKey.set(key, group);
				groups.push(group);
			}
			group.events.push(e);
		}
		return groups;
	}

	/** How many events I haven't read yet — drives the unread badge. */
	get unread(): number {
		revision.value;
		return unreadCount();
	}

	/** The distinct types present in the stream, with labels — the filter chips. */
	get types(): ActivityTypeChip[] {
		const seen = new Set<ActivityType>();
		const chips: ActivityTypeChip[] = [];
		for (const e of this.all) {
			if (seen.has(e.type)) continue;
			seen.add(e.type);
			chips.push({ type: e.type, label: ACTIVITY_TYPE_LABELS[e.type] });
		}
		return chips;
	}

	/** A count per type over the whole stream (each starts at 0) — chip badges. */
	get typeCounts(): ActivityTypeCounts {
		const counts = {} as ActivityTypeCounts;
		for (const key of Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]) {
			counts[key] = 0;
		}
		for (const e of this.all) {
			counts[e.type] += 1;
		}
		return counts;
	}

	/** No events at all — the surface shows the "nothing here yet" empty state. */
	get isEmptyData(): boolean {
		return this.all.length === 0;
	}

	/** Events exist, but the active filters hide them all — distinct empty copy. */
	get isEmptyFiltered(): boolean {
		return this.all.length > 0 && this.filtered.length === 0;
	}

	// ---- Mutations (optimistic — the mock data layer is synchronous) ----------

	/**
	 * Open one event: mark it read and bump so the feed/badge re-flow. No toast —
	 * marking-read-on-open is implicit, the unread badge dropping is feedback enough.
	 */
	open(id: string) {
		markRead(id);
		revision.bump();
	}

	/** Clear the unread badge in one move (guarded), bump, confirm with a toast. */
	markAllRead() {
		if (this.unread === 0) return;
		markAllRead();
		revision.bump();
		toast('All caught up', { status: 'success' });
	}
}

export const feed = new FeedState();
