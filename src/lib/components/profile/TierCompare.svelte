<script lang="ts">
	// X04 · The three-tier comparison — Standard / Plus / Metal side by side, price and
	// perks at equal weight. Fee is stated as plain fact ("Free" / "€7.99 / month"), the
	// perks list carries the same visual weight, and nothing here hypes an upsell. The
	// tier I'm on now carries a SINGLE accent mark — an accent top-rule + a "Current plan"
	// badge — and its action is a disabled "Current plan"; every other card offers a
	// switch, worded as an upgrade or a sideways/down move via isUpgrade. Metal's
	// no-markup FX is called out as the standout, still factually.
	//
	// No coloured fills mark status — the rule and the badge text do. This is a pure
	// presenter: it raises onSwitch(to) and lets the host run the forced-decision dialog.
	import { on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { TIERS, isUpgrade } from '$lib/profile/tiers';
	import type { Tier } from '$lib/profile/tiers';

	let { current, onSwitch }: { current: Tier; onSwitch: (to: Tier) => void } = $props();

	/** A fee reads as the word "Free", or "€7.99 / month" — never "€0.00". */
	function feeLabel(minor: number): string {
		return minor === 0 ? 'Free' : `${formatMoney(minor, 'EUR')} / month`;
	}

	/** Word a switch by direction: upgrade reads up, anything cheaper reads as a switch. */
	function switchLabel(to: Tier): string {
		return isUpgrade(current, to) ? `Upgrade to ${to}` : `Switch to ${to}`;
	}
</script>

<ul class="grid" aria-label="Compare my plan">
	{#each TIERS as plan (plan.id)}
		{@const isCurrent = plan.id === current}
		<li class="cell">
			<gok-card class="plan" class:is-current={isCurrent}>
				<!-- The single accent mark: an accent top-rule on the current plan. -->
				<div class="rule" class:is-current={isCurrent} aria-hidden="true"></div>

				<div class="plan-head">
					<div class="name-row">
						<h3 class="plan-name gok-headline-6">{plan.name}</h3>
						{#if isCurrent}
							<gok-badge variant="success" size="s">Current plan</gok-badge>
						{/if}
					</div>
					<p class="plan-blurb">{plan.blurb}</p>
				</div>

				<p class="plan-fee gok-tabular-nums">{feeLabel(plan.monthlyFeeMinor)}</p>

				<ul class="perks">
					{#each plan.perks as perk (perk)}
						<li class="perk" class:is-standout={perk.startsWith('No-markup FX')}>
							<span class="perk-mark" aria-hidden="true">
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

				<div class="plan-action">
					{#if isCurrent}
						<gok-button variant="secondary" disabled>Current plan</gok-button>
					{:else}
						<gok-button
							variant={isUpgrade(current, plan.id) ? 'primary' : 'secondary'}
							{@attach on('click', () => onSwitch(plan.id))}
						>
							{switchLabel(plan.id)}
						</gok-button>
					{/if}
				</div>
			</gok-card>
		</li>
	{/each}
</ul>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cell {
		display: flex;
	}

	.plan {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		inline-size: 100%;
		overflow: hidden;
	}

	/* The single accent mark — a hairline top-rule that firms to the accent only on
	   the plan I'm on. Never a coloured fill. */
	.rule {
		position: absolute;
		inset-block-start: 0;
		inset-inline: 0;
		block-size: var(--gok-border-width-strong);
		background: var(--gok-color-border);
	}

	.rule.is-current {
		background: var(--gok-color-primary);
	}

	.plan-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.name-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.plan-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.plan-blurb {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Price — equal weight to the perks, stated plainly. */
	.plan-fee {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.perks {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
		flex: 1 1 auto;
	}

	.perk {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.perk-mark {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-block-start: 0.1em;
		color: var(--gok-color-text-muted);
	}

	/* The standout perk earns the accent on its mark — one accent per context. */
	.perk.is-standout .perk-mark {
		color: var(--gok-color-primary);
	}

	.perk.is-standout .perk-text {
		font-weight: var(--gok-font-weight-semibold);
	}

	.plan-action {
		margin-block-start: auto;
	}

	.plan-action :global(gok-button) {
		inline-size: 100%;
	}

	@media (max-width: 48rem) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
