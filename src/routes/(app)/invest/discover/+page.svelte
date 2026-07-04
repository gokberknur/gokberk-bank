<script lang="ts">
	// V13 · Discover — the "find an instrument without knowing the ticker" browse surface.
	// It composes already-built pieces and never places or mutates money: every path routes
	// to the instrument detail (row-activate) or the V03 order ticket (Buy → ?ticket=buy).
	//
	// Top → bottom, single column, no page-level measure cap (the shell already caps):
	//   1. PageHeader
	//   2. An in-page jump-nav (CV-LAY-6) → #search · #browse · #movers.
	//   3. #search — a sticky DiscoverSearch (the fast path leads).
	//   4. #browse — the neutral-list browser (the page body): a level-1 dimension segment
	//      (the page's single earned accent) + a level-2 category tablist, feeding one shared
	//      InstrumentGrid.
	//   5. #movers — de-emphasised market context, placed LAST: symmetric Gainers / Losers.
	//
	// Guardrail (V13 "informs, never hypes"): zero hype copy — categories are factual labels,
	// movers is "biggest moves today"; the ONE accent is the active dimension segment (+ the
	// search focus ring); day-change is rule + sign + arrow + text (InstrumentGrid owns that).
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DiscoverSearch from '$lib/components/invest/DiscoverSearch.svelte';
	import InstrumentGrid from '$lib/components/invest/InstrumentGrid.svelte';
	import { categoriesFor, DIMENSIONS, type ListDimension } from '$lib/invest/lists';
	import { movers } from '$lib/invest/movers';
	import { isMarketOpen } from '$lib/data/market';
	import { setProps, on } from '$lib/wc.svelte';

	// ── Two-level browse state (local $state, no store) ──
	// Level 1 = grouping dimension (the earned accent); level 2 = category within it.
	let activeDimension = $state<ListDimension>('asset');
	let activeCategoryKey = $state(''); // '' → falls back to the dimension's first category

	const categories = $derived(categoriesFor(activeDimension));
	// The selected category, falling back to the first when the key is empty/stale (so a
	// dimension switch always lands on that dimension's first list).
	const activeCategory = $derived(
		categories.find((c) => c.key === activeCategoryKey) ?? categories[0]
	);
	const activeDimensionLabel = $derived(
		DIMENSIONS.find((d) => d.key === activeDimension)?.label ?? ''
	);
	// The controlling-tab id for the shared panel's aria-labelledby.
	const activeTabId = $derived(activeCategory ? `browse-tab-${activeCategory.key}` : undefined);

	// Movers derived once (pure) — biggest moves today, symmetric context, not a leaderboard.
	const m = movers(5);
	const marketOpen = isMarketOpen();

	// ── Level 1: dimension segment. Reset the category so the new dimension's first list shows. ──
	function onDimension(e: Event) {
		activeDimension = (e.target as HTMLElement & { value: string }).value as ListDimension;
		activeCategoryKey = '';
	}

	// ── Level 2: category tablist. Click selects; arrows/Home/End move selection + focus
	//    (roving tabindex, automatic activation — the WAI-ARIA tabs pattern, mirroring the
	//    section sub-nav's keyboard model). ──
	function onTabKeydown(e: KeyboardEvent, index: number) {
		const cats = categories;
		let target = -1;
		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				target = (index + 1) % cats.length;
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				target = (index - 1 + cats.length) % cats.length;
				break;
			case 'Home':
				target = 0;
				break;
			case 'End':
				target = cats.length - 1;
				break;
			default:
				return;
		}
		e.preventDefault();
		const next = cats[target];
		activeCategoryKey = next.key;
		// The button already exists (same dimension, keyed by cat.key) — focus it directly.
		document.getElementById(`browse-tab-${next.key}`)?.focus();
	}

	// Buy anywhere → the instrument detail with the V03 order ticket pre-opened. Discovery
	// never places or mutates money; it only routes to where the trade actually happens.
	function openTicket(symbol: string) {
		goto(`/invest/instrument/${symbol}?ticket=buy`);
	}
