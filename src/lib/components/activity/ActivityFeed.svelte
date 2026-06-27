<script lang="ts">
	// The grouped timeline. Each day is a section with a mono-uppercase eyebrow
	// heading (a real <h2> for a11y, styled as the editorial eyebrow) and its
	// events rendered as hairline rows — no boxes. Newest day first; the data layer
	// already orders events newest-first within each day.
	import type { ActivityGroup } from '$lib/state/feed.svelte';
	import ActivityRow from './ActivityRow.svelte';

	let { groups, onopen }: { groups: ActivityGroup[]; onopen: (id: string) => void } = $props();
</script>

<div class="feed">
	{#each groups as group (group.key)}
		<section class="day" aria-labelledby={`day-${group.key}`}>
			<h2 id={`day-${group.key}`} class="day-head gok-eyebrow">{group.label}</h2>
			<div class="rows">
				{#each group.events as event (event.id)}
					<ActivityRow {event} {onopen} />
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.feed {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-600);
	}

	.day {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.day-head {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.rows {
		display: flex;
		flex-direction: column;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}
</style>
