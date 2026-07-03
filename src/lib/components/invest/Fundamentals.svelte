<script lang="ts">
	// V09 · Type-branched factual fundamentals — the depth beyond V02's key-stats ledger.
	// A discriminated union on the instrument type decides what an investor actually reads:
	//   stock → revenue (indicative) + earnings per share, then a sector-peers comparison
	//   etf   → ongoing charge (TER) + tracked index, then the fund's top holdings
	//   crypto→ an honest "not applicable" panel (never a blank/dashed equity ledger)
	// Every figure is seeded/deterministic (getFundamentals) — factual data only, ZERO
	// ratings/recommendations/estimates/price-targets. Money is integer minor units.
	//
	// Brand discipline: no accent here — a peer's day change is direction by rule + ▲/▼ +
	// the explicit +/− sign (formatPercent), never colour alone. The dense peer/holdings
	// tables ride the shared RecordList so they recompose to stacked record-cards below
	// ~40rem instead of forcing a horizontal scroll (CV-LAY-5). The host page owns the
	// section eyebrow/heading; this component owns the ledger + its sub-lists.
	import { getFundamentals } from '$lib/invest/fundamentals';
	import { instrumentOf, dayChangeBps } from '$lib/data/portfolio';
	import type { Instrument } from '$lib/data/market';
	import type { Currency } from '$lib/data/money';
	import { formatMoney, formatPercent, formatNumber } from '$lib/format';
	import { goto } from '$app/navigation';
	import RecordList from '$lib/components/layout/RecordList.svelte';

	let { inst }: { inst: Instrument } = $props();

	const f = $derived(getFundamentals(inst));

	// Compact EUR for the (large, indicative) revenue figure, e.g. "€48.2B" — the same
	// trick the instrument page uses for market cap. Revenue is stored in EUR minor units.
	const compactEur = new Intl.NumberFormat('en-IE', {
		style: 'currency',
		currency: 'EUR',
		notation: 'compact',
		maximumFractionDigits: 2
	});

	// Mirrors RecordList's own (non-exported) Column shape, bound to a concrete row so the
	// format callbacks read typed fields.
	type Column<R> = {
		key: string;
		label: string;
		sortable?: boolean;
		numeric?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: R) => string;
	};

	// ── Stock: sector peers (a small like-sector comparison, resolved from the master) ──
	type Peer = {
		symbol: string;
		name: string;
		lastPriceMinor: number;
		currency: Currency;
		bps: number;
	};

	const peers = $derived<Peer[]>(
		f.type === 'stock'
			? f.peerSymbols
					.map((s) => instrumentOf(s))
					.filter((i): i is Instrument => !!i)
					.map((i) => ({
						symbol: i.symbol,
						name: i.name,
						lastPriceMinor: i.lastPriceMinor,
						currency: i.currency,
						bps: dayChangeBps(i)
					}))
			: []
	);

	const peerColumns: Column<Peer>[] = [
		{ key: 'symbol', label: 'Symbol', primary: true },
		{ key: 'name', label: 'Name' },
		{
			key: 'lastPriceMinor',
			label: 'Last',
			numeric: true,
			format: (_v, r) => formatMoney(r.lastPriceMinor, r.currency)
		},
		{
			key: 'bps',
			label: 'Day change',
			numeric: true,
			// Direction by rule + icon + sign (RecordList cells are plain strings — no colour).
			format: (_v, r) => `${r.bps >= 0 ? '▲' : '▼'} ${formatPercent(r.bps / 10000)}`
		}
	];

	// ── ETF: top holdings (display-only — a weight breakdown, nothing to open) ──
	type Holding = { name: string; weightBps: number };

	const holdingColumns: Column<Holding>[] = [
		{ key: 'name', label: 'Holding', primary: true },
		{
			key: 'weightBps',
			label: 'Weight',
			numeric: true,
			// A magnitude, not a delta — plain percent (no signed +/−).
			format: (_v, r) => `${formatNumber(r.weightBps / 100)}%`
		}
	];
</script>

{#snippet stat(term: string, value: string)}
	<div class="stat">
		<dt class="stat-term">{term}</dt>
		<dd class="stat-value gok-tabular-nums">{value}</dd>
	</div>
{/snippet}

{#if f.type === 'stock'}
	<div class="fundamentals">
		<gok-card>
			<dl class="stats">
				{@render stat('Revenue (indicative)', compactEur.format(f.revenueEurMinor / 100))}
				{@render stat('Earnings per share', formatMoney(f.epsMinor, inst.currency))}
			</dl>
		</gok-card>

		<section class="sub" aria-labelledby="fundamentals-peers-heading">
			<h3 id="fundamentals-peers-heading" class="sub-heading gok-headline-6">Sector peers</h3>
			{#if peers.length > 0}
				<RecordList
					columns={peerColumns}
					rows={peers}
					getRowId={(r) => r.symbol}
					selectionMode="none"
					onselect={(r) => goto(`/invest/instrument/${r.symbol}`)}
					accessibleLabel="Sector peers"
				/>
			{:else}
				<p class="note">No sector peers in this universe.</p>
			{/if}
		</section>
	</div>
{:else if f.type === 'etf'}
	<div class="fundamentals">
		<gok-card>
			<dl class="stats">
				{@render stat('Ongoing charge (TER)', `${formatNumber(f.terBps / 100)}%`)}
				{@render stat('Tracked index', f.index)}
			</dl>
		</gok-card>

		<section class="sub" aria-labelledby="fundamentals-holdings-heading">
			<h3 id="fundamentals-holdings-heading" class="sub-heading gok-headline-6">Top holdings</h3>
			<RecordList
				columns={holdingColumns}
				rows={f.holdings}
				getRowId={(r) => r.name}
				accessibleLabel="Top holdings"
			/>
		</section>
	</div>
{:else}
	<gok-empty-state variant="compact">
		<p class="na-title gok-headline-6">Not applicable</p>
		<p class="na-body">Fundamentals don't apply to this asset.</p>
	</gok-empty-state>
{/if}

<style>
	.fundamentals {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* --- Key/value ledger grid (mirrors the instrument page's .stats/.stat idiom) --- */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
		gap: var(--gok-space-400) var(--gok-space-500);
		margin: 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.stat-term {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.stat-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	/* --- Sub-list (sector peers / top holdings) --- */
	.sub {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.sub-heading {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* Reserved quiet line for an empty peer set (no fabricated rows). */
	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Crypto: honest not-applicable panel --- */
	.na-title {
		margin-block-end: var(--gok-space-100);
		color: var(--gok-color-text);
	}

	.na-body {
		margin: 0;
		color: var(--gok-color-text-muted);
	}
</style>
