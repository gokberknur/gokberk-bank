<script lang="ts">
	// The ledger toolbar: free-text search, faceted filters (type / status /
	// direction), a density switch, and a removable-chip summary beneath. It owns
	// no row state — it drives the `transactions` view (filter + search) and the
	// shared `density` switch. Custom-element events arrive via `on`; reflected
	// boolean/string props go in via `setProps`. No `bind:` on custom elements:
	// search reads its value off the event target, and the input is reset
	// imperatively when filters are cleared.
	import { transactions } from '$lib/state/transactions.svelte';
	import { density } from '$lib/state/density.svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import type { TxnType, TxnStatus } from '$lib/data/types';
	import type { TxnDirection } from '$lib/accounts/txn-filter';
	import type { Density } from '$lib/state/density.svelte';

	const TYPE_OPTIONS: { value: TxnType; label: string }[] = [
		{ value: 'card', label: 'Card' },
		{ value: 'sepa', label: 'SEPA' },
		{ value: 'swift', label: 'SWIFT' },
		{ value: 'transfer', label: 'Transfer' },
		{ value: 'fee', label: 'Fee' },
		{ value: 'topup', label: 'Top-up' },
		{ value: 'fx', label: 'Exchange' }
	];

	const STATUS_OPTIONS: { value: TxnStatus; label: string }[] = [
		{ value: 'pending', label: 'Pending' },
		{ value: 'settled', label: 'Settled' }
	];

	function typeLabel(t: TxnType): string {
		return TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
	}

	// The search field, captured via an attachment so "Clear all" can reset its
	// value imperatively (custom elements take no bind:value — set the property).
	let searchEl: (HTMLElement & { value: string }) | null = null;
	function captureSearch(node: Element) {
		searchEl = node as HTMLElement & { value: string };
	}

	function onSearchInput(e: Event) {
		transactions.setSearch((e.target as HTMLInputElement).value);
	}

	function onTypeSelect(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		transactions.toggleType(value as TxnType);
	}

	function onStatusSelect(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		transactions.toggleStatus(value as TxnStatus);
	}

	function onDirection(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		transactions.setDirection(value as TxnDirection);
	}

	function onDensity(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		density.set(value as Density);
	}

	function clearSearchField() {
		if (searchEl) searchEl.value = '';
	}

	function clearAll() {
		transactions.clearFilters();
		clearSearchField();
	}

	// The active-filter chips, encoding which filter each one removes.
	type Chip = { value: string; label: string };
	const chips = $derived.by<Chip[]>(() => {
		const v = transactions.view;
		const out: Chip[] = [];
		const q = v.search.trim();
		if (q) out.push({ value: 'search', label: `Search: ${q}` });
		for (const t of v.types) out.push({ value: `type:${t}`, label: typeLabel(t) });
		for (const s of v.statuses) out.push({ value: `status:${s}`, label: s === 'pending' ? 'Pending' : 'Settled' });
		if (v.direction !== 'all') out.push({ value: 'direction', label: v.direction === 'in' ? 'Money in' : 'Money out' });
		return out;
	});

	function onChipRemove(e: Event) {
		const value = (e as CustomEvent<{ value: string }>).detail.value;
		if (value === 'search') {
			transactions.setSearch('');
			clearSearchField();
		} else if (value === 'direction') {
			transactions.setDirection('all');
		} else if (value.startsWith('type:')) {
			transactions.toggleType(value.slice('type:'.length) as TxnType);
		} else if (value.startsWith('status:')) {
			transactions.toggleStatus(value.slice('status:'.length) as TxnStatus);
		}
	}
</script>

<section class="toolbar" aria-label="Filter transactions">
	<div class="controls">
		<div class="search">
			<gok-input
				type="search"
				label="Search transactions"
				placeholder="Search transactions"
				{@attach captureSearch}
				{@attach on('input', onSearchInput)}
			></gok-input>
		</div>

		<div class="facets">
			<gok-menu accessible-label="Filter by type" {@attach on('gok-select', onTypeSelect)}>
				<gok-button slot="trigger" variant="secondary">Type</gok-button>
				{#each TYPE_OPTIONS as opt (opt.value)}
					<gok-menu-item
						type="checkbox"
						value={opt.value}
						{@attach setProps({ checked: transactions.view.types.includes(opt.value) })}
					>
						{opt.label}
					</gok-menu-item>
				{/each}
			</gok-menu>

			<gok-menu accessible-label="Filter by status" {@attach on('gok-select', onStatusSelect)}>
				<gok-button slot="trigger" variant="secondary">Status</gok-button>
				{#each STATUS_OPTIONS as opt (opt.value)}
					<gok-menu-item
						type="checkbox"
						value={opt.value}
						{@attach setProps({ checked: transactions.view.statuses.includes(opt.value) })}
					>
						{opt.label}
					</gok-menu-item>
				{/each}
			</gok-menu>

			<gok-segmented
				label="Direction"
				{@attach setProps({ value: transactions.view.direction })}
				{@attach on('change', onDirection)}
			>
				<gok-segmented-item value="all">All</gok-segmented-item>
				<gok-segmented-item value="in">In</gok-segmented-item>
				<gok-segmented-item value="out">Out</gok-segmented-item>
			</gok-segmented>
		</div>

		<div class="density">
			<gok-segmented
				label="Density"
				{@attach setProps({ value: density.current })}
				{@attach on('change', onDensity)}
			>
				<gok-segmented-item value="comfortable">Comfortable</gok-segmented-item>
				<gok-segmented-item value="compact">Compact</gok-segmented-item>
			</gok-segmented>
		</div>
	</div>

	{#if chips.length > 0}
		<div class="chips" aria-label="Active filters">
			{#each chips as chip (chip.value)}
				<gok-tag removable value={chip.value} {@attach on('remove', onChipRemove)}>
					{chip.label}
				</gok-tag>
			{/each}

			{#if transactions.hasFilters}
				<gok-button variant="secondary" size="s" {@attach on('click', clearAll)}>Clear all</gok-button>
			{/if}
		</div>
	{/if}
</section>

<style>
	.toolbar {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--gok-space-300);
	}

	.search {
		flex: 1 1 16rem;
		min-inline-size: 12rem;
	}

	.facets,
	.density {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.density {
		margin-inline-start: auto;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}
</style>
