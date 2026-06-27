<script lang="ts">
	// The card-art hero — the one surface where colour lives richly. It still reads
	// only `--gok-*` custom properties: the brand *core* tokens (ink / paper / the
	// forest-green accent) directly, never a raw hex. Three art treatments map to
	// the card's `design`: `ink` (physical, deep matte near-black), `mist` (virtual,
	// a soft paper-grey), `forest` (disposable, the accent as the whole canvas).
	//
	// The face scales with its own width via container-query units (cqi), so one set
	// of rules covers both the large detail `hero` and the wallet-`strip` size.
	import type { Card } from '$lib/data/types';

	let { card, size = 'strip' }: { card: Card; size: 'hero' | 'strip' } = $props();

	const TYPE_EYEBROW: Record<Card['type'], string> = {
		physical: 'Physical',
		virtual: 'Virtual',
		disposable: 'Single-use'
	};

	const NETWORK_MARK: Record<Card['network'], string> = {
		visa: 'VISA',
		mastercard: 'Mastercard'
	};

	const NETWORK_NAME: Record<Card['network'], string> = {
		visa: 'Visa',
		mastercard: 'Mastercard'
	};

	const frozen = $derived(card.controls.frozen);
	const typeName = $derived(TYPE_EYEBROW[card.type]);
	const networkMark = $derived(NETWORK_MARK[card.network]);
	const isDisposable = $derived(card.type === 'disposable');

	// "Physical Visa, ending 4291, frozen" — the whole card is read as one image.
	const label = $derived(
		`${typeName} ${NETWORK_NAME[card.network]}, ending ${card.last4}` + (frozen ? ', frozen' : '')
	);
</script>

<div
	class="card"
	data-design={card.design}
	data-size={size}
	data-frozen={frozen ? '' : undefined}
	role="img"
	aria-roledescription="payment card"
	aria-label={label}
