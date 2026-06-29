<script lang="ts">
	// V05 · Add instruments (the F10 combobox) — an app-local multi-select over the
	// instruments NOT already on the active list (`watchlists.addable()`). No
	// gok-combobox exists yet, so this is hand-built to the WAI-ARIA combobox +
	// listbox pattern: a tokened native input (role="combobox", aria-activedescendant
	// tracks the active option) over a role="listbox" aria-multiselectable list.
	// Type to filter by symbol or name; ↑/↓ move; Enter toggles; click toggles. The
	// add primary is the single accent. "Add (N)" appends via watchlists.addToActive,
	// which toasts. Monochrome otherwise.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { watchlists } from '$lib/state/watchlists.svelte';
	import { formatMoney } from '$lib/format';

	interface Props {
		/** Whether the dialog is shown. */
		open: boolean;
		/** Dismiss request (cancel, backdrop, Escape, or a completed add). */
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	const listName = $derived(watchlists.active()?.name ?? 'my watchlist');
	const addable = $derived(watchlists.addable());

	let query = $state('');
	let selected = $state<string[]>([]);
	let activeIndex = $state(0);

	const TYPE_LABEL: Record<string, string> = { stock: 'Stock', etf: 'ETF', crypto: 'Crypto' };

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return addable;
		return addable.filter(
			(i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
		);
	});

	const activeSymbol = $derived(filtered[activeIndex]?.symbol ?? '');
	const addLabel = $derived(selected.length > 0 ? `Add (${selected.length})` : 'Add');

	// The filter input, captured so the dialog can focus it on open and reset its value.
	let inputEl = $state<HTMLInputElement | null>(null);
	function captureInput(node: HTMLInputElement) {
		inputEl = node;
	}

	// Rising edge of `open`: clear the query + selection, return to the top, focus the
	// filter. Only `open` is read reactively; the resets must not re-trigger this.
	// Rising edge of `open`: clear the query + selection, return to the top, focus the
	// filter. `untrack` keeps this keyed on `open` alone — the resets inside must not
	// make it re-run on every keystroke (mirrors the OrderTicket idiom).
	let wasOpen = false;
	$effect(() => {
		const isOpen = open;
		untrack(() => {
			if (isOpen && !wasOpen) {
				query = '';
				selected = [];
				activeIndex = 0;
				if (inputEl) inputEl.value = '';
				queueMicrotask(() => inputEl?.focus());
			}
			wasOpen = isOpen;
		});
	});

	// Keep the active option scrolled into view as ↑/↓ move it.
	$effect(() => {
		if (!activeSymbol) return;
		document.getElementById(`wl-opt-${activeSymbol}`)?.scrollIntoView({ block: 'nearest' });
	});

	function isSelected(symbol: string): boolean {
		return selected.includes(symbol);
	}

	function toggle(symbol: string) {
		selected = isSelected(symbol) ? selected.filter((s) => s !== symbol) : [...selected, symbol];
	}

	function onInput(e: Event) {
		query = (e.target as HTMLInputElement).value;
		activeIndex = 0;
	}

	function onKeydown(e: KeyboardEvent) {
		const len = filtered.length;
		if (len === 0) return;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				activeIndex = (activeIndex + 1) % len;
				break;
			case 'ArrowUp':
				e.preventDefault();
				activeIndex = (activeIndex - 1 + len) % len;
				break;
			case 'Home':
				e.preventDefault();
				activeIndex = 0;
				break;
			case 'End':
				e.preventDefault();
				activeIndex = len - 1;
				break;
			case 'Enter': {
				e.preventDefault();
				const inst = filtered[activeIndex];
				if (inst) toggle(inst.symbol);
				break;
			}
		}
	}

	function commit() {
		if (selected.length === 0) return;
		watchlists.addToActive(selected);
		onClose();
	}
</script>

<gok-dialog
	heading="Add to {listName}"
	{@attach setProps({ open })}
	{@attach on('gok-cancel', onClose)}
	{@attach on('gok-close', onClose)}
