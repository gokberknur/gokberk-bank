<script lang="ts">
	// M02 · One merchant offer, rendered as a flat, hairline `gok-card` — the quiet
	// loyalty layer, never a coupon wall. The whole card is one labelled link into
	// the offer detail (a stretched overlay `<a>`, the WalletCard idiom), so it is a
	// real interactive card — not a clickable div. The activate `gok-switch` is
	// raised above the overlay and stops click propagation so it stays separately
	// operable. The single featured offer earns one accent: a 2px top rule, never a
	// fill. Expired offers carry a muted "Expired" tag and a disabled switch.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never
	// `bind:` on a gok-* element. The switch reflects `offer.activated` (a DOM
	// property) and toggles through `rewards.toggleOffer` (optimistic + toast in
	// state), so the change re-flows across every surface at once.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDayMonth } from '$lib/format';
	import { rewards } from '$lib/state/rewards.svelte';
	import type { RewardOffer } from '$lib/state/rewards.svelte';

	let { offer }: { offer: RewardOffer } = $props();

	const live = $derived(rewards.isLive(offer));

	// The reward headline: cashback basis points → "3% back"; points → "200 points".
	const rewardSummary = $derived(
		offer.rewardType === 'cashback-pct'
			? `${offer.rewardValue / 100}% back`
			: `${offer.rewardValue} points`
	);

	// Toggling is low-stakes + reversible: the state flips optimistically and toasts.
	function onActivate() {
		rewards.toggleOffer(offer.id);
	}

	// Keep the switch a separate click target from the card's stretched link.
	function stop(event: Event) {
		event.stopPropagation();
	}
</script>

<gok-card interactive class="offer" class:is-featured={offer.featured}>
	<a class="stretched" href={`/rewards/${offer.id}`} aria-label={`${offer.merchant} offer details`}
	></a>

	<div class="body">
		<div class="top">
			<p class="merchant gok-headline-6">{offer.merchant}</p>
			{#if offer.featured}
				<gok-tag size="s" readonly>Featured</gok-tag>
			{:else if !live}
				<gok-tag size="s" readonly dot>Expired</gok-tag>
			{/if}
		</div>

		<p class="reward gok-tabular-nums">{rewardSummary}</p>
		<p class="terms">{offer.terms}</p>

		<div class="foot">
			<p class="validity gok-tabular-nums">
				{#if live}
					Ends {formatDayMonth(offer.endDate)}
				{:else}
					Ended {formatDayMonth(offer.endDate)}
				{/if}
			</p>

			<!-- Raised above the stretched overlay so it stays separately clickable;
			     the click-stop keeps a tap on the switch from following the card link. -->
			<div class="switch-cell">
				<gok-switch
					accessible-label={`Activate ${offer.merchant} offer`}
					{@attach setProps({ checked: offer.activated, disabled: !live })}
					{@attach on('change', onActivate)}
					{@attach on('click', stop)}
				></gok-switch>
			</div>
		</div>
	</div>
</gok-card>

<style>
	.offer {
		/* The DS gok-card host now owns the containing block (`:host([interactive])`),
		   so the stretched overlay <a> is bounded to THIS card. */
		display: block;
		block-size: 100%;
	}

	/* The single featured offer earns one accent — a 2px top rule, never a fill. */
	.is-featured {
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.stretched {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: var(--gok-radius-m);
	}

	.stretched:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		block-size: 100%;
	}

	.top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.merchant {
		margin: 0;
		color: var(--gok-color-text);
	}

	.reward {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	.terms {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		margin-block-start: auto;
		padding-block-start: var(--gok-space-300);
	}

	.validity {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.switch-cell {
		position: relative;
		z-index: 2;
		display: inline-flex;
	}
</style>
