<script lang="ts">
	// Trusted devices — the devices signed into my account, each revocable behind
	// step-up. Revoking only signals intent here; the StepUp gate runs the mutation
	// on confirm. Revoking the current device "signs me out" (a toast in the demo, no
	// real navigation). The action's copy names the consequence plainly and calmly.
	import { security, type Device } from '$lib/state/security.svelte';
	import DeviceList from '$lib/components/security/DeviceList.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	const devices = $derived(security.devices);

	// One step-up gate for the page; `pending` holds the mutation to run on confirm.
	let su = $state<{
		open: boolean;
		title: string;
		consequence: string;
		confirmLabel: string;
	}>({ open: false, title: '', consequence: '', confirmLabel: '' });
	let pending: (() => void) | null = null;

	function askRevoke(device: Device) {
		su = {
			open: true,
			title: `Revoke ${device.name}?`,
			consequence: device.current
				? `This signs ${device.name} — the device I'm on now — out of my account.`
				: `This signs ${device.name} out of my account.`,
			confirmLabel: 'Revoke device'
		};
		pending = () => security.revokeDevice(device.id);
	}

	function confirmStepUp() {
		su = { ...su, open: false };
		pending?.();
		pending = null;
	}

	function cancelStepUp() {
		su = { ...su, open: false };
		pending = null;
	}
</script>

<div class="area-head">
	<h2 class="area-title gok-headline-5">Trusted devices</h2>
	<p class="area-sub">
		Every device signed into my account. I can revoke any I don't recognise.
	</p>
</div>

{#if devices.length === 0}
	<gok-empty-state>
		<p class="empty-title gok-headline-6">No trusted devices</p>
		<p class="empty-body">Nothing is signed in right now.</p>
	</gok-empty-state>
{:else}
	<DeviceList {devices} onRevoke={askRevoke} />
{/if}

<StepUp
	open={su.open}
	title={su.title}
	consequence={su.consequence}
	confirmLabel={su.confirmLabel}
	tone="danger"
	onConfirm={confirmStepUp}
	onCancel={cancelStepUp}
/>

<style>
	.area-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin-block-end: var(--gok-space-400);
	}

	.area-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.area-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		color: var(--gok-color-text-muted);
	}
</style>
