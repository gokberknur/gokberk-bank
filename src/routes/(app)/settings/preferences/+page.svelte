<script lang="ts">
	// /settings/preferences — language, the display currency totals are shown in, and
	// interface density. Every save is optimistic: state updates immediately (and
	// persists itself) and a toast confirms. Custom elements are driven by `value` as
	// a property via setProps and read back from their composed `change` event — never
	// bind: on a gok-* element.
	import { prefs, LANGUAGES, DISPLAY_CURRENCIES } from '$lib/settings/prefs.svelte';
	import { density } from '$lib/state/density.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import SettingsHeader from '$lib/components/profile/SettingsHeader.svelte';

	function onLanguage(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		const lang = LANGUAGES.find((l) => l.id === value);
		if (!lang) return;
		prefs.setLanguage(lang.id);
		toast(`Language set to ${lang.label}`, { status: 'success' });
	}

	function onCurrency(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		const cur = DISPLAY_CURRENCIES.find((c) => c === value);
		if (!cur) return;
		prefs.setDisplayCurrency(cur);
		toast(`Totals now shown in ${cur}`, { status: 'success' });
	}

	function onDensity(e: Event) {
		const value = (e.target as HTMLElement & { value: string }).value;
		if (value === 'comfortable' || value === 'compact') density.set(value);
	}
</script>

<svelte:head>
	<title>Preferences · Settings · gökberk bank</title>
</svelte:head>

<div class="settings">
	<SettingsHeader
		heading="My preferences"
		intro="The language I read the app in, the currency I see my totals in, and how dense the interface feels."
	/>

	<gok-card>
		<div class="rows">
			<div class="setting">
				<div class="control">
					<gok-select
						class="control-field"
						label="Language"
						{@attach setProps({ value: prefs.language })}
						{@attach on('change', onLanguage)}
					>
						{#each LANGUAGES as lang (lang.id)}
							<gok-option value={lang.id}>{lang.label}</gok-option>
						{/each}
					</gok-select>
				</div>
				<p class="setting-note">
					I'll read the interface in this language. (A demo preference — it persists, but the copy
					stays in English.)
				</p>
			</div>

			<div class="setting">
				<div class="control">
					<gok-select
						class="control-field"
						label="Display currency"
						{@attach setProps({ value: prefs.displayCurrency })}
						{@attach on('change', onCurrency)}
					>
						{#each DISPLAY_CURRENCIES as cur (cur)}
							<gok-option value={cur}>{cur}</gok-option>
						{/each}
					</gok-select>
				</div>
				<p class="setting-note">The currency my balances and totals are converted to and shown in.</p>
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
					How tightly the interface is packed. Compact fits more on screen; the change applies
					everywhere at once.
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

	.control-field {
		inline-size: 100%;
		max-inline-size: 22rem;
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
