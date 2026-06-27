<script lang="ts">
	// N-series insurance hub — the calm front door to cover. It opens on the policies
	// I already hold (each a card with its premium, renewal date and an Active tag,
	// linking to the policy detail), then lays out the products I can buy as a small
	// grid of cards that lead into the quote flow. The forest-green accent stays
	// unspent here — ink on paper — so the figures and the honest product copy carry
	// the page. A quiet compliance footnote closes it.
	import { insurance } from '$lib/state/insurance.svelte';
	import { claims, CLAIM_STATUS_LABELS, CLAIM_TYPE_LABELS } from '$lib/insurance/claims.svelte';
	import type { ClaimStatus } from '$lib/insurance/claims.svelte';
	import { formatMoney, formatDate } from '$lib/format';

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	// The held policies, resolved to their product for the display name.
	const myPolicies = $derived(
		insurance.activePolicies.map((p) => ({
			policy: p,
			product: insurance.product(p.productId)
		}))
	);

	// Every claim I've filed (newest-first), resolved to its product display name.
	const myClaims = $derived(
		claims.allClaims().map((claim) => {
			const policy = insurance.policy(claim.policyId);
			const product = policy ? insurance.product(policy.productId) : undefined;
			return { claim, productName: product?.name ?? 'Policy' };
		})
	);

	// "From €X/month" uses the cheapest tier's base monthly premium.
	function cheapestMonthly(productId: (typeof insurance.products)[number]['id']): number {
		const product = insurance.product(productId);
		if (!product) return 0;
		return Math.min(...product.tiers.map((t) => t.baseMonthlyMinor));
	}

	const cadence = (billing: 'monthly' | 'annual') => (billing === 'annual' ? '/year' : '/month');
</script>

<svelte:head>
	<title>Insurance · gökberk bank</title>
</svelte:head>

