<script lang="ts">
	// P10 / flow §3 — the add-payee wizard. Three clean steps on the F05 wizard
	// composite: choose a type, enter the account details (with a real mod-97 IBAN
	// checksum that rewards early on blur), then review and save. The whole thing
	// writes into one flow-data object the wizard owns; the step `validate` fns read
	// the same object, so blocking and field-level errors agree. On save the payee
	// joins the directory and we return to the list.
	//
	// Deferred (kept out so the flow stays to three steps): SWIFT beneficiaries
	// (BIC/country/address), confirmation-of-payee name-match verification, and
	// duplicate detection — see the TODOs below and P10's open questions.
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import { payments, type NewPayeeInput } from '$lib/state/payments.svelte';
	import { ibanChecksum, bicFormat, normalizeIban, formatIban } from '$lib/payments/iban';
	import type { PayeeType } from '$lib/data/types';

	/** The wizard's working data — one object the fields write and `validate` reads. */
	interface AddPayeeData {
		type: '' | 'sepa' | 'gok';
		name: string;
		iban: string;
		bic: string;
		handle: string;
		nickname: string;
	}

	const TYPE_LABELS: Record<'sepa' | 'gok', string> = { sepa: 'SEPA', gok: 'gök user' };

	const IBAN_ERROR = 'That IBAN doesn’t look right. Check the digits and try again.';

	const steps: StepDef<AddPayeeData>[] = [
		{
			id: 'type',
			title: 'Type',
			validate: (d) => (d.type ? true : 'Choose what kind of payee this is.')
		},
		{
			id: 'details',
			title: 'Details',
			validate: (d) => {
				if (!d.name.trim()) return 'Enter the payee’s name.';
				if (d.type === 'sepa') {
					if (!d.iban.trim()) return 'Enter the payee’s IBAN.';
					if (!ibanChecksum(d.iban)) return IBAN_ERROR;
					if (!bicFormat(d.bic)) return 'That BIC doesn’t look right. Leave it blank if you’re unsure.';
				} else if (d.type === 'gok') {
					if (!d.handle.trim()) return 'Enter the gök handle.';
				}
				return true;
			}
		},
		{ id: 'save', title: 'Review' }
	];

	const wizard = createWizard<AddPayeeData>({
		flowId: 'add-payee',
		steps,
		initialData: { type: '', name: '', iban: '', bic: '', handle: '', nickname: '' }
	});

	// Reward-early IBAN error, surfaced on the field (separate from the step-level
	// block message). Cleared the moment the checksum passes again.
	let ibanError = $state<string | null>(null);

	/** Set a field's initial value once, on mount — read untracked so typing never re-runs it. */
	function initField(key: keyof AddPayeeData) {
		return (node: Element) => {
			(node as HTMLInputElement).value = untrack(() => String(wizard.data[key] ?? ''));
		};
	}

	function fieldInput(key: 'name' | 'bic' | 'handle' | 'nickname') {
		return (e: Event) => {
			wizard.data[key] = (e.target as HTMLInputElement).value;
		};
	}

	function onTypeChange(e: Event) {
		wizard.data.type = (e.target as HTMLInputElement).value as AddPayeeData['type'];
	}

	function onIbanInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		wizard.data.iban = value;
		if (ibanError && ibanChecksum(value)) ibanError = null;
	}

	function onIbanChange() {
		const value = wizard.data.iban.trim();
		ibanError = value && !ibanChecksum(value) ? IBAN_ERROR : null;
	}

	// Review-ledger values, derived from the flow data.
	const reviewName = $derived(wizard.data.nickname.trim() || wizard.data.name.trim() || '—');
	const reviewType = $derived(wizard.data.type ? TYPE_LABELS[wizard.data.type] : '—');
	const reviewAccount = $derived(
		wizard.data.type === 'gok'
			? wizard.data.handle.trim() || '—'
			: wizard.data.iban.trim()
				? formatIban(wizard.data.iban)
				: '—'
	);

	/** Persist the payee, clear the draft, and return to the directory. */
	function save() {
		const d = wizard.data;
		if (d.type !== 'sepa' && d.type !== 'gok') return;
		const type = d.type as PayeeType;
		const input: NewPayeeInput = {
			name: d.nickname.trim() || d.name.trim(),
			type,
			currency: 'EUR',
			iban: type === 'sepa' ? normalizeIban(d.iban) : null,
			bic: type === 'sepa' && d.bic.trim() ? d.bic.replace(/\s+/g, '').toUpperCase() : null,
			handle: type === 'gok' ? d.handle.trim() : undefined
		};
		payments.addPayee(input);
		wizard.clearDraft();
		goto('/payments/payees');
	}
