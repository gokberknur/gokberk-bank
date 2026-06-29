<script lang="ts">
	// The OCR review ledger — the fields "read" from the document, shown for
	// confirmation in a gok-card. Four are EDITABLE (a mismatch routes to an edit
	// via editOcr); nationality is fixed. Any edit reopens the confirmation
	// (editOcr clears ocrConfirmed), so "These details are correct" must be pressed
	// again. The verify step only passes when liveness passed AND this is confirmed.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';

	const ocr = $derived(onboarding.data.ocr);
	const confirmed = $derived(onboarding.data.ocrConfirmed);

	function onFullName(event: Event) {
		onboarding.editOcr({ fullName: (event.target as HTMLInputElement).value });
	}
	function onDob(event: Event) {
		onboarding.editOcr({ dob: (event.target as HTMLInputElement).value });
	}
	function onDocumentNumber(event: Event) {
		onboarding.editOcr({ documentNumber: (event.target as HTMLInputElement).value });
	}
	function onExpiry(event: Event) {
		onboarding.editOcr({ expiry: (event.target as HTMLInputElement).value });
	}
	function confirm() {
		onboarding.confirmOcr();
	}
</script>

{#if ocr}
	<section class="review" aria-label="Review my details">
		<p class="lead">I read these from my document. If anything's off, I can fix it here.</p>

		<gok-card variant="outlined" class="ledger-card">
			<p slot="header" class="card-eyebrow gok-eyebrow">From my ID</p>

			<div class="fields">
				<gok-input
					label="Name"
					{@attach setProps({ value: ocr.fullName })}
					{@attach on('change', onFullName)}
				></gok-input>

				<gok-input
					label="Date of birth"
					{@attach setProps({ value: ocr.dob })}
					{@attach on('change', onDob)}
				></gok-input>

				<gok-input
					label="Document number"
					{@attach setProps({ value: ocr.documentNumber })}
					{@attach on('change', onDocumentNumber)}
				></gok-input>

				<gok-input
					label="Expiry"
					{@attach setProps({ value: ocr.expiry })}
					{@attach on('change', onExpiry)}
				></gok-input>

				<div class="fixed-field">
					<span class="fixed-label">Nationality</span>
					<span class="fixed-value">{ocr.nationality}</span>
				</div>
			</div>
		</gok-card>

		{#if confirmed}
			<p class="confirmed" aria-live="polite">
				<span class="confirmed-glyph" aria-hidden="true">
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
				My details are confirmed.
			</p>
		{:else}
			<gok-button variant="primary" {@attach on('click', confirm)}>
				These details are correct
			</gok-button>
		{/if}
	</section>
{/if}

<style>
	.review {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 36rem;
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.ledger-card {
		display: block;
	}

	.card-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.fixed-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		padding-block-start: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.fixed-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.fixed-value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirmed {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirmed-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
		color: var(--gok-color-primary);
	}
</style>