>
	<div class="face">
		<div class="row top">
			<span class="wordmark">gök</span>
			<span class="network" class:network-mc={card.network === 'mastercard'}>{networkMark}</span>
		</div>

		<div class="mid">
			<span class="chip" aria-hidden="true"></span>
			<span class="eyebrow">{typeName}</span>
		</div>

		<div class="id">
			<span class="dots" aria-hidden="true">••</span>
			<span class="last4 nums">{card.last4}</span>
		</div>

		<div class="foot">
			{#if isDisposable}
				<span class="single-use" aria-hidden="true">Single-use</span>
			{/if}
			<div class="row bottom">
				<span class="holder">{card.holder}</span>
				<span class="expiry nums">{card.expiry}</span>
			</div>
		</div>
	</div>

	{#if frozen}
		<div class="frost" aria-hidden="true">
			<span class="frost-mark">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
					<path
						d="M7 10V7a5 5 0 0 1 10 0v3"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
					/>
					<rect
						x="5.25"
						y="10"
						width="13.5"
						height="9.5"
						rx="2"
						stroke="currentColor"
						stroke-width="1.75"
					/>
				</svg>
				<span class="frost-label">Frozen</span>
			</span>
		</div>
	{/if}
</div>

<style>
	/*
	 * The card object. `container-type: inline-size` lets every glyph size in `cqi`
	 * (1cqi = 1% of the card's width), so the face scales identically at both sizes
	 * and only the outer width changes between `hero` and `strip`.
	 */
	.card {
		container-type: inline-size;
		position: relative;
		aspect-ratio: 1.586; /* ISO/IEC 7810 ID-1 — 85.6 × 53.98mm */
		inline-size: 100%;
		border-radius: var(--gok-radius-l);
		box-shadow: var(--gok-shadow-2);
		overflow: hidden;
		isolation: isolate;
		user-select: none;
	}

	.card[data-size='strip'] {
		inline-size: 16rem;
		max-inline-size: 80vw;
	}

	.card[data-size='hero'] {
		max-inline-size: 27rem;
	}

	/* --- The three art treatments — core brand tokens, never raw hex. --- */

	/* ink (physical): deep matte near-black, paper text, a vivid green accent. */
	.card[data-design='ink'] {
		--_field: var(--gok-color-ink);
		--_text: var(--gok-color-paper);
		--_muted: var(--gok-color-neutral-4);
		--_accent: var(--gok-color-accent-soft);
		background:
			radial-gradient(
				120% 140% at 85% 0%,
				color-mix(in oklab, var(--gok-color-accent) 22%, transparent),
				transparent 55%
			),
			var(--gok-color-ink);
	}

	/* mist (virtual): a soft paper-grey gradient, ink text, deep green accent. */
	.card[data-design='mist'] {
		--_field: var(--gok-color-neutral-1);
		--_text: var(--gok-color-ink);
		--_muted: var(--gok-color-neutral-6);
		--_accent: var(--gok-color-accent);
		background: linear-gradient(
			145deg,
			var(--gok-color-neutral-1),
			var(--gok-color-neutral-3)
		);
	}

	/* forest (disposable): the accent IS the canvas — the one fully-colour card. */
	.card[data-design='forest'] {
		--_field: var(--gok-color-accent);
		--_text: var(--gok-color-paper);
		--_muted: color-mix(in oklab, var(--gok-color-paper) 72%, transparent);
		--_accent: var(--gok-color-paper);
		background: linear-gradient(
			150deg,
			var(--gok-color-accent-strong),
			var(--gok-color-accent)
		);
	}

	.face {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 7cqi;
		color: var(--_text);
		font-family: var(--gok-font-family-mono);
		font-variant-numeric: tabular-nums;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4cqi;
	}

	.wordmark {
		font-family: var(--gok-font-family-display);
		font-size: 9cqi;
		font-weight: var(--gok-font-weight-semibold);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.network {
		font-size: 6.5cqi;
		font-weight: var(--gok-font-weight-bold);
		letter-spacing: 0.14em;
		line-height: 1;
	}

	.network-mc {
		font-size: 5cqi;
		letter-spacing: 0.02em;
		text-transform: none;
	}

	.mid {
		display: flex;
		align-items: center;
		gap: 4cqi;
	}

	/* The chip — a small rounded plate; ink firms its hairline to forest-green. */
	.chip {
		inline-size: 13cqi;
		block-size: 9.5cqi;
		border-radius: 1.6cqi;
		background: color-mix(in oklab, var(--_text) 14%, transparent);
		border: 0.5cqi solid color-mix(in oklab, var(--_accent) 60%, transparent);
	}

	.eyebrow {
		font-size: 3.4cqi;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--_muted);
	}

	.id {
		display: flex;
		align-items: baseline;
		gap: 2.5cqi;
		font-size: 8cqi;
		letter-spacing: 0.06em;
	}

	.dots {
		color: var(--_muted);
		letter-spacing: 0.1em;
	}

	.last4 {
		font-weight: var(--gok-font-weight-medium);
	}

	.holder {
		font-size: 4cqi;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		/* Embossed feel — a faint top-light highlight over the field. */
		text-shadow: 0 0.2cqi 0 color-mix(in oklab, var(--_field) 60%, transparent);
	}

	.expiry {
		font-size: 4cqi;
		letter-spacing: 0.08em;
		color: var(--_muted);
	}

	/*
	 * The bottom cluster: the disposable's "Single-use" marker sits on its own line
	 * ABOVE the holder/expiry row, so it can never collide with the expiry in the
	 * bottom corner (the old absolute-positioned marker overlapped it). For the
	 * non-disposable designs the wrapper holds only the bottom row, so their layout
	 * is unchanged.
	 */
	.foot {
		display: flex;
		flex-direction: column;
		gap: 2.5cqi;
	}

	/* The disposable's mono marker — a small paper-tinted tag on the forest field. */
	.single-use {
		align-self: flex-start;
		padding-block: 0.8cqi;
		padding-inline: 2.4cqi;
		border-radius: var(--gok-radius-pill);
		background: color-mix(in oklab, var(--_text) 16%, transparent);
		font-family: var(--gok-font-family-mono);
		font-size: 3cqi;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--_text);
	}

	/* --- Frozen: dim + desaturate the face, lay a frost veil + lock marker. --- */
	.card[data-frozen] .face {
		opacity: 0.5;
		filter: saturate(0.35);
	}

	.frost {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--gok-color-paper) 32%, transparent);
		backdrop-filter: saturate(0.6) brightness(1.04);
	}

	.frost-mark {
		display: inline-flex;
		align-items: center;
		gap: 2cqi;
		padding-block: 2cqi;
		padding-inline: 4cqi;
		border-radius: var(--gok-radius-pill);
		background: color-mix(in oklab, var(--gok-color-ink) 72%, transparent);
		color: var(--gok-color-paper);
	}

	.frost-label {
		font-family: var(--gok-font-family-mono);
		font-size: 3.6cqi;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.frost-mark svg {
		inline-size: 5cqi;
		block-size: 5cqi;
	}

	@media (prefers-reduced-motion: no-preference) {
		.card {
			transition: box-shadow var(--gok-motion-duration-moderate) var(--gok-motion-ease-standard);
		}
	}
</style>
