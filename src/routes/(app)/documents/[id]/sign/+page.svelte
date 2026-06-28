<script lang="ts">
	// D02 · E-sign a document — the four-step signing surface for one vault document.
	// Signing is a real commitment, so the flow earns it: I read the document to the
	// end (a scroll gate, never a silent block), agree in plain legal words, prove
	// it's me with a step-up, and only then is the signature minted. The session is
	// persisted by the state, so a flow interrupted by a reload resumes where it left
	// off — the scroll gate and consent are restored on mount.
	//
	// Interop is strictly setProps/on from wc.svelte — never bind: on a gok-* host;
	// values are read off events. The single earned accent is the "Sign document"
	// button. If the document is already signed, the gate is skipped entirely and the
	// signed copy is shown directly.
	import { page } from '$app/state';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { toast } from '$lib/state/toasts.svelte';
	import { documents } from '$lib/state/documents.svelte';
	import { DOC_CATEGORY_LABELS } from '$lib/data/documents-data';
	import { esign } from '$lib/state/esign.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	const docId = page.params.id ?? '';
	const doc = $derived(documents.document(docId));

	// The signing session (persisted) — drives the gate restore on mount.
	const session = $derived(esign.session(docId));
	const scrolled = $derived(session.scrolledToEnd);
	const consented = $derived(session.consented);

	// Already signed (in the vault)? Skip the gate and show the signed copy directly.
	const alreadySigned = $derived(esign.isSigned(docId));
	const signedDoc = $derived(esign.signedDocument(docId));

	const typeLabel = $derived(doc ? DOC_CATEGORY_LABELS[doc.category] : '');

	// The local step machine, restored from the persisted session: a resumed flow that
	// already consented re-opens on the consent step.
	type Step = 'review' | 'consent' | 'signed';
	let step = $state<Step>(esign.session(docId).consented ? 'consent' : 'review');

	// The step-up re-auth, overlaid on the consent step.
	let stepUpOpen = $state(false);

	// The signature minted at commit — also restored from the session on a resume so
	// the signed panel survives a reload.
	let signatureRef = $state<string | null>(esign.session(docId).signatureRef);

	// Read progress (0–1) for the quiet gok-progress on the review step. Seeded full
	// when the gate was already cleared on a resumed session.
	let readProgress = $state(esign.session(docId).scrolledToEnd ? 1 : 0);
	const readPercent = $derived(Math.round(readProgress * 100));

	// The persisted session also records the signature, so a flow finished before a
	// reload still resolves to the signed copy even though the in-memory vault re-seeds.
	const sessionSignedAt = $derived(session.signedAtIso);
	const sessionSigned = $derived(!!sessionSignedAt);

	// Show the signed panel once the vault doc is signed (or the persisted session
	// carries a signature), or the flow reached signed in this session.
	const showSigned = $derived(alreadySigned || sessionSigned || step === 'signed');

	// The Sign action is earned: read to the end AND agreed. The same rule gates the
	// review→consent Continue (scroll only) and the accent Sign button (scroll+consent).
	const canSign = $derived(scrolled && consented);

	// A read-only document body so the review is genuinely scrollable — mock clauses
	// (this is a demo; the vault holds summaries, not full instruments). Serious by
	// design: signing is never trivialised.
	const clauses: { heading: string; body: string }[] = [
		{
			heading: 'What I am agreeing to',
			body: 'By signing, I confirm I have read this document in full and that I intend to be legally bound by it. This is an agreement between me and gökberk bank, and it takes effect on the date I sign.'
		},
		{
			heading: 'My obligations',
			body: 'I agree to the duties this document sets out, including any payments, conditions, and timeframes it names. I understand that not meeting them may have consequences described here.'
		},
		{
			heading: 'Fees and charges',
			body: 'Any fees that apply are set out in this document and in the account terms. I understand how they are calculated, when they are charged, and how I will be told if they change.'
		},
		{
			heading: 'My rights',
			body: 'I keep the rights the law gives me, including any right to withdraw or cancel within the period stated here. Signing electronically does not reduce those rights.'
		},
		{
			heading: 'How I am protected',
			body: 'My information is handled under the privacy terms, and eligible deposits are protected under the applicable deposit-guarantee scheme. This document does not change those protections.'
		},
		{
			heading: 'My signed copy',
			body: 'Once I sign, a timestamped copy carrying my signature reference is kept in my documents vault. I can open or download it at any time. The signature below is a legally binding electronic signature.'
		}
	];

	// The legal consent line — first person, exact, never minimised.
	const consentText = $derived(
		doc
			? `I have read and agree to ${doc.title}. I understand this is a legally binding electronic signature.`
			: ''
	);

	// ── Scroll gate ──────────────────────────────────────────────────────────────
	// Track the review region's scroll; clear the gate at the bottom. Keyboard-first:
	// the region is focusable, so End / PageDown reach the bottom and clear the gate.
	// If the content is short enough not to overflow, the gate is satisfied at once.
	function reviewScroll(node: HTMLElement) {
		const update = () => {
			const max = node.scrollHeight - node.clientHeight;
			const ratio = max <= 1 ? 1 : node.scrollTop / max;
			readProgress = Math.min(1, Math.max(0, ratio));
			if (readProgress >= 0.99) esign.markScrolled(docId);
		};
		// Measure after layout settles, then on every scroll.
		const raf = requestAnimationFrame(update);
		node.addEventListener('scroll', update, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			node.removeEventListener('scroll', update);
		};
	}

	// Move focus to a heading when a step's panel mounts — keeps the keyboard in place
	// and lets the signed confirmation be announced.
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	// ── Handlers ─────────────────────────────────────────────────────────────────
	function toConsent() {
		if (!scrolled) return;
		step = 'consent';
	}

	function backToReview() {
		step = 'review';
	}

	function onConsentChange(event: Event) {
		const checked = (event.target as HTMLElement & { checked?: boolean }).checked ?? false;
		esign.setConsent(docId, checked);
	}

	function openStepUp() {
		if (!canSign) return;
		stepUpOpen = true;
	}

	function onStepUpCancel() {
		// Declining the step-up returns me to consent with no signature.
		stepUpOpen = false;
	}

	function onStepUpConfirm() {
		stepUpOpen = false;
		esign.setStepUp(docId, true);
		const ref = esign.sign(docId);
		if (ref) {
			signatureRef = ref;
			step = 'signed';
		}
	}

	function download() {
		// Simulated — there is no file in this demo.
		toast('Signed copy downloaded', { status: 'success' });
	}

	// The reference shown on the signed panel: the freshly minted one, else the vault
	// doc's stored ref (on a revisit).
	const shownRef = $derived(signatureRef ?? signedDoc?.signatureRef ?? session.signatureRef ?? '');
	const shownSignedAt = $derived(signedDoc?.signedAtIso ?? sessionSignedAt ?? null);
