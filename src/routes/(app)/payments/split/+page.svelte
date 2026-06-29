<script lang="ts">
	// P08 · Split a bill — the whole flow on one progressively-revealed page. Splitting
	// **collects** money (it mints one P07 request per other person for their share);
	// no money ever leaves my account, so there's NO forced-decision dialog here — the
	// deliberate act is *sending the requests*. The maths is integer minor units in
	// `split.svelte` (shares always sum to the total); this surface only gathers the
	// bill, the people, and the method, shows a live remainder, and then sends + tracks.
	//
	// Interop is strictly `setProps`/`on` from `wc.svelte` — never `bind:` on a gok-*
	// host. MoneyInput is a Svelte composite, so its `value`/`onchange` are plain props.
	// The people picker is a hand-built WAI-ARIA combobox (the F10/AddInstruments idiom):
	// type to filter the payees I haven't added, ↑/↓ move, Enter/click adds — each add
	// is announced in a polite live region.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { split } from '$lib/payments/split.svelte';
	import { requests } from '$lib/payments/requests.svelte';
	import type { PaymentRequest } from '$lib/payments/requests.svelte';
	import type { Currency } from '$lib/data/money';
	import { toast } from '$lib/state/toasts.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	// ── Phase: gather + allocate (build) → the sent-requests tracker (track). ──
	type SentRow = { name: string; shareMinor: number; currency: Currency; link: string };
	let phase = $state<'build' | 'track'>('build');
	let sent = $state<SentRow[]>([]);
	let sentTotalMinor = $state(0);
	let sentCurrency = $state<Currency>('EUR');

	// ── Reactive reads off the split state (people[0] is always me). ──
	const wallets = $derived(split.wallets());
	const people = $derived(split.people);
	const currency = $derived(split.currency());
	const shares = $derived(split.shares());
	const method = $derived(split.method);
	const remainder = $derived(split.remainder());
	const balanced = $derived(split.balanced());
	const roundingRow = $derived(split.roundingRow());
	const percentTotalValue = $derived(split.percentTotalValue());
	const requestableCount = $derived(split.requestable().length);
	const canSend = $derived(split.valid());
	const availablePayees = $derived(split.availablePayees());

	// The reserved remainder line — one row, always present, polite live region so it
	// reads on change without shifting layout. No blame in the over copy.
	const remainderText = $derived.by(() => {
		if (balanced) return 'All allocated';
		if (remainder > 0) return `${formatMoney(remainder, currency)} left to allocate`;
		return `${formatMoney(-remainder, currency)} over — trim a share`;
	});

	// ── People picker (inline combobox over the payees I haven't added yet). ──
	let query = $state('');
	let activeIndex = $state(0);
	let nameDraft = $state('');
	let announce = $state('');
	let comboEl = $state<HTMLInputElement | null>(null);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return availablePayees;
		return availablePayees.filter(
			(p) => p.name.toLowerCase().includes(q) || (p.handle?.toLowerCase().includes(q) ?? false)
		);
	});
	const activeId = $derived(filtered[activeIndex]?.id ?? '');

	function captureCombo(node: HTMLInputElement) {
		comboEl = node;
	}

	function addPayee(id: string, name: string) {
		split.addPayee(id);
		announce = `Added ${name}`;
		query = '';
		activeIndex = 0;
		if (comboEl) comboEl.value = '';
		queueMicrotask(() => comboEl?.focus());
	}

	function onComboInput(event: Event) {
		query = (event.target as HTMLInputElement).value;
		activeIndex = 0;
	}

	function onComboKeydown(event: KeyboardEvent) {
		const len = filtered.length;
		if (len === 0) return;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				activeIndex = (activeIndex + 1) % len;
				break;
			case 'ArrowUp':
				event.preventDefault();
				activeIndex = (activeIndex - 1 + len) % len;
				break;
			case 'Home':
				event.preventDefault();
				activeIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				activeIndex = len - 1;
				break;
			case 'Enter': {
				event.preventDefault();
				const payee = filtered[activeIndex];
				if (payee) addPayee(payee.id, payee.name);
				break;
			}
		}
	}

	function onNameDraftInput(event: Event) {
		nameDraft = (event.target as HTMLElement & { value?: string }).value ?? '';
	}

	function addByName() {
		const name = nameDraft.trim();
		if (!name) return;
		split.addByName(name);
		announce = `Added ${name}`;
		nameDraft = '';
	}

	function removePerson(key: string, name: string) {
		split.removePerson(key);
		announce = `Removed ${name}`;
	}

	// ── The bill / method handlers. ──
	function onTotalChange(minor: number) {
		split.setTotal(minor);
	}
	function onNoteInput(event: Event) {
		split.setNote((event.target as HTMLElement & { value?: string }).value ?? '');
	}
	function onWalletChange(event: Event) {
		split.setWallet((event.target as HTMLElement & { value?: string }).value ?? '');
	}
	function onMethodChange(event: Event) {
		const value = (event.target as HTMLElement & { value?: string }).value;
		if (value === 'equal' || value === 'amount' || value === 'percent') split.setMethod(value);
	}
	function onShareChange(key: string, minor: number) {
		split.setShare(key, minor);
	}
	function onPctInput(key: string, event: Event) {
		const raw = (event.target as HTMLElement & { value?: string }).value ?? '';
		const pct = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
		split.setPct(key, Number.isNaN(pct) ? 0 : pct);
	}

	// ── Send · mint the requests, snapshot the result, move to the tracker. No dialog:
	// nothing leaves my account, so the send button IS the deliberate act. ──
	function send() {
		const made: PaymentRequest[] | null = split.sendRequests();
		if (!made) return;
		const reqd = split.requestable(); // same order sendRequests minted in
		sent = made.map((req, i) => ({
			name: reqd[i]?.name ?? req.note,
			shareMinor: req.amountMinor,
			currency: req.currency,
			link: requests.link(req)
		}));
		sentTotalMinor = split.totalMinor;
		sentCurrency = split.currency();
		phase = 'track';
	}

	async function copyLink(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			toast('Link copied', { status: 'success' });
		} catch {
			toast('Couldn’t copy — select the link and copy it manually', { status: 'error' });
		}
	}

	function newSplit() {
		split.reset();
		sent = [];
		sentTotalMinor = 0;
		query = '';
		nameDraft = '';
		activeIndex = 0;
		announce = '';
		phase = 'build';
	}
