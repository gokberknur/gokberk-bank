<script lang="ts">
	// M02 · Offer detail — the full terms of one merchant offer in a flat `gok-card`
	// ledger, plus the activate/deactivate switch. The reward headline carries no
	// accent; the offer's whole colour budget stays ink. Activation is low-stakes +
	// reversible, so the switch flips optimistically (`rewards.toggleOffer` toasts in
	// state) with no confirm dialog. A not-found id resolves to a calm empty state.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never
	// `bind:` on a gok-* element; the switch reflects `offer.activated` as a DOM
	// property and toggles through state.
	import { page } from '$app/state';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { rewards } from '$lib/state/rewards.svelte';

	const offerId = $derived(page.params.offerId);
	const offer = $derived(offerId ? rewards.offer(offerId) : undefined);
	const live = $derived(offer ? rewards.isLive(offer) : false);

	// The reward headline: cashback basis points → "3% back"; points → "200 points".
	const rewardSummary = $derived(
		offer
			? offer.rewardType === 'cashback-pct'
				? `${offer.rewardValue / 100}% back`
				: `${offer.rewardValue} points`
			: ''
	);

	const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	function onActivate() {
		if (offer) rewards.toggleOffer(offer.id);
	}
</script>

<svelte:head>
	<title>{offer ? `${offer.merchant} offer` : 'Offer'} · gökberk bank</title>
</svelte:head>

{#if !offer}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Offer not found</p>
			<p class="missing-body">This offer doesn't exist, or it's no longer available.</p>
			<gok-link slot="actions" href="/rewards">Back to rewards</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/rewards">&larr; Rewards</gok-link>
			<p class="eyebrow gok-eyebrow">Offer</p>
			<h1 class="title gok-headline-2">{offer.merchant}</h1>
			<div class="headline-row">
				<p class="reward gok-tabular-nums">{rewardSummary}</p>
				{#if !live}
					<gok-tag size="s" readonly dot>Expired</gok-tag>
				{/if}
			</div>
		</header>

		<!-- Activate — the one control; low-stakes + reversible, no confirm dialog. -->
		<section class="block" aria-labelledby="activate-heading">
			<div class="activate-row">
				<div class="activate-text">
					<h2 id="activate-heading" class="block-title gok-headline-5">
						{offer.activated ? 'Offer active' : 'Activate offer'}
					</h2>
					<p class="help">
						{#if live}
							Turn this on to start earning. You can turn it off anytime.
						{:else}
							This offer has ended, so it can't be activated.
						{/if}
					</p>
				</div>
				<gok-switch
					accessible-label={`Activate ${offer.merchant} offer`}
					{@attach setProps({ checked: offer.activated, disabled: !live })}
					{@attach on('change', onActivate)}
				></gok-switch>
			</div>
		</section>

		<!-- Terms ledger — reward, cap, validity window, category. -->
		<section class="block" aria-labelledby="terms-heading">
			<h2 id="terms-heading" class="block-title gok-headline-5">Terms</h2>
			<gok-card>
				<dl class="ledger">
					<div class="row">
						<dt>Reward</dt>
						<dd class="gok-tabular-nums">{rewardSummary}</dd>
					</div>
					{#if offer.capMinor != null}
						<div class="row">
							<dt>Cap</dt>
							<dd class="gok-tabular-nums">{formatMoney(offer.capMinor, 'EUR')}</dd>
						</div>
					{/if}
					{#if offer.category}
						<div class="row">
							<dt>Category</dt>
							<dd>{sentence(offer.category)}</dd>
						</div>
					{/if}
					<div class="row">
						<dt>Starts</dt>
						<dd class="gok-tabular-nums">{formatDate(offer.startDate)}</dd>
					</div>
					<div class="row">
						<dt>Ends</dt>
						<dd class="gok-tabular-nums">{formatDate(offer.endDate)}</dd>
					</div>
				</dl>
				<p class="terms-prose">{offer.terms}</p>
			</gok-card>
		</section>

		<!-- How it works — a quiet, plain note. -->
		<section class="block" aria-labelledby="how-heading">
			<h2 id="how-heading" class="block-title gok-headline-5">How it works</h2>
			<p class="help">
				Once activated, qualifying spend at {offer.merchant} earns
				{#if offer.rewardType === 'cashback-pct'}cashback{:else}points{/if} automatically — no codes,
				no claims. Earnings appear in my rewards history, pending until they settle.
			</p>
			<!-- Qualifying-transactions list is deferred (optional) — it needs a
			     per-offer spend match over the F03 ledger, out of scope for this cut. -->
		</section>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.missing {
		padding-block: var(--gok-space-700);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
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

	.headline-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.reward {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		color: var(--gok-color-text);
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.help {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.activate-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
	}

	.activate-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	/* --- The key/value ledger --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
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

	.terms-prose {
		margin: 0;
		margin-block-start: var(--gok-space-300);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
