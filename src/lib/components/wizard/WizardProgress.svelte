<script lang="ts">
	// Shared wizard progress indicator — the mono "Step k of N" eyebrow + a gok-progress
	// fraction, the same signal the Wizard composite renders in its header. Extracted so the
	// lending apply flows and the insurance quote — which run their own decision-gated step
	// machines rather than the createWizard store — show a CONSISTENT progress signal across
	// the app (LEND-U-03, INS-U-02). Composes gok-* + tokens only.
	import { setProps } from '$lib/wc.svelte';

	let {
		step,
		total,
		label
	}: {
		/** 1-based index of the current step. */
		step: number;
		/** Total number of steps. */
		total: number;
		/** The current step's title (labels the progress bar). */
		label: string;
	} = $props();
</script>

<div class="wiz-progress">
	<p class="gok-eyebrow wiz-eyebrow">Step {step} of {total}</p>
	<gok-progress format="fraction" {label} {@attach setProps({ value: step, max: total })}></gok-progress>
</div>

<style>
	.wiz-progress {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.wiz-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}
</style>
