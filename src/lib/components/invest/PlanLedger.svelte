<script lang="ts">
	// V10 · The per-run cost preview for a savings plan — reused on the create wizard's
	// Amount step (a live preview) and its Review step (the same figures, confirmed). It
	// answers the one question a recurring commitment must disclose before setup: what
	// leaves the wallet each run, and what it buys. Everything is REDUCED from the plan
	// draft + the market seed (the same leg → notional → price → quantity → fee spine the
	// real run uses via plan-run.ts) — never stored, so it re-flows as the draft changes.
	//
	// Honesty first: fees are shown per run; a basket lists every leg with its weight and
	// the cash it takes; FX and whole-share rounding get a plain muted line each; the whole
	// block ends on the shared "indicative / estimates only" tag. Money is integer minor
	// units throughout; weights are integer basis points. Tokens only.
	import { planLegs } from '$lib/invest/plan-run';
	import { splitAmountMinor, bpsToPct } from '$lib/invest/basket';
	import { orderFee } from '$lib/state/invest.svelte';
	import { instrumentOf } from '$lib/data/portfolio';
	import { toEur } from '$lib/data/money';
	import { formatMoney } from '$lib/format';
	import type { SavingsPlan } from '$lib/invest/plans.svelte';
	import IndicativeTag from './IndicativeTag.svelte';

	let { plan }: { plan: SavingsPlan } = $props();

	// The legs (a single 100% leg for an instrument/fund; a basket's own legs) and the
	// exact per-leg split of the contribution (last cent lands on the heaviest leg).
	const legs = $derived(planLegs(plan));
	const split = $derived(splitAmountMinor(plan.amountMinor, legs));

	// Per-leg preview: notional → EUR price → quantity (fractional where the instrument
	// allows, else floored) → the leg's order fee. Mirrors plan-run's computeRun exactly.
	const rows = $derived(
		legs.map((leg, i) => {
			const inst = instrumentOf(leg.symbol);
			const notionalMinor = split[i]?.amountMinor ?? 0;
			const priceEurMinor = inst ? toEur(inst.lastPriceMinor, inst.currency) : 0;
			const raw = priceEurMinor > 0 ? notionalMinor / priceEurMinor : 0;
			const qty = inst?.fractionalAllowed ? raw : Math.floor(raw);
			return {
				symbol: leg.symbol,
				name: inst?.name ?? leg.symbol,
				weightBps: leg.weightBps,
				notionalMinor,
				qty,
				feeMinor: orderFee(notionalMinor),
				currency: inst?.currency ?? 'EUR',
				fractional: inst?.fractionalAllowed ?? false
			};
		})
	);

	const feeMinor = $derived(rows.reduce((s, r) => s + r.feeMinor, 0));
	const totalMinor = $derived(plan.amountMinor + feeMinor);
	const hasFx = $derived(rows.some((r) => r.currency !== 'EUR'));
	const anyWholeShare = $derived(rows.some((r) => !r.fractional));
	const isBasket = $derived(plan.kind === 'basket');

	/** A quantity to 4 dp with trailing zeros trimmed ("2.0320" → "2.032", "3.0000" → "3"). */
	function fmtQty(qty: number): string {
		return qty.toFixed(4).replace(/\.?0+$/, '');
	}
</script>

<div class="preview">
	{#if isBasket}
		<!-- Per-leg breakdown: name + weight, the cash routed to it, and the ~units it buys. -->
		<ul class="legs" aria-label="What each run buys">
			{#each rows as row (row.symbol)}
				<li class="leg">
					<span class="leg-name">
						{row.name}
						<span class="leg-weight gok-tabular-nums">{bpsToPct(row.weightBps)}%</span>
					</span>
					<span class="leg-figures">
						<span class="leg-notional gok-tabular-nums">{formatMoney(row.notionalMinor, 'EUR')}</span>
						<span class="leg-qty gok-tabular-nums">~{fmtQty(row.qty)} units</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- The money ledger: contribution, fee, the all-in per-run debit. -->
	<dl class="ledger">
		<div class="row">
			<dt>Invested</dt>
			<dd class="gok-tabular-nums">{formatMoney(plan.amountMinor, 'EUR')}</dd>
		</div>
		<div class="row">
			<dt>Fee</dt>
			<dd class="gok-tabular-nums">{formatMoney(feeMinor, 'EUR')}</dd>
		</div>
		<div class="row">
			<dt>Per run</dt>
			<dd class="gok-tabular-nums total">{formatMoney(totalMinor, 'EUR')}</dd>
		</div>
	</dl>

	{#if hasFx}
		<p class="note">
			Some holdings trade in another currency — converted at the mid-rate; the final rate may
			differ.
		</p>
	{/if}
	{#if anyWholeShare}
		<p class="note">Whole-share holdings round down; the remainder carries to the next run.</p>
	{/if}

	<IndicativeTag detail="estimates only" />
</div>

<style>
	.preview {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	/* --- Per-leg basket breakdown --- */
	.legs {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.leg {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.leg:first-child {
		border-block-start: none;
	}

	.leg-name {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-200);
		min-inline-size: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.leg-weight {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.leg-figures {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		text-align: end;
	}

	.leg-notional {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.leg-qty {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Money ledger (copied from the scheduled create's .ledger/.row) --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* The all-in per-run figure carries the weight. */
	.total {
		font-weight: var(--gok-font-weight-semibold);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
