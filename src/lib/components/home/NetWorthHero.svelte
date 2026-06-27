<script lang="ts">
	// X01 net-worth hero — the calm first figure the dashboard opens on. Total net
	// worth (cash across wallets + pots, EUR home currency), a muted month-change
	// line carried by an arrow glyph + signed amount (never colour-alone), and the
	// page's single earned accent: the one live primary CTA into /accounts. At full
	// width the card splits into two columns so it never reads empty: the figure +
	// CTA on the left, a calm cash/savings breakdown on the right.
	import { accounts } from '$lib/state/accounts.svelte';
	import { thisMonthNetEurMinor } from '$lib/home/insights';
	import { LineChart, netWorthSeriesEur } from '$lib/charts';
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

	// The F11 net-worth trend: weekly net worth (EUR) over the last 12 weeks.
	let trend = $derived(netWorthSeriesEur(12));
	let trendLabel = $derived(`Net worth ${netWorth}, last 12 weeks.`);
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

		<div class="trend">
			<LineChart
				data={trend}
				formatValue={(m) => formatMoney(m, 'EUR')}
				label={trendLabel}
				area
				height="13rem"
			/>
			<p class="trend-caption">
				<span class="trend-term">Cash</span>
				<span class="trend-figure gok-tabular-nums">{cash}</span>
				<span class="trend-sep" aria-hidden="true">·</span>
				<span class="trend-term">Savings</span>
				<span class="trend-figure gok-tabular-nums">{savings}</span>
			</p>
		</div>
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

	/* The trend: a calm area line, with Cash · Savings as a small caption beneath
	   so the breakdown still reads without competing with the figure. */
	.trend {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	.trend-caption {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
	}

	.trend-term {
		color: var(--gok-color-text-muted);
	}

	.trend-figure {
		color: var(--gok-color-text);
	}

	.trend-sep {
		color: var(--gok-color-border-strong);
	}

	@media (min-width: 48rem) {
		.layout {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
			align-items: center;
			gap: var(--gok-space-700);
		}
	}
</style>
