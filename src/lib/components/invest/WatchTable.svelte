<script lang="ts">
	// V05 · The watchlist grid — a HAND-BUILT accessible table that mirrors the V01
	// holdings grid (dogfooding #27: gok-table cells are formatted strings only, so a
	// per-row Sparkline node can't live in it). Semantic <table>, <th scope>, aria-sort
	// driven by local sort state, tabular numerals, hairline rules. Columns: Symbol
	// (+ name), Last, Day change (rule + ▲/▼ + sign + signed amount and percent — never
	// colour alone), Sparkline (with the day-change value as its text equivalent), and a
	// trailing Remove. Reads the ACTIVE list's rows straight off the reactive state; the
	// remove control is optimistic (the state toasts "Removed {symbol}").
	import { goto } from '$app/navigation';
	import { watchlists } from '$lib/state/watchlists.svelte';
	import type { WatchRow } from '$lib/state/watchlists.svelte';
	import { formatMoney, formatPercent } from '$lib/format';
	import { Sparkline } from '$lib/charts';

	const rows = $derived(watchlists.rows());
	const listName = $derived(watchlists.active()?.name ?? 'my watchlist');

	// ── App-local sort state (gok-table can't host the Sparkline) ──
	type SortKey = 'symbol' | 'last' | 'day';
	let sortKey = $state<SortKey>('day');
	let sortDir = $state<'asc' | 'desc'>('desc');

	function sortValue(row: WatchRow, key: SortKey): number | string {
		switch (key) {
			case 'symbol':
				return row.symbol;
			case 'last':
				return row.lastPriceMinor;
			case 'day':
				return row.change.pctX100;
		}
	}

	const sortedRows = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const av = sortValue(a, sortKey);
			const bv = sortValue(b, sortKey);
			if (typeof av === 'string' && typeof bv === 'string') {
				return av.localeCompare(bv) * dir;
			}
			return ((av as number) - (bv as number)) * dir;
		});
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			// Text column sorts A→Z first; numeric columns lead with the largest.
			sortDir = key === 'symbol' ? 'asc' : 'desc';
		}
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	// dir already carries the sign bucket — drives the glyph, the status role, and the
	// screen-reader word ('flat' folds into the no-trend case for the sparkline colour).
	function glyph(dir: WatchRow['change']['dir']): string {
		return dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
	}

	function word(dir: WatchRow['change']['dir']): string {
		return dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'flat';
	}

	function openInstrument(symbol: string) {
		goto(`/invest/instrument/${symbol}`);
	}

	function removeRow(symbol: string) {
		watchlists.removeFromActive(symbol);
	}
</script>

