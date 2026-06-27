<script lang="ts">
	// The trusted-devices list — one gok-card per device with its name, platform,
	// location and last-seen, a "This device" tag on the current one, and a Revoke
	// action rendered as text in the status colour (never a solid red fill). The
	// component only signals intent: it calls `onRevoke(device)` and the page opens
	// the step-up gate before anything mutates.
	import { formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';
	import type { Device } from '$lib/state/security.svelte';

	let {
		devices,
		onRevoke
	}: {
		devices: Device[];
		onRevoke: (device: Device) => void;
	} = $props();
</script>

<ul class="list">
	{#each devices as device (device.id)}
		<li>
			<gok-card>
				<div class="row">
					<div class="info">
						<div class="title-line">
							<span class="name">{device.name}</span>
							{#if device.current}
								<gok-tag size="s">This device</gok-tag>
							{/if}
						</div>
						<p class="meta">
							{device.platform} · {device.location}
						</p>
						<p class="seen gok-tabular-nums">
							Last seen {formatRelative(device.lastSeen, TODAY)}
						</p>
					</div>

					<button type="button" class="danger-link" onclick={() => onRevoke(device)}>
						Revoke
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

	.seen {
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

	.danger-link:hover {
		text-decoration: none;
	}

	.danger-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-status-error);
		outline-offset: var(--gok-focus-ring-offset);
	}

	@media (max-width: 24.375rem) {
		.row {
			gap: var(--gok-space-300);
		}
	}
</style>
