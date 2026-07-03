<script lang="ts">
	// V12 P/L split — the realized-vs-unrealized breakdown that sits beside the V01
	// all-time line. Three rows: unrealized (what I still hold, at average cost),
	// realized (from executed sells), and their total (emphasized). Each figure is
	// carried by rule + ▲/▼ + explicit sign + the status role ON THE NUMBER ONLY —
	// never hue alone; the labels stay monochrome. A quiet factual cost-basis note
	// and a "view statement" link that stubs to the documents vault round it out.
	import { formatMoney } from '$lib/format';

	let {
		unrealizedMinor,
		realizedMinor
	}: { unrealizedMinor: number; realizedMinor: number } = $props();

	const totalMinor = $derived(unrealizedMinor + realizedMinor);

	// The sign bucket that drives the status role + icon + screen-reader word.
	function signOf(n: number): 'pos' | 'neg' | 'flat' {
		return n > 0 ? 'pos' : n < 0 ? 'neg' : 'flat';
	}
</script>

<!-- One P/L row: monochrome label + a signed EUR figure carried by rule + ▲/▼ +
     sign, with the status role on the number only. `emphasis` flags the total. -->
{#snippet plRow(label: string, amountMinor: number, emphasis: boolean)}
	{@const sign = signOf(amountMinor)}
	<div class="row" class:row-total={emphasis}>
		<span class="row-label">{label}</span>
		<span class="row-value gok-tabular-nums" data-sign={sign}>
			<span class="row-icon" aria-hidden="true"
				>{sign === 'pos' ? '▲' : sign === 'neg' ? '▼' : '—'}</span
			>
			<span class="visually-hidden">{sign === 'pos' ? 'up' : sign === 'neg' ? 'down' : 'flat'}</span>
			{formatMoney(amountMinor, 'EUR', { signDisplay: true })}
		</span>
	</div>
{/snippet}

<gok-card class="card">
	<div class="body">
		<p class="eyebrow gok-eyebrow">P/L split</p>

		<div class="rows">
			{@render plRow('Unrealized', unrealizedMinor, false)}
			{@render plRow('Realized', realizedMinor, false)}
			<gok-divider></gok-divider>
			{@render plRow('Total', totalMinor, true)}
		</div>

		<p class="note">Cost basis: average cost.</p>

		<a class="statement-link" href="/documents">View statement</a>
	</div>
</gok-card>

<style>
	.card {
		display: block;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.row-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row-value {
		display: inline-flex;
		align-items: baseline;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* Status role lands on the number only — rule + icon + sign carry it too. */
	.row-value[data-sign='pos'] {
		color: var(--gok-color-status-success);
	}

	.row-value[data-sign='neg'] {
		color: var(--gok-color-status-error);
	}

	.row-icon {
		font-size: 0.7em;
	}

	/* The total row reads a touch heavier — larger + semibold, label stays mono ink. */
	.row-total .row-label {
		font-weight: var(--gok-font-weight-semibold);
	}

	.row-total .row-value {
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.statement-link {
		align-self: flex-start;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.statement-link:hover {
		color: var(--gok-color-text);
	}

	.statement-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		clip-path: inset(50%);
		white-space: nowrap;
		overflow: hidden;
	}
</style>