>
	<div class="picker">
		<label class="field">
			<span class="visually-hidden">Filter instruments by symbol or name</span>
			<input
				class="filter"
				type="text"
				role="combobox"
				aria-expanded={filtered.length > 0}
				aria-controls="wl-listbox"
				aria-autocomplete="list"
				aria-activedescendant={activeSymbol ? `wl-opt-${activeSymbol}` : undefined}
				autocomplete="off"
				placeholder="Filter by symbol or name"
				{@attach captureInput}
				oninput={onInput}
				onkeydown={onKeydown}
			/>
		</label>

		{#if addable.length === 0}
			<p class="note" role="status">Every instrument I track is already on {listName}.</p>
		{:else if filtered.length === 0}
			<p class="note" role="status">No matches for “{query.trim()}”.</p>
		{:else}
			<ul
				id="wl-listbox"
				class="listbox"
				role="listbox"
				aria-multiselectable="true"
				aria-label="Instruments to add"
			>
				{#each filtered as inst, i (inst.symbol)}
					{@const picked = isSelected(inst.symbol)}
					<!-- Keyboard lives on the combobox input (aria-activedescendant + Enter);
					     the click is a mouse-only convenience, so no per-option key handler. -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="wl-opt-{inst.symbol}"
						class="option"
						class:is-active={i === activeIndex}
						role="option"
						aria-selected={picked}
						onclick={() => {
							activeIndex = i;
							toggle(inst.symbol);
						}}
					>
						<span class="check" aria-hidden="true">
							{#if picked}
								<svg viewBox="0 0 16 16" width="13" height="13" fill="none">
									<path
										d="M3 8.5l3 3 7-8"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{/if}
						</span>
						<span class="opt-main">
							<span class="opt-sym">{inst.symbol}</span>
							<span class="opt-name">{inst.name}</span>
						</span>
						<span class="opt-meta">
							<span class="opt-type">{TYPE_LABEL[inst.type] ?? inst.type}</span>
							<span class="opt-price gok-tabular-nums"
								>{formatMoney(inst.lastPriceMinor, inst.currency)}</span
							>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div slot="footer" class="actions">
		<gok-button variant="secondary" {@attach on('click', onClose)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: selected.length === 0 })}
			{@attach on('click', commit)}
		>
			{addLabel}
		</gok-button>
	</div>
</gok-dialog>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.field {
		display: block;
	}

	.filter {
		inline-size: 100%;
		padding: var(--gok-space-200) var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.filter::placeholder {
		color: var(--gok-color-text-muted);
	}

	.filter:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 1px;
		border-color: var(--gok-color-primary);
	}

	.note {
		margin: 0;
		padding-block: var(--gok-space-400);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
		text-align: center;
	}

	.listbox {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-block-size: 18rem;
		overflow-y: auto;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.option {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding: var(--gok-space-200) var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		cursor: pointer;
	}

	.option:last-child {
		border-block-end: 0;
	}

	.option:hover {
		background: var(--gok-color-surface-strong);
	}

	/* The active descendant (keyboard focus proxy) — a quiet ring, no colour bet. */
	.option.is-active {
		background: var(--gok-color-surface-strong);
		box-shadow: inset 2px 0 0 0 var(--gok-color-text);
	}

	.option[aria-selected='true'] {
		background: var(--gok-color-surface-strong);
	}

	.check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 1.125rem;
		block-size: 1.125rem;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-s);
		color: var(--gok-color-text-on-primary);
	}

	.option[aria-selected='true'] .check {
		background: var(--gok-color-primary);
		border-color: var(--gok-color-primary);
	}

	.opt-main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
		flex: 1 1 auto;
	}

	.opt-sym {
		font-family: var(--gok-font-family-mono);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.opt-name {
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.opt-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		flex: none;
	}

	.opt-type {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-footnote-size);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--gok-color-text-muted);
	}

	.opt-price {
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		inline-size: 100%;
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
