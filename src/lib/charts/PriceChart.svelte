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
		LineWidth
	} from 'lightweight-charts';
	import { chartTheme, onThemeChange, prefersReducedMotion, type ChartTheme } from './theme';
	import { resolveColor } from './util';

	interface Candle {
		/** A `'YYYY-MM-DD'` business day (Lightweight Charts BusinessDay string). */
		time: string;
		open: number;
		high: number;
		low: number;
		close: number;
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
	let lib: typeof import('lightweight-charts') | null = null;
	let builtKind: 'candlestick' | 'line' | null = null;

	/** (Re)create the series for the current `kind` (candlestick ⇄ line/area). */
	function buildSeries() {
		if (!chart || !lib) return;
		if (series) {
			chart.removeSeries(series);
			series = null;
		}
		series =
			kind === 'candlestick'
				? chart.addSeries(lib.CandlestickSeries)
				: chart.addSeries(lib.AreaSeries);
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
			(series as ISeriesApi<'Area'>).applyOptions({
				lineColor: theme.accent,
				lineWidth: 2 as LineWidth,
				topColor: resolveColor(`color-mix(in srgb, ${theme.accent} 22%, transparent)`),
				bottomColor: resolveColor(`color-mix(in srgb, ${theme.accent} 2%, transparent)`),
				priceFormat
			});
		}
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
	}

	onMount(() => {
		let disposed = false;
		let ro: ResizeObserver | undefined;
		let stopTheme: (() => void) | undefined;

		(async () => {
			lib = await import('lightweight-charts');
			if (disposed) return;
			chart = lib.createChart(el, { width: el.clientWidth, height: el.clientHeight });
			buildSeries();
			reapply();
			applyData();
			chart.timeScale().fitContent();
			ro = new ResizeObserver(() => chart?.resize(el.clientWidth, el.clientHeight));
			ro.observe(el);
			stopTheme = onThemeChange(reapply);
		})();

		return () => {
			disposed = true;
			ro?.disconnect();
			stopTheme?.();
			chart?.remove();
			chart = null;
			series = null;
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
		font-size: var(--gok-font-size-50);
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
