<script lang="ts">
	// N03 · File a claim — a calm, no-blame wizard on the insurance spine. Four steps
	// (choose policy → what happened → add evidence → review & submit) ride the F05
	// wizard composite: `claims.wizard.data` IS the $state draft, and the per-step
	// validators live in the state module, so this surface only renders the fields
	// that write into the draft and lets the shell gate forward movement.
	//
	// The whole tone is first-person singular and no-blame: this is a claim, so I'm
	// telling the bank what happened to me, never being accused. The reporting-window
	// check and the duplicate check are *informative* — I can always file behind a
	// forced acknowledgement. The terminal submit is a forced-decision confirm dialog,
	// not destructive (no danger tone), then I'm taken to the tracker.
	//
	// Interop is strictly `setProps`/`on` — never `bind:` on a gok-* host; fields write
	// into the draft through `patch` (an immutable patch so persistence + reactivity
	// flow), and gok-* values are read off the event — including the gok-textarea
	// account and the gok-date-picker (it owns its label + helper line; the ISO value
	// is read off the event detail).
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { TODAY, isoDate } from '$lib/data/time';
	import { claims, CLAIM_TYPE_LABELS } from '$lib/insurance/claims.svelte';
	import type { ClaimData } from '$lib/insurance/claims.svelte';
	import { getProduct } from '$lib/data/insurance-data';
	import Wizard from '$lib/components/wizard/Wizard.svelte';

	// An incident can't be in the future — cap the picker at the fixed today.
	const maxIncidentDate = isoDate(TODAY);

	// ── Reads off the claims state (revision-reactive getters). ──
	const activePolicies = $derived(claims.activePolicies());
	const selectedPolicy = $derived(claims.selectedPolicy());
	const selectedProductName = $derived(
		selectedPolicy ? getProduct(selectedPolicy.productId)?.name : undefined
	);
	const allowedTypes = $derived(claims.allowedTypes());
	const windowCheck = $derived(claims.windowCheck());
	const duplicate = $derived(claims.duplicate());

	/** Patch the wizard draft immutably so persistence + reactivity both flow. */
	function patch(part: Partial<ClaimData>) {
		claims.wizard.data = { ...claims.wizard.data, ...part };
	}

	// ── Step 1 · policy. A radio-card group; the selected card firms its hairline. ──
	function onPolicyChange(event: Event) {
		const id = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ policyId: id });
	}

	// ── Step 2 · incident. Segmented type + native date + native textarea. ──
	function onTypeChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value ?? '';
		patch({ type: value as ClaimData['type'] });
	}
	function onDateInput(event: Event) {
		patch({ incidentDate: (event as CustomEvent<{ value: string }>).detail.value });
	}
	function onDescriptionInput(event: Event) {
		patch({ description: (event.currentTarget as HTMLElement & { value: string }).value });
	}
	function onAcknowledgeChange(event: Event) {
		const checked = (event.target as HTMLElement & { checked?: boolean }).checked ?? false;
		patch({ windowAcknowledged: checked });
	}

	// ── Step 3 · evidence. Simulated adds with deterministic, descriptive names. ──
	function addPhoto() {
		const n = claims.wizard.data.evidence.length + 1;
		claims.addEvidence(`photo-${n}.jpg`, 'photo');
	}
	function addReceipt() {
		const n = claims.wizard.data.evidence.length + 1;
		claims.addEvidence(`receipt-${n}.pdf`, 'receipt');
	}
	function addReport() {
		const n = claims.wizard.data.evidence.length + 1;
		claims.addEvidence(`report-${n}.pdf`, 'report');
	}

	// ── Step 4 · review. Each row edits back to its step (policy=0, incident=1, evidence=2). ──
	function editStep(index: number) {
		claims.wizard.goTo(index);
	}

	// ── Submit · a forced-decision confirm dialog, then on to the tracker. ──
	let submitOpen = $state(false);

	function onReviewComplete() {
		submitOpen = true;
	}
	function closeSubmit() {
		submitOpen = false;
	}
	function confirmSubmit() {
		const claim = claims.submit();
		submitOpen = false;
		goto(`/insurance/claims/${claim.id}`);
	}
</script>

