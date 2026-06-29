<script lang="ts">
	// N01 · Buy insurance — quote → purchase. A save-as-you-go phase machine
	// (choose → configure → review → done) that rides the money spine: configure
	// cover, see a live, fully-disclosed premium, then pay and e-sign behind a
	// forced-decision dialog with a simulated passkey step-up.
	//
	// THE DEFINING BRAND RULE — covered AND excluded at EQUAL visual weight.
	// Both lists are rendered by ONE markup shape (`coverPanel` snippet) and share
	// ONE set of CSS classes (.cover-heading / .cover-list / .cover-item / …), so
	// neither can ever drift to a smaller or quieter treatment. The only thing that
	// differs between a covered and an excluded row is the leading glyph (a check vs
	// a slash, both aria-hidden) and a visually-hidden "Covered" / "Not covered"
	// word — the meaning is carried by the heading + that word, NEVER by size or
	// colour. As add-ons toggle, items move LIVE between the two lists (the state's
	// `excluded` getter retires a named exclusion an active add-on now covers).
	//
	// Interop is strictly `setProps` / `on` from `wc.svelte` — never `bind:` on a
	// gok-* custom element. Money is integer minor units; formatting at the edges.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { insurance } from '$lib/state/insurance.svelte';
	import WizardProgress from '$lib/components/wizard/WizardProgress.svelte';
	import type { InsuranceProductId, CoverTier, BillingPeriod } from '$lib/data/insurance-data';

	type Phase = 'choose' | 'configure' | 'review' | 'done';
	let phase = $state<Phase>('choose');

	// The three buy steps (the 'done' success screen is terminal, not a step). Mirrors the
	// claims wizard's progress signal for cross-domain consistency (INS-U-02).
	const QUOTE_STEPS: { id: Phase; title: string }[] = [
		{ id: 'choose', title: 'Choose cover' },
		{ id: 'configure', title: 'Set it up' },
		{ id: 'review', title: 'Review & buy' }
	];
	const quoteStepIndex = $derived(QUOTE_STEPS.findIndex((s) => s.id === phase));

	// On mount (SPA, client-only): a valid `?product=` deep-links straight into
	// configure with that product seeded; otherwise we start at the product grid.
	onMount(() => {
		const requested = page.url.searchParams.get('product');
		if (requested && insurance.product(requested as InsuranceProductId)) {
			insurance.startQuote(requested as InsuranceProductId);
			phase = 'configure';
		}
	});

	// ── Live draft + quote (all reactive on insurance.quoteDraft) ───────────────
	const draft = $derived(insurance.quoteDraft);
	const product = $derived(insurance.quoteProduct);
	const quote = $derived(insurance.quote());
	const covered = $derived(insurance.covered);
	const excluded = $derived(insurance.excluded);
	const recurringMinor = $derived(insurance.recurringPremiumMinor());

	const periodSuffix = $derived(draft.billing === 'annual' ? '/year' : '/month');
	const premiumLabel = $derived(formatMoney(recurringMinor, 'EUR'));

	/** Cheapest tier per product, for the "From …/month" line on the choose grid. */
	function fromMinor(id: InsuranceProductId): number {
		const p = insurance.product(id);
		if (!p) return 0;
		return Math.min(...p.tiers.map((t) => t.baseMonthlyMinor));
	}

	// ── Phase: choose ───────────────────────────────────────────────────────────
	function chooseProduct(id: InsuranceProductId) {
		insurance.startQuote(id);
		phase = 'configure';
	}

	// ── Phase: configure — change handlers ──────────────────────────────────────
	function onTierChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value as CoverTier;
		insurance.setQuoteDraft({ tier: value });
	}

	function onAddOnChange(id: string) {
		insurance.toggleAddOn(id);
	}

	function onExcessChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '0';
		insurance.setQuoteDraft({ excessMinor: Number(value) });
	}

	function onBillingChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value as BillingPeriod;
		insurance.setQuoteDraft({ billing: value });
	}

	let insuredTouched = $state(false);

	function onInsuredInput(event: Event) {
		insurance.setQuoteDraft({
			insuredLabel: (event.target as HTMLInputElement).value
		});
	}

	function onInsuredBlur() {
		insuredTouched = true;
	}

	const insuredLabel = $derived(draft.insuredLabel.trim());
	const canContinue = $derived(insuredLabel !== '');
	// Reward-early: only nag once the field has been touched and left empty.
	const insuredError = $derived(
		insuredTouched && insuredLabel === ''
			? `Tell me what I'm insuring to continue.`
			: ''
	);

	function toReview() {
		insuredTouched = true;
		if (canContinue) phase = 'review';
	}

	// ── Phase: review → forced-decision confirm (pay & sign) ────────────────────
	let confirmOpen = $state(false);
	let consentGiven = $state(false);
	let stepUpVerified = $state(false);

	const addOnLabels = $derived(
		(product?.addOns ?? [])
			.filter((a) => draft.addOnIds.includes(a.id))
			.map((a) => a.label)
	);
	const tierLabel = $derived(product?.tiers.find((t) => t.tier === draft.tier)?.label ?? '');

	function openConfirm() {
		consentGiven = false;
		stepUpVerified = false;
		confirmOpen = true;
	}

	function closeConfirm() {
		confirmOpen = false;
	}

	function onConsentChange(event: Event) {
		consentGiven = (event.target as HTMLElement & { checked?: boolean }).checked ?? false;
	}

	/** SIMULATED step-up (real passkey / OTP is F08 / F12). */
	function approveWithPasskey() {
		stepUpVerified = true;
	}

	const canBuy = $derived(consentGiven && stepUpVerified);

	function buyAndSign() {
		if (!canBuy) return;
		const policy = insurance.buy();
		if (!policy) return; // Guarded on a non-empty insured label.
		confirmOpen = false;
		phase = 'done';
	}

	function backToConfigure() {
		phase = 'configure';
	}

	// ── Phase: done ──────────────────────────────────────────────────────────────
	const bought = $derived(insurance.bought);

	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	function viewPolicy() {
		if (bought) goto(`/insurance/policies/${bought.id}`);
	}

	function backToInsurance() {
		goto('/insurance');
	}
