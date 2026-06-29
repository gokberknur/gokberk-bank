<script lang="ts">
	// X04 · My plan limits — a read-only comparison of what each tier allows, set by plan.
	// A real semantic table (column headers per tier, row headers per limit) so it reads
	// in any assistive tech; values are tabular. The tier I'm on is marked by a single
	// accent mark — an accent top-rule on its column and a "Current" line, never a
	// coloured fill. Nothing here is editable: limits move with my plan, so the way to
	// change them is to switch plan. First-person singular throughout.
	import { session } from '$lib/state/session.svelte';
	import { TIERS } from '$lib/profile/tiers';

	// The limit labels, in the order the first tier lists them — every tier shares them.
	const labels = TIERS[0].limits.map((l) => l.label);

	/** A tier's stated value for a given limit label. */
	function valueFor(tierIndex: number, label: string): string {
		return TIERS[tierIndex].limits.find((l) => l.label === label)?.value ?? '—';
	}
</script>

<svelte:head>
	<title>My plan limits · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/profile/tier">&larr; My plan</gok-link>
		<p class="eyebrow gok-eyebrow">Profile</p>
		<h1 class="title gok-headline-2">Plan limits</h1>
		<p class="lead">
			The limits each plan sets, here for context. They move with my plan — to change them, I switch
			plan. I'm on {session.tier}.
		</p>
	</header>

	<div class="table-wrap">
		<table class="limits">
			<caption class="sr-only">My plan limits, compared across Standard, Plus and Metal.</caption>
			<thead>
				<tr>
					<th scope="col" class="corner">Limit</th>
					{#each TIERS as tier (tier.id)}
						{@const isCurrent = tier.id === session.tier}
						<th scope="col" class="tier-col" class:is-current={isCurrent} aria-current={isCurrent ? 'true' : undefined}>
							<span class="tier-rule" class:is-current={isCurrent} aria-hidden="true"></span>
							<span class="tier-name">{tier.name}</span>
							{#if isCurrent}
								<span class="tier-mark">Current</span>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each labels as label (label)}
					<tr>
						<th scope="row" class="row-head">{label}</th>
						{#each TIERS as tier, i (tier.id)}
							<td class="cell gok-tabular-nums" class:is-current={tier.id === session.tier}>
								{valueFor(i, label)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="foot-note">
		Want different limits? <gok-link href="/profile/tier">Compare and switch my plan</gok-link>.
	</p>
</div>

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

	/* --- Comparison table --- */
	.table-wrap {
		overflow-x: auto;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.limits {
		inline-size: 100%;
		border-collapse: collapse;
		font-family: var(--gok-font-family-text);
	}

	.corner {
		text-align: start;
		padding: var(--gok-space-300) var(--gok-space-400);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-eyebrow-size);
		letter-spacing: var(--gok-type-eyebrow-tracking);
		text-transform: uppercase;
		color: var(--gok-color-text-muted);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.tier-col {
		position: relative;
		text-align: end;
		padding: var(--gok-space-300) var(--gok-space-400);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-inline-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		vertical-align: bottom;
	}

	/* The single accent mark — an accent top-rule above the plan I'm on. */
	.tier-rule {
		position: absolute;
		inset-block-start: 0;
		inset-inline: 0;
		block-size: var(--gok-border-width-strong);
		background: transparent;
	}

	.tier-rule.is-current {
		background: var(--gok-color-primary);
	}

	.tier-name {
		display: block;
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.tier-mark {
		display: block;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-eyebrow-size);
		letter-spacing: var(--gok-type-eyebrow-tracking);
		text-transform: uppercase;
		color: var(--gok-color-text-muted);
	}

	.row-head {
		text-align: start;
		padding: var(--gok-space-300) var(--gok-space-400);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text-muted);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.cell {
		text-align: end;
		padding: var(--gok-space-300) var(--gok-space-400);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-inline-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.cell.is-current {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.foot-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
