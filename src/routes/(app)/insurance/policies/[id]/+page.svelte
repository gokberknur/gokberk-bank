<script lang="ts">
	// N02 — one policy, up close. A calm, complete view of the cover I hold: the
	// signature cover summary shows what's covered AND what's not at EQUAL weight
	// (exclusions are never smaller, greyer or hidden — only the leading mark and the
	// heading tell them apart), then a ledger of the policy's terms, my documents
	// (deferred to the D-series vault, so each is a disabled "Soon"), the payment
	// schedule, and the two commitments. Renew is reversible (a tap + toast); cancel
	// is irreversible, so it ends on a forced-decision danger dialog with no dismiss.
	// On confirm the status tag flips to Cancelled and the actions retire — no blame.
	import { page } from '$app/state';
	import { insurance } from '$lib/state/insurance.svelte';
	import { getTier } from '$lib/data/insurance-data';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import { TODAY, isoDate } from '$lib/data/time';

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	const policy = $derived(page.params.id ? insurance.policy(page.params.id) : undefined);
	const product = $derived(policy ? insurance.product(policy.productId) : undefined);
	const tier = $derived(policy && product ? getTier(product, policy.tier) : undefined);
	const cover = $derived(policy ? insurance.coverFor(policy) : { covered: [], excluded: [] });

	const isActive = $derived(policy?.status === 'active');

	// The add-ons carried on this policy, by their display label, or "None".
	const addOnLabels = $derived(
		policy && product
			? policy.addOnIds
					.map((id) => product.addOns.find((a) => a.id === id)?.label)
					.filter((l): l is string => Boolean(l))
			: []
	);

	// Add one calendar month to an ISO date (deterministic — no Date.now()).
	function plusMonth(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return isoDate(new Date(Date.UTC(y, m, d)));
	}

	// The next premium charge: annual policies bill on renewal; monthly ones a month
	// out from the mock TODAY.
	const nextChargeDate = $derived(
		policy ? (policy.billing === 'annual' ? policy.renewalDate : plusMonth(isoDate(TODAY))) : ''
	);
	const cadenceWord = $derived(policy?.billing === 'annual' ? 'annually' : 'monthly');

	// The documents I'll be able to open once the D-series vault lands. Disabled for
	// now — each is a "Soon".
	const documents = ['Policy schedule', 'Certificate of insurance', 'Terms & conditions'];

	// ── Cancel: a forced decision (irreversible). ──
	let cancelOpen = $state(false);

	function confirmCancel() {
		if (!policy) return;
		insurance.cancel(policy.id);
		cancelOpen = false;
	}

	function renew() {
		if (!policy) return;
		insurance.renew(policy.id);
	}
</script>

<svelte:head>
	<title>{product ? `${product.name} · ${policy?.insuredLabel}` : 'Policy'} · gökberk bank</title>
</svelte:head>

