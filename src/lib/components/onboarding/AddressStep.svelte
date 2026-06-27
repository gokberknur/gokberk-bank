<script lang="ts">
	// Step 2 · "Where I live" — address lines, city, a country-aware postcode, and
	// tax residency. The postcode field shows the selected country's hint as helper
	// text. Like profile, the validator returns a field-map, so errors (PO-box on
	// line1, bad postcode) surface inline here. Writes through onboarding.patch.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { COUNTRIES, getCountry } from '$lib/onboarding/kyc';

	const fieldErrors = $derived<Record<string, string>>(
		onboarding.wizard.error && typeof onboarding.wizard.error === 'object'
			? onboarding.wizard.error
			: {}
	);

	// The postcode help follows the residency country chosen on the prior step.
	const postcodeHint = $derived(
		getCountry(onboarding.data.residency)?.postcodeHint ?? 'My postal or zip code'
	);

	function onLine1(event: Event) {
		onboarding.patch({ line1: (event.target as HTMLInputElement).value });
	}
	function onLine2(event: Event) {
		onboarding.patch({ line2: (event.target as HTMLInputElement).value });
	}
	function onCity(event: Event) {
		onboarding.patch({ city: (event.target as HTMLInputElement).value });
	}
	function onPostcode(event: Event) {
		onboarding.patch({ postcode: (event.target as HTMLInputElement).value });
	}
	function onTaxResidency(event: Event) {
		onboarding.patch({ taxResidency: (event.target as HTMLSelectElement).value });
	}
</script>

<form class="step" aria-label="Where I live" onsubmit={(e) => e.preventDefault()}>
	<gok-input
		label="Street address"
		placeholder="House number and street"
		autocomplete="address-line1"
		reserve-message
		{@attach setProps({ value: onboarding.data.line1, error: fieldErrors.line1 })}
		{@attach on('input', onLine1)}
		{@attach on('change', onLine1)}
	></gok-input>

	<gok-input
		label="Address line 2 (optional)"
		placeholder="Apartment, floor, etc."
		autocomplete="address-line2"
		{@attach setProps({ value: onboarding.data.line2 })}
		{@attach on('input', onLine2)}
		{@attach on('change', onLine2)}
	></gok-input>

	<gok-input
		label="City"
		autocomplete="address-level2"
		reserve-message
		{@attach setProps({ value: onboarding.data.city, error: fieldErrors.city })}
		{@attach on('input', onCity)}
		{@attach on('change', onCity)}
	></gok-input>

	<gok-input
		label="Postcode"
		autocomplete="postal-code"
		reserve-message
		{@attach setProps({
			value: onboarding.data.postcode,
			helper: postcodeHint,
			error: fieldErrors.postcode
		})}
		{@attach on('input', onPostcode)}
		{@attach on('change', onPostcode)}
	></gok-input>

	<gok-select
		label="Tax residency"
		placeholder="Choose a country"
		reserve-message
		{@attach setProps({ value: onboarding.data.taxResidency, error: fieldErrors.taxResidency })}
		{@attach on('change', onTaxResidency)}
	>
		{#each COUNTRIES as country (country.code)}
			<gok-option value={country.code}>{country.name}</gok-option>
		{/each}
	</gok-select>
</form>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}
</style>
