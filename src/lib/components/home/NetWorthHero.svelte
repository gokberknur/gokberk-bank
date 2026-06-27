<script lang="ts">
	// X01 net-worth hero — the calm first figure the dashboard opens on. Total net
	// worth (cash across wallets + pots, EUR home currency), a muted month-change
	// line carried by an arrow glyph + signed amount (never colour-alone), and the
	// page's single earned accent: the one live primary CTA into /accounts. At full
	// width the card splits into two columns so it never reads empty: the figure +
	// CTA on the left, a calm cash/savings breakdown on the right.
	import { accounts } from '$lib/state/accounts.svelte';
	import { thisMonthNetEurMinor } from '$lib/home/insights';
	import { formatMoney } from '$lib/format';
	import { goto } from '$app/navigation';
	import { on } from '$lib/wc.svelte';

	let netWorth = $derived(formatMoney(accounts.netWorthEurMinor, 'EUR'));
	let net = $derived(thisMonthNetEurMinor());
	let changeAmount = $derived(formatMoney(net, 'EUR', { signDisplay: true }));
	// Direction by rule: arrow glyph (decorative) reinforces the sign already in
	// the formatted amount. No red/green — the muted ink + the sign carry it.
	let arrow = $derived(net > 0 ? '↑' : net < 0 ? '↓' : '→');

	let cash = $derived(formatMoney(accounts.walletsTotalEurMinor, 'EUR'));
	let savings = $derived(formatMoney(accounts.potsTotalEurMinor, 'EUR'));
</script>

<gok-card class="hero">
	<div class="layout">
		<div class="main">
			<p class="eyebrow gok-eyebrow">Net worth</p>
			<p class="figure gok-headline-1 gok-tabular-nums">{netWorth}</p>

			<p class="change gok-tabular-nums">
				<span class="arrow" aria-hidden="true">{arrow}</span>
				<span>{changeAmount} this month</span>
			</p>

			<div class="cta">
				<gok-button variant="primary" {@attach on('click', () => goto('/accounts'))}>
					View accounts
				</gok-button>
			</div>
		</div>

		<!-- TODO: replace breakdown with the F11 net-worth area chart -->
		<dl class="breakdown">
			<div class="breakdown-row">
				<dt class="breakdown-label">Cash</dt>
				<dd class="breakdown-figure gok-tabular-nums">{cash}</dd>
			</div>
			<div class="breakdown-row">
				<dt class="breakdown-label">Savings</dt>
				<dd class="breakdown-figure gok-tabular-nums">{savings}</dd>
			</div>
		</dl>
	</div>
</gok-card>

<style>
	.hero {
		display: block;
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.figure {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text);
	}

	.change {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		margin: 0;
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.arrow {
		font-size: var(--gok-type-body-small-size);
	}

	.cta {
		margin-block-start: var(--gok-space-400);
	}

	.breakdown {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		/* A hairline column that frames the breakdown without adding weight. */
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.breakdown-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.breakdown-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.breakdown-figure {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	@media (min-width: 48rem) {
		.layout {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
			align-items: start;
			gap: var(--gok-space-700);
		}

		.breakdown {
			/* On the right column, align the breakdown with the figure baseline. */
			margin-block-start: var(--gok-space-700);
		}
	}
</style>
