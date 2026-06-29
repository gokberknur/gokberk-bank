<script lang="ts">
	// A06 — Statements. A quiet document vault for one wallet: the monthly statements
	// the spine already buckets, plus any custom-range statement I generate this
	// session. This is record-keeping, not a money move, so the forest-green accent
	// stays unspent — every affordance is neutral ink. Opening a statement renders it
	// inline as a tidy branded document that prints to PDF: a `@media print` block
	// hides the app shell and forces ink-on-paper contrast, so the screen render stays
	// token-driven while the page that comes out of the printer is readable in any theme.
	//
	// Interop is strictly `setProps`/`on` from $lib/wc.svelte — never `bind:` on a
	// gok-* host. The from/to range is one DS gok-date-range (two ISO fields, one
	// calendar); both ends are read off the event detail on `input`.
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { setProps, on } from '$lib/wc.svelte';
	import { statements } from '$lib/accounts/statements.svelte';
	import type { Statement } from '$lib/accounts/statements.svelte';
	import { accounts } from '$lib/state/accounts.svelte';
	import { session } from '$lib/state/session.svelte';
	import { formatMoney, formatDate } from '$lib/format';

	const walletId = $derived(page.params.id ?? '');
	const wallet = $derived(walletId ? accounts.wallet(walletId) : undefined);

	// Every statement for this wallet — my generated ones first, then the monthly set.
	const list = $derived(walletId ? statements.forWallet(walletId) : []);

	// ── The on-screen statement render. `opened` is the statement currently shown as
	// a document; its rows are oldest-first (statement order). ──
	let opened = $state<Statement | null>(null);
	const openedTxns = $derived(opened ? statements.transactions(opened) : []);

	// ── Generate. One gok-date-range (from/to) + reward-early validation on a reserved line. ──
	let start = $state('');
	let end = $state('');
	let emptyNote = $state(false);

	const bothSet = $derived(!!start && !!end);
	const rangeValid = $derived(statements.validRange(start, end));
	const rangeMessage = $derived(
		bothSet && !rangeValid
			? 'The start date needs to be on or before the end date.'
			: rangeValid
				? 'Ready — I’ll assemble a statement for that range.'
				: ''
	);

	function onRangeInput(event: Event) {
		const detail = (event as CustomEvent<{ start: string; end: string }>).detail;
		start = detail.start;
		end = detail.end;
		emptyNote = false;
	}

	function generate() {
		if (!rangeValid || !walletId) return;
		const s = statements.generate(walletId, start, end);
		if (!s) return;
		// Zero rows → the toast already says so; show a quiet note, don't open a blank doc.
		if (s.txnCount > 0) {
			emptyNote = false;
			opened = s;
		} else {
			opened = null;
			emptyNote = true;
		}
	}

	// ── Row affordances. View opens the document inline; Download opens it then prints. ──
	function view(s: Statement) {
		emptyNote = false;
		opened = s;
	}

	async function download(s: Statement) {
		emptyNote = false;
		opened = s;
		await tick();
		printDoc();
	}

	function closeDoc() {
		opened = null;
	}

	function printDoc() {
		// Guarded for SSR — printing is a browser-only affordance.
		if (browser) window.print();
	}
</script>

<svelte:head>
	<title>Statements · gökberk bank</title>
</svelte:head>

