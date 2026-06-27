<script lang="ts">
	// Step 3 · "Prove it's me" — consent FIRST, then (only once acknowledged) the ID
	// type picker + the simulated upload. The step's validator is step-level
	// (string), so the Wizard shell shows its alert if the user tries to continue
	// before consenting / choosing an ID / uploading. Progressive reveal keeps the
	// ask honest: nothing about documents appears until consent is given.
	import { setProps, on } from '$lib/wc.svelte';
	import { onboarding } from '$lib/onboarding/onboarding.svelte';
	import { ID_TYPES, type IdType } from '$lib/onboarding/kyc';
	import ConsentScreen from './ConsentScreen.svelte';
	import IdentityUpload from './IdentityUpload.svelte';

	function onIdType(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value as IdType;
		onboarding.patch({ idType: value });
	}
</script>

<form class="step" aria-label="Prove it's me" onsubmit={(e) => e.preventDefault()}>
	<ConsentScreen />

	{#if onboarding.data.consentAcked}
		<div class="reveal">
			<gok-segmented
				label="Which ID am I using?"
				{@attach setProps({ value: onboarding.data.idType })}
				{@attach on('change', onIdType)}
			>
				{#each ID_TYPES as type (type.value)}
					<gok-segmented-item value={type.value}>{type.label}</gok-segmented-item>
				{/each}
			</gok-segmented>

			{#if onboarding.data.idType}
				<IdentityUpload />
			{/if}
		</div>
	{/if}
</form>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.reveal {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}
</style>
