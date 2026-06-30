<script lang="ts">
	// L04 Flow A · Mortgage application wizard — the deepest journey in the app. Six
	// steps on a local step machine: property → finances → documents → decision in
	// principle → offer → e-sign. Everything (LTV, the decision, the product shelf, the
	// chosen offer and its full ~300-row amortization) derives from `app.draft`, which
	// is persisted, so an interrupted application resumes on the next visit.
	//
	// The tone is the whole point: calm, exact, fully disclosed. A rate never appears
	// without its APRC beside it; every fee is itemised; the total cost of credit is on
	// the page before I'm asked to sign. A decline is factual and forward-looking — a
	// plain reason plus real alternatives, no blame, no score, no offer.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:`
	// on a gok-* element. MoneyInput is a Svelte composite, so its value/onchange are
	// plain props. The one earned accent per step is the single primary action (and the
	// active product selection on the offer step). Tokens/semantic roles only.
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { mortgageApplication as app } from '$lib/state/mortgage-application.svelte';
	import { EMPLOYMENT_TYPES, PROPERTY_TYPES } from '$lib/lending/mortgage';
	import type { AmortRow } from '$lib/data/lending';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import WizardProgress from '$lib/components/wizard/WizardProgress.svelte';

	// The brief dwell on the pending decision screen before the (already-deterministic)
	// decision-in-principle shows — long enough to feel considered, short enough to stay
	// calm. A plain setTimeout, no timestamps.
	const DECISION_DWELL_MS = 1500;

	const eur = (minor: number) => formatMoney(minor, 'EUR');
	// Rates carry two decimals (3.69%, 3.94%) — never round an APRC away.
	const rate = (bps: number) =>
		`${(bps / 100).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
	// LTV reads cleaner at one decimal (80%, 76.4%).
	const pct1 = (bps: number) => `${(bps / 100).toLocaleString('en-IE', { maximumFractionDigits: 1 })}%`;

	// ── The six-step machine. Offer + sign are reachable only on agreed/referred. ──
	type Step = 'property' | 'finances' | 'documents' | 'decision' | 'offer' | 'sign';
	const STEP_ORDER: { id: Step; title: string }[] = [
		{ id: 'property', title: 'Property' },
		{ id: 'finances', title: 'Finances' },
		{ id: 'documents', title: 'Documents' },
		{ id: 'decision', title: 'Decision' },
		{ id: 'offer', title: 'Offer' },
		{ id: 'sign', title: 'Sign' }
	];
	let step = $state<Step>('property');
	const stepIndex = $derived(STEP_ORDER.findIndex((s) => s.id === step));

	// The decision step runs its own little sub-machine: consent → pending → result.
	type DecisionState = 'consent' | 'pending' | 'result';
	let decisionState = $state<DecisionState>('consent');

	// ── Restore + prefill. Money composites seed their display once, so the property
	// fields are wrapped in `{#key hydrated}` and remounted after a prefill writes the
	// figures coming in from the calculator's Apply CTA. ──
	let hydrated = $state(0);
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		const sp = page.url.searchParams;
		const hasParams = sp.has('value') || sp.has('deposit') || sp.has('term');
		if (hasParams) {
			app.prefill({
				valueMinor: Number(sp.get('value') ?? '') || undefined,
				depositMinor: Number(sp.get('deposit') ?? '') || undefined,
				termMonths: Number(sp.get('term') ?? '') || undefined
			});
		} else if (app.draft.decided) {
			// Resume where a finished decision left off: the offer (agreed/referred) or
			// the decline panel.
			const outcome = app.decision.outcome;
			if (outcome === 'declined') {
				step = 'decision';
				decisionState = 'result';
			} else {
				step = 'offer';
			}
		}
		hydrated += 1;
	});

	onDestroy(() => clearTimeout(dwellTimer));

	// ── Field handlers. ──
	function onPropertyType(event: Event) {
		app.patch({
			propertyType: (event.target as HTMLElement & { value?: string }).value as never
		});
	}
	function onAddress(event: Event) {
		app.patch({ address: (event.target as HTMLInputElement).value });
	}
	function onEmployment(event: Event) {
		app.patch({
			employment: (event.target as HTMLElement & { value?: string }).value as never
		});
	}

	// ── Per-step validity (gates Continue + drives the inline hint). ──
	const propertyValid = $derived(
		app.draft.valueMinor > 0 &&
			app.draft.depositMinor >= 0 &&
			app.draft.depositMinor < app.draft.valueMinor &&
			app.draft.address.trim().length > 0
	);
	const propertyHint = $derived.by(() => {
		if (app.draft.valueMinor <= 0) return 'Enter the property value to continue.';
		if (app.draft.depositMinor >= app.draft.valueMinor)
			return "My deposit can't be the whole value — leave something to borrow.";
		if (app.draft.address.trim().length === 0) return 'Add the property address to continue.';
		return '';
	});

	const financesValid = $derived(app.draft.grossAnnualIncomeMinor > 0);
	const financesHint = $derived(
		financesValid ? '' : 'Enter my gross annual income so I can run the decision.'
	);

	// ── Navigation. ──
	function goToStep(next: Step) {
		step = next;
		if (next === 'decision') decisionState = app.draft.decided ? 'result' : 'consent';
		// The app shell's scroll container is `#main`, not the window.
		document.getElementById('main')?.scrollTo({ top: 0 });
	}

	function continueFromProperty() {
		if (propertyValid) goToStep('finances');
	}
	function continueFromFinances() {
		if (financesValid) goToStep('documents');
	}
	function continueFromDocuments() {
		if (app.allDocsUploaded) goToStep('decision');
	}

	// ── Documents (SIMULATED upload — dogfooding: no real file is read or stored). ──
	function uploadDoc(id: string) {
		app.toggleDoc(id, true);
	}
	function removeDoc(id: string) {
		app.toggleDoc(id, false);
	}

	// ── Decision in principle. A brief considered dwell, then the deterministic call. ──
	const decision = $derived(app.decision);

	function runDecision() {
		decisionState = 'pending';
		dwellTimer = setTimeout(() => {
			app.runDecision();
			decisionState = 'result';
		}, DECISION_DWELL_MS);
	}

	function continueToOffer() {
		goToStep('offer');
	}
	function adjustApplication() {
		decisionState = 'consent';
		goToStep('property');
	}

	// ── Offer. Product selection first, then the full disclosure. ──
	const selectedId = $derived(app.selectedProduct?.id ?? '');
	function selectProduct(id: string) {
		app.selectProduct(id);
	}

	// The chosen product's full disclosure.
	const chosen = $derived(app.selectedProduct);
	const termYears = $derived(Math.round(app.draft.termMonths / 12));

	// ── The full amortization schedule, as a fresh array for the grid (dogfooding #36). ──
	interface Column {
		key: string;
		label: string;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: AmortRow) => string;
	}
	const scheduleColumns: Column[] = [
		{ key: 'month', label: '#', primary: true, width: '4rem' },
		{
			key: 'date',
			label: 'Date',
			width: '9rem',
			format: (_v, row) => app.scheduleDateIso(row.month)
		},
		{ key: 'paymentMinor', label: 'Payment', numeric: true, format: (v) => eur(v as number) },
		{ key: 'principalMinor', label: 'Principal', numeric: true, format: (v) => eur(v as number) },
		{ key: 'interestMinor', label: 'Interest', numeric: true, format: (v) => eur(v as number) },
		{ key: 'balanceMinor', label: 'Balance', numeric: true, format: (v) => eur(v as number) }
	];
	const scheduleRows = $derived([...app.offerSchedule]);
	const getRowId = (row: AmortRow) => row.month;

	// ── E-sign hand-off to the shared D02 signing flow. ──
	function reviewAndSign() {
		const id = app.createOfferDocument();
		goto('/documents/' + id + '/sign');
	}

	// Move focus to an outcome heading when it mounts, so the result is announced.
	function focusHeading(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Apply for a mortgage · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/lending/mortgages/calculator">&larr; Mortgage calculator</gok-link>
		<p class="eyebrow gok-eyebrow">Mortgages</p>
		<h1 class="title gok-headline-2">Apply for a mortgage</h1>
		<p class="lead">
			I'll work through the property, my finances, and my documents, get a decision in principle,
			then see the full offer — every rate beside its APRC, every fee itemised — before I sign.
		</p>
	</header>

	<WizardProgress
		step={stepIndex + 1}
		total={STEP_ORDER.length}
		label={STEP_ORDER[stepIndex].title}
	/>
	<!-- Step indicator — quiet, by rule + number, never the accent. -->
	<ol class="steps" aria-label="Application steps">
		{#each STEP_ORDER as s, i (s.id)}
			<li
				class="steps-item"
				class:is-current={i === stepIndex}
				class:is-done={i < stepIndex}
				aria-current={i === stepIndex ? 'step' : undefined}
			>
				<span class="steps-num gok-tabular-nums">{i + 1}</span>
				<span class="steps-label">{s.title}</span>
			</li>
		{/each}
	</ol>

	{#if step === 'property'}
		<!-- Step 1 · Property — value, deposit, type, address + a live LTV readout. -->
		<section class="step" aria-labelledby="property-heading">
			<h2 id="property-heading" class="step-title gok-headline-5">The property</h2>

			<div class="fields">
				{#key hydrated}
					<MoneyInput
						currency="EUR"
						label="Property value"
						value={app.draft.valueMinor}
						onchange={(minor) => app.patch({ valueMinor: minor })}
					/>
					<MoneyInput
						currency="EUR"
						label="My deposit"
						value={app.draft.depositMinor}
						onchange={(minor) => app.patch({ depositMinor: minor })}
					/>
				{/key}

				<gok-select
					label="Property type"
					{@attach setProps({ value: app.draft.propertyType })}
					{@attach on('change', onPropertyType)}
				>
					{#each PROPERTY_TYPES as type (type.value)}
						<gok-option value={type.value}>{type.label}</gok-option>
					{/each}
				</gok-select>

				<gok-input
					label="Property address"
					placeholder="e.g. 12 Pearse Street, Dublin 2"
					{@attach setProps({ value: app.draft.address })}
					{@attach on('input', onAddress)}
					{@attach on('change', onAddress)}
				></gok-input>
			</div>

			<!-- Live LTV + implied loan — the figure that prices everything downstream. -->
			<gok-card>
				<dl class="ledger">
					<div class="ledger-row">
						<dt class="ledger-label">Loan-to-value</dt>
						<dd class="ledger-value gok-tabular-nums">{pct1(app.ltv)}</dd>
					</div>
					<div class="ledger-row">
						<dt class="ledger-label">I'd borrow</dt>
						<dd class="ledger-value gok-tabular-nums">{eur(app.principalMinor)}</dd>
					</div>
				</dl>
			</gok-card>

			{#if !propertyValid && propertyHint}
				<p class="hint" role="status">{propertyHint}</p>
			{/if}

			<div class="actions">
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !propertyValid })}
					{@attach on('click', continueFromProperty)}
				>
					Continue
				</gok-button>
			</div>
		</section>
	{:else if step === 'finances'}
		<!-- Step 2 · Finances — kept lean; income drives the affordability decision. -->
		<section class="step" aria-labelledby="finances-heading">
			<h2 id="finances-heading" class="step-title gok-headline-5">My finances</h2>

			<div class="fields">
				<MoneyInput
					currency="EUR"
					label="Gross annual income"
					value={app.draft.grossAnnualIncomeMinor}
					onchange={(minor) => app.patch({ grossAnnualIncomeMinor: minor })}
				/>

				<gok-select
					label="Employment"
					{@attach setProps({ value: app.draft.employment })}
					{@attach on('change', onEmployment)}
				>
					{#each EMPLOYMENT_TYPES as type (type.value)}
						<gok-option value={type.value}>{type.label}</gok-option>
					{/each}
				</gok-select>

				<MoneyInput
					currency="EUR"
					label="My monthly credit commitments"
					value={app.draft.monthlyCommitmentsMinor}
					onchange={(minor) => app.patch({ monthlyCommitmentsMinor: minor })}
				/>
			</div>

			<p class="quiet">
				Just the essentials for now — a full application would gather more, but this is enough for a
				decision in principle.
			</p>

			{#if !financesValid && financesHint}
				<p class="hint" role="status">{financesHint}</p>
			{/if}

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', () => goToStep('property'))}>
					Back
				</gok-button>
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !financesValid })}
					{@attach on('click', continueFromFinances)}
				>
					Continue
				</gok-button>
			</div>
		</section>
	{:else if step === 'documents'}
		<!-- Step 3 · Documents — three required, SIMULATED uploads, gated Continue. -->
		<section class="step" aria-labelledby="documents-heading">
			<h2 id="documents-heading" class="step-title gok-headline-5">My documents</h2>

			<p class="quiet" aria-live="polite">
				<span class="gok-tabular-nums">{app.uploadedCount}</span> of 3 attached
				{#if !app.allDocsUploaded}
					· {3 - app.uploadedCount} still needed
				{/if}
			</p>

			<ul class="docs" aria-label="Required documents">
				{#each app.requiredDocs as doc (doc.id)}
					{@const isUploaded = app.draft.uploaded[doc.id]}
					<li class="doc" class:is-uploaded={isUploaded}>
						<div class="doc-info">
							<span class="doc-mark" aria-hidden="true">
								{#if isUploaded}
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
										<circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" />
									</svg>
								{/if}
							</span>
							<div class="doc-text">
								<span class="doc-label">{doc.label}</span>
								<span class="doc-hint">{doc.hint}</span>
							</div>
						</div>

						<div class="doc-action">
							{#if isUploaded}
								<gok-tag size="s">Attached</gok-tag>
								<button type="button" class="link-button" {@attach on('click', () => removeDoc(doc.id))}>
									Remove
									<span class="sr-only">{doc.label}</span>
								</button>
							{:else}
								<gok-button variant="secondary" {@attach on('click', () => uploadDoc(doc.id))}>
									Attach
									<span class="sr-only">{doc.label}</span>
								</gok-button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>

			<p class="demo-note">
				This is a demo — no real document is read or stored. Attaching adds a placeholder so I can
				see the rest of the flow.
			</p>

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', () => goToStep('finances'))}>
					Back
				</gok-button>
				<gok-button
					variant="primary"
					{@attach setProps({ disabled: !app.allDocsUploaded })}
					{@attach on('click', continueFromDocuments)}
				>
					Continue
				</gok-button>
			</div>
		</section>
	{:else if step === 'decision'}
		<!-- Step 4 · Decision in principle — consent → pending → outcome. -->
		<section class="step" aria-labelledby="decision-heading">
			<h2 id="decision-heading" class="step-title gok-headline-5">My decision in principle</h2>

			{#if decisionState === 'consent'}
				<p class="quiet">
					This is an indicative decision based on what I've shared. It's a soft assessment — it
					doesn't affect my credit score, and it isn't a binding offer.
				</p>

				<gok-card>
					<dl class="ledger">
						<div class="ledger-row">
							<dt class="ledger-label">I'd borrow</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(app.principalMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Loan-to-value</dt>
							<dd class="ledger-value gok-tabular-nums">{pct1(app.ltv)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Over</dt>
							<dd class="ledger-value gok-tabular-nums">{termYears} years</dd>
						</div>
					</dl>
				</gok-card>

				<div class="actions">
					<gok-button variant="secondary" {@attach on('click', () => goToStep('documents'))}>
						Back
					</gok-button>
					<gok-button variant="primary" {@attach on('click', runDecision)}>
						Get my decision
					</gok-button>
				</div>
			{:else if decisionState === 'pending'}
				<div class="pending" aria-live="polite">
					<gok-spinner size="l" accessible-label="Reviewing my application"></gok-spinner>
					<gok-tag size="m" dot>Reviewing</gok-tag>
					<p class="quiet">Reviewing — usually under a minute.</p>
				</div>
			{:else if decision.outcome === 'agreed'}
				<!-- Agreed: a calm positive panel (rule + icon + text, never colour alone). -->
				<div class="outcome outcome-agreed" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<path
								d="M5 12.5l4.5 4.5L19 7"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						Agreed in principle
					</h3>
					<p class="outcome-reason">{decision.reason}</p>
					<div class="actions">
						<gok-button variant="primary" {@attach on('click', continueToOffer)}>
							Continue to my offer
						</gok-button>
					</div>
				</div>
			{:else if decision.outcome === 'referred'}
				<!-- Referred: an info panel — still proceed to an indicative offer. -->
				<div class="outcome outcome-referred" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							<path
								d="M12 11v5"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
							<circle cx="12" cy="7.75" r="1.1" fill="currentColor" />
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						A closer look needed
					</h3>
					<p class="outcome-reason">{decision.reason}</p>
					<p class="quiet">
						I can still see the offer below — it's indicative until an underwriter confirms it.
					</p>
					<div class="actions">
						<gok-button variant="primary" {@attach on('click', continueToOffer)}>
							Continue to my offer
						</gok-button>
					</div>
				</div>
			{:else}
				<!-- Declined: plain, no-blame, forward-looking. No offer is shown. -->
				<div class="outcome outcome-declined" aria-live="polite">
					<span class="outcome-mark" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
							<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
							<path d="M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
					</span>
					<h3 class="outcome-title gok-headline-6" tabindex="-1" {@attach focusHeading}>
						I can't offer this right now
					</h3>
					<p class="outcome-reason">{decision.reason}</p>

					<div class="alternatives">
						<p class="card-eyebrow gok-eyebrow">A few ways forward</p>
						<ul class="alt-list">
							<li>Put down a larger deposit to bring the loan-to-value into range.</li>
							<li>Choose a longer term to lower the monthly payment.</li>
							<li>Look at a lower property value.</li>
						</ul>
					</div>

					<div class="actions">
						<gok-button variant="primary" {@attach on('click', adjustApplication)}>
							Adjust my application
						</gok-button>
						<gok-link href="/lending">Back to lending</gok-link>
					</div>
				</div>
			{/if}
		</section>
	{:else if step === 'offer'}
		<!-- Step 5 · Offer — product selection, then full disclosure + schedule. -->
		<section class="step" aria-labelledby="offer-heading">
			<h2 id="offer-heading" class="step-title gok-headline-5">My offer</h2>

			{#if decision.outcome === 'referred'}
				<gok-alert status="info">
					This offer is indicative — an underwriter will confirm it before it's final.
				</gok-alert>
			{/if}

			<!-- Product selection — native radios styled as cards; the checked card carries
			     the single earned accent (active selection). APRC sits beside every rate. -->
			<fieldset class="products">
				<legend class="products-legend gok-eyebrow">Choose my product</legend>
				{#each app.products as product (product.id)}
					<label class="product" class:is-selected={selectedId === product.id}>
						<input
							class="sr-only"
							type="radio"
							name="product"
							value={product.id}
							checked={selectedId === product.id}
							onchange={() => selectProduct(product.id)}
						/>
						<span class="product-mark" aria-hidden="true"></span>
						<span class="product-body">
							<span class="product-label gok-headline-6">{product.label}</span>
							<span class="product-rates">
								<span class="product-rate gok-tabular-nums">{rate(product.aprBps)} rate</span>
								<span class="product-aprc gok-tabular-nums">APRC {rate(product.aprcBps)}</span>
							</span>
							<span class="product-monthly gok-tabular-nums">
								{eur(product.monthlyMinor)} a month
							</span>
						</span>
					</label>
				{/each}
			</fieldset>

			{#if chosen}
				<!-- The chosen offer, disclosed in full. Rate ALWAYS beside its APRC. -->
				<gok-card variant="filled">
					<p slot="header" class="card-eyebrow gok-eyebrow">My {chosen.label} offer</p>
					<dl class="ledger">
						<div class="ledger-row">
							<dt class="ledger-label">Rate</dt>
							<dd class="ledger-value gok-tabular-nums">
								{rate(chosen.aprBps)} · APRC {rate(chosen.aprcBps)}
							</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Monthly payment</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.monthlyMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Term</dt>
							<dd class="ledger-value gok-tabular-nums">{termYears} years</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Loan amount</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(app.principalMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Loan-to-value</dt>
							<dd class="ledger-value gok-tabular-nums">{pct1(app.ltv)}</dd>
						</div>
					</dl>
				</gok-card>

				<!-- Itemised fees — every fee on the page, totalled. -->
				<gok-card>
					<p slot="header" class="card-eyebrow gok-eyebrow">Fees, itemised</p>
					<dl class="ledger">
						<div class="ledger-row">
							<dt class="ledger-label">Arrangement fee</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.fees.arrangementMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Valuation fee</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.fees.valuationMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Funds-transfer fee</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.fees.fundsTransferMinor)}</dd>
						</div>
						<div class="ledger-row ledger-row-total">
							<dt class="ledger-label">Total fees</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.fees.totalMinor)}</dd>
						</div>
					</dl>
				</gok-card>

				<!-- Total cost of credit — repayable + interest, in full. -->
				<gok-card>
					<p slot="header" class="card-eyebrow gok-eyebrow">Total cost of credit</p>
					<dl class="ledger">
						<div class="ledger-row">
							<dt class="ledger-label">Total repayable</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.cost.totalRepayableMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Total interest</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.cost.totalInterestMinor)}</dd>
						</div>
					</dl>
				</gok-card>

				<!-- The full repayment schedule — every month of the term. -->
				<div class="schedule">
					<p class="card-eyebrow gok-eyebrow">My repayment schedule</p>
					<gok-table
						accessible-label="My full mortgage repayment schedule"
						{@attach setProps({ columns: scheduleColumns, rows: scheduleRows, getRowId })}
					></gok-table>
					<p class="quiet">
						The full schedule over {termYears} years — each line is the month, its date, the payment, and
						how it splits between principal and interest as the balance falls.
					</p>
				</div>
			{/if}

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', () => goToStep('decision'))}>
					Back
				</gok-button>
				<gok-button variant="primary" {@attach on('click', () => goToStep('sign'))}>
					Continue to sign
				</gok-button>
			</div>
		</section>
	{:else}
		<!-- Step 6 · E-sign hand-off to the shared D02 signing flow. -->
		<section class="step" aria-labelledby="sign-heading" aria-live="polite">
			<h2 id="sign-heading" class="step-title gok-headline-5" tabindex="-1" {@attach focusHeading}>
				Review and sign my mortgage offer
			</h2>

			<p class="quiet">
				Everything's disclosed — the rate and its APRC, every fee, the total cost, and the full
				schedule. The next step opens my offer document to read and sign. Nothing is binding until
				I sign.
			</p>

			{#if chosen}
				<gok-card>
					<dl class="ledger">
						<div class="ledger-row">
							<dt class="ledger-label">Product</dt>
							<dd class="ledger-value">{chosen.label}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Rate</dt>
							<dd class="ledger-value gok-tabular-nums">
								{rate(chosen.aprBps)} · APRC {rate(chosen.aprcBps)}
							</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Monthly payment</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.monthlyMinor)}</dd>
						</div>
						<div class="ledger-row">
							<dt class="ledger-label">Total repayable</dt>
							<dd class="ledger-value gok-tabular-nums">{eur(chosen.cost.totalRepayableMinor)}</dd>
						</div>
					</dl>
				</gok-card>
			{/if}

			<p class="quiet">
				Once it's signed, my mortgage moves to servicing — managing it day to day is coming next.
			</p>

			<div class="actions">
				<gok-button variant="secondary" {@attach on('click', () => goToStep('offer'))}>
					Back
				</gok-button>
				<gok-button variant="primary" {@attach on('click', reviewAndSign)}>
					Review and sign
				</gok-button>
				<gok-link href="/lending">Back to lending</gok-link>
			</div>
		</section>
	{/if}
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

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Step indicator ── */
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps-item {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.steps-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: 1;
	}

	.steps-label {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.steps-item.is-current {
		color: var(--gok-color-text);
	}

	.steps-item.is-current .steps-num {
		border-color: var(--gok-color-text);
	}

	.steps-item.is-done .steps-num {
		border-color: var(--gok-color-border-strong);
	}

	/* ── Step shell ── */
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.step-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.quiet {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.demo-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	/* ── Ledger (key/value) ── */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.ledger-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.ledger-row:first-child {
		border-block-start: none;
	}

	.ledger-row-total {
		border-block-start-color: var(--gok-color-border-strong);
	}

	.ledger-row-total .ledger-label,
	.ledger-row-total .ledger-value {
		font-weight: var(--gok-font-weight-semibold);
	}

	.ledger-label {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ledger-value {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* ── Documents ── */
	.docs {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-inline-size: 40rem;
	}

	.doc {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc:first-child {
		border-block-start: none;
	}

	.doc.is-uploaded {
		border-block-start-color: var(--gok-color-border-strong);
	}

	.doc-info {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-300);
		min-inline-size: 0;
	}

	.doc-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		margin-block-start: var(--gok-space-100);
		color: var(--gok-color-text-muted);
	}

	.doc.is-uploaded .doc-mark {
		color: var(--gok-color-primary);
	}

	.doc-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.doc-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.doc-hint {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.doc-action {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.link-button {
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.link-button:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	/* ── Pending decision ── */
	.pending {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-700);
		text-align: center;
	}

	/* ── Outcome panels (rule + icon + text, never colour alone) ── */
	.outcome {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		max-inline-size: 46rem;
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-strong) solid var(--gok-color-border-strong);
	}

	.outcome-agreed {
		border-block-start-color: var(--gok-color-primary);
	}

	.outcome-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: var(--gok-border-width-strong) solid currentcolor;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-text-muted);
	}

	.outcome-agreed .outcome-mark {
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.outcome-title:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.outcome-reason {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.alternatives {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.alt-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-inline-start: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* ── Product selection cards ── */
	.products {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		border: 0;
	}

	.products-legend {
		margin: 0;
		margin-block-end: var(--gok-space-200);
		padding: 0;
		color: var(--gok-color-text-muted);
	}

	.product {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-300);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		cursor: pointer;
	}

	.product.is-selected {
		border-color: var(--gok-color-primary);
		box-shadow: inset 0 0 0 var(--gok-border-width-hairline) var(--gok-color-primary);
	}

	.product:focus-within {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.product-mark {
		display: inline-flex;
		flex: none;
		inline-size: 1.1rem;
		block-size: 1.1rem;
		margin-block-start: var(--gok-space-100);
		border: var(--gok-border-width-strong) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-pill);
	}

	.product.is-selected .product-mark {
		border-color: var(--gok-color-primary);
		background:
			radial-gradient(
				circle,
				var(--gok-color-primary) 0 45%,
				transparent 50%
			);
	}

	.product-body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.product-label {
		color: var(--gok-color-text);
	}

	.product-rates {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.product-rate {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.product-aprc {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.product-monthly {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* ── Schedule ── */
	.schedule {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	/* ── Utility ── */
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
