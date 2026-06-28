<script lang="ts">
	// S01 support hub — the calm front door. Self-serve first: a prominent help
	// search leads, the likely answer surfaces as expandable articles, and only
	// then comes the effortless escalation (raise a ticket, or — soon — live chat).
	// Never a dead end: an empty search still points to the ticket form. The one
	// earned accent on this surface is the single primary "Send to support".
	import { goto } from '$app/navigation';
	import { support, HELP_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '$lib/state/support.svelte';
	import type { HelpCategory, TicketStatus } from '$lib/state/support.svelte';
	import { disputes, DISPUTE_STATUS_LABELS } from '$lib/disputes/disputes.svelte';
	import type { DisputeStatus } from '$lib/disputes/disputes.svelte';
	import { getTransactionById } from '$lib/data/disputes-data';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';

	// Help center: the query drives whether we show search results or the browse-
	// by-category index. Both read from the store's reactive getters.
	const query = $derived(support.helpQuery.trim());
	const results = $derived(support.results);
	const groups = $derived(support.byCategory);

	const tickets = $derived(support.tickets);
	const allDisputes = $derived(disputes.allDisputes());

	const categoryEntries = Object.entries(HELP_CATEGORY_LABELS) as [HelpCategory, string][];

	function onSearchInput(e: Event) {
		support.setHelpQuery((e.target as HTMLInputElement).value);
	}

	function onSubjectInput(e: Event) {
		support.setRaise({ subject: (e.target as HTMLInputElement).value });
	}

	function onCategoryChange(e: Event) {
		support.setRaise({ category: (e.target as HTMLInputElement).value as HelpCategory });
	}

	// Raise: hand the draft to the store, then deep-link straight into the new
	// ticket's thread so the escalation never loses the user.
	function send() {
		const ticket = support.raiseTicket();
		if (ticket) goto(`/support/tickets/${ticket.id}`);
	}

	function scrollToRaise() {
		document.getElementById('raise-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Support · gökberk bank</title>
</svelte:head>

<!-- A status tag carries the word + an icon, never colour alone. -->
{#snippet statusTag(status: TicketStatus)}
	<gok-tag size="s">
		<span class="status">
			{#if status === 'resolved'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else if status === 'in-review'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
					<path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.75" />
				</svg>
			{/if}
			{TICKET_STATUS_LABELS[status]}
		</span>
	</gok-tag>
{/snippet}

<!-- A dispute status tag — the word + a leading glyph, never colour alone. -->
{#snippet disputeStatusTag(status: DisputeStatus)}
	<gok-tag size="s">
		<span class="status">
			{#if status === 'upheld'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else if status === 'declined'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
					<path d="M8.5 12h7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
				</svg>
			{:else if status === 'withdrawn'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<path d="M6 12h12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
				</svg>
			{:else if status === 'provisional-credit'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<path d="M19 12a7 7 0 1 1-2.05-4.95" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
					<path d="M19 4v3.5h-3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else if status === 'investigating'}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
					<path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
					<circle cx="12" cy="12" r="5" />
				</svg>
			{/if}
			{DISPUTE_STATUS_LABELS[status]}
		</span>
	</gok-tag>
{/snippet}

<!-- One expandable article: native <details> (the DS ships no gok-disclosure). -->
{#snippet article(title: string, body: string)}
	<details class="article">
		<summary class="article-summary">{title}</summary>
		<p class="article-body">{body}</p>
	</details>
{/snippet}

<div class="page">
	<PageHeader
		eyebrow="Support"
		title="How can I help myself today?"
		titleClass="gok-headline-2"
		caption="Most answers are a search away. If I still need a hand, I can raise a ticket and I’ll hear back soon — usually within a day."
	>
		{#snippet actions()}
			<gok-button variant="secondary" {@attach on('click', scrollToRaise)}>
				Raise a ticket
			</gok-button>
		{/snippet}
	</PageHeader>

	<!-- 1 · Help center: search first, then browse. -->
	<section class="help" aria-labelledby="help-heading">
		<h2 id="help-heading" class="block-title gok-headline-5">Search help</h2>

		<gok-input
			type="search"
			label="What do I need help with?"
			placeholder="Search help — e.g. “SEPA”, “freeze card”, “passkey”"
			autocomplete="off"
			{@attach on('input', onSearchInput)}
		></gok-input>

		{#if query.length > 0}
			{#if results.length > 0}
				<div class="articles" aria-label="Search results">
					{#each results as a (a.id)}
						{@render article(a.title, a.body)}
					{/each}
				</div>
			{:else}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No articles matched</p>
					<p class="empty-body">
						No help articles matched “{query}”. I can raise a ticket below and I’ll help.
					</p>
				</gok-empty-state>
			{/if}
		{:else}
			<div class="browse">
				{#each groups as group (group.category)}
					<div class="browse-group">
						<h3 class="browse-label gok-eyebrow">{group.label}</h3>
						<div class="articles">
							{#each group.articles as a (a.id)}
								{@render article(a.title, a.body)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- 2 · My tickets. -->
	<section class="tickets" aria-labelledby="tickets-heading">
		<h2 id="tickets-heading" class="block-title gok-headline-5">My tickets</h2>

		{#if tickets.length === 0}
			<p class="quiet">No open tickets.</p>
		{:else}
			<ul class="ticket-list">
				{#each tickets as t (t.id)}
					<li class="ticket">
						<a class="ticket-link" href={`/support/tickets/${t.id}`}>
							<span class="ticket-main">
								<span class="ticket-subject">{t.subject}</span>
								<span class="ticket-ref nums">{t.ref}</span>
							</span>
							<span class="ticket-meta">
								{@render statusTag(t.status)}
								<span class="ticket-date nums">Updated {formatDate(t.updatedAt)}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- 3 · My disputes. Disputes start from a transaction, so there's no "new" button
	     here — this just tracks the ones I've raised. -->
	{#if allDisputes.length > 0}
		<section class="disputes" aria-labelledby="disputes-heading">
			<h2 id="disputes-heading" class="block-title gok-headline-5">My disputes</h2>

			<ul class="ticket-list">
				{#each allDisputes as d (d.id)}
					{@const charge = getTransactionById(d.transactionId)}
					<li class="ticket">
						<a class="ticket-link" href={`/support/disputes/${d.id}`}>
							<span class="ticket-main">
								<span class="ticket-subject">{charge?.merchant ?? 'Disputed charge'}</span>
								<span class="ticket-ref nums">{d.reference}</span>
							</span>
							<span class="ticket-meta">
								{@render disputeStatusTag(d.status)}
								<span class="ticket-date nums">Raised {formatDate(d.raisedOn)}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- 4 · Raise a ticket. -->
	<section class="raise" aria-labelledby="raise-heading">
		<h2 id="raise-heading" class="block-title gok-headline-5">Raise a ticket</h2>

		<gok-card variant="filled">
			<form class="form" onsubmit={(e) => e.preventDefault()}>
				<gok-input
					label="Subject"
					placeholder="A short summary of what’s going on"
					autocomplete="off"
					reserve-message
					{@attach on('input', onSubjectInput)}
				></gok-input>

				<gok-select
					label="Category"
					{@attach setProps({ value: support.raiseDraft.category })}
					{@attach on('change', onCategoryChange)}
				>
					{#each categoryEntries as [value, label] (value)}
						<gok-option {value}>{label}</gok-option>
					{/each}
				</gok-select>

				<!-- The DS ships no gok-textarea, so this is a tokened <textarea> that
				     mirrors gok-input's label + reserved-message anatomy. -->
				<div class="field">
					<label class="field-label" for="raise-body">Describe it</label>
					<textarea
						id="raise-body"
						class="field-textarea"
						rows="5"
						placeholder="What happened, and what I’d like to sort out. The more detail, the faster I can help."
						value={support.raiseDraft.body}
						oninput={(e) => support.setRaise({ body: e.currentTarget.value })}
					></textarea>
					<p class="field-message">I won’t be blamed — just tell it like it happened.</p>
				</div>

				<div class="form-foot">
					<div class="attach">
						<!-- F09 file-upload dropzone is deferred; affordance shown disabled. -->
						<gok-button variant="secondary" size="s" disabled>Attach a file</gok-button>
						<gok-tag size="s">Soon</gok-tag>
					</div>
					<gok-button
						variant="primary"
						disabled={!support.canRaise}
						{@attach on('click', send)}
					>
						Send to support
					</gok-button>
				</div>
			</form>
		</gok-card>
	</section>

	<!-- 5 · Live chat (mock deferred). -->
	<section class="chat" aria-labelledby="chat-heading">
		<h2 id="chat-heading" class="block-title gok-headline-5">Live chat</h2>
		<div class="chat-row">
			<div class="chat-copy">
				<p class="chat-title">Start a live chat</p>
				<p class="chat-sub">Chat with me in real time. Coming soon — for now, a ticket is the way.</p>
			</div>
			<div class="chat-actions">
				<!-- Mock live-chat panel is deferred. -->
				<gok-button variant="secondary" disabled>Start a live chat</gok-button>
				<gok-tag size="s">Soon</gok-tag>
			</div>
		</div>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* --- Section scaffolding --- */
	.help,
	.tickets,
	.disputes,
	.raise,
	.chat {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* --- Help center --- */
	.browse {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.browse-group {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.browse-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.articles {
		display: flex;
		flex-direction: column;
	}

	.article {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.article:last-child {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.article-summary {
		padding-block: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.article-body {
		margin: 0;
		padding-block-end: var(--gok-space-400);
		max-inline-size: 60ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-relaxed-line, var(--gok-type-body-regular-line));
		color: var(--gok-color-text-muted);
	}

	/* --- Tickets --- */
	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.ticket-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.ticket {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ticket:last-child {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ticket-link {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-200) var(--gok-space-400);
		padding-block: var(--gok-space-300);
		text-decoration: none;
		color: inherit;
	}

	.ticket-link:hover .ticket-subject {
		color: var(--gok-color-link);
	}

	.ticket-link:focus-visible {
		outline: var(--gok-border-width-thick, 2px) solid var(--gok-color-primary);
		outline-offset: var(--gok-space-100);
		border-radius: var(--gok-radius-200, 4px);
	}

	.ticket-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
		min-inline-size: 0;
	}

	.ticket-subject {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.ticket-ref {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ticket-meta {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.ticket-date {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	/* --- Raise form --- */
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-label-size, var(--gok-type-body-small-size));
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.field-textarea {
		width: 100%;
		padding: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-200, 6px);
		resize: vertical;
	}

	.field-textarea::placeholder {
		color: var(--gok-color-text-muted);
	}

	.field-textarea:focus-visible {
		outline: none;
		border-color: var(--gok-color-primary);
		box-shadow: 0 0 0 var(--gok-border-width-hairline) var(--gok-color-primary);
	}

	.field-message {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.form-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.attach {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* --- Live chat row --- */
	.chat-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.chat-copy {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
	}

	.chat-title {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.chat-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.chat-actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* --- Empty state copy --- */
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.nums {
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 24.375rem) {
		.ticket-link {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
