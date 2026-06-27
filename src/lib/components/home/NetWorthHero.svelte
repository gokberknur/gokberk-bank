<script lang="ts">
	// X01 net-worth hero — the calm first figure the dashboard opens on. Total net
	// worth (cash across wallets + pots, EUR home currency), a muted month-change
	// line carried by an arrow glyph + signed amount (never colour-alone), and the
	// page's single earned accent: the one live primary CTA into /accounts.
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
</script>

<gok-card class="hero">
	<p class="eyebrow gok-eyebrow">Net worth</p>
	<p class="figure gok-headline-1 gok-tabular-nums">{netWorth}</p>

	<p class="change gok-tabular-nums">
		<span class="arrow" aria-hidden="true">{arrow}</span>
		<span>{changeAmount} this month</span>
	</p>

	<!-- TODO: F11 net-worth area chart + range gok-segmented -->

	<div class="cta">
		<gok-button variant="primary" {@attach on('click', () => goto('/accounts'))}>
			View accounts
		</gok-button>
	</div>
</gok-card>

<style>
	.hero {
		display: block;
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
</style>
