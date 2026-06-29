<script lang="ts">
	// V05 · Watchlists — named lists of instruments I track but may not own. A list
	// switcher (the active tab is the single accent, alongside the add primary), the
	// active list's grid (the hand-built WatchTable, since gok-table can't host a
	// per-row Sparkline — dogfooding #27), and the F10 add-instruments combobox. List
	// management is light: a New list / rename inline-name dialog and a quiet delete
	// confirm. Web-component interop is strictly setProps/on from wc.svelte — never
	// bind: on a gok-* element (dogfooding #21). First-person, sentence-case throughout.
	import { setProps, on } from '$lib/wc.svelte';
	import { watchlists } from '$lib/state/watchlists.svelte';
	import WatchTable from '$lib/components/invest/WatchTable.svelte';
	import AddInstruments from '$lib/components/invest/AddInstruments.svelte';

	const lists = $derived(watchlists.all());
	const active = $derived(watchlists.active());
	const activeId = $derived(active?.id ?? null);
	const activeName = $derived(active?.name ?? '');
	const count = $derived(active?.symbols.length ?? 0);
	const countLabel = $derived(count === 1 ? '1 instrument' : `${count} instruments`);

	function selectList(id: string) {
		watchlists.setActive(id);
	}

	// ── Add instruments (the combobox dialog) ──
	let addOpen = $state(false);
	function openAdd() {
		addOpen = true;
	}
	function closeAdd() {
		addOpen = false;
	}

	// ── New list / rename — a single inline-name dialog ──
	let nameDialogOpen = $state(false);
	let nameMode = $state<'create' | 'rename'>('create');
	let nameDraft = $state('');
	const nameValid = $derived(nameDraft.trim().length > 0);
	const nameHeading = $derived(nameMode === 'create' ? 'New watchlist' : 'Rename list');
	const nameCta = $derived(nameMode === 'create' ? 'Create' : 'Save');

	function openCreate() {
		nameMode = 'create';
		nameDraft = '';
		nameDialogOpen = true;
	}
	function openRename() {
		if (!active) return;
		nameMode = 'rename';
		nameDraft = active.name;
		nameDialogOpen = true;
	}
	function closeNameDialog() {
		nameDialogOpen = false;
	}
	function onNameInput(e: Event) {
		nameDraft = (e.target as HTMLInputElement).value;
	}
	function submitName() {
		const name = nameDraft.trim();
		if (!name) return;
		if (nameMode === 'create') {
			watchlists.create(name);
		} else if (activeId) {
			watchlists.rename(activeId, name);
		}
		nameDialogOpen = false;
	}
	function onNameKeydown(e: Event) {
		if ((e as KeyboardEvent).key === 'Enter' && nameValid) {
			e.preventDefault();
			submitName();
		}
	}

	// ── Delete list — a light confirm (deleting a populated list is mildly destructive) ──
	let deleteOpen = $state(false);
	function openDelete() {
		if (active) deleteOpen = true;
	}
	function closeDelete() {
		deleteOpen = false;
	}
	function confirmDelete() {
		if (activeId) watchlists.remove(activeId);
		deleteOpen = false;
	}
</script>

