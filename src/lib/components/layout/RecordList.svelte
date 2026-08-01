<script lang="ts" generics="T = Record<string, unknown>">
	// A responsive data-table composite that fixes the app's #1 UI finding: on
	// mobile, gok-table clips its rightmost (decision) columns behind a horizontal
	// scroll. RecordList renders the real <gok-table> at >=40rem — keeping its
	// sort/paginate/select engine untouched — and swaps to stacked record-cards
	// below 40rem, where nothing is clipped and there is no h-scroll. It takes the
	// same columns/rows shape as gok-table, so screens opt in with a near-drop-in
	// swap. columns/rows/getRowId/selection go to the element as DOM **properties**
	// via setProps (objects/arrays can't survive attribute stringification), and
	// the hyphenated gok-selection-change event is wired with the on(...) attach.
	import type { Snippet } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { mobile } from '$lib/breakpoints';

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: T) => string;
	};

	let {
		columns,
		rows,
		getRowId,
		selectionMode = 'single',
		selectedId = null,
		onselect,
		onsort,
		renderCell,
		paginated = false,
		pageSize = 25,
		accessibleLabel,
		alwaysRows = false,
		caption,
		empty
	}: {
		columns: Column[];
		rows: T[];
		getRowId: (row: T) => string;
		selectionMode?: 'single' | 'none';
		selectedId?: string | null;
		/** Optional. When provided, rows are interactive (a full-row click/tap opens the record via
		 * onselect). When omitted, the list is display-only: mobile rows render as inert cards, and the
		 * desktop table drops selection/row-activate wiring and runs selection-mode="none". */
		onselect?: (row: T) => void;
		/** Forwarded from gok-table's own gok-sort event; null when sorting is cleared. RecordList stays generic and does not interpret it. */
		onsort?: (sort: { key: string; direction: 'asc' | 'desc' } | null) => void;
		/** Optional per-cell renderer, forwarded verbatim to the desktop <gok-table> for custom cells
		 * (status badges, stacked name+ref cells, date title fallbacks). Signature mirrors gok-table's
		 * own `renderCell`. It is deliberately NOT used on mobile: the record-card renders each column
		 * via its string `format` instead, so cells stay readable text and nothing clips. */
		renderCell?: (column: Column, row: T) => Node | string;
		paginated?: boolean;
		pageSize?: number;
		accessibleLabel: string;
		/** Render the stacked record-rows at every width (opt out of gok-table) — for screens that want full-row click-to-open instead of a sortable table. */
		alwaysRows?: boolean;
		/** Slotted caption/eyebrow block (rendered above both table and card list). */
		caption?: Snippet;
		/** Slotted empty state (rendered when rows is empty). */
		empty?: Snippet;
	} = $props();

	// Column roles, derived once from the columns shape.
	const primaryCol = $derived(columns.find((c) => c.primary));
	const numericCols = $derived(columns.filter((c) => c.numeric));
	const metaCols = $derived(columns.filter((c) => !c.primary && !c.numeric));

	function fmt(col: Column, row: T): string {
		return col.format
			? col.format((row as Record<string, unknown>)[col.key], row)
			: String((row as Record<string, unknown>)[col.key]);
	}

	// The mobile card's accessible name — every column's label + value, so no
	// column is lost to the reader even though the card only surfaces some visually.
	function recordLabel(row: T): string {
		return columns.map((c) => `${c.label} ${fmt(c, row)}`).join(', ');
	}

	// Desktop: the gok-table owns sorting + pagination internally; we never
	// preventDefault its events. handleSelection reads the first selected id and
	// maps it back to a row.
	function handleSelection(e: Event) {
		const id = (e as CustomEvent<{ ids?: string[] }>).detail.ids?.[0];
		if (!id) return;
		const row = rows.find((r) => getRowId(r) === id);
		if (row) onselect?.(row);
	}

	// A no-op attachment used in place of a listener when the list is display-only — keeps the
	// row-activate / selection-change listeners genuinely off the element (never attached), so an
	// inert table has no click handlers to fire.
	const noEffect = () => {};

	// gok-table fires row-activate on a full-row click or Enter (independent of selection
	// mode) — this is the "open this record" gesture, matching the mobile card's full-row tap.
	function handleActivate(e: Event) {
		const id = (e as CustomEvent<{ id?: string }>).detail?.id;
		if (!id) return;
		const row = rows.find((r) => getRowId(r) === id);
		if (row) onselect?.(row);
	}

	// gok-table sorts its own internal copy; we only forward the signal so a consumer
	// can react (e.g. blank a running-balance column off the canonical order). We never
	// interpret the sort or touch `rows` here — RecordList stays generic.
	function handleSort(e: Event) {
		const detail = (e as CustomEvent<{ key: string; direction: 'asc' | 'desc' }>).detail;
		onsort?.(detail ?? null);
	}

	// Mobile pagination is a simple "show more" reveal (no column sorting on
	// mobile — the default row order is preserved, which is acceptable per spec).
	// We stash the rows reference alongside the reveal count so the reveal resets
	// for free when `rows` changes upstream (filter/search): if the stored ref no
	// longer matches the current rows, the extra-pages count reads as 0. This
	// keeps the reset at read-time — no $effect, no captured-initial-value warning.
	let reveal = $state<{ ref: T[] | null; extra: number }>({ ref: null, extra: 0 });
	const extraPages = $derived(reveal.ref === rows ? reveal.extra : 0);
	const pageLimit = $derived(pageSize * (extraPages + 1));

	const shownRows = $derived(paginated ? rows.slice(0, pageLimit) : rows);
