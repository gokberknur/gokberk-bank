<script lang="ts">
	// Step 4 · "Quick check" — a SIMULATED selfie/liveness check, then the OCR
	// review. Pressing "Start the check" shows a genuine PENDING beat (a Processing
	// tag + an info alert that I won't have to re-enter anything) for ~1.2s via
	// setTimeout — never a faked completion — before the deterministic
	// attemptLiveness() resolves. On pass we run the OCR and reveal OcrReview; the
	// step only passes when liveness passed AND the OCR is confirmed (the store's
	// validator enforces that). The happy path always passes; the exhausted branch
	// is a defensive help path.
	import { onDestroy } from 'svelte';
	import { on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import OcrReview from './OcrReview.svelte';

	const VERIFY_DWELL_MS = 1200;

	type Phase = 'idle' | 'verifying' | 'passed' | 'exhausted';
	// On (re)mount, a previously-passed check restores straight to the review.
	let phase = $state<Phase>(onboarding.data.livenessPassed ? 'passed' : 'idle');

	let timer: ReturnType<typeof setTimeout> | undefined;

	function startCheck() {
		phase = 'verifying';
		timer = setTimeout(() => {
			const result = onboarding.attemptLiveness();
			if (result.passed) {
				if (!onboarding.data.ocr) onboarding.runIdentityOcr();
				phase = 'passed';
			} else {
				// Defensive: the demo's liveness always passes, but if the attempt cap
				// were ever reached we route to a calm help path instead of a dead end.
				phase = result.exhausted ? 'exhausted' : 'idle';
			}
		}, VERIFY_DWELL_MS);
	}

	onDestroy(() => clearTimeout(timer));
</script>

<form class="step" aria-label="Quick check" onsubmit={(e) => e.preventDefault()}>
	{#if phase === 'idle'}
		<div class="intro">
			<p class="lead">
				A short selfie check confirms the ID is mine. Nothing is recorded — I just hold still for a
				moment.
			</p>
			<gok-button variant="primary" {@attach on('click', startCheck)}>Start the check</gok-button>
		</div>
	{:else if phase === 'verifying'}
		<div class="verifying" aria-live="polite">
			<gok-spinner size="l" accessible-label="Verifying my selfie check"></gok-spinner>
			<gok-tag size="m" dot>Processing</gok-tag>
			<gok-alert status="info">
				This usually takes under a minute — I won't have to re-enter anything.
			</gok-alert>
		</div>
	{:else if phase === 'exhausted'}
		<div class="help" aria-live="polite">
			<gok-alert status="warning">
				I couldn't complete the check after a few tries. My details are safe — my
				<gok-link href="/support">support team</gok-link> can finish this with me.
			</gok-alert>
			<gok-button variant="secondary" {@attach on('click', startCheck)}>Try again</gok-button>
		</div>
	{:else}
		<div class="passed">
			<p class="passed-line" aria-live="polite">
				<span class="passed-glyph" aria-hidden="true">
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
				That's me — the check passed.
			</p>
			<OcrReview />
		</div>
	{/if}
</form>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		align-items: flex-start;
		max-inline-size: 36rem;
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.verifying {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-600);
		text-align: center;
	}

	.verifying gok-alert {
		display: block;
		max-inline-size: 32rem;
	}

	.help {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--gok-space-400);
		max-inline-size: 36rem;
	}

	.help gok-alert {
		display: block;
	}

	.passed {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.passed-line {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.passed-glyph {
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
