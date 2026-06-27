<script lang="ts">
	// Step 1 · "About me" — name, date of birth, residency. Writes through
	// onboarding.patch on every input. Profile/address validators return a FIELD
	// MAP (not a step-level string), so the Wizard shell shows no alert for them —
	// this panel surfaces each field's error inline instead. DOB has no DS date
	// control (dogfooding #3), so it's a native <input type="date"> tokened to
	// rhyme with gok-input. Interop is setProps/on; the native date input is
	// app-local so a plain value/oninput is fine.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { COUNTRIES } from '$lib/onboarding/kyc';

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
		onboarding.patch({ dob: (event.currentTarget as HTMLInputElement).value });
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

	<!-- DOB · native date input, tokened to match gok-input (dogfooding #3). -->
	<div class="date-field">
		<label class="date-label" for="dob">My date of birth</label>
		<input
			id="dob"
			class="date-input"
			class:is-invalid={Boolean(fieldErrors.dob)}
			type="date"
			value={onboarding.data.dob}
			aria-describedby="dob-message"
			aria-invalid={fieldErrors.dob ? 'true' : undefined}
			oninput={onDob}
		/>
		<!-- Reserved message line: always present so an error never shifts the row. -->
		<p id="dob-message" class="date-message" role={fieldErrors.dob ? 'alert' : undefined}>
			{fieldErrors.dob ?? ''}
		</p>
	</div>

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

	/* --- Native date field, tokened to rhyme with gok-input --- */
	.date-field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.date-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.date-input {
		inline-size: 100%;
		padding-inline: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
	}

	.date-input::-webkit-calendar-picker-indicator {
		cursor: pointer;
	}

	.date-input:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-color: var(--gok-color-primary);
	}

	.date-input.is-invalid {
		border-color: var(--gok-color-status-error);
	}

	.date-message {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}
</style>