{#if !policy || !product}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Policy not found</p>
			<p class="missing-body">This policy doesn't exist, or it has been removed.</p>
			<gok-link slot="actions" href="/insurance">Back to insurance</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/insurance">&larr; Insurance</gok-link>

			<div class="head-main">
				<div class="head-id">
					<p class="head-eyebrow gok-eyebrow">My policy · {policy.policyNumber}</p>
					<h1 class="head-title gok-headline-3">{product.name}</h1>
					<p class="head-insured">{policy.insuredLabel}</p>
				</div>

				<div class="head-aside">
					<gok-tag size="m">
						<span class="status">
							{#if policy.status === 'active'}
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
									<path
										d="M5 12.5l4.5 4.5L19 7"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								Active
							{:else if policy.status === 'cancelled'}
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
									<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
									<path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
								</svg>
								Cancelled
							{:else}
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
									<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
									<path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								Lapsed
							{/if}
						</span>
					</gok-tag>
					<p class="head-premium gok-tabular-nums">
						{eur(policy.premiumMinor)}<span class="head-cadence"
							>{policy.billing === 'annual' ? '/year' : '/month'}</span
						>
					</p>
				</div>
			</div>
		</header>

		<!-- Cover summary — the signature section. Covered and not-covered render with
		     identical type, size and weight; only the leading mark and heading differ. -->
		<section class="block" aria-labelledby="cover-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Cover summary</p>
				<h2 id="cover-heading" class="block-title gok-headline-5">What my cover does and doesn't do</h2>
			</div>

			<div class="cover-grid">
				<section class="cover-col" aria-labelledby="covered-heading">
					<h3 id="covered-heading" class="cover-col-title gok-headline-6">What's covered</h3>
					<ul class="cover-list">
						{#each cover.covered as item (item.label)}
							<li class="cover-item">
								<span class="cover-mark" aria-hidden="true">
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
										<path
											d="M5 12.5l4.5 4.5L19 7"
											stroke="currentColor"
											stroke-width="1.9"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
								<span class="cover-text">
									<span class="cover-label">{item.label}</span>
									{#if item.detail}<span class="cover-detail">{item.detail}</span>{/if}
								</span>
							</li>
						{/each}
					</ul>
				</section>

				<section class="cover-col" aria-labelledby="excluded-heading">
					<h3 id="excluded-heading" class="cover-col-title gok-headline-6">What's not covered</h3>
					<ul class="cover-list">
						{#each cover.excluded as item (item.label)}
							<li class="cover-item">
								<span class="cover-mark" aria-hidden="true">
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
										<path
											d="M6 18L18 6"
											stroke="currentColor"
											stroke-width="1.9"
											stroke-linecap="round"
										/>
									</svg>
								</span>
								<span class="cover-text">
									<span class="cover-label">{item.label}</span>
									{#if item.detail}<span class="cover-detail">{item.detail}</span>{/if}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			</div>
		</section>

		<!-- Policy details — the terms ledger. -->
		<section class="block" aria-labelledby="details-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Policy details</p>
				<h2 id="details-heading" class="block-title gok-headline-5">My policy</h2>
			</div>

			<gok-card>
				<dl class="ledger">
					<div class="ledger-row">
						<dt class="ledger-key">Cover level</dt>
						<dd class="ledger-val">{tier?.label}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-key">Add-ons</dt>
						<dd class="ledger-val">{addOnLabels.length ? addOnLabels.join(', ') : 'None'}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-key">Excess</dt>
						<dd class="ledger-val gok-tabular-nums">{eur(policy.excessMinor)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-key">Sum insured</dt>
						<dd class="ledger-val gok-tabular-nums">{tier ? eur(tier.sumInsuredMinor) : '—'}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-key">Start date</dt>
						<dd class="ledger-val gok-tabular-nums">{formatDate(policy.startDate)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-key">Renewal date</dt>
						<dd class="ledger-val gok-tabular-nums">{formatDate(policy.renewalDate)}</dd>
					</div>
				</dl>
			</gok-card>
		</section>

		<!-- Documents — deferred to the D-series vault; each is a "Soon". -->
		<section class="block" aria-labelledby="documents-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Documents</p>
				<h2 id="documents-heading" class="block-title gok-headline-5">My documents</h2>
			</div>

			<ul class="docs">
				{#each documents as doc (doc)}
					<li class="doc-row">
						<span class="doc-name">{doc}</span>
						<span class="doc-action">
							<gok-button variant="secondary" size="s" disabled>Download</gok-button>
							<gok-tag size="s">Soon</gok-tag>
						</span>
					</li>
				{/each}
			</ul>
			<p class="docs-note">Downloads open once my document vault lands.</p>
		</section>

		<!-- Payment schedule — a single calm line. -->
		<section class="block" aria-labelledby="schedule-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Payment schedule</p>
				<h2 id="schedule-heading" class="block-title gok-headline-5">My payments</h2>
			</div>
			<p class="schedule gok-tabular-nums">
				{eur(policy.premiumMinor)} {cadenceWord}, next on {formatDate(nextChargeDate)}.
			</p>
		</section>

		<!-- Actions — renew (reversible) and cancel (forced decision). They retire once
		     the policy is no longer active. -->
		{#if isActive}
			<section class="actions" aria-label="Policy actions">
				<gok-button variant="secondary" {@attach on('click', renew)}>Renew policy</gok-button>
				<gok-button variant="ghost" {@attach on('click', () => (cancelOpen = true))}>
					Cancel policy
				</gok-button>
			</section>
		{:else if policy.status === 'cancelled'}
			<gok-alert status="neutral" open>
				<span slot="title">This policy is cancelled</span>
				Cover has ended. To get cover again, start a new quote from the insurance page.
			</gok-alert>
		{/if}
	</div>

	<!-- Cancel — a forced decision: irreversible, so no scrim/Escape dismissal closes
	     it, and the copy is plain and no-blame. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading={`Cancel my ${product.name} policy?`}
		no-dismiss
		{@attach setProps({ open: cancelOpen })}
		{@attach on('gok-cancel', () => (cancelOpen = false))}
		{@attach on('gok-close', () => (cancelOpen = false))}
	>
		<p class="cancel-body">
			Cover ends immediately and this can't be undone. I'll stop paying
			<strong class="gok-tabular-nums">{eur(policy.premiumMinor)}</strong>
			{cadenceWord}, and {policy.insuredLabel} will no longer be insured.
		</p>

		<div slot="footer" class="cancel-actions">
			<gok-button variant="secondary" {@attach on('click', () => (cancelOpen = false))}>
				Keep my policy
			</gok-button>
			<gok-button variant="primary" {@attach on('click', confirmCancel)}>Cancel policy</gok-button>
		</div>
	</gok-dialog>
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

	/* ── Header ── */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.head-main {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.head-id {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-insured {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.head-aside {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-200);
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}

	.head-premium {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	.head-cadence {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		font-weight: var(--gok-font-weight-regular);
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

	/* ── Cover summary — covered & excluded at EQUAL weight ──
	   Both columns share every type rule. The ONLY difference is the leading glyph
	   (a check vs a cross) and the heading word. Exclusions are not smaller, greyer
	   or hidden — that equal weight is the brand's honesty made visible. */
	.cover-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
	}

	@media (min-width: 40rem) {
		.cover-grid {
			grid-template-columns: 1fr 1fr;
			gap: var(--gok-space-600);
		}
	}

	.cover-col {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.cover-col-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.cover-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.cover-item {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	/* The mark is ink in both columns — same size, same weight; only the glyph says
	   covered vs not. Never a colour-only or size-only signal. */
	.cover-mark {
		display: inline-flex;
		flex: none;
		margin-block-start: 0.1em;
		color: var(--gok-color-text);
	}

	.cover-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50);
	}

	.cover-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.cover-detail {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Policy ledger ── */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
	}

	.ledger-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.ledger-key {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.ledger-val {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		text-align: end;
		color: var(--gok-color-text);
	}

	/* ── Documents ── */
	.docs {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.doc-action {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.docs-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Payment schedule ── */
	.schedule {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* ── Cancel dialog ── */
	.cancel-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.cancel-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	@media (max-width: 24.375rem) {
		.head-main {
			flex-direction: column;
		}

		.head-aside {
			align-items: flex-start;
		}
	}
</style>