</script>

<svelte:head>
	<title>Sign document · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if !doc}
		<section class="missing">
			<gok-empty-state>
				<p class="missing-title gok-headline-5">Document not found</p>
				<p class="missing-body">I couldn't find this document in my vault.</p>
				<div slot="actions">
					<gok-link href="/documents">&larr; Back to my documents</gok-link>
				</div>
			</gok-empty-state>
		</section>
	{:else if showSigned}
		<!-- Signed: a calm, announced confirmation — never confetti. -->
		<section class="signed" aria-live="polite">
			<span class="signed-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="26" height="26" fill="none">
					<path
						d="M5 12.5l4 4 10-11"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</span>

			<p class="eyebrow gok-eyebrow">{typeLabel} · Signed</p>
			<h1 class="signed-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
				I've signed {doc.title}
			</h1>
			<p class="signed-lead">This is now a binding electronic signature. My signed copy is in my vault.</p>

			<dl class="ledger">
				<div class="row">
					<dt>Signed by</dt>
					<dd>{esign.signer}</dd>
				</div>
				<div class="row">
					<dt>Signed on</dt>
					<dd class="gok-tabular-nums">{shownSignedAt ? formatDate(shownSignedAt) : '—'}</dd>
				</div>
				<div class="row">
					<dt>Signature reference</dt>
					<dd class="ref gok-tabular-nums">{shownRef || '—'}</dd>
				</div>
			</dl>

			<div class="signed-actions">
				<gok-button variant="secondary" {@attach on('click', download)}>Download my signed copy</gok-button>
				<gok-link href="/documents">&larr; Back to my documents</gok-link>
			</div>
		</section>
	{:else}
		<header class="head">
			<gok-link href="/documents">&larr; My documents</gok-link>
			<p class="eyebrow gok-eyebrow">{typeLabel} · Sign</p>
			<h1 class="title gok-headline-2">{doc.title}</h1>
			<p class="lead">A signature here is binding. I'll read it through, agree, and confirm it's me.</p>
		</header>

		{#if step === 'review'}
			<!-- Step 1 · Review — a scrollable, keyboard-reachable region with a scroll-to-end gate. -->
			<section class="step" aria-label="Review the document">
				<div class="progress">
					<gok-progress
						size="s"
						label="Document read progress"
						{@attach setProps({ value: readPercent, max: 100 })}
					></gok-progress>
				</div>

				<!-- Focusable + scrollable so End / PageDown reach the bottom and clear the gate.
				     The scroll region legitimately needs tabindex for keyboard scrolling. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="reader"
					role="region"
					aria-label="{doc.title} — full text, scroll to the end to continue"
					tabindex="0"
					{@attach reviewScroll}
				>
					<div class="reader-inner">
						<p class="reader-meta">
							<span>{doc.source}</span>
							<span class="gok-tabular-nums">Issued {formatDate(doc.dateIso)}</span>
						</p>
						<p class="reader-summary">{doc.summary}</p>
						{#each clauses as clause (clause.heading)}
							<section class="clause">
								<h2 class="clause-heading gok-headline-6">{clause.heading}</h2>
								<p class="clause-body">{clause.body}</p>
							</section>
						{/each}
						<p class="reader-end">This is the end of the document.</p>
					</div>
				</div>

				<div class="step-foot">
					{#if !scrolled}
						<p id="review-hint" class="hint">Scroll to the end to continue.</p>
					{/if}
					<gok-button
						variant="secondary"
						aria-describedby={scrolled ? undefined : 'review-hint'}
						{@attach setProps({ disabled: !scrolled })}
						{@attach on('click', toConsent)}
					>
						Continue
					</gok-button>
				</div>
			</section>
		{:else}
			<!-- Step 2 · Consent — the legal acknowledgement + the single accent Sign button. -->
			<section class="step" aria-label="Agree and sign">
				<gok-alert status="info">This is a legally binding electronic signature.</gok-alert>

				<gok-checkbox
					{@attach setProps({ checked: consented, required: true })}
					{@attach on('change', onConsentChange)}
				>
					{consentText}
				</gok-checkbox>

				<div class="step-foot">
					{#if !canSign}
						<p id="sign-hint" class="hint">
							{#if !scrolled}
								I can sign once I've read the document to the end and agreed.
							{:else}
								Tick the box above to agree before I sign.
							{/if}
						</p>
					{/if}
					<div class="step-actions">
						<gok-button variant="secondary" {@attach on('click', backToReview)}>Back</gok-button>
						<gok-button
							variant="primary"
							aria-describedby={canSign ? undefined : 'sign-hint'}
							{@attach setProps({ disabled: !canSign })}
							{@attach on('click', openStepUp)}
						>
							Sign document
						</gok-button>
					</div>
				</div>
			</section>
		{/if}
	{/if}
</div>

<!-- Step-up re-auth: prove it's me before the signature is minted. -->
{#if doc}
	<StepUp
		open={stepUpOpen}
		title="Sign this document"
		consequence={`Confirming applies my legally binding electronic signature to ${doc.title}. This can't be undone.`}
		confirmLabel="Sign document"
		tone="danger"
		onConfirm={onStepUpConfirm}
		onCancel={onStepUpCancel}
	/>
{/if}

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

	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 46rem;
	}

	.progress {
		max-inline-size: 22rem;
	}

	/* The scrollable review region — focusable, with a visible focus ring. */
	.reader {
		max-block-size: 24rem;
		overflow-y: auto;
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
	}

	.reader:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.reader-inner {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.reader-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-300);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.reader-summary {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.clause {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.clause-heading {
		margin: 0;
		color: var(--gok-color-text);
	}

	.clause-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.reader-end {
		margin: 0;
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--gok-color-text-muted);
	}

	.step-foot {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.step-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.hint {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Signed panel --- */
	.signed {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-300);
		max-inline-size: 40rem;
		padding-block: var(--gok-space-500);
	}

	.signed-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.signed-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.signed-lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.ledger {
		inline-size: 100%;
		max-inline-size: 30rem;
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: var(--gok-space-200) 0 0;
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

	.ref {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	.signed-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
		margin-block-start: var(--gok-space-200);
	}

	/* --- Not found --- */
	.missing {
		padding-block: var(--gok-space-600);
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
</style>
