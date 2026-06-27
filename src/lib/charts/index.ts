// Charts barrel (F11). One import surface for the app-local chart wrappers and the
// pure helpers they share. Wrappers stay presentational and prop-driven; routes
// import from here and never touch a charting library directly.

export { default as DonutChart } from './DonutChart.svelte';
export { default as LineChart } from './LineChart.svelte';
export { default as PriceChart } from './PriceChart.svelte';
export { default as Sparkline } from './Sparkline.svelte';
export { default as StackedBar } from './StackedBar.svelte';

// The token bridge + reduced-motion / theme-change helpers + the accent-led ramp.
export {
	chartTheme,
	onThemeChange,
	prefersReducedMotion,
	categoricalRamp,
	type ChartTheme
} from './theme';

// Pure series helpers + their data shapes.
export {
	categoryBreakdown,
	netWorthSeriesEur,
	balanceSparkline,
	type NamedValue,
	type SeriesPoint
} from './series';
