<script lang="ts">
	// /settings/appearance — theme (light/dark) and the density mirror. The theme
	// switch is the DS `gok-theme-switch`: it owns the shared `gok-theme` key and the
	// `data-theme` attribute itself, so I just render it with a label — no storage
	// wiring, and its visuals are left untouched. Density shares the same `density`
	// store as /settings/preferences, so the two segmented controls stay in lockstep.
	import { density } from '$lib/state/density.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import SettingsHeader from '$lib/components/profile/SettingsHeader.svelte';

	function onDensity(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		if (value === 'comfortable' || value === 'compact') density.set(value);
	}
</script>

<svelte:head>
	<title>Appearance · Settings · gökberk bank</title>
</svelte:head>

<div class="settings">
	<SettingsHeader
		heading="Appearance"
		intro="How the app looks to me — light or dark, comfortable or compact."
	/>

	<gok-card>
		<div class="rows">
			<div class="setting">
				<div class="control">
					<gok-theme-switch label="Theme"></gok-theme-switch>
				</div>
				<p class="setting-note">
					Light or dark. The whole app and the design-system components follow this one switch.
				</p>
			</div>

			<div class="setting">
				<div class="control">
					<gok-segmented
						label="Density"
						{@attach setProps({ value: density.current })}
						{@attach on('change', onDensity)}
					>
						<gok-segmented-item value="comfortable">Comfortable</gok-segmented-item>
						<gok-segmented-item value="compact">Compact</gok-segmented-item>
					</gok-segmented>
				</div>
				<p class="setting-note">
					The same density I set in my preferences — they stay in sync. In this demo these
					appearance choices are kept in local storage, so they apply across my devices.
				</p>
			</div>
		</div>
	</gok-card>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.rows {
		display: flex;
		flex-direction: column;
	}

	.setting {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-400);
	}

	.setting:first-child {
		padding-block-start: 0;
	}

	.setting:last-child {
		padding-block-end: 0;
	}

	.setting + .setting {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.control {
		display: flex;
	}

	.setting-note {
		margin: 0;
		max-inline-size: 42rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
