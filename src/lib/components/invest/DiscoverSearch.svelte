<script lang="ts">
	// V13 · Global instrument search — the app-local WAI-ARIA combobox over the whole
	// instrument universe. No gok-combobox exists, so this is hand-built to the combobox
	// + listbox pattern (mirrors AddInstruments): a tokened native input (role="combobox",
	// aria-activedescendant tracks the active option) over a role="listbox" popup. Unlike
	// AddInstruments this is SINGLE-select and ROUTES — Enter/click commits the active
	// instrument and navigates to its detail page (which owns Buy → the V03 spine). Focus
	// is held in the input the whole time; ↑/↓/Home/End move the active option, Esc closes
	// then clears, click selects. Diacritic-insensitive matching is delegated to the shared
	// searchInstruments() so "nestle" finds "Nestlé" and "loreal" finds "L'Oréal".
	import { goto } from '$app/navigation';
	import { searchInstruments } from '$lib/invest/search';
	import { formatMoney } from '$lib/format';
	import type { Instrument } from '$lib/data/market';

	interface Props {
		/** Input placeholder. */
		placeholder?: string;
	}

	let { placeholder = 'Search by name or ticker' }: Props = $props();

	let query = $state('');
	let activeIndex = $state(0);
	let focused = $state(false);
	// Esc dismisses the popup while keeping focus + query; re-typing or re-focusing reopens.
	let dismissed = $state(false);

	const trimmed = $derived(query.trim());
	const matches = $derived(searchInstruments(query, 8));
	// The popup shows whenever there is a non-empty query and the field has focus (either a
	// list of matches OR the "no matches" line — both are a visible popup).
	const open = $derived(focused && trimmed.length > 0 && !dismissed);
	// aria-expanded tracks the *listbox* specifically: true only when options are rendered.
	const showList = $derived(open && matches.length > 0);
	const activeId = $derived(
		showList && matches[activeIndex] ? `discover-opt-${matches[activeIndex].symbol}` : undefined
	);

	// Polite result-count announcement (visually-hidden live region). Empty when closed so a
	// dismissed / empty field says nothing.
	const announcement = $derived.by(() => {
		if (!open) return '';
		if (matches.length === 0) return 'No instruments match';
		return `${matches.length} ${matches.length === 1 ? 'instrument' : 'instruments'}`;
	});

	// Keep the active option scrolled into view as ↑/↓ move it.
	$effect(() => {
		if (!activeId) return;
		document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
	});

	function onInput() {
		// query is bound; just reset the cursor and un-dismiss so typing reopens the popup.
		activeIndex = 0;
		dismissed = false;
	}

	function commit(inst: Instrument) {
		dismissed = true; // close the popup; navigation unmounts us anyway
		goto(`/invest/instrument/${inst.symbol}`);
	}

	function onKeydown(e: KeyboardEvent) {
		const len = matches.length;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (dismissed) {
					dismissed = false; // re-open without moving the active option
					break;
				}
				if (len === 0) break;
				activeIndex = Math.min(activeIndex + 1, len - 1); // clamp at the end
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (len === 0) break;
				activeIndex = Math.max(activeIndex - 1, 0); // clamp at the start
				break;
			case 'Home':
				if (len === 0) break;
				e.preventDefault();
				activeIndex = 0;
				break;
			case 'End':
				if (len === 0) break;
				e.preventDefault();
				activeIndex = len - 1;
				break;
			case 'Enter': {
				const inst = matches[activeIndex];
				if (showList && inst) {
					e.preventDefault();
					commit(inst);
				}
				break;
			}
			case 'Escape':
				if (open) {
					e.preventDefault();
					dismissed = true; // first press: close the popup, keep the query
				} else if (trimmed.length > 0) {
					query = ''; // second press: clear the field
				}
				break;
		}
	}
</script>

<div class="combo">
	<label class="field">
		<span class="field-label">Search instruments</span>
		<span class="input-wrap">
			<span class="search-icon" aria-hidden="true">
				<svg viewBox="0 0 16 16" width="15" height="15" fill="none">
					<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
					<path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</span>
			<input
				class="input"
				type="text"
				role="combobox"
				aria-expanded={showList}
				aria-controls={showList ? 'discover-listbox' : undefined}
				aria-activedescendant={activeId}
				aria-autocomplete="list"
				autocomplete="off"
				autocapitalize="off"
				autocorrect="off"
				spellcheck="false"
				{placeholder}
				bind:value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				onfocus={() => {
					focused = true;
					dismissed = false;
				}}
				onblur={() => (focused = false)}
			/>
		</span>
	</label>

	{#if open}
		<div class="popup">
			{#if matches.length > 0}
				<ul id="discover-listbox" class="listbox" role="listbox" aria-label="Instruments">
					{#each matches as inst, i (inst.symbol)}
						<!-- Keyboard lives on the combobox input (aria-activedescendant + Enter); the
						     mousedown preventDefault keeps focus in the input so the click can commit
						     without a blur race, so no per-option key handler is needed. -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<li
							id="discover-opt-{inst.symbol}"
							class="option"
							class:is-active={i === activeIndex}
							role="option"
							aria-selected={i === activeIndex}
							onmousedown={(e) => e.preventDefault()}
							onclick={() => commit(inst)}
						>
							<span class="opt-sym">{inst.symbol}</span>
							<span class="opt-name">{inst.name}</span>
							<span class="opt-price gok-tabular-nums"
								>{formatMoney(inst.lastPriceMinor, inst.currency)}</span
							>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty" role="status">No instruments match “{trimmed}”.</p>
			{/if}
		</div>
	{/if}

	<span class="visually-hidden" aria-live="polite">{announcement}</span>
</div>

<style>
	.combo {
		position: relative;
		inline-size: 100%;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.field-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.input-wrap {
		display: block;
		position: relative;
	}

	.search-icon {
		position: absolute;
		inset-inline-start: var(--gok-space-300);
		inset-block-start: 50%;
		transform: translateY(-50%);
		display: inline-flex;
		color: var(--gok-color-text-muted);
		pointer-events: none;
	}

	.input {
		inline-size: 100%;
		padding: var(--gok-space-200) var(--gok-space-300);
		/* Room for the leading search glyph. */
		padding-inline-start: calc(var(--gok-space-300) * 2 + var(--gok-space-300));
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.input::placeholder {
		color: var(--gok-color-text-muted);
	}

	/* The search field's focus ring is an allowed accent. */
	.input:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: 1px;
		border-color: var(--gok-color-primary);
	}

	/* Floating dropdown — absolute so the surrounding layout never shifts as it
	   opens/closes. Hairline + flat surface, no elevation shadow. */
	.popup {
		position: absolute;
		inset-block-start: calc(100% + var(--gok-space-100));
		inset-inline: 0;
		z-index: 20;
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		overflow: hidden;
	}

	.listbox {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-block-size: 20rem;
		overflow-y: auto;
	}

	.option {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: baseline;
		gap: var(--gok-space-100) var(--gok-space-300);
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

	/* The active descendant (keyboard focus proxy) — a quiet inset accent bar, no colour bet. */
	.option.is-active {
		background: var(--gok-color-surface-strong);
		box-shadow: inset 2px 0 0 0 var(--gok-color-text);
	}

	.opt-sym {
		font-family: var(--gok-font-family-mono);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.opt-name {
		min-inline-size: 0;
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.opt-price {
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text);
		text-align: end;
	}

	.empty {
		margin: 0;
		padding: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
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
