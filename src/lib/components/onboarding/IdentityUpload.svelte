<script lang="ts">
	// The (SIMULATED) document upload — dogfooding #6: no real file is ever read or
	// stored. "Choose file" and "Use camera" both just attach a deterministic mock
	// filename derived from the chosen ID type. The uploaded state shows the
	// filename with an accessible Remove, plus a quiet "Looks blurry? Retake" that
	// re-attaches (the camera fallback the WAI-ARIA upload pattern asks for). An
	// honest line says it's a demo and nothing real is kept.
	import { on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import type { IdType } from '$lib/onboarding/kyc';

	const FILE_NAMES: Record<IdType, string> = {
		passport: 'passport-photo.jpg',
		'national-id': 'national-id-photo.jpg',
		'driving-licence': 'driving-licence-photo.jpg'
	};

	const fileName = $derived(
		onboarding.data.idType ? FILE_NAMES[onboarding.data.idType] : 'id-photo.jpg'
	);
	const hasDocument = $derived(onboarding.data.documentName !== '');

	function choose() {
		onboarding.attachDocument(fileName);
	}
	function retake() {
		onboarding.attachDocument(fileName);
	}
	function remove() {
		onboarding.removeDocument();
	}
</script>

<section class="upload" aria-label="Upload my ID">
	<p class="caption">A clear photo of my ID, both sides if it's a card.</p>

	{#if hasDocument}
		<div class="file" aria-live="polite">
			<span class="file-glyph" aria-hidden="true">
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
			<span class="file-name">{onboarding.data.documentName}</span>
			<gok-tag size="s">Uploaded</gok-tag>
			<button type="button" class="file-remove" {@attach on('click', remove)}>
				Remove
				<span class="sr-only">{onboarding.data.documentName}</span>
			</button>
		</div>

		<p class="retake-line">
			Looks blurry?
			<button type="button" class="link-button" {@attach on('click', retake)}>Retake</button>
		</p>
	{:else}
		<div class="choices">
			<gok-button variant="secondary" {@attach on('click', choose)}>Choose file</gok-button>
			<gok-button variant="secondary" {@attach on('click', choose)}>Use camera</gok-button>
		</div>
	{/if}

	<p class="demo-note">
		This is a demo — no real document is read or stored. Choosing either option attaches a
		placeholder so I can see the rest of the flow.
	</p>
</section>

<style>
	.upload {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		max-inline-size: 36rem;
	}

	.caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	.file {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
	}

	.file-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		color: var(--gok-color-primary);
	}

	.file-name {
		flex: 1 1 auto;
		min-inline-size: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.file-remove,
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

	.file-remove:focus-visible,
	.link-button:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.retake-line {
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
