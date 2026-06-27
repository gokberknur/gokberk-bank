<script lang="ts">
	// One event in the feed — a full-width row button. Anatomy: a leading type
	// glyph (reusing the nav icon set), a 2px inline-start status rule keyed to
	// `status`, the sentence-case title + a muted body, and a right-aligned cluster
	// of the signed amount over a relative time. Status is never colour-alone: the
	// rule is paired with a text marker (visible for pending/blocked, and always
	// folded into the row's accessible name). Unread rows carry a quiet ink dot and
	// a bolder title — state-driven, not hue. The accent is not spent here; it is
	// reserved for the drawer's primary action (X02 brand note).
	import type {
		ActivityEvent,
		ActivityType,
		ActivityStatus
	} from '$lib/state/feed.svelte';
	import { ACTIVITY_TYPE_LABELS } from '$lib/state/feed.svelte';
	import { formatMoney, formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';
	import NavIcon from '$lib/components/shell/NavIcon.svelte';

	let { event, onopen }: { event: ActivityEvent; onopen: (id: string) => void } = $props();

	// Type → leading glyph (nav icon keys, reused where they read true).
	const TYPE_ICON: Record<ActivityType, string> = {
		money: 'transfer',
		cards: 'card',
		security: 'support',
		applications: 'documents',
		market: 'invest',
		system: 'bell'
	};

	// Status as a mark + word, so the inline-start rule is never colour-alone.
	const STATUS_META: Record<ActivityStatus, { mark: string; label: string }> = {
		ok: { mark: '✓', label: 'Done' },
		pending: { mark: '◷', label: 'Processing' },
		blocked: { mark: '⊘', label: 'Blocked' },
		info: { mark: '·', label: 'Info' }
	};

	const amount = $derived(
		event.amountMinor !== undefined && event.currency
			? formatMoney(event.amountMinor, event.currency, { signDisplay: true })
			: null
	);
	const when = $derived(formatRelative(event.timestamp, TODAY));
	const status = $derived(STATUS_META[event.status]);

	// The whole row's accessible name — type, title, amount, time, read state.
	// Status text rides along so the rule is never the sole status cue.
	const label = $derived(
		[
			ACTIVITY_TYPE_LABELS[event.type],
			event.title,
			amount ?? '',
			when,
			event.status === 'ok' ? '' : status.label,
			event.read ? '' : 'Unread'
		]
			.filter(Boolean)
			.join(', ')
	);
</script>

<button
	type="button"
	class="row"
	data-status={event.status}
	data-unread={!event.read}
	aria-label={label}
	onclick={() => onopen(event.id)}
>
	<span class="rule" aria-hidden="true"></span>

	<span class="mark" aria-hidden="true">
		{#if !event.read}
			<span class="unread-dot"></span>
		{/if}
	</span>

	<span class="glyph" aria-hidden="true">
		<NavIcon name={TYPE_ICON[event.type]} />
	</span>

	<span class="text">
		<span class="title">{event.title}</span>
		<span class="body">{event.body}</span>
		{#if event.status === 'pending'}
			<gok-tag size="s">Processing</gok-tag>
		{:else if event.status === 'blocked'}
			<span class="status-flag">
				<span class="status-mark" aria-hidden="true">{status.mark}</span>
				{status.label}
			</span>
		{/if}
	</span>

	<span class="cluster">
		{#if amount}
			<span class="amount gok-tabular-nums">{amount}</span>
		{/if}
		<span class="time gok-tabular-nums">{when}</span>
	</span>
</button>

<style>
	.row {
		display: grid;
		grid-template-columns: auto auto auto 1fr auto;
		align-items: start;
		gap: var(--gok-space-200);
		inline-size: 100%;
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-100) 0;
		border: 0;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: transparent;
		text-align: start;
		font-family: var(--gok-font-family-text);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.row:hover {
		background: var(--gok-color-surface);
	}

	.row:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-focus-ring);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	/* The 2px inline-start status rule — colour keyed to status, paired with the
	   marks/words above so it is never the only status cue. */
	.rule {
		align-self: stretch;
		inline-size: var(--gok-border-width-strong);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-border-strong);
	}

	.row[data-status='ok'] .rule {
		background: var(--gok-color-status-success);
	}

	.row[data-status='pending'] .rule {
		background: var(--gok-color-status-warning);
	}

	.row[data-status='blocked'] .rule {
		background: var(--gok-color-status-error);
	}

	.row[data-status='info'] .rule {
		background: var(--gok-color-status-info);
	}

	/* Unread mark — an ink dot (state, not hue), paired with a bolder title. */
	.mark {
		display: flex;
		justify-content: center;
		inline-size: var(--gok-space-200);
		padding-block-start: var(--gok-space-100);
	}

	.unread-dot {
		inline-size: var(--gok-space-200);
		block-size: var(--gok-space-200);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-text);
	}

	.glyph {
		display: flex;
		color: var(--gok-color-text-muted);
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.title {
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text);
	}

	.row[data-unread='true'] .title {
		font-weight: var(--gok-font-weight-semibold);
	}

	.body {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.status-flag {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		margin-block-start: var(--gok-space-100);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	.status-mark {
		font-family: var(--gok-font-family-mono);
	}

	.cluster {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		text-align: end;
	}

	.amount {
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
		white-space: nowrap;
	}

	.time {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		white-space: nowrap;
	}
</style>
