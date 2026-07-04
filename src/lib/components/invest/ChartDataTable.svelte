<script lang="ts">
	// V08 Phase B · The honest "View data" fallback — the numbers behind the price chart, on the
	// page BEFORE the chart draws its indicator lines. A property-driven gok-table inside a native
	// <details> disclosure (the DS ships no gok-disclosure; single-toggle reveals are the native
	// <details> pattern used across the app — see support + plans/new), collapsed by default.
	//
	// Purely presentational + prop-driven: every indicator is DERIVED live from the bars via the
	// pure indicators module, so a table cell can never disagree with the candle it sits under.
	// `null` (insufficient window) renders as "—" — never a fabricated number. SMA is integer minor
	// units (money-formatted); RSI is a ×100 scaled integer (5423 = 54.23), so it divides by 100.
	//
	// Rows are NEWEST-FIRST and pre-formatted to STRINGS (dogfooding #11: gok-table cells are text),
	// with a fresh array built each derive so the grid re-renders on a new reference. Interop is
	// strictly setProps (DOM properties) — never bind:, never object props as attributes.
	import type { Candle } from '$lib/data/market';
	import type { Currency } from '$lib/data/money';
	import type { GokTableColumn } from '@gokberknur/design-system';
	import { sma, rsi } from '$lib/charts/indicators';
	import { formatMoney, formatNumber, formatDate } from '$lib/format';
	import { setProps } from '$lib/wc.svelte';

	let { candles, currency }: { candles: Candle[]; currency: Currency } = $props();

	// ── Indicators, computed live from the close series (integer minor units). Each returns an
	//    array the SAME length as `closes`; `null` = window too short → the cell shows "—". ──
	const closes = $derived(candles.map((c) => c.closeMinor));
	const sma20 = $derived(sma(closes, 20));
	const sma50 = $derived(sma(closes, 50));
	const rsi14 = $derived(rsi(closes, 14));

	// ── Columns: a chronological data export, so nothing is sortable. Numeric columns right-align
	//    and render tabular figures. Every value column is numeric bar the leading Date. ──
	const columns: GokTableColumn[] = [
		{ key: 'date', label: 'Date' },
		{ key: 'open', label: 'Open', numeric: true },
		{ key: 'high', label: 'High', numeric: true },
		{ key: 'low', label: 'Low', numeric: true },
		{ key: 'close', label: 'Close', numeric: true },
		{ key: 'volume', label: 'Volume', numeric: true },
		{ key: 'sma20', label: 'SMA 20', numeric: true },
		{ key: 'sma50', label: 'SMA 50', numeric: true },
		{ key: 'rsi', label: 'RSI 14', numeric: true }
	];

	// ── Rows, NEWEST-FIRST. Index BEFORE reversing so each indicator value stays aligned to its own
	//    bar; a fresh array each derive so gok-table re-renders on the new reference. ──
	const rows = $derived(
		candles
			.map((c, i) => ({
				id: c.time,
				date: formatDate(c.time),
				open: formatMoney(c.openMinor, currency),
				high: formatMoney(c.highMinor, currency),
				low: formatMoney(c.lowMinor, currency),
				close: formatMoney(c.closeMinor, currency),
				volume: formatNumber(c.volume),
				sma20: sma20[i] === null ? '—' : formatMoney(sma20[i] as number, currency),
				sma50: sma50[i] === null ? '—' : formatMoney(sma50[i] as number, currency),
				rsi: rsi14[i] === null ? '—' : formatNumber((rsi14[i] as number) / 100)
			}))
			.reverse()
	);

	const getRowId = (row: Record<string, unknown>) => String(row.id);
</script>

<details class="view-data">
	<summary class="view-data-summary">View data</summary>
	<div class="view-data-body">
		<p class="view-data-caption">
			Every value the chart plots, as a table — computed live from the price series.
		</p>
		<!-- 9 numeric columns: a dense, secondary data-export fallback, so it scrolls horizontally on
		     narrow screens rather than recomposing to record-cards — a deliberate choice for this view. -->
		<div class="table-scroll">
			<gok-table
				{@attach setProps({
					columns,
					rows,
					getRowId,
					paginated: true,
					pageSize: 12,
					accessibleLabel: 'Price and indicator data'
				})}
			>
				<span slot="empty">No price data for this range.</span>
			</gok-table>
		</div>
	</div>
</details>

<style>
	/* Native <details> disclosure — the DS ships no gok-disclosure; a single-toggle reveal is the
	   native pattern used across the app (support articles, plans "More options"). */
	.view-data {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		padding-block-start: var(--gok-space-300);
	}

	.view-data-summary {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.view-data-summary:hover {
		color: var(--gok-color-link);
	}

	.view-data-summary:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.view-data-body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		margin-block-start: var(--gok-space-300);
	}

	.view-data-caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* The dense export scrolls horizontally rather than clipping its rightmost (indicator) columns. */
	.table-scroll {
		inline-size: 100%;
		overflow-x: auto;
	}
</style>
