<script lang="ts">
	// N03 · Claim status tracker page — one claim, up close. It opens with where the
	// claim is (the ClaimTracker stepper), then the honest detail: a pending note while
	// an adjuster decides, the decision once it lands (calm-positive when approved,
	// calm-factual when declined — never blame), what I filed (my account + the
	// evidence), and the claim's documents (deferred to the vault). While the claim is
	// open I can withdraw it — a forced-decision danger dialog that names the reference,
	// since withdrawing can't be undone. On confirm the page re-flows live through the
	// reactive bridge: the status becomes Withdrawn and the action retires.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:`.
	import { page } from '$app/state';
	import { claims, CLAIM_TYPE_LABELS } from '$lib/insurance/claims.svelte';
	import { getProduct, getPolicy } from '$lib/data/insurance-data';
	import { formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import ClaimTracker from '$lib/components/insurance/ClaimTracker.svelte';

	const id = $derived(page.params.id ?? '');
	const claim = $derived(claims.claimById(id));

	// The policy this claim is filed against + its product (for the display name).
	const policy = $derived(claim ? getPolicy(claim.policyId) : undefined);
	const product = $derived(policy ? getProduct(policy.productId) : undefined);

	const isOpen = $derived(claim?.status === 'submitted' || claim?.status === 'in-review');
	const isApproved = $derived(claim?.status === 'approved');
	const isDeclined = $derived(claim?.status === 'declined');

	// A friendly word for each evidence kind.
	const KIND_LABELS: Record<string, string> = {
		photo: 'Photo',
		receipt: 'Receipt',
		report: 'Report',
		document: 'Document'
	};

	// ── Withdraw — a forced decision (irreversible). ──
	let withdrawOpen = $state(false);

	function openWithdraw() {
		withdrawOpen = true;
	}

	function closeWithdraw() {
		withdrawOpen = false;
	}

	function confirmWithdraw() {
		if (!claim) return;
		claims.withdraw(claim.id);
		withdrawOpen = false;
	}
</script>

<svelte:head>
	<title>{claim ? `Claim ${claim.reference}` : 'Claim'} · gökberk bank</title>
</svelte:head>

{#if !claim}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">I couldn't find that claim</p>
			<p class="missing-body">It may have been removed, or the link is wrong.</p>
			<gok-link slot="actions" href="/insurance">Back to insurance</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/insurance">&larr; Insurance</gok-link>

			<div class="head-id">
				<p class="head-eyebrow gok-eyebrow">Claim</p>
				<h1 class="head-title gok-headline-3 gok-tabular-nums">{claim.reference}</h1>
			</div>

			<dl class="meta">
				<div class="meta-row">
					<dt class="meta-key">Policy</dt>
					<dd class="meta-val">
						<a class="meta-link" href={`/insurance/policies/${claim.policyId}`}>
							{product?.name ?? 'Policy'} · {policy?.insuredLabel ?? 'Insured'}
						</a>
					</dd>
				</div>
				<div class="meta-row">
					<dt class="meta-key">Incident</dt>
					<dd class="meta-val">{CLAIM_TYPE_LABELS[claim.type]}</dd>
				</div>
				<div class="meta-row">
					<dt class="meta-key">Incident date</dt>
					<dd class="meta-val gok-tabular-nums">{formatDate(claim.incidentDate)}</dd>
				</div>
				<div class="meta-row">
					<dt class="meta-key">Filed</dt>
					<dd class="meta-val gok-tabular-nums">{formatDate(claim.filedOn)}</dd>
				</div>
			</dl>
		</header>

		<!-- Where the claim is. -->
		<section class="block" aria-labelledby="status-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Status</p>
				<h2 id="status-heading" class="block-title gok-headline-5">Where my claim is</h2>
			</div>

			<ClaimTracker status={claim.status} />

			{#if isOpen}
				<gok-alert status="info">
					An adjuster usually decides within a few days. I'll see the outcome here.
				</gok-alert>
			{/if}
		</section>

		<!-- Decision — once it lands. Approved reads calm-positive; declined calm-factual,
		     never blame. -->
		{#if isApproved || isDeclined}
			<section class="block" aria-labelledby="decision-heading">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Decision</p>
					<h2 id="decision-heading" class="block-title gok-headline-5">
						{isApproved ? 'What was decided' : 'The outcome'}
					</h2>
				</div>

				<gok-card>
					<div class="decision">
						<p class="decision-head">
							{isApproved ? 'This claim was approved.' : 'This claim wasn’t approved.'}
						</p>
						{#if claim.decisionReason}
							<p class="decision-reason">{claim.decisionReason}</p>
						{/if}
					</div>
				</gok-card>
			</section>
		{/if}

		<!-- What I filed — my account + the evidence (read-only). -->
		<section class="block" aria-labelledby="filed-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">My account</p>
				<h2 id="filed-heading" class="block-title gok-headline-5">What I filed</h2>
			</div>

			<p class="filed-desc">{claim.description}</p>

			{#if claim.evidence.length > 0}
				<ul class="evidence">
					{#each claim.evidence as item (item.id)}
						<li class="evidence-row">
							<span class="evidence-name">{item.name}</span>
							<span class="evidence-meta">
								{KIND_LABELS[item.kind] ?? item.kind} · {item.sizeLabel}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="filed-note">I didn't attach any evidence to this claim.</p>
			{/if}
		</section>

		<!-- Documents — deferred to the vault. -->
		{#if claim.documents.length > 0}
			<section class="block" aria-labelledby="documents-heading">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Documents</p>
					<h2 id="documents-heading" class="block-title gok-headline-5">My documents</h2>
				</div>

				<ul class="docs">
					{#each claim.documents as doc (doc.label)}
						<li class="doc-cell">
							<a class="doc-row" href="/documents">
								<span class="doc-text">
									<span class="doc-label">{doc.label}</span>
									<span class="doc-note">{doc.note}</span>
								</span>
								<span class="doc-chevron" aria-hidden="true">
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
										<path
											d="M9 6l6 6-6 6"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Withdraw — only while the claim is open; a forced decision. -->
		{#if isOpen}
			<section class="actions" aria-label="Claim actions">
				<gok-button variant="secondary" {@attach on('click', openWithdraw)}>Withdraw claim</gok-button>
				<p class="actions-note">Withdrawing closes the claim. I can't reopen it.</p>
			</section>
		{/if}
	</div>

	<!-- Withdraw — a forced decision: irreversible, so no scrim/Escape dismissal, and
	     the copy names the reference. This is a standalone dialog (not nested), so a
	     plain close handler is correct. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Withdraw my claim?"
		no-dismiss
		{@attach setProps({ open: withdrawOpen })}
	>
		<p class="withdraw-body">
			This closes claim <strong class="gok-tabular-nums">{claim.reference}</strong>. I can't reopen
			it; I'd need to file again.
		</p>

		<div slot="footer" class="withdraw-actions">
			<gok-button variant="secondary" {@attach on('click', closeWithdraw)}>Keep my claim</gok-button>
			<!-- Destructive confirm: outline/text in the status colour, transparent fill —
			     never a solid fill. App-local <button> so the rule holds without restyling
			     a DS component. -->
			<button type="button" class="status-confirm" onclick={confirmWithdraw}>
				Withdraw claim {claim.reference}
			</button>
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

	.meta {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.meta-key {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.meta-val {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		text-align: end;
		color: var(--gok-color-text);
	}

	.meta-link {
		color: var(--gok-color-link);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.meta-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-xs, var(--gok-radius-s));
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

	/* ── Decision ── */
	.decision {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.decision-head {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size, var(--gok-type-body-regular-size));
		line-height: var(--gok-type-body-large-line, var(--gok-type-body-regular-line));
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.decision-reason {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── What I filed ── */
	.filed-desc {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.filed-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.evidence {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.evidence-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.evidence-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.evidence-meta {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
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

	.doc-cell {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		color: var(--gok-color-text);
	}

	.doc-row:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-focus-ring-offset));
		border-radius: var(--gok-radius-s);
	}

	.doc-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50);
	}

	.doc-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text);
	}

	.doc-note {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.doc-chevron {
		display: inline-flex;
		flex: none;
		color: var(--gok-color-text-muted);
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.actions-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── Withdraw dialog ── */
	.withdraw-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.withdraw-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.withdraw-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	/* Destructive confirm — outline/text in the status colour, transparent fill. */
	.status-confirm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.5rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-error);
		border-radius: var(--gok-radius-s);
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		transition:
			background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard),
			color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.status-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.status-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
