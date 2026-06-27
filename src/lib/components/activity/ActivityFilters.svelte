<script lang="ts">
	// Taxonomy chips + an unread-only switch. The chips are gok-buttons over "All"
	// plus the types actually present in the stream, each carrying its count; the
	// active chip is the one earned accent for this surface (primary variant) and is
	// announced with aria-pressed, never by colour alone. The switch is a custom
	// element, so it is driven by `checked` as a property and read back from its
	// composed `change` event — never bind: on a custom element.
	import { feed } from '$lib/state/feed.svelte';
	import { setProps, on } from '$lib/wc.svelte';

	function onUnreadChange(e: Event) {
		feed.setUnreadOnly((e.target as HTMLInputElement).checked);
	}
</script>

<div class="filters">
	<div class="chips" role="group" aria-label="Filter activity by type">
		<gok-button
			variant={feed.typeFilter === 'all' ? 'primary' : 'secondary'}
			size="s"
			aria-pressed={feed.typeFilter === 'all'}
			{@attach on('click', () => feed.setType('all'))}
		>
			All
			<gok-badge size="s">{feed.all.length}</gok-badge>
		</gok-button>

		{#each feed.types as chip (chip.type)}
			<gok-button
				variant={feed.typeFilter === chip.type ? 'primary' : 'secondary'}
				size="s"
				aria-pressed={feed.typeFilter === chip.type}
				{@attach on('click', () => feed.setType(chip.type))}
			>
				{chip.label}
				<gok-badge size="s">{feed.typeCounts[chip.type]}</gok-badge>
			</gok-button>
		{/each}
	</div>

	<div class="toggle">
		<gok-switch
			accessible-label="Unread only"
			{@attach setProps({ checked: feed.unreadOnly })}
			{@attach on('change', onUnreadChange)}
		></gok-switch>
		<span class="toggle-label" aria-hidden="true">Unread only</span>
	</div>
</div>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.toggle-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
