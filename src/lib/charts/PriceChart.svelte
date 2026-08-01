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
		MouseEventParams,
		IPriceLine
	} from 'lightweight-charts';
	import { chartTheme, onThemeChange, prefersReducedMotion, type ChartTheme } from './theme';
	import { resolveColor } from './util';
	import { formatDate } from '$lib/format';
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

	interface Overlay {
		/** Stable id (`'sma20'`, `'bb-upper'`, …) — keyed for teardown/rebuild. */
		id: string;
		/** Points in the SAME MAJOR price units as the candles, already null-filtered. */
		data: { time: string; value: number }[];
		/** Line shape: `[]` solid · `[6, 3]` dashed · anything else dotted. */
		dash?: number[];
		/** Neutral-ramp position: 0 = darkest (theme.text) → 1 = lightest (theme.muted). */
		inkStep?: number;
	}

	interface OscillatorPaneData {
		/** 'rsi' | 'macd' — the pane's indicator key. */
		key: string;
		/** 'RSI 14' | 'MACD' — accessible pane label (unused visually; for future). */
		label: string;
		/** Pane scale: 'index' (0–100, whole-number axis) or 'signed'/'money' (a price spread). */
		format: 'index' | 'signed' | 'money';
		/** 1–2 lines (RSI line; MACD line + signal). Values ALREADY in plottable pane units. */
		lines: { id: string; dash: number[]; inkStep: number; data: { time: string; value: number }[] }[];
		/** Optional zero-centred histogram (MACD). Values already in plottable units. */
		histogram?: { id: string; data: { time: string; value: number }[] };
		/** Flat guide levels (RSI 30/70, MACD 0), already in plottable pane units. */
		references: { value: number; label: string }[];
	}

	interface ComparisonData {
		/** Focal series label (e.g. its ticker). */
		baseLabel: string;
		/** Compare series label (benchmark or ticker). */
		compareLabel: string;
		/** Focal rebased to a common start, index units (100 = start), aligned by time. */
		base: { time: string; value: number }[];
		/** Compare rebased to the SAME start, index units. */
		compare: { time: string; value: number }[];
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
		/** Indicator lines drawn ON the price pane (pane 0), sharing the right price
		 *  scale — moving averages / Bollinger bands. Differentiated by dash + label,
		 *  never hue: each is a neutral-ramp ink, never the accent or up/down colour. */
		overlays?: Overlay[];
		/** Oscillator sub-panes — RSI/MACD — each drawn BELOW the price+volume panes, on its
		 *  own vertical scale. Values arrive already converted to plottable units (the page owns
		 *  minor→major / ×100→index). Differentiated by dash + label + pane, never hue. */
		oscillators?: OscillatorPaneData[];
		/** When set, the chart enters rebased-comparison mode: candles/volume/overlays/oscillators
		 *  are replaced by two neutral rebased lines on an index axis; `null` restores the normal
		 *  view. The two lines separate by weight + dash + label, NEVER hue — and never the accent. */
		comparison?: ComparisonData | null;
	}

	let {
		candles,
		kind = 'candlestick',
		height = '20rem',
		label,
		formatValue = (v: number) => v.toFixed(2),
		overlays = [],
		oscillators = [],
		comparison = null
	}: Props = $props();

	let el: HTMLDivElement;
	let chart: IChartApi | null = null;
	let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null = null;
	let volumeSeries: ISeriesApi<'Histogram'> | null = null;
	// Indicator overlay lines on pane 0 (moving averages / Bollinger). Held in a plain
	// array (like `series`/`volumeSeries`) and rebuilt wholesale on any overlay change,
	// so a toggle never leaves a stale line behind.
	let overlaySeries: ISeriesApi<'Line'>[] = [];
	// Oscillator sub-panes (RSI/MACD). Held flat and rebuilt wholesale on any change — like the
	// overlays — with the extra panes pruned so they never accumulate. `IPriceLine`s (the 30/70/0
	// guide levels) are tracked so a theme toggle can recolour them.
	let oscSeries: ISeriesApi<'Line'>[] = [];
	let oscHistograms: ISeriesApi<'Histogram'>[] = [];
	let oscPriceLines: IPriceLine[] = [];
	let lib: typeof import('lightweight-charts') | null = null;
	let builtKind: 'candlestick' | 'line' | null = null;
	// The two rebased comparison lines ([base, compare]) — present only in comparison mode.
	let compareSeries: ISeriesApi<'Line'>[] = [];
	/** Format a rebased index value for the axis/readout (100.0 = the common start). */
	const formatIndex = (v: number) => v.toFixed(1);

	/** Lerp two concrete `rgb(r, g, b)` strings to a concrete `rgb()` at `t` ∈ [0, 1].
	 *  Both ends come from the token bridge already collapsed to sRGB bytes, so the
	 *  result stays a plain `rgb()` Lightweight can parse — never `color-mix()`/`color(srgb …)`,
	 *  which the library rejects (the volume-bar bug). */
	function lerpInk(a: string, b: string, t: number): string {
		const pa = a.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
		const pb = b.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
		const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
		return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
	}

	// The bar shown in the reserved OHLC readout above the canvas. It DERIVES to the
	// latest bar at rest — so it's never blank and a range/data switch refreshes it for
	// free — and the crosshair handler OVERRIDES it to the hovered bar on move (the
	// overridable-derived pattern; the override clears when `candles` next changes).
	// Carries full OHLC+volume in BOTH candlestick and line mode, since `candles` always does.
	let hoveredBar = $derived<Candle | null>(candles.at(-1) ?? null);

	// The comparison readout line: DERIVES to the latest rebased pair at rest (never blank), and the
	// crosshair handler OVERRIDES it to the hovered session on move — the same overridable-derived
	// pattern as `hoveredBar`. Null unless in comparison mode. Values pre-formatted (index, 1 dp).
	let hoveredCompare = $derived(
		comparison
			? {
					date: formatDate(comparison.base.at(-1)?.time ?? ''),
					baseLabel: comparison.baseLabel,
					baseValue: formatIndex(comparison.base.at(-1)?.value ?? 0),
					compareLabel: comparison.compareLabel,
					compareValue: formatIndex(comparison.compare.at(-1)?.value ?? 0)
				}
			: null
	);

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
		applyOverlayTheme(theme);
		applyOscillatorTheme(theme);
	}

	/** Tear down every existing overlay line and re-add one `lib.LineSeries` per current
	 *  overlay ON pane 0, so it shares the candles' right price scale (a moving average
	 *  sits among the candles). Overlays are QUIET: hairline, no price-line, no last-value
	 *  tag, no crosshair marker — they add no price-axis chrome. Differentiation is dash +
	 *  the table label, never hue. Colour is applied by `applyOverlayTheme` from live tokens. */
	function rebuildOverlays() {
		if (!chart || !lib) return;
		for (const s of overlaySeries) chart.removeSeries(s);
		overlaySeries = [];
		const { LineStyle } = lib;
		for (const ov of overlays) {
			// `[]` → solid · `[6, 3]` (length-2, first ≥ 5) → dashed · anything else → dotted.
			const lineStyle =
				!ov.dash || ov.dash.length === 0
					? LineStyle.Solid
					: ov.dash.length === 2 && ov.dash[0] >= 5
						? LineStyle.Dashed
						: LineStyle.Dotted;
			const s = chart.addSeries(
				lib.LineSeries,
				{
					lineWidth: 1 as LineWidth,
					lineStyle,
					priceLineVisible: false,
					lastValueVisible: false,
					crosshairMarkerVisible: false
				},
				0
			);
			s.setData(ov.data.map((p) => ({ time: p.time as Time, value: p.value })));
			overlaySeries.push(s);
		}
	}

	/** Colour each overlay a concrete neutral-ramp `rgb()` lerped between the muted and
	 *  text inks by its `inkStep` — NEVER the accent or up/down, so a rising MA never reads
	 *  green (CV-A11Y-1). Both ends are concrete rgb from the bridge; the result is too. */
	function applyOverlayTheme(theme: ChartTheme) {
		overlaySeries.forEach((s, i) => {
			s.applyOptions({ color: lerpInk(theme.muted, theme.text, overlays[i]?.inkStep ?? 0.3) });
		});
	}

	/** The oscillator pane count baseline: pane 0 = price; pane 1 = volume when present. */
	function oscBasePane(): number {
		return volumeSeries ? 2 : 1;
	}

	/** Tear down every oscillator series + guide line and rebuild one sub-pane per active oscillator,
	 *  BELOW price+volume. RSI is a single index line with 70/30 guides; MACD is a line + dashed
	 *  signal + a zero-centred histogram with a zero guide. Lines keep their axis value tag + crosshair
	 *  marker (the pane exists to READ that value); the histogram is neutral (sign by side of zero, not
	 *  hue). Colour is applied by applyOscillatorTheme from live tokens. Extra panes from a previous,
	 *  larger set are pruned so panes never accumulate. */
	function rebuildOscillators() {
		if (!chart || !lib) return;
		for (const s of oscSeries) chart.removeSeries(s);
		for (const h of oscHistograms) chart.removeSeries(h);
		oscSeries = [];
		oscHistograms = [];
		oscPriceLines = [];
		const { LineStyle } = lib;
		const base = oscBasePane();
		oscillators.forEach((pane, idx) => {
			const paneIndex = base + idx;
			// Histogram first, so the lines draw above it.
			if (pane.histogram) {
				const h = chart!.addSeries(
					lib!.HistogramSeries,
					{ priceLineVisible: false, lastValueVisible: false },
					paneIndex
				);
				h.setData(pane.histogram.data.map((p) => ({ time: p.time as Time, value: p.value })));
				oscHistograms.push(h);
			}
			let firstLine: ISeriesApi<'Line'> | null = null;
			for (const ln of pane.lines) {
				const lineStyle =
					!ln.dash || ln.dash.length === 0
						? LineStyle.Solid
						: ln.dash.length === 2 && ln.dash[0] >= 5
							? LineStyle.Dashed
							: LineStyle.Dotted;
				const s = chart!.addSeries(
					lib!.LineSeries,
					{
						lineWidth: 1 as LineWidth,
						lineStyle,
						priceLineVisible: false,
						lastValueVisible: true,
						crosshairMarkerVisible: true,
						// index panes show a whole-number 0–100 axis; spread panes format like the price.
						priceFormat:
							pane.format === 'index'
								? { type: 'custom' as const, minMove: 1, formatter: (v: number) => v.toFixed(0) }
								: { type: 'custom' as const, minMove: 0.01, formatter: (v: number) => formatValue(v) }
					},
					paneIndex
				);
				s.setData(ln.data.map((p) => ({ time: p.time as Time, value: p.value })));
				if (!firstLine) firstLine = s;
				oscSeries.push(s);
			}
			// Flat guide levels on the pane's first line series (created with a placeholder colour;
			// applyOscillatorTheme recolours them from live tokens).
			for (const ref of pane.references) {
				const pl = firstLine?.createPriceLine({
					price: ref.value,
					color: 'rgb(128, 128, 128)',
					lineStyle: LineStyle.Dashed,
					lineWidth: 1 as LineWidth,
					axisLabelVisible: true,
					title: ref.label
				});
				if (pl) oscPriceLines.push(pl);
			}
		});
		// Prune panes left over from a previous (larger) oscillator set.
		const want = base + oscillators.length;
		let panes = chart.panes();
		while (panes.length > want) {
			chart.removePane(panes.length - 1);
			panes = chart.panes();
		}
		applyPaneStretch();
	}

	/** Price ~3 · volume ~1 · each oscillator ~1.5 of the vertical space (price stays dominant). */
	function applyPaneStretch() {
		if (!chart) return;
		const panes = chart.panes();
		panes[0]?.setStretchFactor(3);
		let i = 1;
		if (volumeSeries) {
			panes[i]?.setStretchFactor(1);
			i++;
		}
		for (; i < panes.length; i++) panes[i]?.setStretchFactor(1.5);
	}

	/** Colour the oscillator lines a concrete neutral-ramp rgb() (lerpInk by inkStep — never accent
	 *  or up/down), the histogram the same muted ink at reduced alpha as the volume bars (magnitude +
	 *  side-of-zero, never hue), and the guide lines the border ink. All concrete rgb/rgba the chart
	 *  can parse — never color-mix()/color(srgb …). */
	function applyOscillatorTheme(theme: ChartTheme) {
		let li = 0;
		for (const pane of oscillators) {
			for (const ln of pane.lines) {
				oscSeries[li]?.applyOptions({ color: lerpInk(theme.muted, theme.text, ln.inkStep) });
				li++;
			}
		}
		const histColor = theme.muted.replace(/^rgb\((.+)\)$/, 'rgba($1, 0.45)');
		for (const h of oscHistograms) h.applyOptions({ color: histColor });
		for (const pl of oscPriceLines) pl.applyOptions({ color: theme.muted });
	}

	/** Remove the entire normal view — price series, volume, overlays, oscillators — and prune every
	 *  pane back to a single pane 0. Used when entering comparison mode. */
	function teardownNormal() {
		if (!chart) return;
		if (series) {
			chart.removeSeries(series);
			series = null;
		}
		if (volumeSeries) {
			chart.removeSeries(volumeSeries);
			volumeSeries = null;
		}
		for (const s of overlaySeries) chart.removeSeries(s);
		for (const s of oscSeries) chart.removeSeries(s);
		for (const h of oscHistograms) chart.removeSeries(h);
		overlaySeries = [];
		oscSeries = [];
		oscHistograms = [];
		oscPriceLines = [];
		builtKind = null;
		let panes = chart.panes();
		while (panes.length > 1) {
			chart.removePane(panes.length - 1);
			panes = chart.panes();
		}
	}

	/** Draw the two rebased comparison lines on pane 0 (index axis). Base = heavier solid ink, compare
	 *  = lighter dashed ink — separated by weight + dash + label, never hue, never the accent. Both
	 *  carry their axis value tag (the pane exists to read relative performance). Colour by the theme pass. */
	function renderComparison() {
		if (!chart || !lib || !comparison) return;
		teardownNormal();
		for (const s of compareSeries) chart.removeSeries(s);
		compareSeries = [];
		const { LineStyle } = lib;
		const priceFormat = { type: 'custom' as const, minMove: 0.1, formatter: formatIndex };
		const baseS = chart.addSeries(
			lib.LineSeries,
			{
				lineWidth: 2 as LineWidth,
				lineStyle: LineStyle.Solid,
				priceLineVisible: false,
				lastValueVisible: true,
				crosshairMarkerVisible: true,
				priceFormat
			},
			0
		);
		baseS.setData(comparison.base.map((p) => ({ time: p.time as Time, value: p.value })));
		const compareS = chart.addSeries(
			lib.LineSeries,
			{
				lineWidth: 1 as LineWidth,
				lineStyle: LineStyle.Dashed,
				priceLineVisible: false,
				lastValueVisible: true,
				crosshairMarkerVisible: true,
				priceFormat
			},
			0
		);
		compareS.setData(comparison.compare.map((p) => ({ time: p.time as Time, value: p.value })));
		compareSeries = [baseS, compareS];
		reapply();
		chart.timeScale().fitContent();
	}

	/** Colour the comparison lines concrete neutral-ramp rgb — base darker (heavier), compare lighter.
	 *  Never accent, never up/down. */
	function applyComparisonTheme(theme: ChartTheme) {
		compareSeries[0]?.applyOptions({ color: lerpInk(theme.muted, theme.text, 0.1) });
		compareSeries[1]?.applyOptions({ color: lerpInk(theme.muted, theme.text, 0.55) });
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
		if (compareSeries.length) applyComparisonTheme(theme);
	}

	/** Full render: ensure the right series exists, theme it, set data, fit the view. */
	function render() {
		if (!chart) return;
		if (comparison) {
			renderComparison();
			return;
		}
		// Leaving comparison mode: drop the compare lines, then rebuild the normal view.
		if (compareSeries.length) {
			for (const s of compareSeries) chart.removeSeries(s);
			compareSeries = [];
		}
		if (kind !== builtKind || !series) buildSeries();
		// Overlays draw on pane 0 alongside the price series — rebuild AFTER it exists so
		// a toggle re-renders with no stale lines; `reapply()` then colours them in.
		rebuildOverlays();
		rebuildOscillators();
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
			// Single entry point so comparison mode is honoured from first paint and the
			// build/theme/data sequence isn't duplicated here and in `render`.
			render();

			// Override the readout with the hovered bar (or the hovered comparison pair). On the
			// data → that point; off the data (crosshair left, or between points) → the latest, so
			// the line holds rather than blanks. The override clears when the data next changes, so
			// a range switch snaps back to the derived latest. In comparison mode this narrates the
			// two rebased index values instead; otherwise full OHLC+volume (`candles` always carries it).
			onCrosshair = (param) => {
				if (comparison) {
					const b =
						param.time !== undefined
							? comparison.base.find((p) => p.time === param.time)
							: undefined;
					const c =
						param.time !== undefined
							? comparison.compare.find((p) => p.time === param.time)
							: undefined;
					const at = b?.time ?? comparison.base.at(-1)?.time ?? '';
					hoveredCompare = {
						date: formatDate(at),
						baseLabel: comparison.baseLabel,
						baseValue: formatIndex(b?.value ?? comparison.base.at(-1)?.value ?? 0),
						compareLabel: comparison.compareLabel,
						compareValue: formatIndex(c?.value ?? comparison.compare.at(-1)?.value ?? 0)
					};
				} else {
					const match =
						param.time !== undefined ? candles.find((cc) => cc.time === param.time) : undefined;
					hoveredBar = match ?? candles.at(-1) ?? null;
				}
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
			if (chart) {
				for (const s of overlaySeries) chart.removeSeries(s);
				for (const s of oscSeries) chart.removeSeries(s);
				for (const h of oscHistograms) chart.removeSeries(h);
				for (const s of compareSeries) chart.removeSeries(s);
			}
			overlaySeries = [];
			oscSeries = [];
			oscHistograms = [];
			oscPriceLines = [];
			compareSeries = [];
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
		void overlays;
		void oscillators;
		void comparison;
		if (chart) render();
	});
</script>

<figure class="price">
	<CrosshairReadout bar={hoveredBar} {formatValue} comparison={hoveredCompare} />
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
		line-height: var(--gok-type-footnote-line);
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