</script>

<!-- The mobile card's inner content, shared by the interactive <button> and the inert <div> so the
	 layout is identical whether or not the row opens a record. -->
{#snippet recCard(row: T)}
	<span class="rec-main">
		{#if primaryCol}
			<span class="rec-title">{fmt(primaryCol, row)}</span>
		{/if}
		{#if metaCols.length}
			<span class="rec-meta">{metaCols.map((c) => fmt(c, row)).join(' · ')}</span>
		{/if}
	</span>
	{#if numericCols.length}
		<span class="rec-figures">
			{#each numericCols as col (col.key)}
				<span class="rec-fig gok-tabular-nums">{fmt(col, row)}</span>
			{/each}
		</span>
	{/if}
{/snippet}

{#if mobile.current || alwaysRows}
	{#if caption}
		<div class="rec-caption">{@render caption()}</div>
	{/if}

	{#if rows.length === 0}
		{@render empty?.()}
	{:else}
		<div class="rec-list">
			{#each shownRows as row (getRowId(row))}
				{#if onselect}
					<button
						type="button"
						class="rec"
						class:is-selected={getRowId(row) === selectedId}
						aria-label={recordLabel(row)}
						onclick={() => onselect?.(row)}
					>
						{@render recCard(row)}
					</button>
				{:else}
					<div class="rec">
						{@render recCard(row)}
					</div>
				{/if}
			{/each}
		</div>

		{#if paginated && rows.length > pageLimit}
			<gok-button
				variant="secondary"
				class="show-more"
				{@attach on('click', () => (reveal = { ref: rows, extra: extraPages + 1 }))}
			>
				Show more
			</gok-button>
		{/if}
	{/if}
{:else}
	<gok-table
		selection-mode={onselect ? selectionMode : 'none'}
		class:is-interactive={!!onselect}
		paginated={paginated}
		page-size={pageSize}
		accessible-label={accessibleLabel}
		{@attach setProps({ columns, rows, getRowId, selection: selectedId ? [selectedId] : [], renderCell })}
		{@attach onselect ? on('gok-selection-change', handleSelection) : noEffect}
		{@attach on('gok-sort', handleSort)}
		{@attach onselect ? on('row-activate', handleActivate) : noEffect}
	>
		{#if caption}
			<div slot="caption">{@render caption()}</div>
		{/if}
		{#if empty}
			<div slot="empty">{@render empty()}</div>
		{/if}
	</gok-table>
{/if}

<style>
	.rec-caption {
		margin-block-end: var(--gok-space-300);
	}

	.rec-list {
		display: flex;
		flex-direction: column;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* Interactive body rows open a record on click (gok-table row-activate → onselect); signal it
	   with a pointer. Scoped to the .is-interactive host so an inert (display-only) table shows no
	   pointer. Uses gok-table's public ::part(row) API — never reaches into its shadow DOM. */
	gok-table.is-interactive::part(row) {
		cursor: pointer;
	}

	.rec {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
		inline-size: 100%;
		padding-block: var(--gok-space-300);
		border: 0;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		background: transparent;
		text-align: start;
		font-family: var(--gok-font-family-text);
		color: var(--gok-color-text);
	}

	/* Only the interactive variant (a <button>) is a pointer target; the inert <div> stays plain. */
	button.rec {
		cursor: pointer;
	}

	button.rec:hover {
		background: var(--gok-color-surface);
	}

	button.rec:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-focus-ring);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}

	.rec.is-selected {
		background: var(--gok-color-surface);
	}

	.rec-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.rec-title {
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.rec-meta {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.rec-figures {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		text-align: end;
		flex: none;
	}

	.rec-fig {
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		white-space: nowrap;
	}

	.show-more {
		margin-block-start: var(--gok-space-300);
	}
</style>
