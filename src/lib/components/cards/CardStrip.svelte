<script lang="ts">
	// The wallet strip — a horizontal scroll-snap rail of card-art heroes, each a
	// link into its detail. Keyboard: a roving tabindex over the card links, with
	// ArrowLeft/Right (and Home/End) moving focus; Enter activates the focused link
	// (native anchor behaviour). A trailing "+ Add a card" tile is disabled until
	// the order wizard (C02) ships.
	import type { Attachment } from 'svelte/attachments';
	import type { Card } from '$lib/data/types';
	import CardArt from './CardArt.svelte';

	let { cards }: { cards: Card[] } = $props();

	// Roving focus index across the card links (the disabled add-tile is excluded).
	let focused = $state(0);

	// One ref to the scroll container; `moveTo` queries the card anchors from it to
	// focus by index. Plain (non-reactive) — it's only read inside event handlers.
	let stripEl: HTMLElement | undefined;
	const attachStrip: Attachment = (node) => {
		stripEl = node as HTMLElement;
	};

	function moveTo(index: number) {
		const clamped = Math.max(0, Math.min(cards.length - 1, index));
		focused = clamped;
		stripEl?.querySelectorAll<HTMLAnchorElement>('a.item')[clamped]?.focus();
	}

	function onKeydown(event: KeyboardEvent, index: number) {
		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				moveTo(index + 1);
				break;
			case 'ArrowLeft':
				event.preventDefault();
				moveTo(index - 1);
				break;
			case 'Home':
				event.preventDefault();
				moveTo(0);
				break;
			case 'End':
				event.preventDefault();
				moveTo(cards.length - 1);
				break;
		}
	}
</script>

<div class="strip" role="group" aria-label="My cards" {@attach attachStrip}>
	{#each cards as card, i (card.id)}
		<a
			class="item"
			href={`/cards/${card.id}`}
			tabindex={i === focused ? 0 : -1}
			onkeydown={(e) => onKeydown(e, i)}
			onfocus={() => (focused = i)}
		>
			<CardArt {card} size="strip" />
		</a>
	{/each}

	<!-- Add a card — deferred to the order wizard (C02). -->
	<div class="item add" aria-disabled="true">
		<span class="add-plus" aria-hidden="true">+</span>
		<span class="add-label">Add a card</span>
		<gok-tag size="s">Soon</gok-tag>
	</div>
</div>

<style>
	.strip {
		display: flex;
		gap: var(--gok-space-400);
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: var(--gok-space-100);
		padding-block: var(--gok-space-200);
		/* Room for the focus ring so it isn't clipped by the scroll container. */
		padding-inline: var(--gok-space-100);
		-webkit-overflow-scrolling: touch;
	}

	.item {
		flex: 0 0 auto;
		scroll-snap-align: start;
		border-radius: var(--gok-radius-l);
	}

	a.item {
		display: block;
		text-decoration: none;
		transition: transform var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	a.item:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: var(--gok-space-100);
	}

	@media (prefers-reduced-motion: no-preference) {
		a.item:hover {
			transform: translateY(calc(-1 * var(--gok-space-100)));
		}
	}

	.add {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--gok-space-200);
		inline-size: 16rem;
		max-inline-size: 80vw;
		aspect-ratio: 1.586;
		border: var(--gok-border-width-hairline) dashed var(--gok-color-border-strong);
		background: var(--gok-color-surface);
		color: var(--gok-color-text-muted);
	}

	.add-plus {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-3-size);
		line-height: 1;
	}

	.add-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
	}
</style>
