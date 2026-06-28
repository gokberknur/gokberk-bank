<script lang="ts">
	// P10 — the payees directory. The full beneficiary list in a gok-table (the
	// same DOM-property + single-selection idiom as the ledger grid), plus the one
	// primary action of the surface: add a payee. Selecting a row seeds the send
	// draft for that payee and jumps straight to the send flow — there's no payee
	// detail/edit drawer yet (deferred), so a row is a "pay this person" shortcut.
	// Cells are formatted **strings** (a known gok-table limit), so type and the
	// last-paid date are words, not tags.
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import { payments } from '$lib/state/payments.svelte';
	import { formatDate } from '$lib/format';
	import { maskIban } from '$lib/payments/iban';
	import type { Payee, PayeeType } from '$lib/data/types';

	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		primary?: boolean;
		width?: string;
		format?: (value: unknown, row: Payee) => string;
	};

	const TYPE_LABELS: Record<PayeeType, string> = {
		sepa: 'SEPA',
		swift: 'SWIFT',
		gok: 'gök'
	};

	/** The account line: a masked IBAN tail, a gök handle, or a dash. */
	function accountOf(p: Payee): string {
		if (p.iban) return maskIban(p.iban);
		if (p.handle) return p.handle;
		return '—';
	}

	const columns: Column[] = [
		{ key: 'name', label: 'Name', primary: true, sortable: true },
		{ key: 'type', label: 'Type', width: '6rem', format: (v) => TYPE_LABELS[v as PayeeType] },
		{ key: 'iban', label: 'Account', format: (_v, row) => accountOf(row) },
		{ key: 'currency', label: 'Currency', width: '7rem', sortable: true },
		{
			key: 'lastUsedAt',
			label: 'Last paid',
			width: '9rem',
			sortable: true,
			format: (v) => (v ? formatDate(v as string) : 'Never')
		}
	];

	const getRowId = (p: Payee) => p.id;

	const rows = $derived(payments.payees);

	// Row selection is a "pay this payee" shortcut: seed the draft, then send.
	function handleSelection(e: Event) {
		const id = (e as CustomEvent<{ ids: string[] }>).detail.ids?.[0];
		if (!id) return;
		payments.setDraft({ payeeId: id, recipientKind: 'payee' });
		goto('/payments/transfer');
	}
</script>

<div class="page">
	<header class="head">
		<div class="head-text">
			<p class="head-eyebrow gok-eyebrow">Payments</p>
			<h1 class="head-title gok-headline-2">Payees</h1>
			<p class="head-sub">Everyone I pay. Select a payee to send money, or add a new one.</p>
		</div>
		<gok-link href="/payments/payees/new" class="add-link">
			<gok-button variant="primary">Add payee</gok-button>
		</gok-link>
	</header>

	<gok-table
		selection-mode="single"
		accessible-label="Payees"
		{@attach setProps({ columns, rows, getRowId })}
		{@attach on('gok-selection-change', handleSelection)}
	>
		<div slot="caption" class="caption">
			<p class="caption-eyebrow gok-eyebrow">Directory</p>
			<h2 class="caption-title gok-headline-5">My payees</h2>
		</div>

		<div slot="empty" class="empty">
			<gok-empty-state>
				<p class="empty-title gok-headline-6">No payees yet</p>
				<p class="empty-body">Add your first payee and they’ll show up here, ready to pay.</p>
				<gok-link slot="actions" href="/payments/payees/new">
					<gok-button variant="primary">Add payee</gok-button>
				</gok-link>
			</gok-empty-state>
		</div>
	</gok-table>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
		/* Trim the sparse header→content gap to the standard ~32px (PAY-U-04). */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.head-text {
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

	.caption {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.caption-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.caption-title {
		margin: 0;
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