<svelte:head>
	<title>File a claim · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/insurance">&larr; Insurance</gok-link>
		<p class="eyebrow gok-eyebrow">Insurance claim</p>
		<h1 class="title gok-headline-2">File a claim</h1>
		<p class="lead">Tell me what happened. There's no blame here — I'll take it step by step.</p>
	</header>

	<Wizard wizard={claims.wizard} submitLabel="Review &amp; submit" onComplete={onReviewComplete}>
		{#if claims.wizard.current.id === 'policy'}
			<!-- Step 1 · choose the cover I'm claiming against. -->
			<section class="step" aria-label="Choose policy">
				{#if activePolicies.length === 0}
					<gok-empty-state>
						<p class="empty-title gok-headline-6">No active cover to claim against</p>
						<p class="empty-body">
							I can only file a claim on an active policy. Once I have cover, it'll show up here.
						</p>
						<gok-link slot="actions" href="/insurance">
							<gok-button variant="primary">Go to insurance</gok-button>
						</gok-link>
					</gok-empty-state>
				{:else}
					<gok-radio-group
						label="Which policy is this about?"
						orientation="vertical"
						{@attach setProps({ value: claims.wizard.data.policyId })}
						{@attach on('change', onPolicyChange)}
					>
						{#each activePolicies as policy (policy.id)}
							<gok-radio
								class="policy"
								class:is-selected={policy.id === claims.wizard.data.policyId}
								value={policy.id}
							>
								<span class="policy-label">
									<span class="policy-name">{getProduct(policy.productId)?.name ?? 'Policy'}</span>
									<span class="policy-insured">{policy.insuredLabel}</span>
									<span class="policy-number mono">{policy.policyNumber}</span>
								</span>
							</gok-radio>
						{/each}
					</gok-radio-group>

					{#if selectedPolicy}
						<!-- Cover summary so I file against the right policy. -->
						<div class="cover" aria-live="polite">
							<p class="cover-eyebrow gok-eyebrow">Filing against</p>
							<dl class="ledger">
								<div class="row">
									<dt>Cover</dt>
									<dd>{selectedProductName ?? 'Policy'}</dd>
								</div>
								<div class="row">
									<dt>What's insured</dt>
									<dd>{selectedPolicy.insuredLabel}</dd>
								</div>
								<div class="row">
									<dt>Excess</dt>
									<dd class="gok-tabular-nums">
										{(selectedPolicy.excessMinor / 100).toLocaleString('en-IE', {
											style: 'currency',
											currency: 'EUR'
										})}
									</dd>
								</div>
							</dl>
						</div>
					{/if}
				{/if}
			</section>
		{/if}

		{#if claims.wizard.current.id === 'incident'}
			<!-- Step 2 · what happened — type, date, account, and the honest notes. -->
			<section class="step fields" aria-label="What happened">
				<gok-segmented
					label="What kind of incident was it?"
					{@attach setProps({ value: claims.wizard.data.type })}
					{@attach on('change', onTypeChange)}
				>
					{#each allowedTypes as type (type)}
						<gok-segmented-item value={type}>{CLAIM_TYPE_LABELS[type]}</gok-segmented-item>
					{/each}
				</gok-segmented>

				<!-- Incident date · DS gok-date-picker (owns its label + helper line), capped at today. -->
				<gok-date-picker
					label="When did it happen?"
					helper="The day the incident happened, as best I remember."
					max={maxIncidentDate}
					{@attach setProps({ value: claims.wizard.data.incidentDate })}
					{@attach on('input', onDateInput)}
					{@attach on('change', onDateInput)}
				></gok-date-picker>

				<!-- Account · the form-associated gok-textarea (renders its own label + message). -->
				<gok-textarea
					label="Tell me what happened"
					helper="Just the facts as I remember them — there's no wrong way to tell it."
					reserve-message
					rows={5}
					placeholder="In my own words — what happened, and what was affected."
					{@attach setProps({ value: claims.wizard.data.description })}
					{@attach on('input', onDescriptionInput)}
				></gok-textarea>

				{#if duplicate}
					<gok-alert status="info">
						I already have an open {CLAIM_TYPE_LABELS[duplicate.type]} claim on this policy ({duplicate.reference})
						— I can still file a separate one if this is a different incident.
					</gok-alert>
				{/if}

				{#if windowCheck && !windowCheck.withinWindow}
					<!-- Outside the reporting window: informative, never a hard block. -->
					<gok-alert status="warning">{windowCheck.reason}</gok-alert>
					<gok-checkbox
						{@attach setProps({ checked: claims.wizard.data.windowAcknowledged })}
						{@attach on('change', onAcknowledgeChange)}
					>
						I understand and want to file anyway.
					</gok-checkbox>
				{/if}
			</section>
		{/if}

		{#if claims.wizard.current.id === 'evidence'}
			<!-- Step 3 · evidence — optional, simulated (no real file is read or stored). -->
			<section class="step" aria-label="Add evidence">
				<p class="evidence-help">
					Photos, receipts or reports help me settle this faster — but I can add them later too.
				</p>

				<div class="evidence-actions">
					<gok-button variant="secondary" {@attach on('click', addPhoto)}>Add photo</gok-button>
					<gok-button variant="secondary" {@attach on('click', addReceipt)}>Add receipt</gok-button>
					<gok-button variant="secondary" {@attach on('click', addReport)}>Add report</gok-button>
				</div>

				{#if claims.wizard.data.evidence.length > 0}
					<ul class="evidence-list" aria-label="Attached evidence">
						{#each claims.wizard.data.evidence as item (item.id)}
							<li class="evidence-item">
								<span class="evidence-glyph" aria-hidden="true">
									<svg viewBox="0 0 16 16" width="15" height="15" fill="none">
										<path
											d="M3 8.5l3 3 7-8"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
								<span class="evidence-main">
									<span class="evidence-name mono">{item.name}</span>
									<span class="evidence-meta">{item.kind} · {item.sizeLabel}</span>
								</span>
								<button
									type="button"
									class="evidence-remove"
									{@attach on('click', () => claims.removeEvidence(item.id))}
								>
									Remove
									<span class="sr-only">{item.name}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="quiet">Nothing attached yet — that's fine, evidence is optional.</p>
				{/if}

				<p class="demo-note">
					This is a demo — no real file is read or stored. Each button attaches a placeholder so I
					can see the rest of the flow.
				</p>
			</section>
		{/if}

		{#if claims.wizard.current.id === 'review'}
			<!-- Step 4 · review — a read-only ledger, each row editable in place. -->
			<section class="step" aria-label="Review and submit">
				<gok-card class="review-card">
					<dl class="ledger">
						<div class="row review-row">
							<div class="review-cell">
								<dt>Policy</dt>
								<dd>
									{selectedProductName ?? 'Policy'}
									<span class="review-sub">{selectedPolicy?.insuredLabel ?? ''}</span>
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(0))}>
								Edit<span class="sr-only"> policy</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>Incident</dt>
								<dd>
									{claims.wizard.data.type ? CLAIM_TYPE_LABELS[claims.wizard.data.type] : '—'}
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
								Edit<span class="sr-only"> incident type</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>Date</dt>
								<dd class="gok-tabular-nums">
									{claims.wizard.data.incidentDate
										? formatDate(claims.wizard.data.incidentDate)
										: '—'}
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
								Edit<span class="sr-only"> date</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>What happened</dt>
								<dd class="review-description">{claims.wizard.data.description || '—'}</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(1))}>
								Edit<span class="sr-only"> description</span>
							</gok-button>
						</div>

						<div class="row review-row">
							<div class="review-cell">
								<dt>Evidence</dt>
								<dd>
									{claims.wizard.data.evidence.length}
									{claims.wizard.data.evidence.length === 1 ? 'file' : 'files'} attached
								</dd>
							</div>
							<gok-button variant="secondary" size="s" {@attach on('click', () => editStep(2))}>
								Edit<span class="sr-only"> evidence</span>
							</gok-button>
						</div>
					</dl>
				</gok-card>

				{#if duplicate}
					<gok-alert status="info">
						I still have an open {CLAIM_TYPE_LABELS[duplicate.type]} claim on this policy ({duplicate.reference}).
						This will be filed as a separate claim.
					</gok-alert>
				{/if}

				{#if windowCheck && !windowCheck.withinWindow}
					<gok-alert status="warning">
						{windowCheck.reason} I've acknowledged this and want to file anyway.
					</gok-alert>
				{/if}
			</section>
		{/if}
	</Wizard>
</div>

<!-- Submit · a forced-decision confirm (not destructive, so no danger tone). -->
<gok-dialog
	size="s"
	heading="Submit my claim"
	no-dismiss
	{@attach setProps({ open: submitOpen })}
>
	<p class="submit-body">
		I'm submitting my
		<strong>{claims.wizard.data.type ? CLAIM_TYPE_LABELS[claims.wizard.data.type] : ''}</strong>
		claim on <strong>{selectedProductName ?? 'my policy'}</strong>. An adjuster will review it and
		I'll be able to track it from here.
	</p>

	<div slot="footer" class="submit-actions">
		<gok-button variant="secondary" {@attach on('click', closeSubmit)}>Back</gok-button>
		<gok-button variant="primary" {@attach on('click', confirmSubmit)}>Submit claim</gok-button>
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

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step scaffolding --- */
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.fields {
		max-inline-size: 32rem;
	}

	/* --- Step 1 · policy radio-cards --- */
	/*
	 * Card chrome wraps the host gok-radio — we compose layout around the control,
	 * never restyle the radio's own visuals. The selected card firms its hairline
	 * to ink (the earned green stays on the radio dot — one accent per context).
	 */
	.policy {
		display: block;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.policy:hover {
		border-color: var(--gok-color-border-strong);
	}

	.policy.is-selected {
		border-color: var(--gok-color-text);
	}

	.policy-label {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
	}

	.policy-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		color: var(--gok-color-text);
	}

	.policy-insured {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.policy-number {
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	/* --- Cover summary --- */
	.cover {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.cover-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	/* --- Key/value ledgers --- */
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

	/* --- Step 3 · evidence --- */
	.evidence-help {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.evidence-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.evidence-list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.evidence-item {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.evidence-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		color: var(--gok-color-primary);
	}

	.evidence-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.evidence-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.evidence-meta {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		text-transform: capitalize;
	}

	.evidence-remove {
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

	.evidence-remove:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.demo-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step 4 · review --- */
	.review-card {
		display: block;
	}

	.review-row {
		gap: var(--gok-space-300);
	}

	.review-cell {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.review-row dd {
		text-align: start;
	}

	.review-sub {
		display: block;
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.review-description {
		max-inline-size: 48ch;
	}

	/* --- Submit dialog --- */
	.submit-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.submit-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.submit-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Shared --- */
	.mono {
		font-family: var(--gok-font-family-mono);
	}

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

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-200);
		}
	}
</style>
