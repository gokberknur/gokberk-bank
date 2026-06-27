<script lang="ts">
	// The forced-decision confirm for "Sign out everywhere" — a gok-dialog
	// tone="danger" no-dismiss: no scrim/Escape dismissal, a plainly-named
	// consequence, and two deliberate choices. It is the final commit, opened
	// *behind* the step-up gate (the host opens StepUp first; on verify it opens
	// this). The confirm is outline/text in the status colour, never a solid red
	// fill — an app-local <button> so the rule holds without restyling the DS.
	import { setProps, on } from '$lib/wc.svelte';

	let {
		open,
		onConfirm,
		onCancel
	}: {
		open: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();
</script>

<gok-dialog
	tone="danger"
	size="s"
	heading="Sign out everywhere?"
	no-dismiss
	{@attach setProps({ open })}
	{@attach on('gok-cancel', onCancel)}
	{@attach on('gok-close', onCancel)}
>
	<p class="body">
		This signs out every other device — I'll stay signed in here. Anything signed in
		elsewhere will need to sign in again.
	</p>

	<div slot="footer" class="actions">
		<gok-button variant="secondary" {@attach on('click', onCancel)}>
			Stay signed in here
		</gok-button>
		<button type="button" class="danger-confirm" onclick={onConfirm}>
			Sign out everywhere
		</button>
	</div>
</gok-dialog>

<style>
	.body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	.danger-confirm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 2.5rem;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-400);
		border: var(--gok-border-width-strong) solid var(--gok-color-status-error);
		border-radius: var(--gok-radius-s);
		background: transparent;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		transition: background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.danger-confirm:hover {
		background: var(--gok-color-surface-strong);
	}

	.danger-confirm:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}
</style>
