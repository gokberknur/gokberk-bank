<script lang="ts">
	// X04 · My profile — who I am to the bank. A calm, settings-style surface: my identity
	// ledger (read-only identity fields routed to verification; only my address editable),
	// my KYC standing (I'm verified, so this reads as a satisfied "fully verified" state),
	// and the two onward rows to my plan and its limits. First-person singular throughout.
	import { formatDate } from '$lib/format';
	import { profile, KYC_LEVELS } from '$lib/data/profile-data';
	import { session } from '$lib/state/session.svelte';
	import ProfileLedger from '$lib/components/profile/ProfileLedger.svelte';

	const kyc = $derived(KYC_LEVELS[profile.kyc]);
	const verified = $derived(profile.kyc === 'verified');
</script>

<svelte:head>
	<title>My profile · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<p class="eyebrow gok-eyebrow">Profile</p>
		<h1 class="title gok-headline-2">My profile</h1>
		<p class="lead">
			The details the bank holds for me. My identity is managed by verification; I can update where
			I live.
		</p>
	</header>

	<section class="section" aria-label="My details">
		<h2 class="section-title gok-headline-5">My details</h2>
		<ProfileLedger />
	</section>

	<section class="section" aria-label="Identity verification">
		<h2 class="section-title gok-headline-5">Verification</h2>
		<gok-card class="kyc">
			<div class="kyc-head">
				<div class="kyc-level">
					<p class="kyc-eyebrow gok-eyebrow">My level</p>
					<div class="kyc-name-row">
						<span class="kyc-name">{kyc.label}</span>
						<gok-tag variant="readonly" size="m">{kyc.label}</gok-tag>
					</div>
				</div>
				{#if verified}
					<p class="kyc-status">
						<span class="kyc-check" aria-hidden="true">
							<svg viewBox="0 0 16 16" width="13" height="13" fill="none">
								<path
									d="M3 8.5l3 3 7-8"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						Fully verified
					</p>
				{/if}
			</div>

			<p class="kyc-unlocks">{kyc.unlocks}</p>

			<dl class="ledger">
				<div class="row">
					<dt>Verified on</dt>
					<dd class="gok-tabular-nums">{formatDate(profile.verifiedOnIso)}</dd>
				</div>
			</dl>

			{#if !verified}
				<div class="kyc-action">
					<gok-link href="/onboarding">
						<gok-button variant="primary">Raise my level</gok-button>
					</gok-link>
				</div>
			{/if}
		</gok-card>
	</section>

	<section class="section" aria-label="My plan">
		<h2 class="section-title gok-headline-5">My plan</h2>
		<nav class="links" aria-label="Plan">
			<a class="link-row" href="/profile/tier">
				<span class="link-text">
					<span class="link-title">My plan</span>
					<span class="link-sub">I'm on {session.tier} — compare and switch</span>
				</span>
				<span class="link-arrow" aria-hidden="true">&rarr;</span>
			</a>
			<a class="link-row" href="/profile/limits">
				<span class="link-text">
					<span class="link-title">Plan limits</span>
					<span class="link-sub">The limits my plan sets, for context</span>
				</span>
				<span class="link-arrow" aria-hidden="true">&rarr;</span>
			</a>
		</nav>
	</section>
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

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.section-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	/* --- KYC card --- */
	.kyc {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.kyc-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.kyc-level {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.kyc-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.kyc-name-row {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.kyc-name {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-large-size);
		line-height: var(--gok-type-body-large-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.kyc-status {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
	}

	.kyc-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 1.25rem;
		block-size: 1.25rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
		border: var(--gok-border-width-strong) solid var(--gok-color-primary);
	}

	.kyc-unlocks {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Shared key/value ledger --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding-block-start: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-400);
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.kyc-action {
		display: flex;
	}

	/* --- Onward link rows --- */
	.links {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		overflow: hidden;
	}

	.link-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding: var(--gok-space-400);
		text-decoration: none;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		transition: background var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.link-row:first-child {
		border-block-start: none;
	}

	.link-row:hover {
		background: var(--gok-color-surface-strong);
	}

	.link-row:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: calc(-1 * var(--gok-focus-ring-width));
	}

	.link-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.link-title {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}

	.link-sub {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.link-arrow {
		flex: none;
		color: var(--gok-color-text-muted);
	}
</style>
