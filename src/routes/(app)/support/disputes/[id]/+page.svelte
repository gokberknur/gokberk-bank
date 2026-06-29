<script lang="ts">
	// S02 · Dispute resolution tracker page — one card dispute, up close. It opens with
	// where the dispute is (the DisputeTracker stepper), then the honest detail: the
	// provisional-credit note (a transparent, reversible credit) and a pending note while
	// the bank investigates, the resolution once it lands (calm-positive when upheld —
	// the charge was refunded; calm-factual when declined — never blame), what I raised
	// (my statement + the evidence + whether I tried the merchant), and the dispute's
	// documents (deferred to the vault). While the dispute is open I can withdraw it — a
	// forced-decision danger dialog that names the reference, since it can't be reopened.
	// On confirm the page re-flows live through the reactive bridge: the status becomes
	// Withdrawn and the action retires.
	//
	// Web-component interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:`.
	import { page } from '$app/state';
	import { disputes, DISPUTE_REASON_LABELS } from '$lib/disputes/disputes.svelte';
	import { getTransactionById } from '$lib/data/disputes-data';
	import { formatMoney, formatDate } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import DisputeTracker from '$lib/components/disputes/DisputeTracker.svelte';

	const id = $derived(page.params.id ?? '');
	const dispute = $derived(disputes.disputeById(id));

	// The disputed charge — for the merchant, amount and date.
	const charge = $derived(dispute ? getTransactionById(dispute.transactionId) : undefined);

	const isOpen = $derived(
		dispute?.status === 'raised' ||
			dispute?.status === 'investigating' ||
			dispute?.status === 'provisional-credit'
	);
	const isPending = $derived(dispute?.status === 'raised' || dispute?.status === 'investigating');
	const isUpheld = $derived(dispute?.status === 'upheld');
	const isDeclined = $derived(dispute?.status === 'declined');
	// A provisional credit only reads "live" while the dispute is still open.
	const showProvisionalCredit = $derived(isOpen && (dispute?.provisionalCreditMinor ?? 0) > 0);

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
		if (!dispute) return;
		disputes.withdraw(dispute.id);
		withdrawOpen = false;
	}
</script>

<svelte:head>
	<title>{dispute ? `Dispute ${dispute.reference}` : 'Dispute'} · gökberk bank</title>
</svelte:head>

