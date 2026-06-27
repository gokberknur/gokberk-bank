<script lang="ts">
	// The active-sessions list — one row per session with its device, location and
	// start time, a "This session" tag on the current one. Signing out a single
	// session is a low-stakes, reversible-feel action (optimistic toast, no step-up
	// — a CPO call), so the row calls `onSignOut(session)` directly. The current
	// session has no sign-out affordance: "Sign out everywhere" (page-level, behind
	// step-up + a forced-decision dialog) covers leaving here.
	import { on } from '$lib/wc.svelte';
	import { formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';
	import type { Session } from '$lib/state/security.svelte';

	let {
		sessions,
		onSignOut
	}: {
		sessions: Session[];
		onSignOut: (session: Session) => void;
	} = $props();
</script>

<ul class="list">
	{#each sessions as session (session.id)}
		<li>
			<gok-card>
				<div class="row">
					<div class="info">
						<div class="title-line">
							<span class="name">{session.device}</span>
							{#if session.current}
								<gok-tag size="s">This session</gok-tag>
							{/if}
						</div>
						<p class="meta">{session.location}</p>
						<p class="started gok-tabular-nums">
							Started {formatRelative(session.startedAt, TODAY)}
						</p>
					</div>

					{#if !session.current}
						<gok-button
							variant="secondary"
							size="s"
							{@attach on('click', () => onSignOut(session))}
						>
							Sign out
						</gok-button>
					{/if}
				</div>
			</gok-card>
		</li>
	{/each}
</ul>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.title-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.meta {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.started {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-300);
		}
	}
</style>
