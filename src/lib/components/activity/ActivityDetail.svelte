<script lang="ts">
	// The per-event detail drawer (deep-linked from /activity/[id]). The host
	// gok-drawer owns focus, the scrim, and Escape; we feed `open` as a property and
	// close on its gok-close / gok-cancel events, both routed back to /activity. The
	// body is the full event: type + status as rule + icon + text, the title/body,
	// the signed amount and an absolute timestamp, and the one earned accent — the
	// primary "View source" deep-link. When the id is unknown the drawer shows a
	// distinct not-found state instead.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import {
		ACTIVITY_TYPE_LABELS,
		type ActivityEvent,
		type ActivityStatus
	} from '$lib/state/feed.svelte';

	let {
		event,
		open,
		onclose,
		onsource
	}: {
		event: ActivityEvent | undefined;
		open: boolean;
		onclose: () => void;
		onsource: (route: string) => void;
	} = $props();

	const STATUS_META: Record<ActivityStatus, { mark: string; label: string }> = {
		ok: { mark: '✓', label: 'Done' },
		pending: { mark: '◷', label: 'Processing' },
		blocked: { mark: '⊘', label: 'Blocked' },
		info: { mark: '·', label: 'Info' }
	};

	const amount = $derived(
		event && event.amountMinor !== undefined && event.currency
			? formatMoney(event.amountMinor, event.currency, { signDisplay: true })
			: null
	);
	const when = $derived(event ? formatDate(event.timestamp) : '');
	const status = $derived(event ? STATUS_META[event.status] : null);
</script>

<gok-drawer
	placement="end"
	heading="Activity"
	{@attach setProps({ open })}
	{@attach on('gok-close', onclose)}
	{@attach on('gok-cancel', onclose)}
>
	{#if event && status}
		<div class="body">
			<div class="meta">
				<span class="type gok-eyebrow">{ACTIVITY_TYPE_LABELS[event.type]}</span>
				<span class="status" data-status={event.status}>
					<span class="status-rule" aria-hidden="true"></span>
					<span class="status-mark" aria-hidden="true">{status.mark}</span>
					<span>{status.label}</span>
				</span>
			</div>

			<h3 class="title gok-headline-5">{event.title}</h3>

			{#if amount}
				<p class="amount gok-tabular-nums">{amount}</p>
			{/if}

			<p class="text">{event.body}</p>

			<dl class="details">
				<div class="row">
					<dt>When</dt>
					<dd class="gok-tabular-nums">{when}</dd>
				</div>
			</dl>
		</div>
	{:else}
		<div class="body">
			<gok-empty-state>
				<p class="missing-title gok-headline-6">Event not found</p>
				<p class="missing-body">This activity item no longer exists, or the link is wrong.</p>
			</gok-empty-state>
		</div>
	{/if}

	<div slot="footer" class="footer">
		<gok-button variant="secondary" {@attach on('click', onclose)}>Close</gok-button>
		{#if event?.source}
			<gok-button variant="primary" {@attach on('click', () => onsource(event.source!.route))}>
				{event.source.label}
			</gok-button>
		{/if}
	</div>
</gok-drawer>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-300);
	}

	.type {
		color: var(--gok-color-text-muted);
	}

	/* Status as rule + icon + text — never colour alone. */
	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.status-rule {
		inline-size: var(--gok-border-width-strong);
		block-size: var(--gok-type-body-small-line);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-border-strong);
	}

	.status[data-status='ok'] .status-rule {
		background: var(--gok-color-status-success);
	}

	.status[data-status='pending'] .status-rule {
		background: var(--gok-color-status-warning);
	}

	.status[data-status='blocked'] .status-rule {
		background: var(--gok-color-status-error);
	}

	.status[data-status='info'] .status-rule {
		background: var(--gok-color-status-info);
	}

	.status-mark {
		font-family: var(--gok-font-family-mono);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.amount {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-4-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-4-line);
		color: var(--gok-color-text);
	}

	.text {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}
</style>
