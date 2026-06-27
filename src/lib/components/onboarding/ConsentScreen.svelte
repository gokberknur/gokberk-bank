<script lang="ts">
	// The KYC consent gate — shown FIRST inside the identity step, before any ID is
	// asked for. The what / why / how-long detail sits in a gok-accordion (plain,
	// honest legal copy), and a single REQUIRED checkbox records explicit consent.
	// Nothing is pre-ticked: the checkbox starts unchecked and stays the user's
	// decision. Once acknowledged, the identity step reveals the rest.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { CONSENT_SECTIONS, CONSENT_ACK } from '$lib/onboarding/kyc';

	function onConsent(event: Event) {
		const checked = (event.target as HTMLInputElement & { checked: boolean }).checked;
		onboarding.acknowledgeConsent(checked);
	}
</script>

<section class="consent" aria-label="Identity check consent">
	<p class="lead">
		Before I share any ID, here's exactly what's collected, why it's needed, and how long it's
		kept. Nothing is saved unless I choose to continue.
	</p>

	<gok-accordion>
		{#each CONSENT_SECTIONS as section (section.heading)}
			<gok-accordion-item>
				<span slot="summary">{section.heading}</span>
				<p class="body">{section.body}</p>
			</gok-accordion-item>
		{/each}
	</gok-accordion>

	<gok-checkbox
		class="ack"
		{@attach setProps({ checked: onboarding.data.consentAcked, required: true })}
		{@attach on('change', onConsent)}
	>
		{CONSENT_ACK}
	</gok-checkbox>
</section>

<style>
	.consent {
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

	.body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.ack {
		display: block;
	}
</style>
