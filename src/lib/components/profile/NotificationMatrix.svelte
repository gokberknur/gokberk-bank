<script lang="ts">
	// The notification matrix — a genuine table: rows are events (Money, Cards, …),
	// columns are channels (Push, Email, In-app), and each cell is a `gok-switch`
	// reflecting prefs.isOn(event, channel). Real row + column headers make it
	// screen-reader navigable; every switch carries an accessible label combining its
	// event and channel ("Money · Push"). Mandatory rows (Security) render their
	// switches on AND disabled — prefs.toggleNotif already no-ops them — with an inline
	// note. Switches are driven by `checked`/`disabled` as properties via setProps and
	// toggled from their composed `change` event; never bind: on a gok-* element.
	import {
		prefs,
		NOTIF_EVENTS,
		NOTIF_CHANNELS,
		isMandatory,
		type NotifEventId,
		type NotifChannelId
	} from '$lib/settings/prefs.svelte';
	import { setProps, on } from '$lib/wc.svelte';

	function toggle(event: NotifEventId, channel: NotifChannelId) {
		prefs.toggleNotif(event, channel);
	}
</script>

<table class="matrix" aria-label="Notification preferences by event and channel">
	<thead>
		<tr>
			<th scope="col" class="corner">Event</th>
			{#each NOTIF_CHANNELS as channel (channel.id)}
				<th scope="col" class="col-head">{channel.label}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each NOTIF_EVENTS as event (event.id)}
			{@const mandatory = isMandatory(event.id)}
			<tr>
				<th scope="row" class="row-head">
					<span class="row-label">{event.label}</span>
					<span class="row-note">{event.note}</span>
					{#if mandatory}
						<span class="row-mandatory">Always on — security alerts can't be muted.</span>
					{/if}
				</th>
				{#each NOTIF_CHANNELS as channel (channel.id)}
					<td class="cell">
						{#if mandatory}
							<gok-switch
								accessible-label="{event.label} · {channel.label}"
								{@attach setProps({ checked: true, disabled: true })}
							></gok-switch>
						{:else}
							<gok-switch
								accessible-label="{event.label} · {channel.label}"
								{@attach setProps({ checked: prefs.isOn(event.id, channel.id) })}
								{@attach on('change', () => toggle(event.id, channel.id))}
							></gok-switch>
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.matrix {
		inline-size: 100%;
		border-collapse: collapse;
		font-family: var(--gok-font-family-text);
	}

	.corner {
		text-align: start;
	}

	/* Header row: mono uppercase eyebrows over a hairline baseline. */
	.corner,
	.col-head {
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-eyebrow-size);
		line-height: var(--gok-type-eyebrow-line);
		letter-spacing: var(--gok-type-eyebrow-tracking);
		font-weight: var(--gok-font-weight-medium);
		text-transform: uppercase;
		color: var(--gok-color-text-muted);
	}

	.col-head {
		inline-size: 6.5rem;
		text-align: center;
	}

	/* Row header: the event, its description, and (when mandatory) the inline note. */
	.row-head {
		padding-block: var(--gok-space-400);
		padding-inline-end: var(--gok-space-400);
		text-align: start;
		vertical-align: baseline;
	}

	.row-label {
		display: block;
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.row-note {
		display: block;
		margin-block-start: var(--gok-space-100);
		max-inline-size: 32rem;
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text-muted);
	}

	.row-mandatory {
		display: block;
		margin-block-start: var(--gok-space-100);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-primary);
	}

	.cell {
		padding-block: var(--gok-space-400);
		padding-inline: var(--gok-space-300);
		text-align: center;
		vertical-align: top;
	}

	/* Hairline rule between event rows. */
	tbody tr + tr .row-head,
	tbody tr + tr .cell {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	@media (max-width: 32rem) {
		.col-head {
			inline-size: auto;
		}

		.corner,
		.col-head,
		.cell {
			padding-inline: var(--gok-space-200);
		}
	}
</style>
