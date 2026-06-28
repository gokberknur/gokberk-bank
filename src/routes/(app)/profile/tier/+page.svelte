<script lang="ts">
	// X04 · My plan — compare the three tiers and switch. The compare grid states each
	// fee as plain fact at equal weight to its perks; the tier I'm on carries a single
	// accent mark. A switch is a forced decision — TierSwitchDialog names the change and
	// the new fee before I commit. On confirm I switch and persist (the FX margin is
	// tier-driven, so Metal genuinely turns FX to no-markup elsewhere), then a calm
	// success panel confirms it with a change-again way back. No upsell hype, no dark
	// patterns. First-person singular throughout.
	import { on } from '$lib/wc.svelte';
	import { session } from '$lib/state/session.svelte';
	import type { Tier } from '$lib/profile/tiers';
	import { toast } from '$lib/state/toasts.svelte';
	import TierCompare from '$lib/components/profile/TierCompare.svelte';
	import TierSwitchDialog from '$lib/components/profile/TierSwitchDialog.svelte';

	// The pending switch (drives the forced-decision dialog) and the just-switched tier
	// (drives the success panel). `from` is captured when the dialog opens so its copy is
	// stable across the confirm.
	let pending = $state<Tier | null>(null);
	let from = $state<Tier>(session.tier);
	let switchOpen = $state(false);
	let switched = $state<Tier | null>(null);

	function askSwitch(to: Tier) {
		from = session.tier;
		pending = to;
		switchOpen = true;
	}

	function cancelSwitch() {
		switchOpen = false;
		pending = null;
	}

	function confirmSwitch() {
		const to = pending;
		if (!to) return;
		session.setTier(to);
		switchOpen = false;
		pending = null;
		switched = to;
		toast(`I'm on ${to}.`, { status: 'success' });
	}

	/** Back to the compare grid — now showing the new plan as current. */
	function compareAgain() {
		switched = null;
	}

	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>My plan · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/profile">&larr; Profile</gok-link>
		<p class="eyebrow gok-eyebrow">Profile</p>
		<h1 class="title gok-headline-2">My plan</h1>
		<p class="lead">
			I'm on {session.tier}. Each plan states its fee and what it includes — I can switch whenever I
			want, and there's no charge in this demo.
		</p>
	</header>

	{#if switched}
		<!-- Success · the switch confirmed, with a calm way back to compare. -->
		<section class="done" aria-label="Plan switched">
			<gok-empty-state>
				<span slot="media" class="done-glyph" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M5 12.5l4.5 4.5L19 6.5"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>

				<h2 class="done-title gok-headline-4" tabindex="-1" {@attach focusHeading}>
					I'm on {switched}
				</h2>

				<gok-tag variant="readonly" size="m">Current plan</gok-tag>

				<p class="done-body">
					My plan is now {switched}. It applies straight away — including my FX margin.
				</p>

				<div slot="actions" class="done-actions">
					<gok-button variant="secondary" {@attach on('click', compareAgain)}>
						Compare plans again
					</gok-button>
					<gok-link href="/profile/limits">
						<gok-button variant="secondary">See my limits</gok-button>
					</gok-link>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<TierCompare current={session.tier} onSwitch={askSwitch} />

		<p class="foot-note">
			Plans set my limits too —
			<gok-link href="/profile/limits">see what each one allows</gok-link>.
		</p>
	{/if}
</div>

<!-- The forced-decision switch confirm. -->
<TierSwitchDialog
	open={switchOpen}
	{from}
	to={pending}
	onConfirm={confirmSwitch}
	onCancel={cancelSwitch}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.foot-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Success panel --- */
	.done {
		display: flex;
	}

	.done-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.done-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.done-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.done-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}
</style>
