// Support (S01) — a help center (browsable/searchable articles) + tickets with
// threaded replies. Calm, self-serve-first. Deterministic; dates from TODAY.
// Tickets are mutable (raise + reply) via immutable replacement so rune reads
// re-flow. Mock content only.

import { TODAY, isoDate } from './time';

export type HelpCategory = 'payments' | 'cards' | 'account' | 'security' | 'borrow';

export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
	payments: 'Payments & transfers',
	cards: 'Cards',
	account: 'Account & wallets',
	security: 'Security & fraud',
	borrow: 'Borrowing & cover'
};

export interface HelpArticle {
	id: string;
	category: HelpCategory;
	title: string;
	/** A short plain-language answer (a few sentences). */
	body: string;
}

export const HELP_ARTICLES: readonly HelpArticle[] = [
	{ id: 'help-sepa-time', category: 'payments', title: 'How long does a SEPA transfer take?', body: 'A SEPA Instant transfer usually lands in seconds, any time of day. A standard SEPA Credit Transfer settles within one business day. I can see the expected arrival on the review step before I send, and the status on the transaction afterwards.' },
	{ id: 'help-swift-fees', category: 'payments', title: 'What fees apply to an international (SWIFT) transfer?', body: 'A SWIFT transfer shows the FX rate, my margin, and the charge option (OUR / SHARED / BEN) before I confirm — nothing is hidden. With SHARED, intermediary banks may take a small fee from the amount in transit; OUR means I pay those so the full amount arrives.' },
	{ id: 'help-cancel-payment', category: 'payments', title: 'Can I cancel a payment I just sent?', body: 'A payment that is still pending can be cancelled from its transaction detail, and the money returns to my wallet straight away. Once it has settled, I’d need to ask the recipient to return it — reach out to support and we’ll help.' },
	{ id: 'help-freeze-card', category: 'cards', title: 'How do I freeze or unfreeze my card?', body: 'On the card’s page, the Freeze switch pauses all payments instantly — and unfreezes just as fast. Freezing is reversible and doesn’t cancel the card, so it’s the safe first move if I misplace it.' },
	{ id: 'help-card-controls', category: 'cards', title: 'What do the card controls do?', body: 'Card controls let me turn channels on or off (online, contactless, ATM, abroad) and set a daily spend limit. They take effect immediately and I can change them any time — useful for a virtual card I only use for one subscription.' },
	{ id: 'help-virtual-card', category: 'cards', title: 'What’s a virtual or single-use card?', body: 'A virtual card lives only in the app — handy for online shops. A single-use card cancels itself after one purchase, so the number is worthless if it leaks. Both spend from the same wallet as my physical card.' },
	{ id: 'help-available-vs-current', category: 'account', title: 'Why is my available balance different from my current balance?', body: 'Current balance is everything settled in my wallet. Available balance is what I can actually spend right now — it excludes money held for pending card authorisations or transfers that haven’t cleared. The two converge once everything settles.' },
	{ id: 'help-multi-currency', category: 'account', title: 'How do multi-currency wallets work?', body: 'I can hold balances in several currencies side by side and exchange between them at a clear rate. Each wallet has its own IBAN-style details, so I can be paid in that currency without converting.' },
	{ id: 'help-statements', category: 'account', title: 'Where do I find my statements?', body: 'Every statement, agreement, policy, and certificate lives in my Documents vault. I can filter by type or date, open any document in the app, and download a copy.' },
	{ id: 'help-passkey', category: 'security', title: 'What is a passkey and why use one?', body: 'A passkey signs me in and approves sensitive actions using my device’s biometrics instead of a password — there’s nothing to phish or reuse. I’m prompted for it as a step-up when I do something high-stakes, like signing an agreement or a large transfer.' },
	{ id: 'help-unrecognised-charge', category: 'security', title: 'I don’t recognise a charge — what should I do?', body: 'First, freeze the card from its page so nothing else can go through. Then open the transaction: many unfamiliar names are just a merchant’s legal name. If it’s genuinely not mine, start a dispute and we’ll investigate — I won’t be blamed, and provisional credit may apply while we look into it.' },
	{ id: 'help-step-up', category: 'security', title: 'Why am I asked to verify again mid-flow?', body: 'For higher-value or sensitive actions, the app asks for a quick identity check (a passkey or one-time code) right before I commit. It’s a step-up — a deliberate pause so a deliberate action is really mine.' },
	{ id: 'help-loan-withdraw', category: 'borrow', title: 'Can I change my mind after taking a loan?', body: 'Yes. Every credit agreement comes with a 14-day right to withdraw: within 14 days I can cancel and repay what I’ve drawn, with no penalty. The same cooling-off idea applies to insurance — a 14-day window for a full refund if I haven’t claimed.' },
	{ id: 'help-soft-search', category: 'borrow', title: 'Will checking my loan rate affect my credit score?', body: 'No. The affordability check on a loan application is a soft search — it shows me my rate without leaving a mark a lender can see. A hard check only happens if I go ahead and accept the agreement.' },
	{ id: 'help-cover-excluded', category: 'borrow', title: 'How do I know what my insurance doesn’t cover?', body: 'Exclusions are shown with the same prominence as what’s covered — on the quote, the review, and the policy page. Add-ons can move some items into cover. If anything is unclear before I buy, support can talk it through.' }
];

