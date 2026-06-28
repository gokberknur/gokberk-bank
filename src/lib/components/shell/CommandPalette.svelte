<script lang="ts">
	// The global command palette (X03) — a top-anchored floating surface that opens
	// from anywhere (Cmd/Ctrl-K, or the navbar search). It reads the already-built
	// `command` state: the query, the ranked/grouped results (or recent + suggested
	// when empty), and a single flat list the keyboard roves. Editorial: a flat,
	// hairline-ruled surface, mono-uppercase group eyebrows, and the accent spent
	// exactly once — the mark on the highlighted row.
	//
	// No `bind:` on the gok-input: its value is read off the `input` event and the
	// field is remounted fresh on each open. Keyboard (arrows / Enter / Escape) is
	// handled on the palette container, where events from the inner field bubble up.
	import { goto } from '$app/navigation';
	import { command } from '$lib/state/command.svelte';
	import type { SearchItem } from '$lib/command/registry';
	import { on } from '$lib/wc.svelte';

	const LISTBOX_ID = 'command-palette-listbox';

	// The field node, captured via an attachment (custom elements take no bind:value)
	// so it can be focused on open without a node reference binding.
	let inputEl: (HTMLElement & { value: string }) | null = null;
	function captureInput(node: Element) {
		inputEl = node as HTMLElement & { value: string };
		return () => {
			inputEl = null;
		};
	}

	// The render plan: each section carries its mono eyebrow and its items tagged with
	// a running FLAT index. The order MUST match `command.flat` (recent → suggested
	// when empty; results in group order when typing) so the highlight and Enter agree.
	type Row = { item: SearchItem; index: number };
	type Section = { key: string; eyebrow: string; rows: Row[] };

	const sections = $derived.by<Section[]>(() => {
		const out: Section[] = [];
		let index = 0;
		const push = (key: string, eyebrow: string, items: SearchItem[]) => {
			out.push({ key, eyebrow, rows: items.map((item) => ({ item, index: index++ })) });
		};

		if (command.hasQuery) {
			for (const group of command.results) push(group.group, group.group.toUpperCase(), group.items);
		} else {
			if (command.recent.length) push('recent', 'RECENT', command.recent);
			push('suggested', 'SUGGESTED', command.suggested);
		}
		return out;
	});

	const noMatches = $derived(command.hasQuery && command.flat.length === 0);

	// Polite announcement of the result count (distinct copy for no-match vs counted).
	const announce = $derived(
		!command.hasQuery
			? ''
			: command.flat.length === 0
				? `No matches for ${command.query}`
				: `${command.flat.length} result${command.flat.length === 1 ? '' : 's'}`
	);

	// Open / close focus management: capture the opener when the palette opens, focus
	// the field, and restore focus to the opener when it closes.
	let opener: HTMLElement | null = null;
	let wasOpen = false;
	$effect(() => {
		const isOpen = command.open;
		if (isOpen && !wasOpen) {
			opener = document.activeElement as HTMLElement | null;
			requestAnimationFrame(() => inputEl?.focus());
		} else if (!isOpen && wasOpen) {
			const previous = opener;
			opener = null;
			requestAnimationFrame(() => previous?.focus());
		}
		wasOpen = isOpen;
	});

	function onInput(event: Event) {
		command.setQuery((event.target as HTMLInputElement).value);
	}

	function run(item: SearchItem) {
		goto(item.href);
		command.recordRecent(item.id);
		command.close();
	}

	// Rows are real links (their `href`) for semantics + graceful fallback, but the
	// palette routes inside the SPA and records the run, so intercept the click.
	function onRowClick(event: MouseEvent, item: SearchItem) {
		event.preventDefault();
		run(item);
	}

	function onKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				command.move(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				command.move(-1);
				break;
			case 'Enter': {
				event.preventDefault();
				const selected = command.selected;
				if (selected) run(selected);
				break;
			}
			case 'Escape':
				event.preventDefault();
				command.close();
				break;
			case 'Tab':
				// A single roving listbox is one Tab stop — keep focus on the field;
				// Escape is the way out.
				event.preventDefault();
				break;
		}
	}
</script>