{#if !dispute}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">I couldn't find that dispute</p>
			<p class="missing-body">It may have been removed, or the link is wrong.</p>
			<gok-link slot="actions" href="/support">Back to support</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href="/support">&larr; Support</gok-link>

			<div class="head-id">
				<p class="head-eyebrow gok-eyebrow">Dispute</p>
				<h1 class="head-title gok-headline-3 gok-tabular-nums">{dispute.reference}</h1>
			</div>

			<dl class="meta">
				<div class="meta-row">
					<dt class="meta-key">Charge</dt>
					<dd class="meta-val">
						{#if charge}
							<a class="meta-link" href={`/accounts/${charge.walletId}`}>
								{charge.merchant} · <span class="gok-tabular-nums"
									>{formatMoney(Math.abs(charge.amountMinor), charge.currency)}</span
								>
							</a>
						{:else}
							The disputed charge
						{/if}
					</dd>
				</div>
				{#if charge}
					<div class="meta-row">
						<dt class="meta-key">Charge date</dt>
						<dd class="meta-val gok-tabular-nums">{formatDate(charge.date)}</dd>
					</div>
				{/if}
				<div class="meta-row">
					<dt class="meta-key">Reason</dt>
					<dd class="meta-val">{DISPUTE_REASON_LABELS[dispute.reason]}</dd>
				</div>
				<div class="meta-row">
					<dt class="meta-key">Raised</dt>
					<dd class="meta-val gok-tabular-nums">{formatDate(dispute.raisedOn)}</dd>
				</div>
			</dl>
		</header>

		<!-- Where the dispute is. -->
		<section class="block" aria-labelledby="status-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">Status</p>
				<h2 id="status-heading" class="block-title gok-headline-5">Where my dispute is</h2>
			</div>

			<DisputeTracker status={dispute.status} />

			{#if showProvisionalCredit}
				<gok-alert status="info">
					A temporary credit of {formatMoney(
						dispute.provisionalCreditMinor,
						charge?.currency ?? 'EUR'
					)} is on my account while this is investigated — it may be reversed if the dispute isn't upheld.
				</gok-alert>
			{/if}

			{#if isPending}
				<gok-alert status="info">
					The bank is looking into this. I'll see the outcome here — I don't need to do anything.
				</gok-alert>
			{/if}
		</section>

		<!-- Resolution — once it lands. Upheld reads calm-positive; declined calm-factual,
		     never blame. -->
		{#if isUpheld || isDeclined}
			<section class="block" aria-labelledby="resolution-heading">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Resolution</p>
					<h2 id="resolution-heading" class="block-title gok-headline-5">
						{isUpheld ? 'What was decided' : 'The outcome'}
					</h2>
				</div>

				<gok-card>
					<div class="resolution">
						<p class="resolution-head">
							{isUpheld ? 'This dispute was upheld — the charge was refunded.' : 'This dispute wasn’t upheld.'}
						</p>
						{#if dispute.resolutionReason}
							<p class="resolution-reason">{dispute.resolutionReason}</p>
						{/if}
					</div>
				</gok-card>
			</section>
		{/if}

		<!-- What I raised — my statement + the evidence (read-only). -->
		<section class="block" aria-labelledby="raised-heading">
			<div class="block-titles">
				<p class="block-eyebrow gok-eyebrow">My account</p>
				<h2 id="raised-heading" class="block-title gok-headline-5">What I raised</h2>
			</div>

			<p class="raised-desc">{dispute.statement}</p>

			{#if dispute.contactedMerchant !== null}
				<p class="raised-note">
					{dispute.contactedMerchant
						? 'I contacted the merchant first.'
						: "I hadn't contacted the merchant first."}
				</p>
			{/if}

			{#if dispute.evidence.length > 0}
				<ul class="evidence">
					{#each dispute.evidence as item (item.id)}
						<li class="evidence-row">
							<span class="evidence-name">{item.name}</span>
							<span class="evidence-meta">
								{KIND_LABELS[item.kind] ?? item.kind} · {item.sizeLabel}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="raised-note">I didn't attach any evidence to this dispute.</p>
			{/if}
		</section>

		<!-- Documents — deferred to the vault. -->
		{#if dispute.documents.length > 0}
			<section class="block" aria-labelledby="documents-heading">
				<div class="block-titles">
					<p class="block-eyebrow gok-eyebrow">Documents</p>
					<h2 id="documents-heading" class="block-title gok-headline-5">My documents</h2>
				</div>

				<ul class="docs">
					{#each dispute.documents as doc (doc.label)}
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

		<!-- Withdraw — only while the dispute is open; a forced decision. -->
		{#if isOpen}
			<section class="actions" aria-label="Dispute actions">
				<gok-button variant="secondary" {@attach on('click', openWithdraw)}>Withdraw dispute</gok-button>
				<p class="actions-note">Withdrawing closes the dispute. I can't reopen it.</p>
			</section>
		{/if}
	</div>

	<!-- Withdraw — a forced decision: irreversible, so no scrim/Escape dismissal, and
	     the copy names the reference. This is a standalone dialog (not nested), so a
	     plain close handler is correct. -->
	<gok-dialog
		tone="danger"
		size="s"
		heading="Withdraw my dispute?"
		no-dismiss
		{@attach setProps({ open: withdrawOpen })}
		{@attach on('gok-cancel', closeWithdraw)}
		{@attach on('gok-close', closeWithdraw)}
	>
		<p class="withdraw-body">
			This closes case <strong class="gok-tabular-nums">{dispute.reference}</strong>. If a temporary
			credit was applied it'll be reversed. I can't reopen it.
		</p>

		<div slot="footer" class="withdraw-actions">
			<gok-button variant="secondary" {@attach on('click', closeWithdraw)}>Keep my dispute</gok-button>
			<!-- Destructive confirm: outline/text in the status colour, transparent fill —
			     never a solid fill. App-local <button> so the rule holds without restyling
			     a DS component. -->
			<button type="button" class="status-confirm" onclick={confirmWithdraw}>
				Withdraw dispute {dispute.reference}
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
		border-radius: var(--gok-radius-s);
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

	/* ── Resolution ── */
	.resolution {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.resolution-head {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size, var(--gok-type-body-regular-size));
		line-height: var(--gok-type-body-large-line, var(--gok-type-body-regular-line));
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.resolution-reason {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* ── What I raised ── */
	.raised-desc {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.raised-note {
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
		gap: var(--gok-space-100);
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
