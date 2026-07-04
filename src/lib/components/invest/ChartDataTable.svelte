<script lang="ts">
	// V08 Phase B · The honest "View data" fallback — the numbers behind the price chart, on the
	// page BEFORE the chart draws its indicator lines. A property-driven gok-table inside a native
	// <details> disclosure (the DS ships no gok-disclosure; single-toggle reveals are the native
	// <details> pattern used across the app — see support + plans/new), collapsed by default.
	//
	// Purely presentational + prop-driven: the indicator columns come straight from the `lines`
	// prop — the SAME IndicatorLine[] the chart plots as overlays — so a table cell can never
	// disagree with the line the chart draws (one source, two consumers). `null` (insufficient
	// window) renders as "—" — never a fabricated number. Every overlay line is a price-unit minor
	// value → money-formatted.
	//
	// Columns are Date/OHLCV plus one numeric column per active line (keyed by `line.id`, labelled
	// `line.label`); with no indicators on, `lines` is empty and the table is just Date/OHLCV. Rows
	// are NEWEST-FIRST and pre-formatted to STRINGS (dogfooding #11: gok-table cells are text), with
	// a fresh array built each derive so the grid re-renders on a new reference. Interop is strictly
	// setProps (DOM properties) — never bind:, never object props as attributes.
	import type { Candle } from '$lib/data/market';
	import type { Currency } from '$lib/data/money';
	import type { GokTableColumn } from '@gokberknur/design-system';
	import type { IndicatorLine } from '$lib/charts/indicator-series';
	import { formatMoney, formatNumber, formatDate } from '$lib/format';
	import { setProps } from '$lib/wc.svelte';

	let {
		candles,
		currency,
		lines = []
	}: { candles: Candle[]; currency: Currency; lines?: IndicatorLine[] } = $props();

	// ── Columns: a chronological data export, so nothing is sortable. Numeric columns right-align
	//    and render tabular figures. Date/OHLCV are fixed; one numeric column follows per active
	//    indicator line (keyed by its id, labelled by its label) so the table mirrors the chart. ──
	const columns = $derived<GokTableColumn[]>([
		{ key: 'date', label: 'Date' },
		{ key: 'open', label: 'Open', numeric: true },
		{ key: 'high', label: 'High', numeric: true },
		{ key: 'low', label: 'Low', numeric: true },
		{ key: 'close', label: 'Close', numeric: true },
		{ key: 'volume', label: 'Volume', numeric: true },
		...lines.map((line) => ({ key: line.id, label: line.label, numeric: true }))
	]);

	// ── Rows, NEWEST-FIRST. Index BEFORE reversing so each line value stays aligned to its own bar;
	//    a fresh array each derive so gok-table re-renders on the new reference. Each line's cell is
	//    its minor value money-formatted, or "—" when the window was too short (null). ──
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
				...Object.fromEntries(
					lines.map((line) => {
						const v = line.valuesMinor[i];
						return [line.id, v === null ? '—' : formatMoney(v, currency)];
					})
				)
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
		<!-- A dense, secondary data-export fallback (Date/OHLCV + one column per active indicator), so
		     it scrolls horizontally on narrow screens rather than recomposing to record-cards. -->
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
