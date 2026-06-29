<script lang="ts">
	// Allocation / spend donut (F11). A thin ECharts wrapper: a ring (never a full
	// pie), accent-led `categoricalRamp` segments separated by hairline gaps, labels
	// kept off the chart (legend is the caller's job), a quiet tooltip with name +
	// formatted value + percent, and an optional mono readout in the hole. Reads only
	// `--gok-*` via `chartTheme()`, re-themes live on `data-theme`, lazy-loads ECharts.
	import { onMount } from 'svelte';
	import type { EChartsOption, EChartsType } from 'echarts';
	import { chartTheme, onThemeChange, prefersReducedMotion, categoricalRamp } from './theme';
	import { resolveColors } from './util';
	import type { NamedValue } from './series';

	interface Props {
		/** Slices (minor units in `value`). */
		data: NamedValue[];
		/** Format a minor-unit value for the tooltip (default: raw number). */
		formatValue?: (minor: number) => string;
		/** CSS height of the chart box. */
		height?: string;
		/** Text alternative summarising the key figure (the canvas is decorative). */
		label: string;
		/** Optional mono eyebrow in the donut hole. */
		centerTitle?: string;
		/** Optional value in the donut hole (already formatted by the caller). */
		centerValue?: string;
	}

	let {
		data,
		formatValue = (n: number) => String(n),
		height = '14rem',
		label,
		centerTitle,
		centerValue
	}: Props = $props();

	let el: HTMLDivElement;
	let chart: EChartsType | null = null;

	interface PieParam {
		name: string;
		value: number;
		percent: number;
	}

	function buildOption(): EChartsOption {
		const theme = chartTheme();
		const reduced = prefersReducedMotion();
		const colors = resolveColors(categoricalRamp(theme, data.length));
		return {
			animation: !reduced,
			animationDuration: 240,
			animationEasing: 'cubicOut',
			color: colors,
			tooltip: {
				trigger: 'item',
				backgroundColor: theme.surfaceStrong,
				borderColor: theme.border,
				borderWidth: 1,
				padding: [6, 10],
				textStyle: { color: theme.text, fontFamily: theme.fontMono, fontSize: 12 },
				extraCssText: 'box-shadow: none;',
				formatter: (p: unknown) => {
					const d = p as PieParam;
					return `${d.name}: ${formatValue(d.value)} (${d.percent}%)`;
				}
			},
			series: [
				{
					type: 'pie',
					radius: ['62%', '86%'],
					avoidLabelOverlap: false,
					label: { show: false },
					labelLine: { show: false },
					itemStyle: { borderColor: theme.surface, borderWidth: 2 },
					emphasis: { scale: false },
					data: data.map((d) => ({ name: d.name, value: d.value }))
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

	// Re-render when the data / formatter change (guarded until the instance exists).
	$effect(() => {
		// Touch reactive inputs so the effect tracks them.
		void data;
		void formatValue;
		if (chart) reapply();
	});
</script>

<div class="donut" style:height role="img" aria-label={label}>
	<div class="canvas" bind:this={el}></div>
	{#if centerTitle || centerValue}
		<div class="hole" aria-hidden="true">
			{#if centerTitle}<span class="title">{centerTitle}</span>{/if}
			{#if centerValue}<span class="value">{centerValue}</span>{/if}
		</div>
	{/if}
</div>

<style>
	.donut {
		position: relative;
		inline-size: 100%;
	}

	.canvas {
		inline-size: 100%;
		block-size: 100%;
	}

	.hole {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--gok-space-100);
		pointer-events: none;
	}

	.title {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--gok-color-text-muted);
	}

	.value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		font-weight: 600;
		color: var(--gok-color-text);
		font-variant-numeric: tabular-nums;
	}
</style>