export function getArticles(): readonly HelpArticle[] {
	return HELP_ARTICLES;
}

export function getArticle(id: string): HelpArticle | undefined {
	return HELP_ARTICLES.find((a) => a.id === id);
}

export function searchArticles(query: string): HelpArticle[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...HELP_ARTICLES];
	return HELP_ARTICLES.filter(
		(a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
	);
}

export type TicketStatus = 'open' | 'in-review' | 'resolved';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
	open: 'Open',
	'in-review': 'In review',
	resolved: 'Resolved'
};

export interface TicketMessage {
	id: string;
	from: 'me' | 'support';
	dateIso: string;
	body: string;
}

export interface Ticket {
	id: string;
	ref: string;
	subject: string;
	category: HelpCategory;
	status: TicketStatus;
	createdAt: string;
	updatedAt: string;
	messages: TicketMessage[];
}

function daysAgo(n: number): string {
	const d = new Date(TODAY);
	d.setDate(d.getDate() - n);
	return isoDate(d);
}

let tickets: Ticket[] = [
	{
		id: 'tk-2',
		ref: 'CASE-481902',
		subject: 'Card declined while abroad',
		category: 'cards',
		status: 'in-review',
		createdAt: daysAgo(2),
		updatedAt: daysAgo(1),
		messages: [
			{ id: 'm1', from: 'me', dateIso: daysAgo(2), body: 'My physical card was declined at a shop in Lisbon even though I have funds. Can you check what happened?' },
			{ id: 'm2', from: 'support', dateIso: daysAgo(2), body: 'Thanks for flagging this — sorry for the hassle. I can see the “abroad” channel was turned off in your card controls, which would explain the decline. I’ve passed this to the cards team to confirm there’s nothing else going on.' },
			{ id: 'm3', from: 'support', dateIso: daysAgo(1), body: 'Quick update: the cards team confirmed it was the channel control. You can re-enable “Use abroad” on the card’s page and it’ll work straight away. I’ll keep this open until you’ve had a chance to try.' }
		]
	},
	{
		id: 'tk-1',
		ref: 'CASE-477310',
		subject: 'Update the address on my account',
		category: 'account',
		status: 'resolved',
		createdAt: daysAgo(12),
		updatedAt: daysAgo(11),
		messages: [
			{ id: 'm1', from: 'me', dateIso: daysAgo(12), body: 'I’ve moved — how do I update my registered address?' },
			{ id: 'm2', from: 'support', dateIso: daysAgo(11), body: 'Congrats on the move! I’ve updated your address from the details you confirmed. Your next statement will show the new one. Anything else I can help with?' }
		]
	}
];

export function getTickets(): Ticket[] {
	return tickets;
}

export function getTicket(id: string): Ticket | undefined {
	return tickets.find((t) => t.id === id);
}

/** Raise a new ticket (immutable). Returns it. */
export function addTicket(subject: string, category: HelpCategory, body: string): Ticket {
	const seq = tickets.length + 1;
	const today = isoDate(TODAY);
	const ticket: Ticket = {
		id: `tk-${seq + 2}`,
		ref: `CASE-${480000 + seq * 137}`,
		subject,
		category,
		status: 'open',
		createdAt: today,
		updatedAt: today,
		messages: [{ id: 'm1', from: 'me', dateIso: today, body }]
	};
	tickets = [ticket, ...tickets];
	return ticket;
}

/** Append a reply to a ticket (immutable replacement). A reply to a resolved ticket
 *  reopens it — the detail view promises "a reply reopens the conversation" (SVC-Q-01). */
export function addReply(ticketId: string, body: string): void {
	const today = isoDate(TODAY);
	tickets = tickets.map((t) =>
		t.id === ticketId
			? {
					...t,
					updatedAt: today,
					status: t.status === 'resolved' ? 'open' : t.status,
					messages: [...t.messages, { id: `m${t.messages.length + 1}`, from: 'me', dateIso: today, body }]
				}
			: t
	);
}
