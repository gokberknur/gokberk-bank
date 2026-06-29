<script lang="ts">
	// X04 · My identity ledger — a hairline, read-only ledger of who I am to the bank.
	// Identity-bearing fields (legal name, DOB, residency, tax residency) are NOT
	// editable here: changing them is a KYC re-verification, so each routes to /onboarding
	// with a calm "managed by identity" affordance rather than an inline edit. Only my
	// address is editable — an "Edit" button opens a gok-drawer of gok-inputs (validated
	// reward-early: no empty line1/city/postcode), Save commits to a local $state snapshot
	// (the seed `profile.address` is const, so I keep an editable copy), toasts, and closes.
	//
	// Interop is strictly setProps/on from wc.svelte — never bind: on a gok-* host; every
	// gok-input value is read off its event. First-person singular throughout — it's MY
	// profile.
	import { setProps, on } from '$lib/wc.svelte';
	import { formatDate } from '$lib/format';
	import { profile } from '$lib/data/profile-data';
	import { toast } from '$lib/state/toasts.svelte';

	type AddressField = 'line1' | 'city' | 'postcode' | 'country';

	// Identity-bearing fields — read-only, each routes to KYC re-verification.
	const identityRows = [
		{ key: 'Legal name', value: profile.legalName },
		{ key: 'Date of birth', value: formatDate(profile.dobIso) },
		{ key: 'Residency', value: profile.residencyCountry },
		{ key: 'Tax residency', value: profile.taxResidency }
	];

	// Contact + display fields — shown masked, not identity-managed.
	const contactRows = [
		{ key: 'Preferred name', value: profile.preferredName },
		{ key: 'Email', value: profile.emailMasked },
		{ key: 'Phone', value: profile.phoneMasked }
	];

	// The only editable field: my address. The seed is const, so I keep an editable
	// $state snapshot seeded from it.
	let address = $state({ ...profile.address });

	// ── Edit drawer · a working draft, committed only on a valid Save ──
	let drawerOpen = $state(false);
	let draft = $state({ ...profile.address });
	// Reward-early: a field's error only shows once I've touched it (or tried to Save).
	let touched = $state<Record<AddressField, boolean>>({
		line1: false,
		city: false,
		postcode: false,
		country: false
	});

	const required: AddressField[] = ['line1', 'city', 'postcode'];

	const errors = $derived<Partial<Record<AddressField, string>>>({
		line1: draft.line1.trim() === '' ? 'I need a street address.' : undefined,
		city: draft.city.trim() === '' ? 'I need a city.' : undefined,
		postcode: draft.postcode.trim() === '' ? 'I need a postcode.' : undefined
	});

	const valid = $derived(required.every((f) => !errors[f]));

	/** Show a field's error only after it's been touched. */
	function shownError(field: AddressField): string | undefined {
		return touched[field] ? errors[field] : undefined;
	}

	function openEdit() {
		draft = { ...address };
		touched = { line1: false, city: false, postcode: false, country: false };
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	function onField(field: AddressField) {
		return (event: Event) => {
			const value = (event.target as HTMLElement & { value?: string }).value ?? '';
			draft = { ...draft, [field]: value };
			touched = { ...touched, [field]: true };
		};
	}

	function save() {
		if (!valid) {
			// Reveal every required-field error and hold the drawer open.
			touched = { line1: true, city: true, postcode: true, country: true };
			return;
		}
		address = { ...draft };
		drawerOpen = false;
		toast('My address is updated.', { status: 'success' });
	}
</script>

<gok-card class="ledger-card">
	<div class="group">
		<p class="group-eyebrow gok-eyebrow">Identity</p>
		<p class="group-note">
			Managed by identity — these are set by my verification and can't be edited here.
		</p>
		<dl class="ledger">
			{#each identityRows as row (row.key)}
				<div class="row">
					<dt>{row.key}</dt>
					<dd>
						<span class="value">{row.value}</span>
						<span class="managed">
							<gok-link href="/onboarding">Update via verification</gok-link>
						</span>
					</dd>
				</div>
			{/each}
		</dl>
	</div>

	<div class="group">
		<p class="group-eyebrow gok-eyebrow">Contact</p>
		<dl class="ledger">
			{#each contactRows as row (row.key)}
				<div class="row">
					<dt>{row.key}</dt>
					<dd><span class="value">{row.value}</span></dd>
				</div>
			{/each}
		</dl>
	</div>

	<div class="group">
		<div class="group-head">
			<p class="group-eyebrow gok-eyebrow">Address</p>
			<gok-button variant="secondary" size="s" {@attach on('click', openEdit)}>
				Edit<span class="sr-only"> my address</span>
			</gok-button>
		</div>
		<address class="postal">
			<span>{address.line1}</span>
			<span class="gok-tabular-nums">{address.postcode} {address.city}</span>
			<span>{address.country}</span>
		</address>
	</div>
</gok-card>

<!-- Edit · the only editable surface. A calm drawer of address fields. -->
<gok-drawer
	placement="end"
	heading="Edit my address"
	{@attach setProps({ open: drawerOpen })}
	{@attach on('gok-close', closeDrawer)}
	{@attach on('gok-cancel', closeDrawer)}
>
	<form class="form" aria-label="Edit my address" onsubmit={(e) => e.preventDefault()}>
		<p class="form-lead">
			I can update where I live. My name and identity details stay managed by verification.
		</p>

		<gok-input
			label="Street address"
			autocomplete="address-line1"
			reserve-message
			{@attach setProps({ value: draft.line1, error: shownError('line1') })}
			{@attach on('input', onField('line1'))}
			{@attach on('change', onField('line1'))}
		></gok-input>

		<gok-input
			label="City"
			autocomplete="address-level2"
			reserve-message
			{@attach setProps({ value: draft.city, error: shownError('city') })}
			{@attach on('input', onField('city'))}
			{@attach on('change', onField('city'))}
		></gok-input>

		<gok-input
			label="Postcode"
			autocomplete="postal-code"
			reserve-message
			{@attach setProps({ value: draft.postcode, error: shownError('postcode') })}
			{@attach on('input', onField('postcode'))}
			{@attach on('change', onField('postcode'))}
		></gok-input>

		<gok-input
			label="Country"
			autocomplete="country-name"
			reserve-message
			{@attach setProps({ value: draft.country })}
			{@attach on('input', onField('country'))}
			{@attach on('change', onField('country'))}
		></gok-input>
	</form>

	<div slot="footer" class="form-actions">
		<gok-button variant="secondary" {@attach on('click', closeDrawer)}>Cancel</gok-button>
		<gok-button
			variant="primary"
			{@attach setProps({ disabled: !valid })}
			{@attach on('click', save)}
		>
			Save address
		</gok-button>
	</div>
</gok-drawer>

<style>
	.ledger-card {
		display: block;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
		padding-block: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.group:first-child {
		padding-block-start: 0;
		border-block-start: none;
	}

	.group:last-child {
		padding-block-end: 0;
	}

	.group-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.group-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.group-note {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Key/value ledger --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		margin: 0;
		text-align: end;
	}

	.value {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.managed {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
	}

	/* --- Address block --- */
	.postal {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-style: normal;
		color: var(--gok-color-text);
	}

	/* --- Edit drawer --- */
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.form-lead {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
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
