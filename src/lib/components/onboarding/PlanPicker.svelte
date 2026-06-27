<script lang="ts">
	// Step 5 · "My plan" — the account tiers as a card grid. Each card is a toggle
	// button (aria-pressed) so selection is carried by state + a visible "Selected"
	// tag and a check glyph, never by colour alone. Selecting patches planId; the
	// fee is disclosed inline (Free for Standard). planId always has a default, so
	// this step never blocks.
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { ACCOUNT_PLANS, type PlanId } from '$lib/onboarding/kyc';
	import { formatMoney } from '$lib/format';

	const selected = $derived(onboarding.data.planId);

	function pick(id: PlanId) {
		onboarding.patch({ planId: id });
	}

	function priceLabel(monthlyMinor: number): string {
		return monthlyMinor === 0 ? 'Free' : `${formatMoney(monthlyMinor, 'EUR')}/month`;
	}
</script>

<form class="step" aria-label="My plan" onsubmit={(e) => e.preventDefault()}>
	<ul class="grid" role="group" aria-label="Choose my plan">
		{#each ACCOUNT_PLANS as plan (plan.id)}
			{@const isSelected = selected === plan.id}
			<li>
				<gok-card variant="outlined" class="plan-card">
					<button
						type="button"
						class="plan-button"
						class:is-selected={isSelected}
						aria-pressed={isSelected}
						onclick={() => pick(plan.id)}
					>
						<span class="plan-head">
							<span class="plan-name gok-headline-6">{plan.name}</span>
							{#if isSelected}
								<span class="plan-selected">
									<span class="plan-check" aria-hidden="true">
										<svg viewBox="0 0 16 16" width="12" height="12" fill="none">
											<path
												d="M3 8.5l3 3 7-8"
												stroke="currentColor"
												stroke-width="1.75"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</span>
									Selected
								</span>
							{/if}
						</span>

						<span class="plan-price gok-tabular-nums">{priceLabel(plan.monthlyMinor)}</span>
						<span class="plan-tagline">{plan.tagline}</span>

						<ul class="perks">
							{#each plan.perks as perk (perk)}
								<li class="perk">
									<span class="perk-glyph" aria-hidden="true">
										<svg viewBox="0 0 16 16" width="13" height="13" fill="none">
											<path
												d="M3 8.5l3 3 7-8"
												stroke="currentColor"
												stroke-width="1.75"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</span>
									<span class="perk-text">{perk}</span>
								</li>
							{/each}
						</ul>
					</button>
				</gok-card>
			</li>
		{/each}
	</ul>
</form>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--gok-space-300);
	}

	.plan-card {
		display: block;
		block-size: 100%;
	}

	.plan-button {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		inline-size: 100%;
		block-size: 100%;
		padding: 0;
		border: 0;
		background: none;
		text-align: start;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.plan-button:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.plan-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.plan-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.plan-selected {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		text-transform: uppercase;
		letter-spacing: var(--gok-type-eyebrow-tracking, 0.08em);
		color: var(--gok-color-primary);
	}

	.plan-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1rem;
		block-size: 1rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
		color: var(--gok-color-primary);
	}

	.plan-price {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	.plan-tagline {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.perks {
		list-style: none;
		margin: var(--gok-space-100) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.perk {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.perk-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.1rem;
		block-size: 1.1rem;
		margin-block-start: 0.05rem;
		color: var(--gok-color-text-muted);
	}

	.perk-text {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	/* Selection is carried by the tag + check above; the rule is a quiet reinforcement. */
	.plan-button.is-selected {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: var(--gok-space-200);
		border-radius: var(--gok-radius-s);
	}
</style>