{#if command.open}
	<div class="overlay">
		<button type="button" class="scrim" aria-label="Close command palette" onclick={() => command.close()}
		></button>

		<!-- The palette: keyboard handled here so events from the inner field bubble up. -->
		<div
			class="palette"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			tabindex="-1"
			onkeydown={onKeydown}
		>
			<div class="field">
				<gok-input
					type="search"
					label="Search the app"
					placeholder="Search actions, accounts, payees, instruments…"
					autocomplete="off"
					aria-controls={LISTBOX_ID}
					{@attach captureInput}
					{@attach on('input', onInput)}
				></gok-input>
				<span class="hint" aria-hidden="true">⌘K</span>
			</div>

			<div class="body">
				{#if noMatches}
					<gok-empty-state variant="compact">
						<p class="empty-title">No matches for “{command.query}”</p>
						<p class="empty-body">I'll try a different word — an action, a payee, or a symbol.</p>
					</gok-empty-state>
				{:else}
					<ul class="listbox" id={LISTBOX_ID} role="listbox" aria-label="Results" tabindex="-1">
						{#each sections as section (section.key)}
							<li class="section" role="presentation">
								<p class="eyebrow gok-eyebrow">{section.eyebrow}</p>
								<ul class="rows" role="presentation">
									{#each section.rows as { item, index } (item.id)}
										<li role="presentation">
											<a
												id="command-opt-{index}"
												class="row"
												class:is-selected={index === command.selectedIndex}
												role="option"
												aria-selected={index === command.selectedIndex}
												href={item.href}
												tabindex="-1"
												onclick={(event) => onRowClick(event, item)}
												onmousemove={() => (command.selectedIndex = index)}
											>
												<span class="mark" aria-hidden="true"></span>
												<span class="label">{item.label}</span>
												{#if item.sublabel}
													<span class="sublabel">{item.sublabel}</span>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		<p class="sr-only" role="status" aria-live="polite">{announce}</p>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: var(--gok-z-modal);
		display: grid;
		justify-items: center;
		align-items: start;
		padding-block-start: 12vh;
		padding-inline: var(--gok-space-400);
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		margin: 0;
		background: var(--gok-color-scrim);
		cursor: default;
	}

	.palette {
		position: relative;
		display: flex;
		flex-direction: column;
		inline-size: min(40rem, 100%);
		max-block-size: 70vh;
		background: var(--gok-color-surface);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
		box-shadow: var(--gok-shadow-2);
		overflow: hidden;
	}

	.field {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding-inline: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.field gok-input {
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.hint {
		flex: none;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-caption-size);
		line-height: var(--gok-type-caption-line);
		color: var(--gok-color-text-muted);
	}

	.body {
		overflow-y: auto;
		padding-block: var(--gok-space-200);
	}

	.listbox,
	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.section + .section {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		margin-block-start: var(--gok-space-200);
		padding-block-start: var(--gok-space-200);
	}

	.eyebrow {
		margin: 0;
		padding-inline: var(--gok-space-400);
		padding-block-end: var(--gok-space-100);
		color: var(--gok-color-text-muted);
	}

	.row {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
		padding-inline: var(--gok-space-400);
		padding-block: var(--gok-space-200);
		border-inline-start: var(--gok-border-width-strong) solid transparent;
		text-decoration: none;
		cursor: pointer;
	}

	.row:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-focus-ring-width));
	}

	li + li .row {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row.is-selected {
		background: var(--gok-color-surface-strong);
		border-inline-start-color: var(--gok-color-primary);
	}

	/* The accent, spent once: the highlighted row's mark. */
	.mark {
		flex: none;
		inline-size: var(--gok-space-200);
		block-size: var(--gok-space-200);
		align-self: center;
		border-radius: var(--gok-radius-pill);
		background: transparent;
	}

	.row.is-selected .mark {
		background: var(--gok-color-primary);
	}

	.label {
		flex: 1 1 auto;
		min-inline-size: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sublabel {
		flex: none;
		max-inline-size: 45%;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
		font-variant-numeric: tabular-nums;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty-title {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
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

	@media (prefers-reduced-motion: no-preference) {
		.palette {
			animation: palette-in var(--gok-motion-duration-fast) var(--gok-motion-ease-dynamic);
		}

		@keyframes palette-in {
			from {
				opacity: 0;
				transform: translateY(calc(-1 * var(--gok-space-300)));
			}
		}
	}
</style>
