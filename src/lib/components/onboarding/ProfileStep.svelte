<script lang="ts">
	// Step 1 · "About me" — name, date of birth, residency. Writes through
	// onboarding.patch on every input. Profile/address validators return a FIELD
	// MAP (not a step-level string), so the Wizard shell shows no alert for them —
	// this panel surfaces each field's error inline instead. DOB uses the DS
	// gok-date-picker (it renders its own label + reserved message line + error),
	// capped at today so a future birth date can't be picked. Interop is setProps/on
	// — never bind: on a gok-* host; the ISO value is read off the event detail.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { COUNTRIES } from '$lib/onboarding/kyc';
	import { TODAY, isoDate } from '$lib/data/time';

	// A date of birth can never be in the future — cap the picker at the fixed today.
	const maxDob = isoDate(TODAY);

	// The active step error is a field-map for this step; read it defensively.
	const fieldErrors = $derived<Record<string, string>>(
		onboarding.wizard.error && typeof onboarding.wizard.error === 'object'
			? onboarding.wizard.error
			: {}
	);

	function onName(event: Event) {
		onboarding.patch({ fullName: (event.target as HTMLInputElement).value });
	}

	function onDob(event: Event) {
		onboarding.patch({ dob: (event as CustomEvent<{ value: string }>).detail.value });
	}

	function onResidency(event: Event) {
		onboarding.patch({ residency: (event.target as HTMLSelectElement).value });
	}
</script>

<form class="step" aria-label="About me" onsubmit={(e) => e.preventDefault()}>
	<gok-input
		label="My full name"
		placeholder="As it appears on my ID"
		autocomplete="name"
		reserve-message
		{@attach setProps({ value: onboarding.data.fullName, error: fieldErrors.fullName })}
		{@attach on('input', onName)}
		{@attach on('change', onName)}
	></gok-input>

	<!-- DOB · gok-date-picker (owns its label, reserved message line, and error). -->
	<gok-date-picker
		label="My date of birth"
		max={maxDob}
		reserve-message
		{@attach setProps({ value: onboarding.data.dob, error: fieldErrors.dob })}
		{@attach on('input', onDob)}
		{@attach on('change', onDob)}
	></gok-date-picker>

	<gok-select
		label="Where I live"
		placeholder="Choose a country"
		reserve-message
		{@attach setProps({ value: onboarding.data.residency, error: fieldErrors.residency })}
		{@attach on('change', onResidency)}
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