</script>

<div class="page">
	<header class="head">
		<gok-link href="/payments/payees">&larr; Payees</gok-link>
		<p class="eyebrow gok-eyebrow">Payments</p>
		<h1 class="title gok-headline-2">Add a payee</h1>
	</header>

	<Wizard {wizard} submitLabel="Add payee" onComplete={save}>
		{#if wizard.current.id === 'type'}
			<div class="step">
				<p class="lead">What kind of payee is this? It sets which details I’ll need.</p>
				<gok-segmented
					label="Payee type"
					{@attach setProps({ value: wizard.data.type })}
					{@attach on('change', onTypeChange)}
				>
					<gok-segmented-item value="sepa">SEPA IBAN</gok-segmented-item>
					<gok-segmented-item value="gok">gök user</gok-segmented-item>
				</gok-segmented>
				<!-- TODO: SWIFT (BIC + country + beneficiary address) and internal own-wallet
				     payee types are deferred — see P10 §B and ux-flows §3. -->
				<p class="note">SWIFT and own-wallet payees are coming soon.</p>
			</div>
		{:else if wizard.current.id === 'details'}
			<div class="step fields">
				<gok-input
					label="Name"
					placeholder="Account holder’s name"
					autocomplete="off"
					reserve-message
					{@attach initField('name')}
					{@attach on('input', fieldInput('name'))}
				></gok-input>

				{#if wizard.data.type === 'sepa'}
					<gok-input
						label="IBAN"
						placeholder="DE21 1001 0010 0123 4567 89"
						autocomplete="off"
						reserve-message
						error={ibanError ?? ''}
						{@attach initField('iban')}
						{@attach on('input', onIbanInput)}
						{@attach on('change', onIbanChange)}
					></gok-input>

					<gok-input
						label="BIC"
						placeholder="Optional"
						autocomplete="off"
						reserve-message
						helper="Optional — your bank can usually find it from the IBAN."
						{@attach initField('bic')}
						{@attach on('input', fieldInput('bic'))}
					></gok-input>
				{:else if wizard.data.type === 'gok'}
					<gok-input
						label="Handle"
						placeholder="@handle"
						autocomplete="off"
						reserve-message
						helper="The person’s gök handle, e.g. @lena."
						{@attach initField('handle')}
						{@attach on('input', fieldInput('handle'))}
					></gok-input>
				{/if}

				<!-- TODO: confirmation-of-payee name-match + duplicate detection (P10 §2/§3)
				     are deferred to a later pass. -->
			</div>
		{:else if wizard.current.id === 'save'}
			<div class="step">
				<p class="lead">Check the details, then save this payee.</p>

				<dl class="ledger">
					<div class="row">
						<dt class="row-label gok-eyebrow">Name</dt>
						<dd class="row-value">{reviewName}</dd>
					</div>
					<div class="row">
						<dt class="row-label gok-eyebrow">Type</dt>
						<dd class="row-value">{reviewType}</dd>
					</div>
					<div class="row">
						<dt class="row-label gok-eyebrow">Account</dt>
						<dd class="row-value gok-tabular-nums account">{reviewAccount}</dd>
					</div>
				</dl>

				<gok-input
					label="Nickname"
					placeholder="Optional"
					autocomplete="off"
					reserve-message
					helper="A name just for me. Leave it blank to use the account name."
					{@attach initField('nickname')}
					{@attach on('input', fieldInput('nickname'))}
				></gok-input>
			</div>
		{/if}
	</Wizard>
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

	.step {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.fields {
		max-inline-size: 32rem;
	}

	.lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* Review ledger: a quiet key/value list with hairline rules. */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		max-inline-size: 32rem;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:last-child {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.row-value {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		text-align: end;
	}

	.account {
		font-family: var(--gok-font-family-mono);
	}
</style>
