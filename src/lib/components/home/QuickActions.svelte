<script lang="ts">
	// X01 quick actions — the four things a user reaches for most. The payments
	// surfaces are all live now, so each action navigates straight to its flow. The
	// accent stays in the hero; these are neutral secondary buttons.
	import { goto } from '$app/navigation';
	import NavIcon from '$lib/components/shell/NavIcon.svelte';
	import { on } from '$lib/wc.svelte';

	const actions = [
		{ label: 'Send', icon: 'transfer', href: '/payments/transfer' },
		{ label: 'Request', icon: 'activity', href: '/payments/request' },
		{ label: 'Top up', icon: 'wallet', href: '/payments/topup' },
		{ label: 'Exchange', icon: 'crypto', href: '/payments/exchange' }
	];
</script>

<ul class="grid">
	{#each actions as action (action.label)}
		<li class="cell">
			<gok-button
				class="action"
				variant="secondary"
				{@attach on('click', () => goto(action.href))}
			>
				<NavIcon slot="icon" name={action.icon} />
				{action.label}
			</gok-button>
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
