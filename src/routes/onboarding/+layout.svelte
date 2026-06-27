<script lang="ts">
	// The onboarding frame — a centered, branded, full-page shell that lives
	// OUTSIDE the (app) chrome (no sidenav, no navbar). The root +layout already
	// imports the foundation CSS, registers the gök elements, and bridges View
	// Transitions, so this only adds the quiet full-page frame + a toast region
	// (the completion toast fires from the flow's `complete()`).
	import { toasts } from '$lib/state/toasts.svelte';
	import { on } from '$lib/wc.svelte';

	let { children } = $props();
</script>

<div class="frame">
	<main class="main">
		{@render children()}
	</main>
</div>

<gok-toast-region placement="bottom-end">
	{#each toasts.items as t (t.id)}
		<gok-toast
			status={t.status}
			duration={t.duration}
			{@attach on('gok-dismiss', () => toasts.dismiss(t.id))}>{t.message}</gok-toast
		>
	{/each}
</gok-toast-region>

<style>
	.frame {
		display: flex;
		justify-content: center;
		min-block-size: 100dvh;
		padding-inline: var(--gok-space-400);
		padding-block: var(--gok-space-700) var(--gok-space-600);
		background: var(--gok-color-surface);
	}

	.main {
		inline-size: 100%;
		max-inline-size: 44rem;
	}

	@media (max-width: 40rem) {
		.frame {
			padding-block: var(--gok-space-500) var(--gok-space-500);
		}
	}
</style>
