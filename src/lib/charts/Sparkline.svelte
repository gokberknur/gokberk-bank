<script lang="ts">
	// Tiny inline sparkline (F11) — wallet / card rows. No axes, labels, or tooltip:
	// just the shape of a trend. Colour follows up/down (auto from first-vs-last) or
	// the accent when no trend is asked for. Reads only `--gok-*` via `chartTheme()`,
	// re-themes live on `data-theme`, lazy-loads ECharts.
	import { onMount } from 'svelte';
	import type { EChartsOption, EChartsType } from 'echarts';
	import { chartTheme, onThemeChange, prefersReducedMotion } from './theme';

	interface Props {
		/** Raw series values (e.g. minor units) — only the shape matters here. */
		values: number[];
		/** CSS height of the spark box. */
		height?: string;
		/** Text alternative summarising the trend (the canvas is decorative). */
		label: string;
		/** Force a colour: 'up'/'down', 'auto' (first-vs-last), or omit for accent. */
		trend?: 'up' | 'down' | 'auto';
	}

	let { values, height = '2.5rem', label, trend }: Props = $props();

	let el: HTMLDivElement;
	let chart: EChartsType | null = null;

	function lineColor(): string {
		const theme = chartTheme();
		if (trend === 'up') return theme.up;
		if (trend === 'down') return theme.down;
		if (trend === 'auto') {
			const first = values[0] ?? 0;
			const last = values[values.length - 1] ?? 0;
			return last < first ? theme.down : theme.up;
		}
		return theme.accent;
	}

	function buildOption(): EChartsOption {
		const reduced = prefersReducedMotion();
		const color = lineColor();
		return {
			animation: !reduced,
			animationDuration: 220,
			animationEasing: 'cubicOut',
			grid: { left: 1, right: 1, top: 2, bottom: 2 },
			xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, i) => i) },
			yAxis: { type: 'value', show: false, scale: true },
			series: [
				{
					type: 'line',
					data: values,
					showSymbol: false,
					smooth: false,
					silent: true,
					lineStyle: { color, width: 1.5 },
					areaStyle: { color, opacity: 0.12 }
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
		void values;
		void trend;
		if (chart) reapply();
	});
</script>

<div class="spark" style:height role="img" aria-label={label}>
	<div class="canvas" bind:this={el}></div>
</div>

<style>
	.spark {
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
		block-size: 100%;
	}
</style>
