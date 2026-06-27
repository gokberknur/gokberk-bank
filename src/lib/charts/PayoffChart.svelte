<script lang="ts">
	// F11 · Payoff glide chart — a two-series line/area over a shared month index: the
	// loan's ORIGINAL balance glide path (running every payment to term, in a muted,
	// dashed neutral) against the AFTER-ACTION path (after I overpay, or after I pay
	// off — the one earned accent, with a soft area fill). It reads only `--gok-*`
	// through `chartTheme()`, re-themes live on `data-theme`, honours reduced motion,
	// and lazy-loads ECharts. The canvas is decorative: every surface that shows it
	// carries an adjacent text summary, so the saving is legible without colour.
	import { onMount } from 'svelte';
	import type { EChartsOption, EChartsType } from 'echarts';
	import { chartTheme, onThemeChange, prefersReducedMotion } from './theme';
	import { formatMoney } from '$lib/format';

	interface Props {
		/** The original balance glide path (minor units), month 0 → term. */
		original: number[];
		/** The balance glide path after the proposed action (minor units). */
		afterAction: number[];
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** CSS height of the chart box. */
		height?: string;
	}

	let { original, afterAction, label, height = '14rem' }: Props = $props();

	let el: HTMLDivElement;
	let chart: EChartsType | null = null;

	interface AxisParam {
		seriesName: string;
		value: number;
		axisValue: string;
		marker: string;
	}

	const eur = (minor: number) => formatMoney(minor, 'EUR');

	function buildOption(): EChartsOption {
		const theme = chartTheme();
		const reduced = prefersReducedMotion();

		// One shared month-index axis; pad the shorter series with trailing zeros so the
		// after-action line clearly rests at zero once the loan has cleared.
		const len = Math.max(original.length, afterAction.length, 2);
		const months = Array.from({ length: len }, (_, i) => String(i));
		const pad = (arr: number[]) => Array.from({ length: len }, (_, i) => arr[i] ?? 0);

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
					const head = `Month ${arr[0].axisValue}`;
					const rows = arr.map((r) => `${r.marker}${r.seriesName}: ${eur(r.value)}`).join('<br>');
					return `${head}<br>${rows}`;
				}
			},
			xAxis: {
				type: 'category',
				data: months,
				boundaryGap: false,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: theme.muted, fontFamily: theme.fontMono, fontSize: 11, hideOverlap: true }
			},
			yAxis: {
				type: 'value',
				splitNumber: 3,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { lineStyle: { color: theme.border, width: 1, type: 'solid' } },
				axisLabel: {
					color: theme.muted,
					fontFamily: theme.fontMono,
					fontSize: 11,
					formatter: (v: number) => eur(v)
				}
			},
			series: [
				{
					name: 'Original',
					type: 'line',
					data: pad(original),
					showSymbol: false,
					smooth: false,
					lineStyle: { color: theme.muted, width: 2, type: 'dashed' },
					itemStyle: { color: theme.muted }
				},
				{
					name: 'After',
					type: 'line',
					data: pad(afterAction),
					showSymbol: false,
					smooth: false,
					lineStyle: { color: theme.accent, width: 2 },
					itemStyle: { color: theme.accent },
					areaStyle: { color: theme.accent, opacity: 0.12 }
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
		void original;
		void afterAction;
		if (chart) reapply();
	});
</script>

<div class="payoff" style:height role="img" aria-label={label}>
	<div class="canvas" bind:this={el}></div>
</div>

<style>
	.payoff {
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
		block-size: 100%;
	}
</style>
