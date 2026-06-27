<script lang="ts">
	// The whole activity surface, shared by both routes: /activity mounts it with
	// no active id (drawer closed); /activity/[id] mounts it with that id (drawer
	// open on that event). Factoring it here means the feed underneath the drawer is
	// the *same* feed — deep-linking restores it in place, with the row open. The
	// only mutation is mark-read, done optimistically: opening a row (or landing on
	// a deep link) marks it read and the live region announces the new unread count.
	import { goto } from '$app/navigation';
	import { feed } from '$lib/state/feed.svelte';
	import { on } from '$lib/wc.svelte';
	import ActivityFilters from './ActivityFilters.svelte';
	import ActivityFeed from './ActivityFeed.svelte';
	import ActivityDetail from './ActivityDetail.svelte';

	let { activeId = null }: { activeId?: string | null } = $props();

	const activeEvent = $derived(activeId ? feed.event(activeId) : undefined);
	const drawerOpen = $derived(activeId !== null);

	// Opening an event marks it read. This covers a deep-link landing too — guarded
	// on `read` so the revision bump from open() doesn't re-trigger the effect.
	$effect(() => {
		if (activeId) {
			const ev = feed.event(activeId);
			if (ev && !ev.read) feed.open(activeId);
		}
	});

	function openEvent(id: string) {
		feed.open(id); // optimistic mark-read before navigation
		goto(`/activity/${id}`);
	}

	function closeDrawer() {
		goto('/activity');
	}

	function viewSource(route: string) {
		goto(route);
	}
</script>

<div class="page">
	<header class="head">
		<div class="head-text">
			<p class="eyebrow gok-eyebrow">Activity</p>
			<h1 class="title gok-headline-2">Everything that touched my account</h1>
			<p class="intro">
				One timeline for money, cards, security, applications, markets and the system —
				newest first. I come here to answer “what happened, and when?”
			</p>
		</div>

		<div class="head-actions">
			<p class="unread gok-eyebrow" role="status" aria-live="polite">
				{#if feed.unread > 0}
					{feed.unread} unread
				{:else}
					All caught up
				{/if}
			</p>
			<gok-button
				variant="secondary"
				disabled={feed.unread === 0}
				{@attach on('click', () => feed.markAllRead())}
			>
				Mark all read
			</gok-button>
		</div>
	</header>

	{#if feed.isEmptyData}
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-5">Nothing yet</p>
				<p class="empty-body">My activity will appear here as my account does things.</p>
			</gok-empty-state>
		</section>
	{:else}
		<ActivityFilters />

		{#if feed.isEmptyFiltered}
			<section class="empty">
				<gok-empty-state>
					<p class="empty-title gok-headline-5">
						No {feed.typeFilter === 'all' ? 'unread' : feed.typeFilter} events
					</p>
					<p class="empty-body">Nothing matches these filters right now.</p>
					<gok-button
						slot="actions"
						variant="secondary"
						{@attach on('click', () => {
							feed.setType('all');
							feed.setUnreadOnly(false);
						})}
					>
						Clear filters
					</gok-button>
				</gok-empty-state>
			</section>
		{:else}
			<ActivityFeed groups={feed.grouped} onopen={openEvent} />
		{/if}
	{/if}
</div>

<ActivityDetail
	event={activeEvent}
	open={drawerOpen}
	onclose={closeDrawer}
	onsource={viewSource}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.head-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		max-inline-size: 44rem;
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.intro {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.head-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-200);
	}

	.unread {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.empty {
		padding-block: var(--gok-space-600);
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
</style>
