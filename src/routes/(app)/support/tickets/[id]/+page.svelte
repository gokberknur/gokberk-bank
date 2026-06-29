<script lang="ts">
	// S01 ticket detail — one conversation, up close. The thread reads as a calm,
	// labelled log: my messages and gökberk support visually distinct (alignment +
	// a faint surface tint + an author label and a tabular date). The reply box is
	// always available, even on a resolved ticket — a reply simply reopens the
	// conversation, never a dead end. The one earned accent is the primary
	// "Send reply".
	import { page } from '$app/state';
	import { support, TICKET_STATUS_LABELS } from '$lib/state/support.svelte';
	import type { TicketStatus } from '$lib/state/support.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';

	const ticket = $derived(page.params.id ? support.ticket(page.params.id) : undefined);

	// The reply composer. A local mirror so clearing it after send is a one-liner.
	let replyBody = $state('');
	const canReply = $derived(replyBody.trim().length > 0);

	function sendReply() {
		if (!ticket || !canReply) return;
		if (support.reply(ticket.id, replyBody)) replyBody = '';
	}

	function onReplyInput(e: Event) {
		replyBody = (e.currentTarget as HTMLElement & { value: string }).value;
	}
</script>

<svelte:head>
	<title>{ticket ? `${ticket.subject} · Support` : 'Ticket'} · gökberk bank</title>
</svelte:head>

{#snippet statusTag(status: TicketStatus)}
	<gok-tag size="m">
		<span class="status">
			{#if status === 'resolved'}
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
					<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else if status === 'in-review'}
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
					<path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.75" />
				</svg>
			{/if}
			{TICKET_STATUS_LABELS[status]}
		</span>
	</gok-tag>
{/snippet}

{#if !ticket}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Ticket not found</p>
			<p class="missing-body">This ticket doesn’t exist, or it has been closed.</p>
			<gok-link slot="actions" href="/support">Back to support</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/support">&larr; Support</gok-link>

			<div class="head-main">
				<div class="head-titles">
					<p class="head-eyebrow gok-eyebrow">{TICKET_STATUS_LABELS[ticket.status]} ticket</p>
					<h1 class="head-title gok-headline-3">{ticket.subject}</h1>
				</div>
				{@render statusTag(ticket.status)}
			</div>

			<dl class="meta">
				<div class="meta-item">
					<dt class="meta-label gok-eyebrow">Reference</dt>
					<dd class="meta-value nums">{ticket.ref}</dd>
				</div>
				<div class="meta-item">
					<dt class="meta-label gok-eyebrow">Opened</dt>
					<dd class="meta-value nums">{formatDate(ticket.createdAt)}</dd>
				</div>
				<div class="meta-item">
					<dt class="meta-label gok-eyebrow">Last updated</dt>
					<dd class="meta-value nums">{formatDate(ticket.updatedAt)}</dd>
				</div>
			</dl>
		</header>

		<section class="thread" aria-label="Conversation">
			<ol class="thread-list">
				{#each ticket.messages as message (message.id)}
					<li class="msg" class:msg-me={message.from === 'me'}>
						<div class="bubble">
							<div class="bubble-head">
								<span class="bubble-author">
									{message.from === 'me' ? 'Me' : 'gökberk support'}
								</span>
								<span class="bubble-date nums">{formatDate(message.dateIso)}</span>
							</div>
							<p class="bubble-body">{message.body}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>

		<section class="reply" aria-labelledby="reply-heading">
			<h2 id="reply-heading" class="reply-title gok-headline-6">Reply</h2>

			{#if ticket.status === 'resolved'}
				<p class="reply-note">
					This ticket is resolved. A reply reopens the conversation — I can pick it back up anytime.
				</p>
			{/if}

			<gok-textarea
				label="My reply"
				rows={4}
				placeholder="Add to the conversation…"
				{@attach setProps({ value: replyBody })}
				{@attach on('input', onReplyInput)}
			></gok-textarea>

			<div class="reply-foot">
				<gok-button variant="primary" disabled={!canReply} {@attach on('click', sendReply)}>
					Send reply
				</gok-button>
			</div>
		</section>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.missing {
		padding-block: var(--gok-space-700);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Header --- */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.head-main {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.head-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-600);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
	}

	.meta-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.meta-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	/* --- Thread --- */
	.thread-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.msg {
		display: flex;
		justify-content: flex-start;
	}

	.msg-me {
		justify-content: flex-end;
	}

	.bubble {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		max-inline-size: 44rem;
		padding: var(--gok-space-300) var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-300, 8px);
		background: var(--gok-color-surface);
	}

	/* My own messages get a faint tint + a trimmed corner so the two voices read
	   apart without leaning on colour alone (the author label carries the meaning). */
	.msg-me .bubble {
		background: var(--gok-color-surface-raised, var(--gok-color-surface));
		border-start-end-radius: var(--gok-radius-100, 2px);
	}

	.msg:not(.msg-me) .bubble {
		border-start-start-radius: var(--gok-radius-100, 2px);
	}

	.bubble-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.bubble-author {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.bubble-date {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.bubble-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		white-space: pre-wrap;
	}

	/* --- Reply --- */
	.reply {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.reply-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.reply-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.reply-foot {
		display: flex;
		justify-content: flex-end;
	}

	.nums {
		font-variant-numeric: tabular-nums;
	}
</style>
