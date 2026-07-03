<script lang="ts">
	// V12 · Projection calculator — a neutral what-if illustration built entirely from the
	// user's OWN assumptions (a monthly contribution, an expected annual return, a horizon).
	// It is never advice: no "recommended", no "you should", no "target". The maths live in
	// the pure `project` engine; this component only gathers inputs and renders the result.
	//
	// The single accent is spent on the SELECTED horizon segment only — never on the
	// projected value or any number, so the slider fill is neutralised to a monochrome role.
	// Money is integer EUR minor units throughout; interop is strictly setProps/on (never
	// bind:) on the gok-* hosts — the money mirror below is a plain Svelte composite, so its
	// value/onchange props are fine.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { project, DEFAULT_ANNUAL_BPS, HORIZON_YEARS } from '$lib/invest/projection';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	let { startMinor }: { startMinor: number } = $props();

	let monthlyMinor = $state(20000); // €200/mo default
	let annualBps = $state(DEFAULT_ANNUAL_BPS); // 6.0%
	let years = $state<number>(10);

	const result = $derived(project({ startMinor, monthlyMinor, annualBps, years }));
	const projectedLabel = $derived(formatMoney(result.projectedMinor, 'EUR'));

	// The percent field is SEEDED once (uncontrolled) and then read from its events — pushing
	// a reformatted value back on every keystroke would fight the caret. The field's own value
	// is the readout of the current assumption.
	const initialReturnPct = (DEFAULT_ANNUAL_BPS / 100).toFixed(1); // "6.0"

	function onSlider(event: Event) {
		monthlyMinor = (event as CustomEvent<{ value: number }>).detail.value;
	}

	function onMoney(minor: number) {
		monthlyMinor = minor;
	}

	function onReturn(event: Event) {
		const raw = (event.target as HTMLInputElement).value;
		const pct = Number.parseFloat(raw);
		if (Number.isFinite(pct)) annualBps = Math.round(pct * 100);
	}

	function onHorizon(event: Event) {
		years = Number((event as CustomEvent<{ value: string }>).detail.value);
	}
</script>

<section class="calc" aria-label="Projection — an illustration built from your own assumptions">
	<div class="inputs">
		<!-- 1 · Monthly contribution — a slider mirrored by the F07 money input; both drive
		     `monthlyMinor`, so dragging and typing stay in sync. -->
		<div class="field">
			<gok-slider
				label="Monthly contribution"
				min={0}
				max={200000}
				step={5000}
				{@attach setProps({ value: monthlyMinor, showValue: false })}
				{@attach on('input', onSlider)}
				{@attach on('change', onSlider)}
			></gok-slider>
			<MoneyInput
				label="Monthly contribution"
				currency="EUR"
				value={monthlyMinor}
				onchange={onMoney}
				minMinor={0}
				maxMinor={200000}
			/>
		</div>

		<!-- 2 · Expected annual return — a user-editable percent, disclosed as an assumption. -->
		<div class="field">
			<gok-input
				type="number"
				inputmode="decimal"
				label="Expected annual return (%)"
				min="0"
				step="0.1"
				default-value={initialReturnPct}
				reserve-message
				{@attach on('input', onReturn)}
				{@attach on('change', onReturn)}
			></gok-input>
			<p class="caption">An assumption you set — not a forecast.</p>
		</div>

		<!-- 3 · Horizon — the one accent lands on the selected segment. -->
		<div class="field">
			<span class="field-label" id="projection-horizon">Horizon</span>
			<gok-segmented
				label="Horizon"
				{@attach setProps({ value: String(years) })}
				{@attach on('change', onHorizon)}
			>
				{#each HORIZON_YEARS as horizon (horizon)}
					<gok-segmented-item value={String(horizon)}>{horizon} yr</gok-segmented-item>
				{/each}
			</gok-segmented>
		</div>
	</div>

	<!-- Output — the illustration. All figures monochrome; no accent, no status hue. -->
	<gok-card variant="outlined" class="illustration">
		<p class="eyebrow gok-eyebrow">Illustration</p>

		<p class="projected gok-tabular-nums">{projectedLabel}</p>
		<p class="projected-label">Projected value</p>

		<dl class="ledger">
			<div class="row">
				<dt>Total contributed</dt>
				<dd class="gok-tabular-nums">{formatMoney(result.contributedMinor, 'EUR')}</dd>
			</div>
			<div class="row">
				<dt>Projected growth</dt>
				<dd class="gok-tabular-nums">{formatMoney(result.growthMinor, 'EUR')}</dd>
			</div>
		</dl>

		<p class="caveat">
			Assumptions you set — not advice. Past performance doesn't predict future returns.
		</p>

		<!-- Polite live region: re-announces the projection as the inputs change. -->
		<p class="sr-only" aria-live="polite">Illustrative projected value: {projectedLabel}</p>
	</gok-card>
</section>

<style>
	.calc {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.inputs {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	/* Neutralise the slider's earned accent — the one accent belongs to the horizon segment. */
	gok-slider {
		--gok-slider-fill-color: var(--gok-color-text);
		--gok-slider-thumb-border-color: var(--gok-color-text);
	}

	.field-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.caption {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	/* --- The illustration output --- */
	.eyebrow {
		margin: 0 0 var(--gok-space-300);
		color: var(--gok-color-text-muted);
	}

	.projected {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-headline-2-size);
		line-height: var(--gok-type-headline-2-line);
		letter-spacing: var(--gok-type-headline-2-tracking);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.projected-label {
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: var(--gok-space-400) 0 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.caveat {
		margin: var(--gok-space-400) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		overflow: hidden;
		white-space: nowrap;
	}
</style>