<div class="grid-scroll">
	<table class="grid">
		<caption class="visually-hidden">
			{listName} — symbol, last price, day change, and a 30-day trend. Sortable by column.
		</caption>
		<thead>
			<tr>
				<th scope="col" aria-sort={ariaSort('symbol')} class="col-symbol">
					<button type="button" class="sort-btn" onclick={() => toggleSort('symbol')}>
						Symbol
						<span class="sort-mark" aria-hidden="true"
							>{sortKey === 'symbol' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
						>
					</button>
				</th>
				<th scope="col" aria-sort={ariaSort('last')} class="col-num">
					<button type="button" class="sort-btn" onclick={() => toggleSort('last')}>
						Last
						<span class="sort-mark" aria-hidden="true"
							>{sortKey === 'last' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
						>
					</button>
				</th>
				<th scope="col" aria-sort={ariaSort('day')} class="col-num">
					<button type="button" class="sort-btn" onclick={() => toggleSort('day')}>
						Day change
						<span class="sort-mark" aria-hidden="true"
							>{sortKey === 'day' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
						>
					</button>
				</th>
				<th scope="col" class="col-spark">30 days</th>
				<th scope="col" class="col-remove"><span class="visually-hidden">Remove</span></th>
			</tr>
		</thead>
		<tbody>
			{#each sortedRows as row (row.symbol)}
				{@const dir = row.change.dir}
				<tr class="row" onclick={() => openInstrument(row.symbol)}>
					<th scope="row" class="col-symbol">
						<a
							class="sym-link"
							href={`/invest/instrument/${row.symbol}`}
							onclick={(e) => e.stopPropagation()}
						>
							<span class="sym">{row.symbol}</span>
							<span class="sym-name">{row.name}</span>
						</a>
					</th>
					<td class="col-num gok-tabular-nums">
						{formatMoney(row.lastPriceMinor, row.currency)}
					</td>
					<td class="col-num gok-tabular-nums">
						<span class="cell-delta" data-sign={dir}>
							<span class="delta-icon" aria-hidden="true">{glyph(dir)}</span>
							<span class="visually-hidden">{word(dir)}</span>
							{formatMoney(row.change.absMinor, row.currency, { signDisplay: true })}
							<span class="delta-pct">({formatPercent(row.change.pctX100 / 10000)})</span>
						</span>
					</td>
					<td class="col-spark">
						<Sparkline
							values={row.spark}
							trend={dir === 'flat' ? 'auto' : dir}
							label={`${row.symbol} 30-day trend — ${word(dir)} ${formatPercent(row.change.pctX100 / 10000)} today.`}
							height="2rem"
						/>
					</td>
					<td class="col-remove">
						<button
							type="button"
							class="remove-btn"
							aria-label={`Remove ${row.symbol} from ${listName}`}
							onclick={(e) => {
								e.stopPropagation();
								removeRow(row.symbol);
							}}
						>
							<span aria-hidden="true">×</span>
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.grid-scroll {
		inline-size: 100%;
		overflow-x: auto;
	}

	.grid {
		inline-size: 100%;
		border-collapse: collapse;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
	}

	.grid th,
	.grid td {
		padding: var(--gok-space-200) var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		white-space: nowrap;
		vertical-align: middle;
	}

	.grid thead th {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		font-weight: var(--gok-font-weight-regular);
		text-align: start;
		color: var(--gok-color-text-muted);
	}

	.col-num {
		text-align: end;
	}

	.col-num .sort-btn {
		justify-content: flex-end;
		margin-inline-start: auto;
	}

	.sort-btn {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		cursor: pointer;
	}

	.sort-btn:hover {
		color: var(--gok-color-text);
	}

	.sort-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.sort-mark {
		font-size: 0.8em;
		color: var(--gok-color-text);
	}

	.col-spark {
		inline-size: 5rem;
	}

	.col-remove {
		inline-size: 2.5rem;
		text-align: end;
	}

	.row {
		cursor: pointer;
	}

	.row:hover {
		background: var(--gok-color-surface-strong);
	}

	.row:focus-within {
		background: var(--gok-color-surface-strong);
	}

	.sym-link {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		text-decoration: none;
		color: inherit;
	}

	.sym-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.sym {
		font-family: var(--gok-font-family-mono);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.sym-name {
		font-size: var(--gok-type-footnote-size);
		color: var(--gok-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		max-inline-size: 12rem;
	}

	.cell-delta {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		justify-content: flex-end;
	}

	.cell-delta[data-sign='up'] {
		color: var(--gok-color-status-success);
	}

	.cell-delta[data-sign='down'] {
		color: var(--gok-color-status-error);
	}

	.cell-delta .delta-icon {
		font-size: 0.7em;
	}

	.delta-pct {
		color: var(--gok-color-text-muted);
	}

	.cell-delta[data-sign='up'] .delta-pct,
	.cell-delta[data-sign='down'] .delta-pct {
		color: inherit;
	}

	.remove-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		padding: 0;
		border: var(--gok-border-width-hairline) solid transparent;
		border-radius: var(--gok-radius-s);
		background: none;
		font-size: var(--gok-type-body-large-size);
		line-height: 1;
		color: var(--gok-color-text-muted);
		cursor: pointer;
	}

	.remove-btn:hover {
		color: var(--gok-color-text);
		border-color: var(--gok-color-border);
		background: var(--gok-color-surface-strong);
	}

	.remove-btn:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}
</style>
