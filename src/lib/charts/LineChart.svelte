<script lang="ts">
	// Calm line / area over time (F11) — net worth, balance history. A single accent
	// line over a soft accent-tinted fill (opacity, not a gradient slab), sparse mono
	// date ticks, a whisper of a baseline instead of a grid, and a quiet tooltip with
	// the date + formatted value. Reads only `--gok-*` via `chartTheme()`, re-themes
	// live on `data-theme`, lazy-loads ECharts. No bounce.
	import { onMount } from 'svelte';
	import type { EChartsOption, EChartsType } from 'echarts';
	import { chartTheme, onThemeChange, prefersReducedMotion } from './theme';
	import type { SeriesPoint } from './series';

	interface Props {
		/** Points (minor units in `value`). */
		data: SeriesPoint[];
		/** Format a minor-unit value for the tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Soft accent area fill under the line. */
		area?: boolean;
	}

	let {
		data,
		formatValue = (n: number) => String(n),
		height = '16rem',
		label,
		area = true
	}: Props = $props();

	let el: HTMLDivElement;
	let chart: EChartsType | null = null;

	interface AxisParam {
		axisValue: string;
		value: number;
	}

	/** Short, sentence-case date tick (e.g. "3 Jun") — mono, sparse. */
	function tick(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}

	/** Year-only tick (e.g. "2031") — for a range that spans several years. */
	function yearTick(iso: string): string {
		return String(new Date(iso).getFullYear());
	}

	/** Full date incl. the year (e.g. "3 Jun 2031") — the tooltip on a multi-year range. */
	function fullTick(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	/** True when the series straddles more than one calendar year (e.g. a 25-year
	 * amortization) — then day+month ticks all collapse to "1 Jan", so the axis reads
	 * the year instead. LEND-D-03. */
	function spansMultipleYears(): boolean {
		if (data.length === 0) return false;
		const years = data.map((d) => new Date(d.date).getFullYear());
		return Math.max(...years) !== Math.min(...years);
	}

	function buildOption(): EChartsOption {
		const theme = chartTheme();
		const reduced = prefersReducedMotion();
		// A multi-year range reads its ticks as years; the tooltip keeps the full date.
		const multiYear = spansMultipleYears();
		const axisTick = multiYear ? yearTick : tick;
		const tipTick = multiYear ? fullTick : tick;
		return {
			animation: !reduced,
			animationDuration: 260,
			animationEasing: 'cubicOut',
			grid: { left: 8, right: 12, top: 12, bottom: 4, containLabel: true },
			tooltip: {
				trigger: 'axis',
				backgroundColor: theme.surfaceStrong,
				borderColor: theme.border,
				borderWidth: 1,
				padding: [6, 10],
				textStyle: { color: theme.text, fontFamily: theme.fontMono, fontSize: 12 },
				extraCssText: 'box-shadow: none;',
				axisPointer: { type: 'line', lineStyle: { color: theme.border, width: 1 } },
				formatter: (p: unknown) => {
					const arr = p as AxisParam[];
					if (!arr.length) return '';
					return `${tipTick(arr[0].axisValue)} — ${formatValue(arr[0].value)}`;
				}
			},
			xAxis: {
				type: 'category',
				data: data.map((d) => d.date),
				boundaryGap: false,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: theme.muted,
					fontFamily: theme.fontMono,
					fontSize: 11,
					hideOverlap: true,
					formatter: (v: string) => axisTick(v)
				}
			},
			yAxis: {
				type: 'value',
				scale: true,
				splitNumber: 3,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { lineStyle: { color: theme.border, width: 1, type: 'solid' } },
				axisLabel: {
					color: theme.muted,
					fontFamily: theme.fontMono,
					fontSize: 11,
					formatter: (v: number) => formatValue(v)
				}
			},
			series: [
				{
					type: 'line',
					data: data.map((d) => d.value),
					showSymbol: false,
					smooth: false,
					lineStyle: { color: theme.accent, width: 2 },
					itemStyle: { color: theme.accent },
					areaStyle: area ? { color: theme.accent, opacity: 0.12 } : undefined
				}
			]
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
		void data;
		void formatValue;
		void area;
		if (chart) reapply();
	});
</script>

<div class="line" style:height role="img" aria-label={label}>
	<div class="canvas" bind:this={el}></div>
</div>

<style>
	.line {
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
		block-size: 100%;
	}
</style>
