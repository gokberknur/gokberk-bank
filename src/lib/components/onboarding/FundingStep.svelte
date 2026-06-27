<script lang="ts">
	// Step 6 · "Add money (optional)" — an opening top-up. There's no DS money field
	// (dogfooding #4), so this is a gok-input type="number" with a € affix in the
	// leading slot; the value is stored as integer minor units (euros × 100).
	// Quick-pick chips set common amounts, and skipping is explicitly fine — a zero
	// balance is valid, so this step never blocks.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';

	// Quick-pick amounts in whole euros.
	const QUICK_PICKS = [0, 20, 50, 100];

	const euros = $derived(onboarding.data.topUpMinor / 100);

	function onAmount(event: Event) {
		const raw = (event.target as HTMLInputElement).value;
		const value = Number(raw);
		const minor = Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
		onboarding.patch({ topUpMinor: minor });
	}

	function pick(amountEuros: number) {
		onboarding.patch({ topUpMinor: amountEuros * 100 });
	}
</script>

<form class="step" aria-label="Add money" onsubmit={(e) => e.preventDefault()}>
	<p class="lead">
		I can start my account with a top-up from a linked card, or skip and add money later.
	</p>

	<gok-input
		type="number"
		label="Opening top-up"
		inputmode="decimal"
		min="0"
		step="1"
		reserve-message
		helper="Whole euros — I can always top up later."
		{@attach setProps({ value: euros > 0 ? euros : '' })}
		{@attach on('input', onAmount)}
		{@attach on('change', onAmount)}
	>
		<span slot="leading" class="affix">€</span>
	</gok-input>

	<div class="chips" role="group" aria-label="Quick amounts">
		{#each QUICK_PICKS as amount (amount)}
			{@const isActive = onboarding.data.topUpMinor === amount * 100}
			<button
				type="button"
				class="chip"
				class:is-active={isActive}
				aria-pressed={isActive}
				onclick={() => pick(amount)}
			>
				{amount === 0 ? 'Skip' : `€${amount}`}
			</button>
		{/each}
	</div>

	<p class="skip-note">I can skip this — a zero balance is fine, and nothing's charged.</p>
</form>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.affix {
		font-family: var(--gok-font-family-text);
		color: var(--gok-color-text-muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.chip {
		padding-inline: var(--gok-space-400);
		padding-block: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-pill);
		cursor: pointer;
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.chip:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.chip.is-active {
		border-color: var(--gok-color-primary);
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.skip-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
