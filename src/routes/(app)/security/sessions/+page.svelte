<script lang="ts">
	// Active sessions — where my account is currently signed in. Signing out a single
	// session is low-stakes and reversible-feel, so it runs directly (optimistic
	// toast, no step-up). "Sign out everywhere" is consequential: it opens the
	// step-up gate first, and on verify the forced-decision SignOutAllDialog
	// (tone="danger" no-dismiss) makes the deliberate final choice before the mutation
	// runs. It only appears when I'm signed in somewhere other than here.
	import { security, type Session } from '$lib/state/security.svelte';
	import SessionList from '$lib/components/security/SessionList.svelte';
	import SignOutAllDialog from '$lib/components/security/SignOutAllDialog.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';

	const sessions = $derived(security.sessions);
	const hasOthers = $derived(security.hasOtherSessions);

	function signOutOne(session: Session) {
		security.signOutSession(session.id);
	}

	// Sign-out-all: step-up gate → forced-decision dialog → mutation.
	let stepUpOpen = $state(false);
	let forcedOpen = $state(false);

	function askSignOutAll() {
		stepUpOpen = true;
	}

	function stepUpConfirm() {
		stepUpOpen = false;
		forcedOpen = true;
	}

	function stepUpCancel() {
		stepUpOpen = false;
	}

	function forcedConfirm() {
		forcedOpen = false;
		security.signOutEverywhere();
	}

	function forcedCancel() {
		forcedOpen = false;
	}
</script>

<div class="area-head">
	<h2 class="area-title gok-headline-5">Active sessions</h2>
	<p class="area-sub">
		The places my account is signed in right now. I can sign out any single one, or all the
		others at once.
	</p>
</div>

{#if sessions.length === 0}
	<gok-empty-state>
		<p class="empty-title gok-headline-6">No active sessions</p>
		<p class="empty-body">Nothing is signed in right now.</p>
	</gok-empty-state>
{:else}
	<SessionList {sessions} onSignOut={signOutOne} />
{/if}

{#if hasOthers}
	<div class="all">
		<button type="button" class="danger-outline" onclick={askSignOutAll}>
			Sign out everywhere
		</button>
		<p class="all-note">Signs out every other device — I'll stay signed in here.</p>
	</div>
{/if}

<StepUp
	open={stepUpOpen}
	title="Sign out everywhere?"
	consequence="First, a quick check it's me — then I'll confirm signing out my other devices."
	confirmLabel="Continue"
	tone="danger"
	onConfirm={stepUpConfirm}
	onCancel={stepUpCancel}
/>

<SignOutAllDialog open={forcedOpen} onConfirm={forcedConfirm} onCancel={forcedCancel} />

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

	.all {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin-block-start: var(--gok-space-500);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* Page-level destructive action — outline/text in the status colour. */
	.danger-outline {
		align-self: flex-start;
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

	.danger-outline:hover {
		background: var(--gok-color-surface-strong);
	}

	.danger-outline:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.all-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
</style>
