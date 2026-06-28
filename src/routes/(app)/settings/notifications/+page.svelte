<script lang="ts">
	// /settings/notifications — the event × channel matrix. The header carries the
	// shared settings eyebrow + heading + a one-line intro; the matrix itself is a
	// genuine table (NotificationMatrix) with real row and column headers.
	import SettingsHeader from '$lib/components/profile/SettingsHeader.svelte';
	import NotificationMatrix from '$lib/components/profile/NotificationMatrix.svelte';
</script>

<svelte:head>
	<title>Notifications · Settings · gökberk bank</title>
</svelte:head>

<div class="settings">
	<SettingsHeader heading="Notifications" intro="Choose exactly what reaches me, and where." />

	<gok-card>
		<NotificationMatrix />
	</gok-card>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}
</style>
