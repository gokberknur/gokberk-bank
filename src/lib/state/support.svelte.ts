// Support (S01) runtime state — two halves. The **help center** is read-only and
// pure: browsable/searchable articles forwarded from `$lib/data/support-data`,
// driven only by the reactive `helpQuery`. The **tickets** half is mutable, so it
// is **revision-reactive** like the cards/payments spines: every getter touches
// `revision.value` to take a dependency on the shared signal, and every mutation
// (raise a ticket, post a reply) replaces the data immutably + calls
// `revision.bump()` so the ticket list and threads re-flow on every surface.

import {
	getArticles,
	getArticle,
	searchArticles,
	HELP_CATEGORY_LABELS,
	getTickets,
	getTicket,
	addTicket,
	addReply,
	TICKET_STATUS_LABELS
} from '$lib/data/support-data';
import type {
	HelpArticle,
	HelpCategory,
	Ticket,
	TicketMessage,
	TicketStatus
} from '$lib/data/support-data';
import { revision } from './revision.svelte';
import { toast } from './toasts.svelte';

// Re-expose the data surface so screens import everything support-related from the
// state layer, never reaching into the data layer directly.
export { HELP_CATEGORY_LABELS, TICKET_STATUS_LABELS };
export type { HelpArticle, HelpCategory, Ticket, TicketMessage, TicketStatus };

/** The in-flight "raise a ticket" draft — the form's working state. */
export interface RaiseDraft {
	subject: string;
	category: HelpCategory;
	body: string;
}

/** A help category with its articles — the browse view's grouped sections. */
export interface HelpGroup {
	category: HelpCategory;
	label: string;
	articles: HelpArticle[];
}

/** A fresh raise draft: nothing entered, seeded to the Account category. */
function emptyRaiseDraft(): RaiseDraft {
	return { subject: '', category: 'account', body: '' };
}

class SupportState {
	/** The help-center search query (drives `results`). */
	helpQuery = $state('');

	/** The "raise a ticket" form's working draft — ephemeral, never persisted. */
	raiseDraft = $state<RaiseDraft>(emptyRaiseDraft());

	// ---- Help center (read + search) -----------------------------------------

	/** Set the help search query (drives `results`). */
	setHelpQuery(q: string) {
		this.helpQuery = q;
	}

	/** Every help article. */
	get articles(): readonly HelpArticle[] {
		return getArticles();
	}

	/** Find one article by id. */
	article(id: string): HelpArticle | undefined {
		return getArticle(id);
	}

	/** Articles matching `helpQuery` (all of them when the query is empty). */
	get results(): HelpArticle[] {
		return searchArticles(this.helpQuery);
	}

	/** Articles grouped by category (for the browse view shown when there's no query). */
	get byCategory(): HelpGroup[] {
		const groups = new Map<HelpCategory, HelpArticle[]>();
		for (const a of this.articles) {
			const list = groups.get(a.category);
			if (list) list.push(a);
			else groups.set(a.category, [a]);
		}
		const order = Object.keys(HELP_CATEGORY_LABELS) as HelpCategory[];
		return order
			.filter((category) => groups.has(category))
			.map((category) => ({
				category,
				label: HELP_CATEGORY_LABELS[category],
				articles: groups.get(category) ?? []
			}));
	}

	// ---- Tickets (revision-reactive) -----------------------------------------

	/** My tickets, newest-updated first. Touches `revision.value` so it re-flows. */
	get tickets(): Ticket[] {
		revision.value;
		return [...getTickets()].sort((a, b) =>
			a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
		);
	}

	/** Find one ticket by id (revision-reactive so a new reply reflects). */
	ticket(id: string): Ticket | undefined {
		revision.value;
		return getTicket(id);
	}

	/** Merge a partial patch into the raise draft. */
	setRaise(patch: Partial<RaiseDraft>) {
		this.raiseDraft = { ...this.raiseDraft, ...patch };
	}

	/** Discard the raise draft back to its seeded defaults. */
	resetRaise() {
		this.raiseDraft = emptyRaiseDraft();
	}

	/** Whether the draft is complete enough to submit (subject + body non-empty). */
	canRaise = $derived(
		this.raiseDraft.subject.trim().length > 0 && this.raiseDraft.body.trim().length > 0
	);

	/**
	 * Raise a new ticket from the draft. Guards on `canRaise`, then appends it to
	 * the data layer, bumps the revision, confirms with a toast, and clears the
	 * draft. Returns the new ticket, or null when the draft is incomplete.
	 */
	raiseTicket(): Ticket | null {
		if (!this.canRaise) return null;
		const { subject, category, body } = this.raiseDraft;
		const ticket = addTicket(subject.trim(), category, body.trim());
		revision.bump();
		toast('Ticket raised — I’ll hear back soon', { status: 'success' });
		this.resetRaise();
		return ticket;
	}

	/** Post a reply to a ticket. Guards on a non-empty body. Returns whether it sent. */
	reply(ticketId: string, body: string): boolean {
		const text = body.trim();
		if (!text) return false;
		addReply(ticketId, text);
		revision.bump();
		return true;
	}
}

export const support = new SupportState();
