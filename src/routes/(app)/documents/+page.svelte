<script lang="ts">
	// D01 documents vault — one home for every statement, agreement, policy,
	// certificate, and terms pack. Quiet editorial chrome (mono eyebrow + title),
	// a search field and a row of category chips, then the whole vault as one
	// gok-table. The one earned accent is spent twice in the same role — the active
	// category chip (selected) and the Download primary in the viewer.
	//
	// gok-table cells are formatted **strings** only (dogfooding #11): `column.format`
	// returns text, and `columns`/`rows` are handed in as DOM **properties** via
	// setProps (objects/arrays can't survive attribute stringification). So a signed
	// document reads as signed through a string "✓ Signed" cell, never a rich tag —
	// the tag lives in the viewer, where we own the markup.
	import { documents, type DocCategory } from '$lib/state/documents.svelte';
	import { DOC_CATEGORY_LABELS, type BankDocument } from '$lib/data/documents-data';
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { isSignable } from '$lib/documents/esign';
	import DocumentViewer from '$lib/components/documents/DocumentViewer.svelte';

	const rows = $derived(documents.filtered);
	const categories = $derived(documents.categories);
	const counts = $derived(documents.counts);
	const activeCategory = $derived(documents.category);

	// Documents awaiting my signature — a quiet, separate affordance (the table cells
	// are strings only, so the Sign link can't live inside a cell). Each links to the
	// D02 signing flow. Never the accent: signing is earned inside the flow, not here.
	const toSign = $derived(rows.filter((d) => isSignable(d)));

	type Column = {
		key: string;
		label: string;
		primary?: boolean;
		numeric?: boolean;
		width?: string;
		format?: (value: unknown, row: BankDocument) => string;
	};

	// Strings only (dogfooding #11) — every cell is formatted text. Signed state is a
	// "✓ Signed" / "—" string (rule + icon + text), not a colour or a rich node.
	const columns: Column[] = [
		{ key: 'title', label: 'Document', primary: true },
		{
			key: 'category',
			label: 'Type',
			width: '8rem',
			format: (v) => DOC_CATEGORY_LABELS[v as DocCategory]
		},
		{ key: 'source', label: 'Source', width: '10rem' },
		{
			key: 'dateIso',
			label: 'Date',
			width: '8rem',
			format: (v) => formatDate(v as string)
		},
		{
			key: 'sizeKb',
			label: 'Size',
			numeric: true,
			width: '6rem',
			format: (v) => `${v as number} KB`
		},
		{
			key: 'signed',
			label: 'Signed',
			width: '7rem',
			format: (v) => ((v as boolean) ? '✓ Signed' : '—')
		}
	];

	const getRowId = (d: BankDocument) => d.id;

	// The viewer is driven by a controlled selection (dogfooding #12): the same row
	// can reopen because we clear the table's selection on close.
	let selectedId = $state<string | null>(null);
	const selectedDoc = $derived(selectedId ? (documents.document(selectedId) ?? null) : null);

	function onSearch(e: Event) {
		documents.setQuery((e.target as HTMLInputElement).value);
	}

	function selectCategory(c: DocCategory | 'all') {
		documents.setCategory(c);
	}

	function onSelection(e: Event) {
		const id = (e as CustomEvent<{ ids: string[] }>).detail.ids?.[0];
		if (id) selectedId = id;
	}

	function closeViewer() {
		// Clearing the id clears the controlled selection, so the same row re-opens.
		selectedId = null;
	}
</script>

<svelte:head>
	<title>Documents · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Documents</p>
		<h1 class="head-title gok-headline-2">My documents</h1>
		<p class="head-sub">Every statement, contract and certificate, in one place.</p>
	</header>

	<section class="filters" aria-label="Filter documents">
		<div class="search">
			<gok-input
				type="search"
				label="Search documents"
				placeholder="Search documents"
				{@attach on('input', onSearch)}
			></gok-input>
		</div>

		<div class="chips" role="group" aria-label="Filter by type">
			<gok-button
				variant={activeCategory === 'all' ? 'primary' : 'secondary'}
				size="s"
				aria-pressed={activeCategory === 'all'}
				{@attach on('click', () => selectCategory('all'))}
			>
				All <span class="chip-count gok-tabular-nums">{counts.all}</span>
			</gok-button>

			{#each categories as chip (chip.category)}
				<gok-button
					variant={activeCategory === chip.category ? 'primary' : 'secondary'}
					size="s"
					aria-pressed={activeCategory === chip.category}
					{@attach on('click', () => selectCategory(chip.category))}
				>
					{chip.label} <span class="chip-count gok-tabular-nums">{counts[chip.category]}</span>
				</gok-button>
			{/each}
		</div>
	</section>

	{#if toSign.length > 0}
		<section class="to-sign" aria-label="Documents awaiting my signature">
			<p class="to-sign-eyebrow gok-eyebrow">Awaiting my signature</p>
			<ul class="to-sign-list">
				{#each toSign as d (d.id)}
					<li class="to-sign-row">
						<span class="to-sign-title">{d.title}</span>
						<gok-link href={`/documents/${d.id}/sign`}>Sign</gok-link>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<gok-table
		selection-mode="single"
		accessible-label="My documents"
		{@attach setProps({ columns, rows, getRowId, selection: selectedId ? [selectedId] : [] })}
		{@attach on('gok-selection-change', onSelection)}
	>
		<div slot="empty" class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No documents match</p>
				<p class="empty-body">Try another type or search.</p>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<DocumentViewer doc={selectedDoc} open={selectedDoc !== null} onclose={closeViewer} />

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.search {
		max-inline-size: 24rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* No colour override — the count inherits the chip's foreground so it stays
	   legible on both the muted secondary and the green active (primary) chip. */
	.chip-count {
		font-variant-numeric: tabular-nums;
	}

	/* Awaiting-signature affordance — quiet, hairline, never the accent. */
	.to-sign {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding: var(--gok-space-400);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
	}

	.to-sign-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.to-sign-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.to-sign-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.to-sign-row:first-child {
		border-block-start: none;
	}

	.to-sign-title {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.empty {
		padding-block: var(--gok-space-500);
	}

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
</style>
