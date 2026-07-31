<script lang="ts">
	// V10 · Recurring & savings plans — the manage list. My live plans through RecordList: a
	// real <gok-table> on desktop (custom cells via renderCell — a stacked plan/target cell
	// and a status badge) and stacked record-cards on mobile (each column's string `format`),
	// so nothing clips at 390px. A full-row click/tap opens the plan detail via onselect →
	// goto. Status reads as rule + glyph + word (badge variant + a leading gok-icon + the
	// label), never colour alone. rows is spread fresh each revision so a pause/resume/stop
	// re-renders the row (dogfooding #36). The header carries the commitment summary; when
	// there are no plans the caption falls away and the empty state carries the invitation.
	import { goto } from '$app/navigation';
	import { plans } from '$lib/invest/plans.svelte';
	import type { SavingsPlan, PlanStatus } from '$lib/invest/plans.svelte';
	import { instrumentOf } from '$lib/data/portfolio';
	import { formatMoney, formatDate } from '$lib/format';
	import RecordList from '$lib/components/layout/RecordList.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';

	// Narrow string unions for the gok-badge / gok-icon attributes (the package doesn't
	// re-export these from the root; we only need the literal values we set).
	type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';
	type IconName = 'circle-dot' | 'minus' | 'close';

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
		format?: (value: unknown, row: SavingsPlan) => string;
	};

	// weekly → "Weekly", monthly → "Monthly" (a plan never runs 'once').
	const CADENCE_LABEL: Record<SavingsPlan['cadence'], string> = {
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	// Status by rule + glyph + word: the badge edge-rule maps to a status role, a glyph
	// reinforces it, the label carries the meaning. Never colour alone.
	const STATUS_META: Record<PlanStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
		active: { label: 'Active', variant: 'info', icon: 'circle-dot' },
		paused: { label: 'Paused', variant: 'neutral', icon: 'minus' },
		ended: { label: 'Ended', variant: 'neutral', icon: 'close' }
	};

	/** What the plan buys: a basket shows its leg count; a single target shows its name. */
	function targetLabel(p: SavingsPlan): string {
		if (p.kind === 'basket') return `${p.legs.length} holdings`;
		return instrumentOf(p.symbol ?? '')?.name ?? p.symbol ?? '';
	}

	/** The Next-run cell: "Paused" while held, a dash when nothing's left, else the date. */
	function nextRunLabel(p: SavingsPlan): string {
		const status = plans.statusOf(p);
		if (status === 'paused') return 'Paused';
		if (status === 'ended') return '—';
		return formatDate(plans.nextRunIso(p));
	}

	// Every column carries a string `format` so the mobile record-card renders it as readable
	// text. Desktop uses renderCell for the two custom cells (stacked plan/target, status
	// badge); the formats below feed the card. The primary (plan) folds the target in so the
	// card title surfaces both name and target. The status format returns the plain status
	// word (the desktop keeps the glyph badge).
	const columns: Column[] = [
		{
			key: 'name',
			label: 'Plan',
			primary: true,
			sortable: true,
			format: (_v, row) => `${row.name} · ${targetLabel(row)}`
		},
		{
			key: 'amountMinor',
			label: 'Amount',
			numeric: true,
			width: '9rem',
			sortable: true,
			format: (_v, row) => formatMoney(row.amountMinor, row.currency)
		},
		{
			key: 'cadence',
			label: 'Cadence',
			width: '8rem',
			sortable: true,
			format: (_v, row) => CADENCE_LABEL[row.cadence]
		},
		{ key: 'nextRun', label: 'Next run', width: '10rem', format: (_v, row) => nextRunLabel(row) },
		{ key: 'status', label: 'Status', width: '9rem', format: (_v, row) => STATUS_META[plans.statusOf(row)].label }
	];

	const getRowId = (p: SavingsPlan) => p.id;

	// The Plan cell stacks the name over a muted target line (with a quiet "round-ups on" note
	// when the plan is round-up funded); the Status cell renders a rule + glyph + word badge.
	// Everything else falls back to the column's `format`.
	function renderCell(column: Column, row: SavingsPlan): Node | string {
		if (column.key === 'name') {
			const wrap = document.createElement('div');
			wrap.style.display = 'flex';
			wrap.style.flexDirection = 'column';
			wrap.style.gap = 'var(--gok-space-100)';
			const name = document.createElement('span');
			name.textContent = row.name;
			name.style.color = 'var(--gok-color-text)';
			const sub = document.createElement('span');
			sub.textContent = row.roundUpFunded ? `${targetLabel(row)} · round-ups on` : targetLabel(row);
			sub.style.color = 'var(--gok-color-text-muted)';
			sub.style.fontSize = 'var(--gok-type-body-small-size)';
			sub.style.lineHeight = 'var(--gok-type-body-small-line)';
			wrap.append(name, sub);
			return wrap;
		}
		if (column.key === 'status') {
			const meta = STATUS_META[plans.statusOf(row)];
			const badge = document.createElement('gok-badge');
			badge.setAttribute('variant', meta.variant);
			badge.setAttribute('size', 's');
			const icon = document.createElement('gok-icon');
			icon.setAttribute('name', meta.icon);
			icon.setAttribute('size', 's');
			icon.setAttribute('aria-hidden', 'true');
			icon.style.marginInlineEnd = 'var(--gok-space-100)';
			badge.append(icon, document.createTextNode(meta.label));
			return badge;
		}
		const raw = (row as unknown as Record<string, unknown>)[column.key];
		return column.format ? column.format(raw, row) : raw == null ? '' : String(raw);
	}

	// Active = the non-ended plans; the monthly-equivalent commitment across live plans.
	const active = $derived(plans.active());
	const monthly = $derived(plans.monthlyCommitmentMinor());

	// A fresh array per revision: the data layer patches a plan in place, so spreading gives
	// gok-table a new `rows` reference to detect — otherwise a pause/resume/stop wouldn't
	// re-render the row. (dogfooding #36)
	const rows = $derived([...active]);

	// The commitment summary rides under the title. With zero plans it's undefined, so the
	// header caption falls away and the empty state carries the invitation instead.
	const caption = $derived(
		active.length === 0
			? undefined
			: `${formatMoney(monthly, 'EUR')} a month across ${active.length} ${active.length === 1 ? 'plan' : 'plans'}`
	);
</script>

<svelte:head>
	<title>My plans · gökberk bank</title>
</svelte:head>

<div class="page-grid">
	<PageHeader eyebrow="Plans" title="My plans" {caption}>
		{#snippet actions()}
			<gok-link href="/invest/plans/new">
				<gok-button variant="primary">Start a plan</gok-button>
			</gok-link>
		{/snippet}
	</PageHeader>

	<RecordList
		{columns}
		{rows}
		{getRowId}
		{renderCell}
		selectionMode="none"
		onselect={(row) => goto(`/invest/plans/${row.id}`)}
		accessibleLabel="My savings plans"
	>
		{#snippet empty()}
			<div class="empty">
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No plans yet</p>
					<p class="empty-body">
						Automate a habit — invest a set amount on a schedule. I can pause or stop anytime.
					</p>
					<gok-link slot="actions" href="/invest/plans/new">
						<gok-button variant="primary">Start a plan</gok-button>
					</gok-link>
				</gok-empty-state>
			</div>
		{/snippet}
	</RecordList>
</div>

<style>
	.page-grid {
		row-gap: var(--gok-space-section);
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
		max-inline-size: 40ch;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
</style>
