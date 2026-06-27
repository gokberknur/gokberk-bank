<script lang="ts">
	// X01 quick actions — the four things a user reaches for most. Payments
	// (P01–P09) aren't built yet, so every action is a disabled affordance with a
	// quiet "Soon" tag: no navigation, no 404. The accent stays in the hero; these
	// are neutral secondary buttons.
	import NavIcon from '$lib/components/shell/NavIcon.svelte';

	const actions = [
		{ label: 'Send', icon: 'transfer' },
		{ label: 'Request', icon: 'activity' },
		{ label: 'Top up', icon: 'wallet' },
		{ label: 'Exchange', icon: 'crypto' }
	];
</script>

<ul class="grid">
	{#each actions as action (action.label)}
		<li class="cell">
			<gok-button class="action" variant="secondary" disabled>
				<NavIcon slot="icon" name={action.icon} />
				{action.label}
			</gok-button>
			<gok-tag size="s">Soon</gok-tag>
		</li>
	{/each}
</ul>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cell {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.action {
		inline-size: 100%;
	}
</style>
