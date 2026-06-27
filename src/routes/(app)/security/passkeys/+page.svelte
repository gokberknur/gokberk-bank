<script lang="ts">
	// Passkeys — the credentials I sign in with. Adding one (a simulated WebAuthn
	// registration) and removing one both pass through the step-up gate. Adding is
	// not destructive (the confirm is the one earned primary); removing is, so its
	// step-up is danger-toned. When a passkey is my last remaining factor the remove
	// affordances disable and an info alert explains why — I can never lock myself
	// out. The mutations run on the step-up's confirm.
	import { security, type Passkey } from '$lib/state/security.svelte';
	import { on } from '$lib/wc.svelte';
	import PasskeyList from '$lib/components/security/PasskeyList.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	const passkeys = $derived(security.passkeys);
	const lastFactor = $derived(security.isLastFactor);

	let su = $state<{
		open: boolean;
		title: string;
		consequence: string;
		confirmLabel: string;
		tone: 'default' | 'danger';
	}>({ open: false, title: '', consequence: '', confirmLabel: '', tone: 'default' });
	let pending: (() => void) | null = null;

	function askAdd() {
		su = {
			open: true,
			title: 'Add a passkey?',
			consequence: 'This registers a new passkey on this device so I can sign in with it.',
			confirmLabel: 'Add passkey',
			tone: 'default'
		};
		pending = () => security.addPasskey('New device — passkey');
	}

	function askRemove(passkey: Passkey) {
		su = {
			open: true,
			title: `Remove ${passkey.name}?`,
			consequence: `This removes the ${passkey.name} passkey — I won't be able to sign in with it again.`,
			confirmLabel: 'Remove passkey',
			tone: 'danger'
		};
		pending = () => security.removePasskey(passkey.id);
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
	<h2 class="area-title gok-headline-5">Passkeys</h2>
	<p class="area-sub">
		Passkeys let me sign in with Face ID or Touch ID instead of a password — phishing-resistant by
		design.
	</p>
</div>

{#if lastFactor}
	<gok-alert status="info" open>
		<span slot="title">This is my only way to sign in</span>
		I can't remove my last passkey while it's the only thing that signs me in. To remove it, I'll
		add another passkey or turn on two-factor first.
	</gok-alert>
{/if}

<div class="add">
	<gok-button variant="primary" {@attach on('click', askAdd)}>Add a passkey</gok-button>
</div>

{#if passkeys.length === 0}
	<gok-empty-state>
		<p class="empty-title gok-headline-6">No passkeys yet</p>
		<p class="empty-body">Add one to sign in with Face ID or Touch ID.</p>
	</gok-empty-state>
{:else}
	<PasskeyList {passkeys} {lastFactor} onRemove={askRemove} />
{/if}

<StepUp
	open={su.open}
	title={su.title}
	consequence={su.consequence}
	confirmLabel={su.confirmLabel}
	tone={su.tone}
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

	.add {
		margin-block-end: var(--gok-space-400);
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
