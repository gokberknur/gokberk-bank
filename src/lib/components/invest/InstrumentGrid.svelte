<script lang="ts">
	// V13 · InstrumentGrid — the generalized, reusable accessible instrument grid for the
	// discovery surface (used by BOTH the neutral-list browser and the movers panels). A
	// HAND-BUILT semantic <table>, not gok-table / RecordList, because a per-row <Sparkline>
	// is a Svelte component and those hosts only accept string/Node cells (dogfooding #27 —
	// the same reason WatchTable is hand-built; this is its generalized sibling and reuses its
	// idioms: sortable <th> buttons with aria-sort, the .cell-delta day-change treatment
	// (▲/▼/— glyph + sr-only word + signed amount + signed percent — direction by rule+sign+
	// arrow+text, colour only reinforcing), the Sparkline cell with a text-equivalent label,
	// and the row-click → instrument. On phones (< 40rem) it RECOMPOSES to a stacked card list
	// so the discovery grid never horizontal-scrolls on a phone (CV-LAY-5) — unlike WatchTable,
	// which scrolls. All spacing/colour comes from --gok-* tokens; the page's single accent is
	// spent on the active list tab elsewhere, so Buy here stays quiet.
	import { goto } from '$app/navigation';
	import type { Instrument } from '$lib/data/market';
	import { priceHistory } from '$lib/data/market';
	import { dayChangePctX100, dayChangeMinor, moveDir, type MoveDir } from '$lib/invest/movers';
	import { formatMoney, formatPercent } from '$lib/format';
	import { Sparkline } from '$lib/charts';
	import { on } from '$lib/wc.svelte';
	import { mobile } from '$lib/breakpoints';

	type SortKey = 'symbol' | 'last' | 'change';

	interface Props {
		/** The instruments to show, in the caller's order (kept as-is when not sortable). */
		instruments: Instrument[];
		/** The table's <caption> — visually hidden, names the grid for screen readers. */
		accessibleLabel: string;
		/** When set, render a trailing quiet "Buy" per row that calls back with the symbol. */
		onBuy?: (symbol: string) => void;
		/** Column-header sorting (default true). When false, headers are plain and order is kept. */
		sortable?: boolean;
		/** Seed the sort column. */
		initialSortKey?: SortKey;
		/** Seed the sort direction. */
		initialSortDir?: 'asc' | 'desc';
	}

	let {
		instruments,
		accessibleLabel,
		onBuy,
		sortable = true,
		initialSortKey = 'symbol',
		initialSortDir = 'asc'
	}: Props = $props();

	// Phones recompose to a card list (mobile.current) — the discovery grid must never h-scroll on a
	// phone (CV-LAY-5). The mobile breakpoint is the shared app-wide singleton ($lib/breakpoints).

	// ── App-local sort state (a hand-built table hosts the Sparkline; gok-table can't) ──
	// The `initial*` props seed this once — after mount the header buttons own the sort.
	// svelte-ignore state_referenced_locally
	let sortKey = $state<SortKey>(initialSortKey);
	// svelte-ignore state_referenced_locally
	let sortDir = $state<'asc' | 'desc'>(initialSortDir);

	// dir carries the sign bucket — it drives the glyph, the status role, and the screen-reader
	// word ('flat' folds into the no-trend case for the sparkline colour).
	function glyph(dir: MoveDir): string {
		return dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
	}

	function word(dir: MoveDir): string {
		return dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'flat';
	}

	// A precomputed view-model keyed off `instruments`, so priceHistory (the 30-day spark)
	// only recomputes when the input list changes — never on a sort toggle.
	interface GridRow {
		inst: Instrument;
		dir: MoveDir;
		pctX100: number;
		changeMinor: number;
		spark: number[];
		sparkLabel: string;
	}

	const rows: GridRow[] = $derived(
		instruments.map((inst) => {
			const dir = moveDir(inst);
			const pctX100 = dayChangePctX100(inst);
			return {
				inst,
				dir,
				pctX100,
				changeMinor: dayChangeMinor(inst),
				spark: priceHistory(inst.symbol, 30).map((c) => c.closeMinor),
				sparkLabel: `${inst.symbol} 30-day trend — ${word(dir)} ${formatPercent(pctX100 / 10000)} today.`
			};
		})
	);

	function sortValue(row: GridRow, key: SortKey): number | string {
		switch (key) {
			case 'symbol':
				return row.inst.symbol;
			case 'last':
				return row.inst.lastPriceMinor;
			case 'change':
				return row.pctX100;
		}
	}

	const sortedRows = $derived.by(() => {
		if (!sortable) return rows;
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

	function openInstrument(symbol: string) {
		goto(`/invest/instrument/${symbol}`);
	}

	function buy(event: Event, symbol: string) {
		// Quiet secondary action — stop the row-click from also firing, then hand up.
		event.stopPropagation();
		onBuy?.(symbol);
	}
</script>

{#snippet colHead(key: SortKey, label: string, numeric: boolean)}
	{#if sortable}
		<th scope="col" aria-sort={ariaSort(key)} class={numeric ? 'col-num' : 'col-symbol'}>
			<button type="button" class="sort-btn" onclick={() => toggleSort(key)}>
				{label}
				<span class="sort-mark" aria-hidden="true"
					>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span
				>
			</button>
		</th>
	{:else}
		<th scope="col" class={numeric ? 'col-num' : 'col-symbol'}>{label}</th>
	{/if}
{/snippet}

{#snippet delta(row: GridRow)}
	<span class="cell-delta" data-sign={row.dir}>
		<span class="delta-icon" aria-hidden="true">{glyph(row.dir)}</span>
		<span class="visually-hidden">{word(row.dir)}</span>
		{formatMoney(row.changeMinor, row.inst.currency, { signDisplay: true })}
		<span class="delta-pct">({formatPercent(row.pctX100 / 10000)})</span>
	</span>
{/snippet}

{#if mobile.current}
	<!-- Phone form: a stacked card list, no horizontal scroll (CV-LAY-5). Each card's main
	     region is a link that opens the instrument; the quiet Buy sits beside it (interactive
	     content can't nest inside the link). -->
	<section aria-label={accessibleLabel}>
		<ul class="cards">
			{#each sortedRows as row (row.inst.symbol)}
				<li class="card">
					<a class="card-open" href={`/invest/instrument/${row.inst.symbol}`}>
						<div class="card-line">
							<span class="sym">{row.inst.symbol}</span>
							<span class="card-last gok-tabular-nums">
								{formatMoney(row.inst.lastPriceMinor, row.inst.currency)}
							</span>
						</div>
						<div class="card-line card-sub">
							<span class="sym-name">{row.inst.name}</span>
							<span class="gok-tabular-nums">{@render delta(row)}</span>
						</div>
						<Sparkline
							values={row.spark}
							trend={row.dir === 'flat' ? 'auto' : row.dir}
							label={row.sparkLabel}
							height="2rem"
						/>
					</a>
					{#if onBuy}
						<div class="card-buy">
							<gok-button
								size="s"
								variant="secondary"
								aria-label={`Buy ${row.inst.symbol}`}
								{@attach on('click', (e) => buy(e, row.inst.symbol))}
							>
								Buy
							</gok-button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<div class="grid-scroll">
		<table class="grid">
			<caption class="visually-hidden">{accessibleLabel}</caption>
			<thead>
				<tr>
					{@render colHead('symbol', 'Symbol', false)}
					{@render colHead('last', 'Last', true)}
					{@render colHead('change', 'Day change', true)}
					<th scope="col" class="col-spark">30 days</th>
					{#if onBuy}
						<th scope="col" class="col-actions"><span class="visually-hidden">Buy</span></th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each sortedRows as row (row.inst.symbol)}
					<tr class="row" onclick={() => openInstrument(row.inst.symbol)}>
						<th scope="row" class="col-symbol">
							<a
								class="sym-link"
								href={`/invest/instrument/${row.inst.symbol}`}
								onclick={(e) => e.stopPropagation()}
							>
								<span class="sym">{row.inst.symbol}</span>
								<span class="sym-name">{row.inst.name}</span>
							</a>
						</th>
						<td class="col-num gok-tabular-nums">
							{formatMoney(row.inst.lastPriceMinor, row.inst.currency)}
						</td>
						<td class="col-num gok-tabular-nums">{@render delta(row)}</td>
						<td class="col-spark">
							<Sparkline
								values={row.spark}
								trend={row.dir === 'flat' ? 'auto' : row.dir}
								label={row.sparkLabel}
								height="2rem"
							/>
						</td>
						{#if onBuy}
							<td class="col-actions">
								<gok-button
									size="s"
									variant="secondary"
									aria-label={`Buy ${row.inst.symbol}`}
									{@attach on('click', (e) => buy(e, row.inst.symbol))}
								>
									Buy
								</gok-button>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	/* ── Desktop table ─────────────────────────────────────────────────────────── */
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

	.col-actions {
		inline-size: 4rem;
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

	/* ── Symbol + name (shared by table cell and card head) ────────────────────── */
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

	/* ── Day-change cell — direction by rule + sign + arrow + text; colour reinforces ── */
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

	/* ── Phone card list (< 40rem) — no horizontal scroll ──────────────────────── */
	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.card:last-child {
		border-block-end: none;
	}

	.card-open {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		text-decoration: none;
		color: inherit;
		border-radius: var(--gok-radius-s);
	}

	.card-open:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
	}

	.card-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		font-size: var(--gok-type-body-small-size);
	}

	.card-last {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.card-sub {
		font-size: var(--gok-type-footnote-size);
	}

	.card-buy {
		display: flex;
		justify-content: flex-end;
	}

	/* ── Screen-reader-only text (day-change word, table caption, hidden headers) ── */
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