<svelte:head>
	<title>Watchlists · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Invest</p>
		<h1 class="head-title gok-headline-2">My watchlists</h1>
		<p class="head-caption">Instruments I track but may not own. Prices indicative.</p>
	</header>

	{#if lists.length === 0}
		<!-- No lists at all → first-run create-a-list CTA. -->
		<section class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-5">I don't have any watchlists yet</p>
				<p class="empty-body">
					A watchlist is a named set of instruments I want to keep an eye on. I'll start one.
				</p>
				<div slot="actions">
					<gok-button variant="primary" {@attach on('click', openCreate)}>Create a list</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<!-- List switcher: the active tab is the single accent. -->
		<div class="switcher" role="group" aria-label="My watchlists">
			{#each lists as list (list.id)}
				<button
					type="button"
					class="tab"
					class:is-active={list.id === activeId}
					aria-pressed={list.id === activeId}
					onclick={() => selectList(list.id)}
				>
					{list.name}
				</button>
			{/each}
			<button type="button" class="tab tab-new" {@attach on('click', openCreate)}>
				<span class="tab-plus" aria-hidden="true">+</span> New list
			</button>
		</div>

		<section class="list" aria-labelledby="active-list-heading">
			<div class="list-bar">
				<div class="list-titles">
					<h2 id="active-list-heading" class="list-name gok-headline-5">{activeName}</h2>
					<p class="list-count gok-tabular-nums">{countLabel}</p>
				</div>
				<div class="list-actions">
					<gok-button variant="primary" {@attach on('click', openAdd)}>Add instruments</gok-button>
					<gok-button variant="secondary" {@attach on('click', openRename)}>Rename</gok-button>
					<gok-button variant="secondary" {@attach on('click', openDelete)}>Delete list</gok-button>
				</div>
			</div>

			{#if count === 0}
				<!-- The active list is empty. -->
				<div class="empty">
					<gok-empty-state>
						<p class="empty-title gok-headline-5">This watchlist is empty</p>
						<p class="empty-body">I'll add an instrument to start tracking it here.</p>
						<div slot="actions">
							<gok-button variant="primary" {@attach on('click', openAdd)}>Add instruments</gok-button>
						</div>
					</gok-empty-state>
				</div>
			{:else}
				<WatchTable />
			{/if}
		</section>
	{/if}
</div>

<!-- The add-instruments combobox (F10). -->
<AddInstruments open={addOpen} onClose={closeAdd} />

<!-- New list / rename — a single inline-name dialog. -->
<gok-dialog
	size="s"
	heading={nameHeading}
	{@attach setProps({ open: nameDialogOpen })}
	{@attach on('gok-cancel', closeNameDialog)}
	{@attach on('gok-close', closeNameDialog)}
>
	<gok-input
		label="List name"
		placeholder="e.g. Dividend stocks"
		maxlength="40"
		{@attach setProps({ value: nameDraft })}
		{@attach on('input', onNameInput)}
		{@attach on('keydown', onNameKeydown)}
	></gok-input>

	<div slot="footer" class="dialog-actions">
		<gok-button variant="secondary" {@attach on('click', closeNameDialog)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !nameValid })}
			{@attach on('click', submitName)}
		>
			{nameCta}
		</gok-button>
	</div>
</gok-dialog>

<!-- Delete list — a light confirm. -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Delete this list?"
	{@attach setProps({ open: deleteOpen })}
	{@attach on('gok-cancel', closeDelete)}
	{@attach on('gok-close', closeDelete)}
>
	<p class="confirm-body">
		I'll delete <strong>{activeName}</strong> and its
		<span class="gok-tabular-nums">{countLabel}</span>. The instruments themselves aren't affected —
		I can add the list back any time.
	</p>

	<div slot="footer" class="dialog-actions">
		<gok-button variant="secondary" {@attach on('click', closeDelete)}>Keep it</gok-button>
		<gok-button variant="primary" {@attach on('click', confirmDelete)}>Delete list</gok-button>
	</div>
</gok-dialog>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* ── Header ── */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-caption {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* ── List switcher (tabs) ── */
	.switcher {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
		padding-block-end: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		padding: var(--gok-space-100) var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-pill);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: 1;
		color: var(--gok-color-text-muted);
		cursor: pointer;
	}

	.tab:hover {
		color: var(--gok-color-text);
		border-color: var(--gok-color-border-strong);
	}

	.tab:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 2px;
	}

	/* The active list is the single accent. */
	.tab.is-active {
		background: var(--gok-color-primary);
		border-color: var(--gok-color-primary);
		color: var(--gok-color-text-on-primary);
		font-weight: var(--gok-font-weight-semibold);
	}

	.tab-new {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-style: dashed;
	}

	.tab-plus {
		font-size: 1.1em;
	}

	/* ── Active list ── */
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.list-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.list-titles {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.list-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.list-count {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--gok-color-text-muted);
	}

	.list-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200);
	}

	/* ── Dialogs ── */
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
	}

	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	/* ── Empty ── */
	.empty {
		padding-block: var(--gok-space-600);
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