<!-- A claim's status as rule + icon + text: a small glyph beside the status word,
     never colour alone. -->
{#snippet claimGlyph(status: ClaimStatus)}
	{#if status === 'approved'}
		<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
			<path
				d="M5 12.5l4.5 4.5L19 7"
				stroke="currentColor"
				stroke-width="1.9"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else if status === 'declined'}
		<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
			<path d="M8.5 12h7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
		</svg>
	{:else if status === 'withdrawn'}
		<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
			<path d="M6 12h12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
		</svg>
	{:else if status === 'in-review'}
		<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
			<path
				d="M12 8v4l2.5 2"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
			<circle cx="12" cy="12" r="5" />
		</svg>
	{/if}
{/snippet}

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Insurance</p>
		<h1 class="head-title gok-headline-2">Cover, kept honest</h1>
		<p class="head-sub">My policies in one place, and a calm look at what I can add.</p>
	</header>

	<!-- My policies — the cover I already hold. -->
	<section class="block" aria-labelledby="policies-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">My cover</p>
			<h2 id="policies-heading" class="block-title gok-headline-5">My policies</h2>
		</div>

		{#if myPolicies.length === 0}
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No policies yet</p>
				<p class="empty-body">When I take out cover, my policies show up here.</p>
			</gok-empty-state>
		{:else}
			<ul class="policy-grid">
				{#each myPolicies as { policy, product } (policy.id)}
					<li class="policy-cell">
						<gok-card interactive style="position: relative">
							<a
								class="stretched"
								href={`/insurance/policies/${policy.id}`}
								aria-label={`${product?.name ?? 'Policy'} — ${policy.insuredLabel}`}
							></a>
							<div class="policy">
								<div class="policy-top">
									<div class="policy-id">
										<h3 class="policy-name gok-headline-6">{product?.name ?? 'Policy'}</h3>
										<p class="policy-insured">{policy.insuredLabel}</p>
									</div>
									<gok-tag size="s">
										<span class="status">
											<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
												<path
													d="M5 12.5l4.5 4.5L19 7"
													stroke="currentColor"
													stroke-width="1.75"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
											Active
										</span>
									</gok-tag>
								</div>

								<p class="policy-premium gok-tabular-nums">
									{eur(policy.premiumMinor)}<span class="policy-cadence">{cadence(policy.billing)}</span>
								</p>

								<p class="policy-renewal gok-tabular-nums">
									Renews {formatDate(policy.renewalDate)}
								</p>
							</div>
						</gok-card>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- My claims — what I've filed, and the way in to file another. -->
	<section class="block" aria-labelledby="claims-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">My claims</p>
			<h2 id="claims-heading" class="block-title gok-headline-5">What I've filed</h2>
		</div>

		{#if myClaims.length === 0}
			<div class="claims-empty">
				<p class="empty-body">No claims — and I hope it stays that way.</p>
				<gok-link href="/insurance/claims/new">
					<gok-button variant="primary">File a claim</gok-button>
				</gok-link>
			</div>
		{:else}
			<div class="claims">
				<ul class="claim-list">
					{#each myClaims as { claim, productName } (claim.id)}
						<li class="claim-cell">
							<a class="claim-row" href={`/insurance/claims/${claim.id}`}>
								<span class="claim-main">
									<span class="claim-ref gok-tabular-nums">{claim.reference}</span>
									<span class="claim-sub">{productName} · {CLAIM_TYPE_LABELS[claim.type]}</span>
								</span>
								<gok-tag size="s">
									<span class="status">
										{@render claimGlyph(claim.status)}
										{CLAIM_STATUS_LABELS[claim.status]}
									</span>
								</gok-tag>
							</a>
						</li>
					{/each}
				</ul>
				<gok-link href="/insurance/claims/new">
					<gok-button variant="primary">File a claim</gok-button>
				</gok-link>
			</div>
		{/if}
	</section>

	<!-- Products — what I can add. -->
	<section class="block" aria-labelledby="products-heading">
		<div class="block-titles">
			<p class="block-eyebrow gok-eyebrow">Products</p>
			<h2 id="products-heading" class="block-title gok-headline-5">What I can cover</h2>
		</div>

		<ul class="product-grid">
			{#each insurance.products as product (product.id)}
				<li class="product-cell">
					<gok-card interactive style="position: relative">
						<a
							class="stretched"
							href={`/insurance/quote?product=${product.id}`}
							aria-label={`Get a quote for ${product.name}`}
						></a>
						<div class="product">
							<h3 class="product-label gok-headline-6">{product.name}</h3>
							<p class="product-desc">{product.tagline}</p>
							<p class="product-from gok-tabular-nums">
								From {eur(cheapestMonthly(product.id))}<span class="product-cadence">/month</span>
							</p>
						</div>
					</gok-card>
				</li>
			{/each}
		</ul>
	</section>

	<p class="footnote">
		Cover is subject to the policy terms. Limits and exclusions apply.
	</p>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── Header ── */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Blocks ── */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.block-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.block-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* ── Policy + product grids ── */
	.policy-grid,
	.product-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.policy-cell,
	.product-cell {
		display: flex;
	}

	.policy-cell :global(gok-card),
	.product-cell :global(gok-card) {
		inline-size: 100%;
	}

	/* ── Policy card ── */
	.policy {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.policy-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.policy-id {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.policy-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.policy-insured {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	/* ── My claims ── */
	.claims {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		align-items: flex-start;
	}

	.claims-empty {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		align-items: flex-start;
	}

	.claim-list {
		display: flex;
		flex-direction: column;
		inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.claim-cell {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.claim-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		color: var(--gok-color-text);
	}

	.claim-row:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-focus-ring-offset));
		border-radius: var(--gok-radius-s);
	}

	.claim-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50);
	}

	.claim-ref {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-medium, var(--gok-font-weight-semibold));
		color: var(--gok-color-text);
	}

	.claim-sub {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.policy-premium {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		color: var(--gok-color-text);
	}

	.policy-cadence,
	.product-cadence {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text-muted);
	}

	.policy-renewal {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Product card ── */
	.product {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.product-label {
		margin: 0;
		color: var(--gok-color-text);
	}

	.product-desc {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.product-from {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	/* The whole card is one click target via a stretched, focusable overlay. The
	   card MUST be position: relative (set inline) so this overlay is bounded. */
	.stretched {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: var(--gok-radius-m);
		cursor: pointer;
	}

	.stretched:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	/* ── Empty + footnote ── */
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.footnote {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
