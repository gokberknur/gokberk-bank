<script lang="ts">
	// A04 · One savings pot, as a single click target into its detail. The ProgressRing
	// carries the one earned accent; everything else is ink. The figures are stated as
	// text (balance, goal, what's left) so the ring is never the only signal, and the
	// note is plain — "On track", "€X to go", or "Goal reached" — never a coloured banner.
	import type { Pot } from '$lib/data';
	import { pots } from '$lib/accounts/pots.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import ProgressRing from './ProgressRing.svelte';

	let { pot }: { pot: Pot } = $props();

	const pct = $derived(pots.pct(pot));
	const pctLabel = $derived(pots.pctLabel(pot));
	const reached = $derived(pots.reached(pot));
	const toGo = $derived(pots.toGoMinor(pot));

	const balance = $derived(formatMoney(pot.balanceMinor, pot.currency));
	const goal = $derived(pot.goalMinor != null ? formatMoney(pot.goalMinor, pot.currency) : null);

	// The plain progress note — no colour, just words.
	const note = $derived(
		reached
			? 'Goal reached'
			: goal
				? `${formatMoney(toGo, pot.currency)} to go`
				: 'Open-ended — I save as I go'
	);

	// The ring's accessible label — the same figures the eye reads, said once.
	const ringLabel = $derived(
		reached
			? `${pot.name}: goal reached, ${balance} saved`
			: goal
				? `${balance} of ${goal}, ${pctLabel}%`
				: `${balance} saved`
	);
</script>

<gok-card interactive style="position: relative">
	<a class="stretched" href={`/accounts/pots/${pot.id}`} aria-label={`${pot.name} — ${note}`}></a>

	<div class="card">
		<header class="head">
			<span class="emoji" aria-hidden="true">{pot.emoji}</span>
			<span class="meta">
				<span class="eyebrow gok-eyebrow">Pot</span>
				<span class="name gok-headline-6">{pot.name}</span>
			</span>
			{#if pot.roundUps}
				<gok-tag size="s">Round-ups</gok-tag>
			{/if}
		</header>

		<div class="ring-wrap">
			<ProgressRing {pct} {reached} ariaLabel={ringLabel}>
				{#if !reached}
					{#if pctLabel != null}
						<span class="ring-pct gok-tabular-nums">{pctLabel}%</span>
					{:else}
						<span class="ring-balance gok-tabular-nums">{balance}</span>
					{/if}
				{/if}
			</ProgressRing>
		</div>

		<dl class="figures">
			<div class="figure">
				<dt class="figure-label gok-eyebrow">Saved</dt>
				<dd class="figure-value gok-tabular-nums">{balance}</dd>
			</div>
			{#if goal}
				<div class="figure">
					<dt class="figure-label gok-eyebrow">Goal</dt>
					<dd class="figure-value gok-tabular-nums">{goal}</dd>
				</div>
			{/if}
		</dl>

		<p class="note">
			{note}{#if pot.targetDate && !reached}<span class="by"> · by {formatDate(pot.targetDate)}</span>{/if}
		</p>
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

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.head {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.emoji {
		font-size: var(--gok-type-headline-5-size);
		line-height: 1;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.eyebrow {
		color: var(--gok-color-text-muted);
	}

	.name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.ring-wrap {
		display: flex;
		justify-content: center;
		padding-block: var(--gok-space-100);
	}

	.ring-pct {
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		color: var(--gok-color-text);
	}

	.ring-balance {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.figures {
		display: flex;
		justify-content: space-between;
		gap: var(--gok-space-300);
		margin: 0;
	}

	.figure {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 2px);
	}

	.figure-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.figure-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
