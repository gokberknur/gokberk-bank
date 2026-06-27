<script lang="ts">
	// Security activity — the log every action on the other surfaces writes to,
	// shown as one gok-table (columns/rows handed in as DOM properties via setProps).
	// Cells are formatted STRINGS only (dogfooding #11), so the Result column reads as
	// rule + icon + text inside the string ("✓ OK" / "⊘ Blocked" / "· Info"), never
	// colour-alone. When + Event sort (the table owns sorting); a chip row filters by
	// event type. Newest-first as the data layer returns it.
	import {
		security,
		type SecurityEventType,
		type SecurityResult
	} from '$lib/state/security.svelte';
	import { EVENT_TYPE_LABELS } from '$lib/data/security-data';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';

	// Result as rule + icon + text — never colour alone (cells are strings only).
	const RESULT_LABEL: Record<SecurityResult, string> = {
		ok: '✓ OK',
		blocked: '⊘ Blocked',
		info: '· Info'
	};

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown) => string;
	};

	const columns: Column[] = [
		{
			key: 'at',
			label: 'When',
			sortable: true,
			width: '9rem',
			format: (v) => formatRelative(v as string, TODAY)
		},
		{
			key: 'type',
			label: 'Event',
			sortable: true,
			width: '11rem',
			format: (v) => EVENT_TYPE_LABELS[v as SecurityEventType]
		},
		{ key: 'detail', label: 'Detail', primary: true },
		{ key: 'device', label: 'Device', width: '10rem' },
		{ key: 'location', label: 'Location', width: '8rem' },
		{ key: 'result', label: 'Result', width: '8rem', format: (v) => RESULT_LABEL[v as SecurityResult] }
	];

	const getRowId = (e: { id: string }) => e.id;

	// Filter by event type — chips over the table.
	let typeFilter = $state<SecurityEventType | 'all'>('all');

	const presentTypes = $derived(
		[...new Set(security.log.map((e) => e.type))] as SecurityEventType[]
	);

	const rows = $derived(
		typeFilter === 'all' ? security.log : security.log.filter((e) => e.type === typeFilter)
	);
</script>

<div class="area-head">
	<h2 class="area-title gok-headline-5">Security activity</h2>
	<p class="area-sub">
		Sign-ins, step-ups and changes to my security — newest first. I review this to spot anything I
		don't recognise.
	</p>
</div>

<div class="chips" role="group" aria-label="Filter by event type">
	<gok-button
		variant={typeFilter === 'all' ? 'primary' : 'secondary'}
		size="s"
		aria-pressed={typeFilter === 'all'}
		{@attach on('click', () => (typeFilter = 'all'))}
	>
		All
	</gok-button>
	{#each presentTypes as type (type)}
		<gok-button
			variant={typeFilter === type ? 'primary' : 'secondary'}
			size="s"
			aria-pressed={typeFilter === type}
			{@attach on('click', () => (typeFilter = type))}
		>
			{EVENT_TYPE_LABELS[type]}
		</gok-button>
	{/each}
</div>

<gok-table
	accessible-label="Security activity"
	{@attach setProps({ columns, rows, getRowId })}
>
	<div slot="empty" class="empty">
		<gok-empty-state>
			<p class="empty-title gok-headline-6">Nothing to show</p>
			<p class="empty-body">
				No security events match this filter. Choose “All” to see the full log.
			</p>
		</gok-empty-state>
	</div>
</gok-table>

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
		max-inline-size: 42rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
		margin-block-end: var(--gok-space-400);
	}

	.empty {
		padding-block: var(--gok-space-500);
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
