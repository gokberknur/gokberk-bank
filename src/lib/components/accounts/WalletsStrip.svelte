<script lang="ts">
	// The compact wallets strip for /home (consumed by X01). A calm leading total
	// across wallets, then a horizontally-scrollable row of dense wallet tiles —
	// each its own labelled link into the wallet detail — and a trailing "See all"
	// into the full /accounts overview. Same model and look as WalletCard, denser.
	import { accounts } from '$lib/state/accounts.svelte';
	import { formatMoney } from '$lib/format';

	let total = $derived(formatMoney(accounts.walletsTotalEurMinor, 'EUR'));
</script>

<section class="strip" aria-label="Wallets">
	<div class="lead">
		<p class="lead-label gok-eyebrow">Total across wallets</p>
		<p class="lead-figure gok-tabular-nums">{total}</p>
	</div>

	<ul class="row">
		{#each accounts.wallets as wallet (wallet.id)}
			<li class="tile-item">
				<gok-card interactive style="position: relative">
					<a
						class="stretched"
						href={`/accounts/${wallet.id}`}
						aria-label={`${wallet.currency} wallet, available ${formatMoney(wallet.availableMinor, wallet.currency)}`}
					></a>
					<div class="tile">
						<p class="tile-currency gok-eyebrow">{wallet.currency}</p>
						<p class="tile-name">{wallet.name}</p>
						<p class="tile-available gok-tabular-nums">
							{formatMoney(wallet.availableMinor, wallet.currency)}
						</p>
					</div>
				</gok-card>
			</li>
		{/each}
	</ul>

	<p class="more">
		<gok-link href="/accounts">See all &rarr;</gok-link>
	</p>
</section>

<style>
	.strip {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.lead {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.lead-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.lead-figure {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		letter-spacing: var(--gok-type-headline-4-tracking);
		color: var(--gok-color-text);
	}

	.row {
		display: flex;
		gap: var(--gok-space-300);
		margin: 0;
		/* Pad the inline ends so focus outlines aren't clipped at the edges. */
		padding: var(--gok-space-100);
		padding-inline: var(--gok-space-100);
		list-style: none;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
	}

	.tile-item {
		flex: 0 0 auto;
		inline-size: 14rem;
		scroll-snap-align: start;
	}

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

	.tile {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.tile-currency {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.tile-name {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-medium);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.tile-available {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		letter-spacing: var(--gok-type-headline-5-tracking);
		color: var(--gok-color-text);
	}

	.more {
		margin: 0;
	}
</style>
