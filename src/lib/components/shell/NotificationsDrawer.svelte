<script lang="ts">
	// The bell's notification drawer (F13) — a compact glance at the newest activity,
	// not a second feed. It reuses the X02 feed model wholesale (no new store): the
	// host gok-drawer owns focus, the scrim and Escape (fed `open` as a property,
	// closed on gok-close / gok-cancel), and the body lists the ~8 newest events as
	// full-width row buttons that mark-read + deep-link into /activity/[id] (leaving
	// the URL closes the drawer). Unread is state, not hue: a quiet ink dot paired
	// with a bolder title and an sr-only word — never colour alone. The one earned
	// accent is spent on the footer's primary "Open activity"; the full surface is
	// /activity.
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { feed, ACTIVITY_TYPE_LABELS } from '$lib/state/feed.svelte';
	import { sheetPlacement } from '$lib/breakpoints';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	// The newest handful — a glance, not the whole stream. `feed.all` is already
	// newest-first and revision-reactive, so this re-flows on read/mark-all changes.
	const recent = $derived(feed.all.slice(0, 8));

	function openEvent(id: string) {
		feed.open(id); // mark read + bump; navigating away closes the drawer
		goto('/activity/' + id);
	}
</script>

<gok-drawer
	placement={sheetPlacement()}
	heading="Notifications"
	{@attach setProps({ open })}
	{@attach on('gok-close', onclose)}
	{@attach on('gok-cancel', onclose)}
>
	{#if feed.isEmptyData}
		<div class="body">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No notifications yet</p>
				<p class="empty-body">Activity will appear here as my account does things.</p>
			</gok-empty-state>
		</div>
	{:else}
		<ul class="list">
			{#each recent as event (event.id)}
				<li>
					<button
						type="button"
						class="row"
						data-unread={!event.read}
						{@attach on('click', () => openEvent(event.id))}
					>
						<span class="mark" aria-hidden="true">
							{#if !event.read}
								<span class="unread-dot"></span>
							{/if}
						</span>

						<span class="main">
							<span class="eyebrow gok-eyebrow">{ACTIVITY_TYPE_LABELS[event.type]}</span>
							<span class="title">{event.title}</span>
							<span class="when gok-tabular-nums">{formatDate(event.timestamp)}</span>
						</span>

						{#if !event.read}
							<span class="sr-only">Unread</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div slot="footer" class="footer">
		<gok-button
			variant="secondary"
			{@attach setProps({ disabled: feed.unread === 0 })}
			{@attach on('click', () => feed.markAllRead())}
		>
			Mark all read
		</gok-button>
		<gok-button variant="primary" {@attach on('click', () => goto('/activity'))}>
			Open activity
		</gok-button>
	</div>
</gok-drawer>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

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

	.list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Full-width row button — leading unread mark, then the compact type / title /
	   time stack. Calm hairline separators between rows; the last drops its rule. */
	.row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		inline-size: 100%;
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-100) 0;
		border: 0;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: transparent;
		text-align: start;
		font-family: var(--gok-font-family-text);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.list li:last-child .row {
		border-block-end: 0;
	}

	.row:hover {
		background: var(--gok-color-surface);
	}

	.row:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-focus-ring);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	/* Leading marker column — reserved even when read so titles stay aligned. */
	.mark {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		inline-size: var(--gok-space-300);
	}

	/* Unread mark — an ink dot (state, not hue), paired with a bolder title and the
	   sr-only word so it is never colour-alone. */
	.unread-dot {
		inline-size: var(--gok-space-200);
		block-size: var(--gok-space-200);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-text);
	}

	.main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.eyebrow {
		color: var(--gok-color-text-muted);
	}

	.title {
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text);
	}

	.row[data-unread='true'] .title {
		font-weight: var(--gok-font-weight-semibold);
	}

	.when {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* Standard visually-hidden clip pattern (repo convention: PageHeader / DisputeTracker). */
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