</script>

<svelte:head>
	<title>Split a bill · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/payments">&larr; Payments</gok-link>
		<p class="eyebrow gok-eyebrow">Payments</p>
		<h1 class="title gok-headline-2">Split a bill</h1>
		<p class="lead">Share a cost and collect everyone's share as a request.</p>
	</header>

	<!-- A polite live region the whole flow announces into (picker adds/removes). -->
	<span class="sr-only" aria-live="polite">{announce}</span>

	{#if phase === 'build'}
		<!-- ── 1 · The bill ─────────────────────────────────────────────────────── -->
		<section class="block" aria-labelledby="bill-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">The bill</p>
				<h2 id="bill-heading" class="block-title gok-headline-5">What am I splitting?</h2>
			</div>
			<div class="fields">
				<MoneyInput
					value={split.totalMinor}
					{currency}
					label="Total"
					onchange={onTotalChange}
				/>
				<gok-input
					label="What's it for?"
					placeholder="Dinner Tuesday"
					{@attach setProps({ value: split.note })}
					{@attach on('input', onNoteInput)}
				></gok-input>
				<gok-select
					label="Collect into"
					{@attach setProps({ value: split.walletId })}
					{@attach on('change', onWalletChange)}
				>
					{#each wallets as wallet (wallet.id)}
						<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
					{/each}
				</gok-select>
			</div>
		</section>

		<!-- ── 2 · People ───────────────────────────────────────────────────────── -->
		<section class="block" aria-labelledby="people-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">People</p>
				<h2 id="people-heading" class="block-title gok-headline-5">Who's splitting it?</h2>
				<p class="block-sub">
					I'm in as a payer — my share isn't requested. Add the people I'm collecting from.
				</p>
			</div>

			<ul class="chips" aria-label="People in this split">
				{#each people as person (person.key)}
					<li class="chip" class:is-self={person.isSelf}>
						<span class="chip-name">{person.isSelf ? 'Me' : person.name}</span>
						{#if person.isSelf}
							<span class="chip-note">my share isn't requested</span>
						{:else}
							<button
								type="button"
								class="chip-remove"
								aria-label={`Remove ${person.name}`}
								onclick={() => removePerson(person.key, person.name)}
							>
								<span aria-hidden="true">&times;</span>
							</button>
						{/if}
					</li>
				{/each}
			</ul>

			<div class="picker">
				<label class="field">
					<span class="field-label">Add someone I pay</span>
					<input
						class="combo"
						type="text"
						role="combobox"
						aria-expanded={filtered.length > 0}
						aria-controls="split-payees"
						aria-autocomplete="list"
						aria-activedescendant={activeId ? `split-opt-${activeId}` : undefined}
						autocomplete="off"
						placeholder="Filter by name or handle"
						{@attach captureCombo}
						oninput={onComboInput}
						onkeydown={onComboKeydown}
					/>
				</label>

				{#if availablePayees.length === 0}
					<p class="note" role="status">Everyone I pay is already in this split.</p>
				{:else if filtered.length === 0}
					<p class="note" role="status">No matches for “{query.trim()}”.</p>
				{:else}
					<ul id="split-payees" class="listbox" role="listbox" aria-label="People I pay">
						{#each filtered as payee, i (payee.id)}
							<!-- Keyboard lives on the combobox (aria-activedescendant + Enter); the
							     click is a mouse convenience, so no per-option key handler. -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<li
								id="split-opt-{payee.id}"
								class="option"
								class:is-active={i === activeIndex}
								role="option"
								aria-selected={i === activeIndex}
								onclick={() => addPayee(payee.id, payee.name)}
							>
								<span class="opt-name">{payee.name}</span>
								{#if payee.handle}<span class="opt-handle">{payee.handle}</span>{/if}
							</li>
						{/each}
					</ul>
				{/if}

				<div class="byname">
					<gok-input
						label="Add by name"
						placeholder="Someone not in my payees"
						{@attach setProps({ value: nameDraft })}
						{@attach on('input', onNameDraftInput)}
					></gok-input>
					<gok-button
						variant="secondary"
						{@attach setProps({ disabled: nameDraft.trim() === '' })}
						{@attach on('click', addByName)}
					>
						Add
					</gok-button>
				</div>
			</div>
		</section>

		<!-- ── 3 · Method + amounts ─────────────────────────────────────────────── -->
		<section class="block" aria-labelledby="method-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">Shares</p>
				<h2 id="method-heading" class="block-title gok-headline-5">How should it split?</h2>
			</div>

			<gok-segmented
				label="Split method"
				{@attach setProps({ value: method })}
				{@attach on('change', onMethodChange)}
			>
				<gok-segmented-item value="equal">Equal</gok-segmented-item>
				<gok-segmented-item value="amount">By amount</gok-segmented-item>
				<gok-segmented-item value="percent">By %</gok-segmented-item>
			</gok-segmented>

			<ul class="rows" aria-label="Each person's share">
				{#each people as person, i (person.key)}
					<li class="row">
						<span class="row-name">
							{person.isSelf ? 'Me' : person.name}
							{#if method === 'equal' && i === roundingRow}
								<span class="row-hint">carries the rounding</span>
							{/if}
						</span>

						{#if method === 'equal'}
							<span class="row-amount gok-tabular-nums">{formatMoney(shares[i], currency)}</span>
						{:else if method === 'amount'}
							<span class="row-input">
								<MoneyInput
									value={person.shareMinor}
									{currency}
									label={person.isSelf ? 'My share' : person.name}
									onchange={(minor) => onShareChange(person.key, minor)}
								/>
							</span>
						{:else}
							<span class="row-input">
								<gok-input
									type="text"
									inputmode="numeric"
									label={person.isSelf ? 'My percent' : person.name}
									placeholder="0"
									{@attach setProps({ value: String(person.pct) })}
									{@attach on('input', (event) => onPctInput(person.key, event))}
								>
									<span slot="trailing" class="pct-affix" aria-hidden="true">%</span>
								</gok-input>
							</span>
						{/if}
					</li>
				{/each}
			</ul>

			{#if method === 'percent'}
				<p class="pct-total gok-tabular-nums" class:is-balanced={percentTotalValue === 100}>
					<gok-icon
						name={percentTotalValue === 100 ? 'square-check' : 'circle-dot'}
						size="s"
						aria-hidden="true"
					></gok-icon>
					{percentTotalValue}% allocated
				</p>
			{/if}

			<!-- Reserved remainder line — always one row, polite, status by rule+icon+text. -->
			<p
				class="remainder gok-tabular-nums"
				class:is-balanced={balanced}
				class:is-off={!balanced}
				aria-live="polite"
			>
				<gok-icon
					name={balanced ? 'square-check' : 'circle-dot'}
					size="s"
					aria-hidden="true"
				></gok-icon>
				{remainderText}
			</p>

			{#if !balanced}
				<gok-alert status={remainder < 0 ? 'warning' : 'info'} class="remainder-alert">
					{#if remainder > 0}
						The shares add up to less than the bill. I'll send once every cent is allocated.
					{:else}
						The shares add up to more than the bill — trim a share so it balances.
					{/if}
				</gok-alert>
			{/if}
		</section>

		<!-- ── 4 · Send ─────────────────────────────────────────────────────────── -->
		<footer class="send">
			<gok-button
				variant="primary"
				{@attach setProps({ disabled: !canSend })}
				{@attach on('click', send)}
			>
				Send {requestableCount}
				{requestableCount === 1 ? 'request' : 'requests'}
			</gok-button>
		</footer>
	{:else}
		<!-- ── 5 · Track · the just-sent split. Freshly minted, so every share is Open. ── -->
		<section class="block" aria-labelledby="track-heading">
			<div class="block-head">
				<p class="block-eyebrow gok-eyebrow">Track</p>
				<h2 id="track-heading" class="block-title gok-headline-5">I'm collecting</h2>
				<p class="block-sub">
					Sent {sent.length}
					{sent.length === 1 ? 'request' : 'requests'}. Money lands in my wallet as each person pays —
					nothing has moved yet.
				</p>
			</div>

			<div class="progress-block">
				<gok-progress
					format="fraction"
					label="Settled"
					{@attach setProps({ value: 0, max: sent.length })}
				></gok-progress>
				<p class="progress-money gok-tabular-nums">
					0 of {sent.length} paid · {formatMoney(0, sentCurrency)} of {formatMoney(
						sentTotalMinor,
						sentCurrency
					)}
				</p>
			</div>

			<ul class="track-list">
				{#each sent as row (row.link)}
					<li class="track-row">
						<div class="track-main">
							<span class="track-name">{row.name}</span>
							<gok-tag size="s" variant="info">Open</gok-tag>
						</div>
						<span class="track-amount gok-tabular-nums">
							{formatMoney(row.shareMinor, row.currency)}
						</span>
						<gok-button variant="secondary" size="s" {@attach on('click', () => copyLink(row.link))}>
							Copy link
						</gok-button>
					</li>
				{/each}
			</ul>

			<div class="track-actions">
				<gok-link href="/payments/request">
					<gok-button variant="secondary">See all requests</gok-button>
				</gok-link>
				<gok-button variant="primary" {@attach on('click', newSplit)}>New split</gok-button>
			</div>
		</section>
	{/if}
</div>

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
		/* Trim the sparse header→content gap to the standard ~32px (PAY-U-04). */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Section block --- */
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.block-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.block-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.block-sub {
		margin: 0;
		max-inline-size: 42rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	/* --- People chips --- */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-100);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-pill, var(--gok-radius-l));
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.chip.is-self {
		border-style: dashed;
		color: var(--gok-color-text-muted);
	}

	.chip-name {
		font-weight: var(--gok-font-weight-semibold);
	}

	.chip.is-self .chip-name {
		color: var(--gok-color-text);
	}

	.chip-note {
		color: var(--gok-color-text-muted);
	}

	.chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		padding: 0;
		border: 0;
		border-radius: var(--gok-radius-s);
		background: none;
		font-size: var(--gok-type-body-regular-size);
		line-height: 1;
		color: var(--gok-color-text-muted);
		cursor: pointer;
	}

	.chip-remove:hover {
		color: var(--gok-color-text);
		background: var(--gok-color-surface-strong);
	}

	.chip-remove:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
	}

	/* --- Picker (combobox + listbox) --- */
	.picker {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		max-inline-size: 32rem;
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

	.combo {
		inline-size: 100%;
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.combo::placeholder {
		color: var(--gok-color-text-muted);
	}

	.combo:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-color: var(--gok-color-primary);
	}

	.note {
		margin: 0;
		padding-block: var(--gok-space-300);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.listbox {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-block-size: 16rem;
		overflow-y: auto;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
	}

	.option {
		display: flex;
		align-items: baseline;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
		cursor: pointer;
	}

	.option:last-child {
		border-block-end: 0;
	}

	.option:hover {
		background: var(--gok-color-surface-strong);
	}

	.option.is-active {
		background: var(--gok-color-surface-strong);
		box-shadow: inset 2px 0 0 0 var(--gok-color-text);
	}

	.opt-name {
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.opt-handle {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		color: var(--gok-color-text-muted);
	}

	.byname {
		display: flex;
		align-items: flex-end;
		gap: var(--gok-space-200);
	}

	.byname :global(gok-input) {
		flex: 1 1 auto;
	}

	/* --- Per-person share rows --- */
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-inline-size: 36rem;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row-name {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row-hint {
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line, var(--gok-type-body-small-line));
		color: var(--gok-color-text-muted);
	}

	.row-amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.row-input {
		flex: 0 1 12rem;
		min-inline-size: 0;
	}

	.pct-affix {
		color: var(--gok-color-text-muted);
	}

	.pct-total {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.pct-total.is-balanced {
		color: var(--gok-color-text);
	}

	/* --- Remainder (reserved one-row live region) --- */
	.remainder {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-200);
		min-block-size: var(--gok-type-body-regular-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
	}

	.remainder.is-balanced {
		color: var(--gok-color-text);
	}

	.remainder.is-off {
		color: var(--gok-color-text-muted);
	}

	.remainder-alert {
		display: block;
		max-inline-size: 42rem;
	}

	/* --- Send --- */
	.send {
		display: flex;
		justify-content: flex-end;
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* --- Track --- */
	.progress-block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		max-inline-size: 36rem;
	}

	.progress-money {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.track-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		max-inline-size: 42rem;
	}

	.track-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.track-row:first-child {
		border-block-start: none;
	}

	.track-main {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.track-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.track-amount {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.track-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--gok-space-200);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
