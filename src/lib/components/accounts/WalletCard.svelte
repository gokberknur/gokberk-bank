<script lang="ts">
	// One currency wallet, rendered as a single click target. Available is the
	// headline figure (ink, never accent); current + held appear only when money
	// is actually held, and read lighter than the settled figure. The whole card
	// is one labelled link into the wallet detail (A02) via a stretched overlay.
	import type { Wallet } from '$lib/data';
	import { formatMoney } from '$lib/format';

	let { wallet }: { wallet: Wallet } = $props();

	let available = $derived(formatMoney(wallet.availableMinor, wallet.currency));
	let current = $derived(formatMoney(wallet.currentMinor, wallet.currency));
	let held = $derived(formatMoney(wallet.holdMinor, wallet.currency));
	let hasHold = $derived(wallet.holdMinor > 0);
	let ibanTail = $derived(wallet.iban.slice(-4));
	let label = $derived(`${wallet.currency} wallet, available ${available}`);
</script>

<gok-card interactive style="position: relative">
	<a class="stretched" href={`/accounts/${wallet.id}`} aria-label={label}></a>

	<div class="body">
		<p class="currency gok-eyebrow">{wallet.currency}</p>
		<h2 class="name gok-headline-5">{wallet.name}</h2>
		<p class="available gok-tabular-nums">{available}</p>

		{#if hasHold}
			<p class="held gok-tabular-nums">
				Current {current} · <span class="held-amount">{held} held</span>
			</p>
		{/if}

		<p class="iban gok-tabular-nums">•••• {ibanTail}</p>
	</div>
</gok-card>

<style>
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
	}

	.currency {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.name {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.available {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		letter-spacing: var(--gok-type-headline-4-tracking);
		color: var(--gok-color-text);
	}

	.held {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		/* Held money is muted — lighter than the settled available figure. */
		color: var(--gok-color-text-muted);
	}

	.iban {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
