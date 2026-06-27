<script lang="ts">
	// Stacked bar (F11) — spend by category, cashflow in/out. Accent-led
	// `categoricalRamp` segments, no gridlines (space over rules), muted mono axis
	// labels, and a quiet per-segment tooltip. Vertical by default; `horizontal`
	// swaps the axes. Reads only `--gok-*` via `chartTheme()`, re-themes live on
	// `data-theme`, lazy-loads ECharts.
	import { onMount } from 'svelte';
	import type { EChartsOption, EChartsType } from 'echarts';
	import { chartTheme, onThemeChange, prefersReducedMotion, categoricalRamp } from './theme';
	import { resolveColors } from './util';

	interface BarSeries {
		name: string;
		values: number[];
	}

	interface Props {
		/** Axis categories (one per bar). */
		categories: string[];
		/** Stack segments — each `values[i]` aligns with `categories[i]`. */
		series: BarSeries[];
		/** Format a minor-unit value for the tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Lay the bars horizontally (category axis on the left). */
		horizontal?: boolean;
	}

	let {
		categories,
		series,
		formatValue = (n: number) => String(n),
		height = '16rem',
		label,
		horizontal = false
	}: Props = $props();

	let el: HTMLDivElement;
	let chart: EChartsType | null = null;

	interface AxisParam {
		seriesName: string;
		value: number;
		axisValueLabel: string;
		marker: string;
	}

	function buildOption(): EChartsOption {
		const theme = chartTheme();
		const reduced = prefersReducedMotion();
		const colors = resolveColors(categoricalRamp(theme, series.length));

		const labelAxis = {
			type: 'category' as const,
			data: categories,
			axisLine: { lineStyle: { color: theme.border } },
			axisTick: { show: false },
			axisLabel: { color: theme.muted, fontFamily: theme.fontMono, fontSize: 11, hideOverlap: true }
		};
		const valueAxis = {
			type: 'value' as const,
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: { show: false },
			axisLabel: {
				color: theme.muted,
				fontFamily: theme.fontMono,
				fontSize: 11,
				formatter: (v: number) => formatValue(v)
			}
		};

		return {
			animation: !reduced,
			animationDuration: 260,
			animationEasing: 'cubicOut',
			color: colors,
			grid: { left: 8, right: 12, top: 12, bottom: 4, containLabel: true },
			tooltip: {
				trigger: 'axis',
				backgroundColor: theme.surfaceStrong,
				borderColor: theme.border,
				borderWidth: 1,
				padding: [6, 10],
				textStyle: { color: theme.text, fontFamily: theme.fontMono, fontSize: 12 },
				extraCssText: 'box-shadow: none;',
				axisPointer: { type: 'shadow', shadowStyle: { color: theme.surfaceStrong, opacity: 0.4 } },
				formatter: (p: unknown) => {
					const arr = p as AxisParam[];
					if (!arr.length) return '';
					const head = arr[0].axisValueLabel;
					const rows = arr
						.map((r) => `${r.marker}${r.seriesName}: ${formatValue(r.value)}`)
						.join('<br>');
					return `${head}<br>${rows}`;
				}
			},
			xAxis: horizontal ? valueAxis : labelAxis,
			yAxis: horizontal ? labelAxis : valueAxis,
			series: series.map((s) => ({
				name: s.name,
				type: 'bar' as const,
				stack: 'total',
				data: s.values,
				barMaxWidth: 28,
				itemStyle: { borderColor: theme.surface, borderWidth: 1 }
			}))
		};
	}

	function reapply() {
		chart?.setOption(buildOption(), true);
	}

	onMount(() => {
		let disposed = false;
		let ro: ResizeObserver | undefined;
		let stopTheme: (() => void) | undefined;

		(async () => {
			const echarts = await import('echarts');
			if (disposed) return;
			chart = echarts.init(el, null, { renderer: 'canvas' });
			reapply();
			ro = new ResizeObserver(() => chart?.resize());
			ro.observe(el);
			stopTheme = onThemeChange(reapply);
		})();

		return () => {
			disposed = true;
			ro?.disconnect();
			stopTheme?.();
			chart?.dispose();
			chart = null;
		};
	});

	$effect(() => {
		void categories;
		void series;
		void formatValue;
		void horizontal;
		if (chart) reapply();
	});
</script>

<div class="bar" style:height role="img" aria-label={label}>
	<div class="canvas" bind:this={el}></div>
</div>

<style>
	.bar {
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
		block-size: 100%;
	}
</style>