{#if !wallet}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Wallet not found</p>
			<p class="missing-body">This wallet doesn’t exist, or it has been closed.</p>
			<gok-link slot="actions" href="/accounts">Back to accounts</gok-link>
		</gok-empty-state>
	</div>
{:else}
	<div class="page">
		<header class="head">
			<gok-link href={`/accounts/${walletId}`}>&larr; {wallet.name}</gok-link>
			<p class="currency gok-eyebrow">{wallet.currency} wallet</p>
			<h1 class="title gok-headline-2">{wallet.name} · Statements</h1>
			<p class="lead">
				My statements for this wallet — I can pull any month, or generate one for a range I choose.
			</p>
		</header>

		<!-- Generate · a date range + a neutral action. The accent stays unspent. -->
		<section class="generate" aria-labelledby="generate-heading">
			<h2 id="generate-heading" class="section-title gok-headline-6">Generate a statement</h2>
			<p class="section-note">Pick a start and end date and I’ll assemble a statement for that period.</p>

			<div class="range">
				<gok-date-range
					label="Statement period"
					{@attach setProps({ valueStart: start, valueEnd: end })}
					{@attach on('input', onRangeInput)}
					{@attach on('change', onRangeInput)}
				></gok-date-range>
				<gok-button
					variant="secondary"
					{@attach setProps({ disabled: !rangeValid })}
					{@attach on('click', generate)}
				>
					Generate statement
				</gok-button>
			</div>

			<!-- Reserved message line: always present so a note never shifts the row. -->
			<p id="range-message" class="range-message" role="status" aria-live="polite">{rangeMessage}</p>

			{#if emptyNote}
				<p class="empty-note">
					No transactions in that period — nothing to put on a statement. I’ll try a wider range.
				</p>
			{/if}
		</section>

		<!-- The on-screen statement document — rendered inline, and the only thing that
		     prints (the @media print block hides the rest of the app). -->
		{#if opened}
			<section class="document print-doc" aria-labelledby="doc-heading">
				<header class="doc-head">
					<div class="doc-brandline">
						<p class="wordmark">gökberk.<span class="wordmark-sub"> bank</span></p>
						<p class="doc-kind gok-eyebrow">Statement</p>
					</div>
					<h2 id="doc-heading" class="doc-period">
						Statement · {formatDate(opened.periodStart)}–{formatDate(opened.periodEnd)}
					</h2>
					<dl class="doc-meta">
						<div class="doc-meta-row">
							<dt>Account holder</dt>
							<dd>{session.name}</dd>
						</div>
						<div class="doc-meta-row">
							<dt>Wallet</dt>
							<dd>{wallet.name} · {wallet.currency}</dd>
						</div>
						<div class="doc-meta-row">
							<dt>IBAN</dt>
							<dd class="mono">{wallet.iban}</dd>
						</div>
						<div class="doc-meta-row">
							<dt>BIC</dt>
							<dd class="mono">{wallet.bic}</dd>
						</div>
					</dl>
				</header>

				<dl class="doc-balances">
					<div class="balance-fact">
						<dt class="gok-eyebrow">Opening balance</dt>
						<dd class="gok-tabular-nums">
							{formatMoney(opened.openingBalanceMinor, wallet.currency)}
						</dd>
					</div>
					<div class="balance-fact">
						<dt class="gok-eyebrow">Closing balance</dt>
						<dd class="gok-tabular-nums">
							{formatMoney(opened.closingBalanceMinor, wallet.currency)}
						</dd>
					</div>
				</dl>

				<table class="doc-table">
					<caption class="doc-caption">
						Transactions · {formatDate(opened.periodStart)}–{formatDate(opened.periodEnd)}
					</caption>
					<thead>
						<tr>
							<th scope="col" class="col-date">Date</th>
							<th scope="col" class="col-desc">Description</th>
							<th scope="col" class="col-num">Amount</th>
							<th scope="col" class="col-num">Balance</th>
						</tr>
					</thead>
					<tbody>
						{#if openedTxns.length === 0}
							<tr>
								<td colspan="4" class="doc-empty">No transactions in this period.</td>
							</tr>
						{:else}
							{#each openedTxns as t (t.id)}
								<tr>
									<td class="col-date gok-tabular-nums">{formatDate(t.date)}</td>
									<td class="col-desc">{t.merchant}</td>
									<td class="col-num gok-tabular-nums">
										{formatMoney(t.amountMinor, wallet.currency, { signDisplay: true })}
									</td>
									<td class="col-num gok-tabular-nums">
										{formatMoney(t.runningBalanceMinor, wallet.currency)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>

				<div class="doc-actions">
					<gok-button variant="secondary" {@attach on('click', printDoc)}>Download PDF</gok-button>
					<gok-button variant="secondary" {@attach on('click', closeDoc)}>Close</gok-button>
				</div>
			</section>
		{/if}

		<!-- The statement list — a real, captioned table; each row opens or downloads. -->
		<section class="list" aria-labelledby="list-heading">
			<h2 id="list-heading" class="section-title gok-headline-6">My statements</h2>

			{#if list.length === 0}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No statements yet</p>
					<p class="empty-body">
						When money moves in this wallet, monthly statements show up here.
					</p>
				</gok-empty-state>
			{:else}
				<table class="stmt-table">
					<caption class="sr-only">My statements for {wallet.name}</caption>
					<thead>
						<tr>
							<th scope="col">Period</th>
							<th scope="col">Generated</th>
							<th scope="col" class="num">Transactions</th>
							<th scope="col" class="num">Closing balance</th>
							<th scope="col"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each list as s (s.id)}
							<tr class:is-open={opened?.id === s.id}>
								<td class="period-cell">
									<span class="period-text gok-tabular-nums">
										{formatDate(s.periodStart)}–{formatDate(s.periodEnd)}
									</span>
									{#if s.custom}<gok-tag size="s">Custom</gok-tag>{/if}
								</td>
								<td class="gok-tabular-nums">{formatDate(s.generatedAt)}</td>
								<td class="num gok-tabular-nums">{s.txnCount}</td>
								<td class="num gok-tabular-nums">
									{formatMoney(s.closingBalanceMinor, wallet.currency)}
								</td>
								<td class="actions-cell">
									<gok-button variant="secondary" size="s" {@attach on('click', () => view(s))}>
										View<span class="sr-only"> statement</span>
									</gok-button>
									<gok-button variant="secondary" size="s" {@attach on('click', () => download(s))}>
										Download<span class="sr-only"> statement</span>
									</gok-button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	/* --- Missing wallet --- */
	.missing {
		padding-block: var(--gok-space-700);
	}

	.missing-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.missing-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Header --- */
	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.currency {
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

	/* --- Section scaffolding --- */
	.section-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.section-note {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Generate --- */
	.generate {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.range {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--gok-space-300);
		margin-block-start: var(--gok-space-200);
	}

	.range-message {
		min-block-size: var(--gok-type-body-small-line);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.empty-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- The statement document (screen render, token-driven) --- */
	.document {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-500);
		padding: var(--gok-space-600);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-l);
		background: var(--gok-color-surface);
	}

	.doc-head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		padding-block-end: var(--gok-space-400);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc-brandline {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.wordmark {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	.wordmark-sub {
		font-weight: var(--gok-font-weight-regular);
		color: var(--gok-color-text-muted);
	}

	.doc-kind {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.doc-period {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-6-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-6-line);
		color: var(--gok-color-text);
	}

	.doc-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--gok-space-200) var(--gok-space-500);
		margin: 0;
	}

	.doc-meta-row {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-50, 0.125rem);
	}

	.doc-meta-row dt {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.doc-meta-row dd {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.doc-meta-row dd.mono {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
	}

	/* --- Opening / closing facts --- */
	.doc-balances {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200) var(--gok-space-700);
		margin: 0;
	}

	.balance-fact {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.balance-fact dt {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.balance-fact dd {
		margin: 0;
		font-family: var(--gok-font-family-display);
		font-size: var(--gok-type-headline-5-size);
		font-weight: var(--gok-font-weight-semibold);
		line-height: var(--gok-type-headline-5-line);
		color: var(--gok-color-text);
	}

	/* --- Tables (document + list share the figure idiom) --- */
	.doc-table,
	.stmt-table {
		inline-size: 100%;
		border-collapse: collapse;
		font-family: var(--gok-font-family-text);
	}

	.doc-caption {
		margin-block-end: var(--gok-space-300);
		text-align: start;
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.doc-table th,
	.doc-table td,
	.stmt-table th,
	.stmt-table td {
		padding-block: var(--gok-space-300);
		padding-inline: var(--gok-space-300);
		text-align: start;
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.doc-table th,
	.stmt-table th {
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text-muted);
		border-block-end: var(--gok-border-width-strong) solid var(--gok-color-border-strong);
	}

	.doc-table td,
	.stmt-table td {
		color: var(--gok-color-text);
	}

	.col-num,
	.num {
		text-align: end;
	}

	.col-date {
		inline-size: 8rem;
		color: var(--gok-color-text-muted);
	}

	.doc-empty {
		padding-block: var(--gok-space-500);
		text-align: center;
		color: var(--gok-color-text-muted);
	}

	.doc-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
	}

	/* --- Statement list --- */
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.period-cell {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.period-text {
		color: var(--gok-color-text);
	}

	.actions-cell {
		text-align: end;
		white-space: nowrap;
	}

	/* Open row — firmed to ink (no accent), matching the rest of the vault. */
	.stmt-table tbody tr.is-open td {
		background: var(--gok-color-surface-strong);
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

	/* --- Shared --- */
	.mono {
		font-family: var(--gok-font-family-mono);
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

	/* On small screens the figure columns get tight — let the row breathe. */
	@media (max-width: 39.999rem) {
		.doc-meta {
			grid-template-columns: minmax(0, 1fr);
		}

		.doc-table th,
		.doc-table td,
		.stmt-table th,
		.stmt-table td {
			padding-inline: var(--gok-space-200);
		}
	}

	/*
	 * Print · the document-vault payoff. Hide the whole app, reveal only the open
	 * statement, and force ink-on-paper contrast (real ink, so fixed readable colours
	 * are correct here regardless of the on-screen theme). Hairline rules + tabular
	 * figures are preserved. The screen render above stays fully token-driven.
	 */
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}

		.print-doc,
		.print-doc :global(*) {
			visibility: visible !important;
			color: #1a1a1a !important;
			background: transparent !important;
			box-shadow: none !important;
		}

		.print-doc {
			position: absolute;
			inset-block-start: 0;
			inset-inline-start: 0;
			inline-size: 100%;
			padding: 0;
			border: 0;
			background: #ffffff !important;
		}

		.wordmark-sub {
			color: #555555 !important;
		}

		.doc-kind,
		.doc-caption,
		.doc-meta-row dt,
		.balance-fact dt,
		.doc-table th {
			color: #555555 !important;
		}

		.doc-head {
			border-block-end-color: #1a1a1a !important;
		}

		.doc-table th {
			border-block-end-color: #1a1a1a !important;
		}

		.doc-table td {
			border-block-end-color: #cccccc !important;
		}

		/* The on-screen controls never print. */
		.doc-actions {
			display: none !important;
		}
	}
</style>