</script>

<svelte:head>
	<title>Buy insurance · gökberk bank</title>
</svelte:head>

<!--
	The equal-weight cover panel. ONE snippet renders BOTH "covered" and "excluded"
	from the same markup + classes, so exclusions can never be quietly de-emphasised.
	`kind` only swaps the leading glyph and the visually-hidden status word.
-->
{#snippet coverPanel(
	heading: string,
	items: { label: string; detail?: string }[],
	kind: 'covered' | 'excluded'
)}
	<section class="cover-block" aria-labelledby="cover-{kind}">
		<h3 id="cover-{kind}" class="cover-heading gok-headline-6">{heading}</h3>
		{#if items.length === 0}
			<p class="cover-empty">Nothing here at this cover level.</p>
		{:else}
			<ul class="cover-list">
				{#each items as item (item.label)}
					<li class="cover-item">
						<span class="cover-glyph" aria-hidden="true">
							{#if kind === 'covered'}
								<svg viewBox="0 0 16 16" width="15" height="15" fill="none">
									<path
										d="M3 8.5l3 3 7-8"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{:else}
								<svg viewBox="0 0 16 16" width="15" height="15" fill="none">
									<path
										d="M4 12L12 4"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
									/>
								</svg>
							{/if}
						</span>
						<span class="cover-text">
							<span class="visually-hidden"
								>{kind === 'covered' ? 'Covered:' : 'Not covered:'}</span
							>
							<span class="cover-label">{item.label}</span>
							{#if item.detail}
								<span class="cover-detail">{item.detail}</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/snippet}

<!-- Both blocks side by side, sharing the same grid — identical treatment. -->
{#snippet coverPair()}
	<div class="cover-pair">
		{@render coverPanel("What's covered", covered, 'covered')}
		{@render coverPanel("What's not covered", excluded, 'excluded')}
	</div>
	<p class="cover-caption">Add-ons can move items into cover.</p>
{/snippet}

<div class="page">
	{#if phase !== 'done'}
		<WizardProgress
			step={quoteStepIndex + 1}
			total={QUOTE_STEPS.length}
			label={QUOTE_STEPS[quoteStepIndex].title}
		/>
	{/if}
	{#if phase === 'choose'}
		<!-- ── Choose a product ──────────────────────────────────────────────── -->
		<header class="head">
			<gok-link href="/insurance">&larr; Insurance</gok-link>
			<p class="eyebrow gok-eyebrow">Buy cover</p>
			<h1 class="title gok-headline-2">What would I like to protect?</h1>
			<p class="lede">
				Pick a line of cover. I'll see exactly what's covered and what isn't before I buy.
			</p>
		</header>

		<ul class="product-grid">
			{#each insurance.products as p (p.id)}
				<li>
					<gok-card interactive class="product-card">
						<button type="button" class="product-button" onclick={() => chooseProduct(p.id)}>
							<span class="product-name gok-headline-5">{p.name}</span>
							<span class="product-tagline">{p.tagline}</span>
							<span class="product-from">
								From <span class="gok-tabular-nums">{formatMoney(fromMinor(p.id), 'EUR')}</span>/month
							</span>
						</button>
					</gok-card>
				</li>
			{/each}
		</ul>
	{:else if phase === 'configure' && product}
		<!-- ── Configure cover ───────────────────────────────────────────────── -->
		<header class="head">
			<gok-link href="/insurance">&larr; Insurance</gok-link>
			<p class="eyebrow gok-eyebrow">{product.name}</p>
			<h1 class="title gok-headline-2">Build my cover</h1>
			<p class="lede">{product.tagline}</p>
		</header>

		<div class="configure">
			<!-- Left: the controls -->
			<section class="config-controls" aria-label="Configure cover">
				<!-- Cover level -->
				<div class="field">
					<gok-segmented
						label="Cover level"
						{@attach setProps({ value: draft.tier })}
						{@attach on('change', onTierChange)}
					>
						{#each product.tiers as t (t.tier)}
							<gok-segmented-item value={t.tier}>
								<span class="seg-label">{t.label}</span>
								<span class="seg-meta gok-tabular-nums">{formatMoney(t.baseMonthlyMinor, 'EUR')}/mo</span>
							</gok-segmented-item>
						{/each}
					</gok-segmented>
					<p class="field-note">{product.tiers.find((t) => t.tier === draft.tier)?.summary}</p>
				</div>

				<!-- Add-ons -->
				<div class="field">
					<p class="field-label gok-eyebrow">Add-ons</p>
					<ul class="addon-list">
						{#each product.addOns as addOn (addOn.id)}
							<li class="addon-row">
								<div class="addon-text">
									<span class="addon-label">{addOn.label}</span>
									<span class="addon-note">{addOn.note}</span>
								</div>
								<div class="addon-control">
									<span class="addon-price gok-tabular-nums"
										>+{formatMoney(addOn.monthlyMinor, 'EUR')}/mo</span
									>
									<gok-switch
										accessible-label={`${addOn.label}, plus ${formatMoney(addOn.monthlyMinor, 'EUR')} a month`}
										{@attach setProps({ checked: draft.addOnIds.includes(addOn.id) })}
										{@attach on('change', () => onAddOnChange(addOn.id))}
									></gok-switch>
								</div>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Excess -->
				<div class="field">
					<gok-segmented
						label="Excess"
						{@attach setProps({ value: String(draft.excessMinor) })}
						{@attach on('change', onExcessChange)}
					>
						{#each product.excessOptions as opt (opt)}
							<gok-segmented-item value={String(opt)}>
								<span class="gok-tabular-nums">{formatMoney(opt, 'EUR')}</span>
							</gok-segmented-item>
						{/each}
					</gok-segmented>
					<p class="field-note">A higher excess lowers my premium.</p>
				</div>

				<!-- Billing -->
				<div class="field">
					<gok-segmented
						label="Billing"
						{@attach setProps({ value: draft.billing })}
						{@attach on('change', onBillingChange)}
					>
						<gok-segmented-item value="monthly">Monthly</gok-segmented-item>
						<gok-segmented-item value="annual">Annual</gok-segmented-item>
					</gok-segmented>
					<p class="field-note">
						Paying annually saves
						<span class="gok-tabular-nums">{formatMoney(quote.annualSavingMinor, 'EUR')}</span> a year.
					</p>
				</div>

				<!-- What's insured -->
				<div class="field">
					<gok-input
						label="What I'm insuring"
						placeholder={`e.g. ${product.id === 'travel' ? 'Annual trips in Europe' : product.id === 'device' ? 'iPhone 16 Pro' : 'My flat in Lisbon'}`}
						helper={`Describe the ${product.insuredNoun} this policy covers.`}
						reserve-message
						{@attach setProps({ value: draft.insuredLabel, error: insuredError })}
						{@attach on('input', onInsuredInput)}
						{@attach on('change', onInsuredInput)}
						{@attach on('blur', onInsuredBlur)}
					></gok-input>
				</div>
			</section>

			<!-- Right: the live quote + equal-weight cover -->
			<aside class="config-quote" aria-label="My quote">
				<gok-card class="ledger-card">
					<div class="premium" aria-live="polite">
						<span class="premium-eyebrow gok-eyebrow">My premium</span>
						<span class="premium-amount gok-headline-2 gok-tabular-nums">{premiumLabel}</span>
						<span class="premium-period">{periodSuffix}</span>
					</div>
					<dl class="ledger">
						<div class="row">
							<dt>Sum insured</dt>
							<dd class="gok-tabular-nums">{formatMoney(quote.sumInsuredMinor, 'EUR')}</dd>
						</div>
						<div class="row">
							<dt>Excess</dt>
							<dd class="gok-tabular-nums">{formatMoney(draft.excessMinor, 'EUR')}</dd>
						</div>
						{#if draft.billing === 'annual'}
							<div class="row">
								<dt>Annual saving</dt>
								<dd class="gok-tabular-nums">{formatMoney(quote.annualSavingMinor, 'EUR')}</dd>
							</div>
						{/if}
					</dl>
				</gok-card>

				{@render coverPair()}
			</aside>
		</div>

		<div class="actions">
			<gok-button variant="secondary" {@attach on('click', () => (phase = 'choose'))}>
				Back
			</gok-button>
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canContinue })}
				{@attach on('click', toReview)}
			>
				Continue
			</gok-button>
		</div>
	{:else if phase === 'review' && product}
		<!-- ── Review ────────────────────────────────────────────────────────── -->
		<header class="head">
			<gok-link href="/insurance">&larr; Insurance</gok-link>
			<p class="eyebrow gok-eyebrow">{product.name}</p>
			<h1 class="title gok-headline-2">Review my cover</h1>
			<p class="lede">Everything below is final before I pay and sign.</p>
		</header>

		<div class="review">
			<gok-card class="ledger-card">
				<dl class="ledger">
					<div class="row">
						<dt>Product</dt>
						<dd>{product.name}</dd>
					</div>
					<div class="row">
						<dt>Cover level</dt>
						<dd>{tierLabel}</dd>
					</div>
					<div class="row">
						<dt>Add-ons</dt>
						<dd>{addOnLabels.length > 0 ? addOnLabels.join(', ') : 'None'}</dd>
					</div>
					<div class="row">
						<dt>Excess</dt>
						<dd class="gok-tabular-nums">{formatMoney(draft.excessMinor, 'EUR')}</dd>
					</div>
					<div class="row">
						<dt>Billing</dt>
						<dd>{draft.billing === 'annual' ? 'Annual' : 'Monthly'}</dd>
					</div>
					<div class="row">
						<dt>What I'm insuring</dt>
						<dd>{insuredLabel}</dd>
					</div>
					<div class="row row-total">
						<dt>Premium</dt>
						<dd class="gok-tabular-nums">{premiumLabel}{periodSuffix}</dd>
					</div>
				</dl>
			</gok-card>

			{@render coverPair()}

			<p class="next-line">
				When I pay and sign, my policy goes live today, the first premium is taken from my EUR
				wallet, and my documents are saved to my vault.
			</p>
		</div>

		<div class="actions">
			<gok-button variant="secondary" {@attach on('click', backToConfigure)}>Back</gok-button>
			<gok-button variant="primary" {@attach on('click', openConfirm)}>Pay &amp; sign</gok-button>
		</div>
	{:else if phase === 'done' && bought && product}
		<!-- ── Done ──────────────────────────────────────────────────────────── -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark mark-active" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M5 12.5l4.5 4.5L19 7"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>

				<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
					My {product.name} is live
				</h1>

				<gok-tag size="m" dot>Active</gok-tag>

				<p class="outcome-body">
					The first premium of <span class="gok-tabular-nums">{premiumLabel}</span> was taken from my
					EUR wallet. Cover for {insuredLabel} starts today.
				</p>

				<dl class="ledger receipt">
					<div class="row">
						<dt>Policy number</dt>
						<dd class="mono">{bought.policyNumber}</dd>
					</div>
					<div class="row">
						<dt>Premium</dt>
						<dd class="gok-tabular-nums">{premiumLabel}{periodSuffix}</dd>
					</div>
					<div class="row">
						<dt>Documents</dt>
						<dd>
							Saved to my vault
							<gok-tag size="s">Soon</gok-tag>
						</dd>
					</div>
				</dl>

				<p class="cooling-off">
					I have a <strong>14-day cooling-off period</strong>: if I change my mind, I can cancel for
					a full refund of anything I've paid, as long as I haven't claimed.
				</p>

				<div slot="actions" class="outcome-actions">
					<gok-button variant="primary" {@attach on('click', viewPolicy)}>View policy</gok-button>
					<gok-button variant="secondary" {@attach on('click', backToInsurance)}>
						Back to insurance
					</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{/if}
</div>

<!-- The irreversible gate: forced-decision pay & sign (no-dismiss, danger tone). -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Pay & sign"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
>
	<p class="confirm-body">
		I'm buying <strong>{product?.name}</strong> for
		<strong class="gok-tabular-nums">{premiumLabel}{periodSuffix}</strong>
		and signing the policy documents.
	</p>

	<gok-checkbox
		class="consent"
		{@attach setProps({ checked: consentGiven })}
		{@attach on('change', onConsentChange)}
	>
		I've read what's covered and excluded, and agree to the policy terms.
	</gok-checkbox>

	<!-- Step-up: SIMULATED passkey (real passkey / OTP is F08 / F12). -->
	<div class="stepup">
		<p class="stepup-key gok-eyebrow">Verify it's me</p>
		{#if stepUpVerified}
			<p class="stepup-done">
				<span class="stepup-check" aria-hidden="true">
					<svg viewBox="0 0 16 16" width="14" height="14" fill="none">
						<path
							d="M3 8.5l3 3 7-8"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				Verified with passkey
			</p>
		{:else}
			<p class="stepup-body">Signing a policy needs a quick identity check.</p>
			<gok-button variant="secondary" {@attach on('click', approveWithPasskey)}>
				Approve with passkey
			</gok-button>
		{/if}
	</div>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !canBuy })}
			{@attach on('click', buyAndSign)}
		>
			Buy &amp; sign
		</gok-button>
	</div>
</gok-dialog>

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

	.lede {
		margin: 0;
		max-inline-size: 52ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Choose: product grid ───────────────────────────────────────────────── */
	.product-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: var(--gok-space-300);
	}

	.product-card {
		display: block;
		block-size: 100%;
	}

	.product-button {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		inline-size: 100%;
		text-align: start;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.product-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.product-tagline {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.product-from {
		margin-block-start: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	/* ── Configure: two-region layout ───────────────────────────────────────── */
	.configure {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-section);
	}

	@media (min-width: 60rem) {
		.configure {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	.config-controls {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.config-quote {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.field-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.field-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.seg-label {
		display: block;
	}

	.seg-meta {
		display: block;
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* Add-ons */
	.addon-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.addon-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.addon-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.addon-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.addon-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.addon-control {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		flex: none;
	}

	.addon-price {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		white-space: nowrap;
	}

	/* ── Quote ledger card ──────────────────────────────────────────────────── */
	.ledger-card {
		display: block;
	}

	.premium {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: var(--gok-space-100);
		padding-block-end: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.premium-eyebrow {
		flex-basis: 100%;
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.premium-amount {
		margin: 0;
		color: var(--gok-color-text);
	}

	.premium-period {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}

	.ledger {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
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

	.row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	.row-total {
		margin-block-start: var(--gok-space-100);
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row-total dt,
	.row-total dd {
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	/*
	 * ── THE EQUAL-WEIGHT COVER PANEL ────────────────────────────────────────
	 * "What's covered" and "What's not covered" share EVERY style below: the same
	 * heading class, the same grid, the same item/label/detail type and colour.
	 * Exclusions are NOT smaller, NOT greyer, NOT collapsed. The only per-list
	 * difference is the leading glyph (check vs slash) + a visually-hidden status
	 * word — meaning by heading + word, never by visual de-emphasis. Both glyphs
	 * use the same neutral ink so neither list "reads louder" than the other.
	 */
	.cover-pair {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-400);
	}

	@media (min-width: 30rem) {
		.cover-pair {
			grid-template-columns: 1fr 1fr;
		}
	}

	.cover-block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.cover-heading {
		margin: 0;
		color: var(--gok-color-text);
	}

	.cover-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.cover-item {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-200);
	}

	.cover-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		margin-block-start: 0.05rem;
		color: var(--gok-color-text);
	}

	.cover-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
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

	.cover-empty {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.cover-caption {
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Review ─────────────────────────────────────────────────────────────── */
	.review {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.next-line {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Actions row ────────────────────────────────────────────────────────── */
	.actions {
		display: flex;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	/* ── Confirm dialog ─────────────────────────────────────────────────────── */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.consent {
		display: block;
		margin-block-start: var(--gok-space-300);
	}

	.stepup {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.stepup-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.stepup-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.stepup-done {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.stepup-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* ── Done / outcome ─────────────────────────────────────────────────────── */
	.outcome {
		padding-block: var(--gok-space-700);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid currentcolor;
	}

	.mark-active {
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.outcome-body {
		margin: 0;
		max-inline-size: 42ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 24rem;
		margin-inline: auto;
		text-align: start;
		padding-block-start: 0;
	}

	.cooling-off {
		margin: 0;
		max-inline-size: 44ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.cooling-off strong {
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.outcome-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

	/* Visually-hidden: carries "Covered" / "Not covered" to assistive tech only. */
	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