</script>

<svelte:head>
	<title>Discover · gökberk bank</title>
</svelte:head>

<div class="page">
	<PageHeader
		eyebrow="Discover"
		title="Find an instrument"
		caption="Search the universe, browse neutral lists, or scan today’s biggest moves."
	/>

	<!-- In-page jump-nav (CV-LAY-6): a calm, mono rail to the page's sections, in on-page order. -->
	<nav class="jump-nav" aria-label="On this page">
		<ul class="jump-list">
			<li><a class="jump-link" href="#search">Search</a></li>
			<li><a class="jump-link" href="#browse">Browse</a></li>
			<li><a class="jump-link" href="#movers">Movers</a></li>
		</ul>
	</nav>

	<!-- 1 · Search — the fast path. Sticky to the top of the content so it stays in reach; a
	     translucent, blurred bar (the app's sticky-chrome idiom) with block padding so browse
	     rows don't bleed under it as they scroll past. -->
	<section id="search" class="search-sec" aria-labelledby="search-heading">
		<h2 id="search-heading" class="visually-hidden">Search instruments</h2>
		<DiscoverSearch placeholder="Search by name or ticker" />
	</section>

	<!-- 2 · Browse — the neutral-list body: a two-level control feeding one shared grid. -->
	<section id="browse" class="browse anchored" aria-labelledby="browse-heading">
		<h2 id="browse-heading" class="visually-hidden">Browse instruments</h2>

		<div class="browse-controls">
			<!-- Level 1: the grouping dimension. Its active segment is the page's single accent. -->
			<gok-segmented
				label="Browse by"
				{@attach setProps({ value: activeDimension })}
				{@attach on('change', onDimension)}
			>
				{#each DIMENSIONS as dim (dim.key)}
					<gok-segmented-item value={dim.key}>{dim.label}</gok-segmented-item>
				{/each}
			</gok-segmented>

			<!-- Level 2: the category within the dimension. A hand-built roving tablist (not
			     gok-tabs) because a single shared grid — not one panel per tab — is the panel,
			     the categories are dynamic per dimension, and selection stays cleanly decoupled
			     from the accent (an accent-free "selected" chip). Scrolls horizontally on narrow
			     screens rather than wrapping to a wall. -->
			<div class="cat-scroll">
				<div class="cat-tabs" role="tablist" aria-label="{activeDimensionLabel} categories">
					{#each categories as cat, i (cat.key)}
						{@const selected = cat.key === activeCategory?.key}
						<button
							type="button"
							role="tab"
							id="browse-tab-{cat.key}"
							class="cat-tab"
							class:is-selected={selected}
							aria-selected={selected}
							aria-controls="browse-panel"
							tabindex={selected ? 0 : -1}
							onclick={() => (activeCategoryKey = cat.key)}
							onkeydown={(e) => onTabKeydown(e, i)}
						>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div id="browse-panel" role="tabpanel" aria-labelledby={activeTabId} class="browse-panel">
			{#if activeCategory && activeCategory.members.length > 0}
				<InstrumentGrid
					instruments={activeCategory.members}
					accessibleLabel="{activeCategory.label} instruments"
					onBuy={openTicket}
					initialSortKey="symbol"
				/>
			{:else}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No instruments in this list yet</p>
					<p class="empty-body">Nothing sits in this list right now — try another category.</p>
				</gok-empty-state>
			{/if}
		</div>
	</section>

	<!-- 3 · Movers — DE-EMPHASISED market context, placed last. Symmetric (Gainers AND Losers
	     always shown) so it reads as context, never a buy-list. Order is by move magnitude, so
	     these grids aren't sortable. -->
	<section id="movers" class="movers anchored" aria-labelledby="movers-heading">
		<div class="movers-head">
			<p class="movers-eyebrow gok-eyebrow">Movers</p>
			<h2 id="movers-heading" class="movers-title gok-headline-5">Biggest moves today</h2>
			{#if !marketOpen}
				<p class="movers-note">Markets are closed — showing moves at last close.</p>
			{/if}
		</div>

		<div class="movers-grid">
			<div class="mover-panel" aria-labelledby="movers-gainers-heading">
				<h3 id="movers-gainers-heading" class="mover-panel-title gok-headline-6">Gainers</h3>
				<InstrumentGrid
					instruments={m.gainers}
					sortable={false}
					accessibleLabel="Biggest gainers today"
					onBuy={openTicket}
				/>
			</div>
			<div class="mover-panel" aria-labelledby="movers-losers-heading">
				<h3 id="movers-losers-heading" class="mover-panel-title gok-headline-6">Losers</h3>
				<InstrumentGrid
					instruments={m.losers}
					sortable={false}
					accessibleLabel="Biggest losers today"
					onBuy={openTicket}
				/>
			</div>
		</div>
	</section>
</div>

<style>
	/* Single column, section rhythm, NO page-level measure cap (the shell's .main-inner
	   already caps the content column — this page fills it). */
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── In-page jump-nav (CV-LAY-6) — calm, mono, sentence-case, a hairline rule below. ── */
	.jump-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-400);
		margin: 0;
		padding: 0;
		padding-block-end: var(--gok-space-300);
		list-style: none;
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.jump-link {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		color: var(--gok-color-text-muted);
		text-decoration: none;
	}

	.jump-link:hover {
		color: var(--gok-color-text);
	}

	.jump-link:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
		border-radius: var(--gok-radius-s);
	}

	/* ── 1 · Sticky search bar ── */
	.search-sec {
		position: sticky;
		inset-block-start: 0;
		z-index: var(--gok-z-sticky);
		padding-block: var(--gok-space-300);
		background: var(--gok-color-surface-translucent);
		backdrop-filter: blur(var(--gok-blur-chrome));
	}

	/* ── 2 · Browse ── */
	.browse {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.browse-controls {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	/* The category row scrolls horizontally on a narrow screen rather than wrapping into a wall;
	   min-inline-size:0 lets the flex item shrink so the overflow actually scrolls. The scrollbar
	   is hidden (a thumb-drag affordance), mirroring the section sub-nav / chart range strips. */
	.cat-scroll {
		min-inline-size: 0;
		max-inline-size: 100%;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.cat-scroll::-webkit-scrollbar {
		display: none;
	}

	.cat-tabs {
		display: flex;
		gap: var(--gok-space-200);
	}

	/* A category chip. Selection is carried by ink + weight + a filled neutral surface (never the
	   green accent — that's spent on the level-1 dimension segment), reinforced by aria-selected. */
	.cat-tab {
		flex: none;
		padding-block: var(--gok-space-200);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		white-space: nowrap;
		cursor: pointer;
		transition: color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.cat-tab:hover {
		color: var(--gok-color-text);
	}

	.cat-tab.is-selected {
		border-color: var(--gok-color-border-strong);
		background: var(--gok-color-surface-strong);
		color: var(--gok-color-text);
		font-weight: var(--gok-font-weight-semibold);
	}

	.cat-tab:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	/* ── 3 · Movers — de-emphasised, symmetric ── */
	.movers {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.movers-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.movers-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.movers-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.movers-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Two panels side by side on desktop (≥ 64rem); stacked below so each grid keeps its width. */
	.movers-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-500);
	}

	@media (min-width: 64rem) {
		.movers-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.mover-panel {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		min-inline-size: 0;
	}

	.mover-panel-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* ── Empty state ── */
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* Anchored sections land clear of the sticky search bar when jumped to. */
	.anchored {
		scroll-margin-block-start: var(--gok-space-800);
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

	/* Smooth jump-scroll only when the user hasn't asked for reduced motion. */
	@media (prefers-reduced-motion: no-preference) {
		:global(html) {
			scroll-behavior: smooth;
		}
	}
</style>
