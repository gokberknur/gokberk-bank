<script lang="ts">
	// Instrument price view (F11) — TradingView Lightweight Charts (Apache-2.0),
	// wrapped thin so it reads only the `--gok-*` token layer via `chartTheme()`.
	// Monochrome chrome (transparent-ish surface, hairline horizontal grid, muted
	// mono axes, no watermark); candles use the status roles AND shape — up candles
	// hollow, down candles filled — so direction reads without hue. Line mode is the
	// single earned accent over a soft fill. Lazy-loads the library in `onMount`
	// (never top-level, so the static prerender stays clean), re-themes live on a
	// `data-theme` change, and renders the required TradingView attribution.
	import { onMount } from 'svelte';
	import type {
		IChartApi,
		ISeriesApi,
		Time,
		LineWidth,
		MouseEventParams
	} from 'lightweight-charts';
	import { chartTheme, onThemeChange, prefersReducedMotion, type ChartTheme } from './theme';
	import { resolveColor } from './util';
	import CrosshairReadout from '$lib/components/invest/CrosshairReadout.svelte';

	interface Candle {
		/** A `'YYYY-MM-DD'` business day (Lightweight Charts BusinessDay string). */
		time: string;
		open: number;
		high: number;
		low: number;
		close: number;
		/** Optional daily volume — feeds the neutral-ink volume pane (magnitude only). */
		volume?: number;
	}

	interface Props {
		/** OHLC candles, values already in MAJOR units (the page converts minor→major). */
		candles: Candle[];
		/** Price view: full candlesticks or a single-accent line+area on the close. */
		kind?: 'candlestick' | 'line';
		/** CSS block-size of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Price-scale + crosshair formatter (default: two decimals). */
		formatValue?: (v: number) => string;
	}

	let {
		candles,
		kind = 'candlestick',
		height = '20rem',
		label,
		formatValue = (v: number) => v.toFixed(2)
	}: Props = $props();

	let el: HTMLDivElement;
	let chart: IChartApi | null = null;
	let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null = null;
	let volumeSeries: ISeriesApi<'Histogram'> | null = null;
	let lib: typeof import('lightweight-charts') | null = null;
	let builtKind: 'candlestick' | 'line' | null = null;

	// The bar shown in the reserved OHLC readout above the canvas. It DERIVES to the
	// latest bar at rest — so it's never blank and a range/data switch refreshes it for
	// free — and the crosshair handler OVERRIDES it to the hovered bar on move (the
	// overridable-derived pattern; the override clears when `candles` next changes).
	// Carries full OHLC+volume in BOTH candlestick and line mode, since `candles` always does.
	let hoveredBar = $derived<Candle | null>(candles.at(-1) ?? null);

	/** Whether any candle carries a numeric volume — gates the volume pane. */
	function hasVolume(): boolean {
		return candles.some((c) => typeof c.volume === 'number');
	}

	/** (Re)create the price series for the current `kind` (candlestick ⇄ line/area) and,
	 *  alongside it, the volume histogram in pane 1. Both are torn down and rebuilt
	 *  together on a kind switch so neither leaks nor duplicates across the swap. */
	function buildSeries() {
		if (!chart || !lib) return;
		if (series) {
			chart.removeSeries(series);
			series = null;
		}
		if (volumeSeries) {
			chart.removeSeries(volumeSeries);
			volumeSeries = null;
		}
		series =
			kind === 'candlestick'
				? chart.addSeries(lib.CandlestickSeries)
				: chart.addSeries(lib.AreaSeries);

		// Volume pane (pane 1) — only when the data actually carries volume. Its own
		// overlay price scale (`priceScaleId: ''`) auto-scales to the volume magnitude
		// inside the pane, so it never distorts the price axis above.
		if (hasVolume()) {
			volumeSeries = chart.addSeries(
				lib.HistogramSeries,
				{ priceFormat: { type: 'volume' }, priceScaleId: '' },
				1
			);
			// Price pane ~75% / volume pane ~25% of the vertical space.
			const panes = chart.panes();
			panes[0]?.setStretchFactor(3);
			panes[1]?.setStretchFactor(1);
		}
		builtKind = kind;
	}

	/** Push the OHLC (candlestick) or close-value (line/area) data into the series. */
	function applyData() {
		if (!series) return;
		if (kind === 'candlestick') {
			(series as ISeriesApi<'Candlestick'>).setData(
				candles.map((c) => ({
					time: c.time as Time,
					open: c.open,
					high: c.high,
					low: c.low,
					close: c.close
				}))
			);
		} else {
			(series as ISeriesApi<'Area'>).setData(
				candles.map((c) => ({ time: c.time as Time, value: c.close }))
			);
		}
		// Volume is magnitude only — a single neutral ink (coloured in the theme pass),
		// never up/down hue. Direction stays on the candles / line.
		volumeSeries?.setData(candles.map((c) => ({ time: c.time as Time, value: c.volume ?? 0 })));
	}

	/** Re-apply series colours/format from a fresh palette (no remount). */
	function applySeriesTheme(theme: ChartTheme) {
		if (!series) return;
		const priceFormat = {
			type: 'custom' as const,
			minMove: 0.01,
			formatter: (v: number) => formatValue(v)
		};
		if (kind === 'candlestick') {
			(series as ISeriesApi<'Candlestick'>).applyOptions({
				// Up = hollow (transparent body), Down = filled — direction reads by
				// shape, not hue alone. Borders + wicks carry the status colour.
				upColor: 'rgba(0, 0, 0, 0)',
				downColor: theme.down,
				borderVisible: true,
				borderUpColor: theme.up,
				borderDownColor: theme.down,
				wickVisible: true,
				wickUpColor: theme.up,
				wickDownColor: theme.down,
				priceFormat
			});
		} else {
			// Direction over the visible range drives the line — a losing asset must
			// not read green (CV-A11Y-1 / CRY-D-01). Mirrors the candlestick up/down tokens.
			const first = candles[0]?.close ?? 0;
			const last = candles.at(-1)?.close ?? first;
			const dir = last >= first ? theme.up : theme.down;
			(series as ISeriesApi<'Area'>).applyOptions({
				lineColor: dir,
				lineWidth: 2 as LineWidth,
				topColor: resolveColor(`color-mix(in srgb, ${dir} 22%, transparent)`),
				bottomColor: resolveColor(`color-mix(in srgb, ${dir} 2%, transparent)`),
				priceFormat
			});
		}
		// Every volume bar the same muted ink at reduced strength — magnitude, not hue.
		// theme.muted is already a concrete rgb(r, g, b) from the token bridge; give the
		// receding volume bars a 45% alpha the chart lib can parse. color-mix()/color(srgb)
		// serialisations are rejected by Lightweight, so never hand those to a series option.
		const volumeColor = theme.muted.replace(/^rgb\((.+)\)$/, 'rgba($1, 0.45)');
		volumeSeries?.applyOptions({
			color: volumeColor,
			priceFormat: { type: 'volume' }
		});
	}

	/** Re-apply the monochrome chrome + series colours from the live tokens. */
	function reapply() {
		if (!chart || !lib) return;
		const theme = chartTheme();
		const reduced = prefersReducedMotion();
		chart.applyOptions({
			layout: {
				background: { type: lib.ColorType.Solid, color: theme.surface },
				textColor: theme.muted,
				fontFamily: theme.fontMono,
				attributionLogo: false // our own on-brand credit fulfils the licence link
			},
			grid: {
				// Quiet: hide the vertical lines, keep a whisper of horizontal hairline.
				vertLines: { visible: false },
				horzLines: { color: theme.border, style: lib.LineStyle.Solid, visible: true }
			},
			crosshair: {
				mode: lib.CrosshairMode.Magnet,
				vertLine: {
					color: theme.muted,
					width: 1 as LineWidth,
					style: lib.LineStyle.Dashed,
					labelBackgroundColor: theme.surfaceStrong
				},
				horzLine: {
					color: theme.muted,
					width: 1 as LineWidth,
					style: lib.LineStyle.Dashed,
					labelBackgroundColor: theme.surfaceStrong
				}
			},
			rightPriceScale: { borderColor: theme.border, borderVisible: true },
			timeScale: { borderColor: theme.border, borderVisible: true, secondsVisible: false },
			// Reduced motion: kill kinetic (inertial) scroll.
			kineticScroll: { mouse: false, touch: !reduced }
		});
		applySeriesTheme(theme);
	}

	/** Full render: ensure the right series exists, theme it, set data, fit the view. */
	function render() {
		if (!chart) return;
		if (kind !== builtKind || !series) buildSeries();
		reapply();
		applyData();
		chart.timeScale().fitContent();
		// The readout refreshes itself: `hoveredBar` derives from `candles`, so a
		// range/data switch snaps it back to the latest bar without a manual reset.
	}

	onMount(() => {
		let disposed = false;
		let ro: ResizeObserver | undefined;
		let stopTheme: (() => void) | undefined;
		let onCrosshair: ((param: MouseEventParams) => void) | undefined;

		(async () => {
			lib = await import('lightweight-charts');
			if (disposed) return;
			chart = lib.createChart(el, { width: el.clientWidth, height: el.clientHeight });
			buildSeries();
			reapply();
			applyData();
			chart.timeScale().fitContent();

			// Override the readout with the hovered bar. On the data → that bar; off the
			// data (crosshair left, or between points) → the latest bar, so the line holds
			// rather than blanks. The override clears when `candles` next changes, so a
			// range switch snaps back to the derived latest. Works in both candlestick and
			// line mode because `candles` always carries full OHLC+volume.
			onCrosshair = (param) => {
				const match =
					param.time !== undefined ? candles.find((c) => c.time === param.time) : undefined;
				hoveredBar = match ?? candles.at(-1) ?? null;
			};
			chart.subscribeCrosshairMove(onCrosshair);

			ro = new ResizeObserver(() => chart?.resize(el.clientWidth, el.clientHeight));
			ro.observe(el);
			stopTheme = onThemeChange(reapply);
		})();

		return () => {
			disposed = true;
			ro?.disconnect();
			stopTheme?.();
			if (chart && onCrosshair) chart.unsubscribeCrosshairMove(onCrosshair);
			chart?.remove();
			chart = null;
			series = null;
			volumeSeries = null;
		};
	});

	// Re-render when data / kind / formatter change (guarded until the instance exists).
	$effect(() => {
		void candles;
		void kind;
		void formatValue;
		if (chart) render();
	});
</script>

<figure class="price">
	<CrosshairReadout bar={hoveredBar} {formatValue} />
	<div class="canvas" bind:this={el} style:height role="img" aria-label={label}></div>
	<figcaption class="credit">
		<a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
			Charts by TradingView
		</a>
	</figcaption>
</figure>

<style>
	.price {
		margin: 0;
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
	}

	.credit {
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--gok-color-text-muted);
		text-align: end;
	}

	.credit a {
		color: inherit;
		text-decoration: none;
	}

	.credit a:hover {
		text-decoration: underline;
	}
</style>
