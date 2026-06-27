<script lang="ts">
	// The passkeys list — one gok-card per passkey with its name, added date and
	// last-used time, and a Remove action rendered as text in the status colour. When
	// I'm down to my last factor the remove affordances are disabled (the page shows
	// the reason in a gok-alert) so I can never lock myself out. Remove only signals
	// intent — `onRemove(passkey)` opens the step-up gate on the page.
	import { formatDate, formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';
	import type { Passkey } from '$lib/state/security.svelte';

	let {
		passkeys,
		lastFactor,
		onRemove
	}: {
		passkeys: Passkey[];
		/** When true, removing any passkey would lock me out — disable Remove. */
		lastFactor: boolean;
		onRemove: (passkey: Passkey) => void;
	} = $props();
</script>

<ul class="list">
	{#each passkeys as passkey (passkey.id)}
		<li>
			<gok-card>
				<div class="row">
					<div class="info">
						<span class="name">{passkey.name}</span>
						<p class="meta gok-tabular-nums">
							Added {formatDate(passkey.createdAt)}
						</p>
						<p class="meta gok-tabular-nums">
							Last used {formatRelative(passkey.lastUsed, TODAY)}
						</p>
					</div>

					<button
						type="button"
						class="danger-link"
						disabled={lastFactor}
						onclick={() => onRemove(passkey)}
					>
						Remove
					</button>
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

	/* Destructive action — text in the status colour, not a solid red fill. */
	.danger-link {
		flex: none;
		padding: var(--gok-space-100) var(--gok-space-200);
		border: none;
		background: transparent;
		border-radius: var(--gok-radius-s);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-status-error);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.danger-link:hover:not(:disabled) {
		text-decoration: none;
	}

	.danger-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	.danger-link:disabled {
		color: var(--gok-color-text-disabled);
		cursor: not-allowed;
		text-decoration: none;
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-300);
		}
	}
</style>
