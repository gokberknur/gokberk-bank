<script lang="ts">
	// P10 / flow §3 — the add-payee wizard on the F05 wizard composite: choose a type,
	// enter the account details (with a real mod-97 IBAN checksum that rewards early on
	// blur), confirm the payee name against the (simulated) receiving bank (SEPA only),
	// then review and save. The whole thing writes into one flow-data object the wizard
	// owns; the step `validate` fns read the same object, so blocking and field-level
	// errors agree. On save the payee joins the directory and we return to the list.
	//
	// Deferred (kept out to hold the flow tight): SWIFT beneficiaries (BIC/country/
	// address) and duplicate detection — see the TODOs below and P10's open questions.
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import { payments, type NewPayeeInput } from '$lib/state/payments.svelte';
	import { ibanChecksum, bicFormat, normalizeIban, formatIban } from '$lib/payments/iban';
	import { confirmPayee } from '$lib/payments/confirm-payee';
	import type { PayeeType } from '$lib/data/types';

	/** The wizard's working data — one object the fields write and `validate` reads. */
	interface AddPayeeData {
		type: '' | 'sepa' | 'gok';
		name: string;
		iban: string;
		bic: string;
		handle: string;
		nickname: string;
		acknowledged: boolean;
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
		{
			id: 'verify',
			title: 'Confirm',
			// Confirmation of payee is a SEPA-account concept — skip it for gök-handle payees.
			canEnter: (d) => d.type === 'sepa',
			validate: (d) =>
				confirmPayee(d.name, d.iban).status === 'match' || d.acknowledged
					? true
					: 'Please confirm you’ve checked the account name before continuing.'
		},
		{ id: 'save', title: 'Review' }
	];

	const wizard = createWizard<AddPayeeData>({
		flowId: 'add-payee',
		steps,
		initialData: { type: '', name: '', iban: '', bic: '', handle: '', nickname: '', acknowledged: false }
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

	function onNameInput(e: Event) {
		wizard.data.name = (e.target as HTMLInputElement).value;
		// A changed name invalidates a prior acknowledgement.
		wizard.data.acknowledged = false;
	}

	function onAckChange(e: Event) {
		wizard.data.acknowledged = (e.target as HTMLElement & { checked?: boolean }).checked ?? false;
	}

	function onIbanInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		wizard.data.iban = value;
		if (ibanError && ibanChecksum(value)) ibanError = null;
		wizard.data.acknowledged = false;
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

	// Confirmation of payee — the (simulated) bank's name-match for the entered SEPA account.
	const cop = $derived(confirmPayee(wizard.data.name, wizard.data.iban));

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
					{@attach on('input', onNameInput)}
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

				<!-- TODO: duplicate detection (P10 §3) is deferred to a later pass. -->
			</div>
		{:else if wizard.current.id === 'verify'}
			<div class="step">
				<p class="lead">I checked this account with the receiving bank before you send.</p>
				{#if cop.status === 'match'}
					<div class="cop cop-match" role="status">
						<span class="cop-mark" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
								<path
									d="M5 12.5l4.5 4.5L19 7"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						<div class="cop-text">
							<p class="cop-title gok-headline-6">The account name matches</p>
							<p class="cop-body">
								The bank confirms this account belongs to <strong>{cop.accountName}</strong>. Looks
								right to continue.
							</p>
						</div>
					</div>
				{:else}
					<gok-alert status="warning">
						<span slot="title">The name doesn’t match</span>
						The account holder is registered as <strong>{cop.accountName}</strong>, not “{wizard.data.name.trim()}”.
						Check you have the right account before you continue — once money is sent, it can’t be
						pulled back.
					</gok-alert>
					<gok-checkbox
						{@attach setProps({ checked: wizard.data.acknowledged })}
						{@attach on('change', onAckChange)}
					>
						I’ve checked this is correct
					</gok-checkbox>
				{/if}
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

	.cop {
		display: flex;
		align-items: flex-start;
		gap: var(--gok-space-300);
		max-inline-size: 36rem;
	}

	.cop-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: var(--gok-border-width-strong) solid currentcolor;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-text-muted);
	}

	.cop-match .cop-mark {
		color: var(--gok-color-primary);
	}

	.cop-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.cop-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.cop-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
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
