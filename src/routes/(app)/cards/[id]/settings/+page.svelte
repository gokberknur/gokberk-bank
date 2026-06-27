<script lang="ts">
	// C03 — the card control panel. Everyday safety controls on a single card:
	// freeze, per-channel use (online · contactless · ATM), a daily spend cap, and
	// a (read-only for now) region allow-list. Every control is a low-stakes,
	// reversible setting, so each takes effect *optimistically* with a gok-toast and
	// NO confirmation dialog — the gök "instant + reversible" pattern. Validation on
	// the limit rewards early (it surfaces the moment a bound is crossed, with
	// no-blame copy) so a user never hits a wall at save time. The one earned accent
	// is spent on the switch "on" fill + the focus ring; everything else stays ink.
	//
	// Web-component interop: gok-switch is driven by `checked`/`disabled` as DOM
	// properties (via `setProps`) and read back from its composed `change` event
	// (`e.target.checked`) — never `bind:` on a custom element. State lives in
	// `cards` (revision-backed, so a change reflects across every surface at once).
	import { page } from '$app/state';
	import { cards } from '$lib/state/cards.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import { formatMoney } from '$lib/format';
	import { setProps, on } from '$lib/wc.svelte';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';

	const card = $derived(page.params.id ? cards.card(page.params.id) : undefined);

	// Human strings for the identity header + back link. Sentence case (the brand's
	// one intentional uppercase is the mono eyebrow, not these labels).
	const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const cardTypeLabel = $derived(card ? sentence(card.type) : '');
	const networkLabel = $derived(card ? sentence(card.network) : '');

	// ISO region code → display name ("DE" → "Germany"), en-IE to match the app.
	const regionNames = new Intl.DisplayNames(['en-IE'], { type: 'region' });
	const regionName = (code: string) => {
		try {
			return regionNames.of(code) ?? code;
		} catch {
			return code;
		}
	};

	// Per-channel plain copy — used for both the row label and its toast.
	const CHANNELS = [
		{ key: 'online', label: 'Online payments' },
		{ key: 'contactless', label: 'Contactless' },
		{ key: 'atm', label: 'ATM withdrawals' }
	] as const;
	type ChannelKey = (typeof CHANNELS)[number]['key'];

	// --- Freeze ---------------------------------------------------------------
	// Fully reversible, so it flips optimistically with an info toast and no dialog.
	function onFreezeChange() {
		if (!card) return;
		const frozen = cards.toggleFreeze(card.id);
		toast(frozen ? 'Card frozen — unfreeze anytime' : 'Card unfrozen', { status: 'info' });
	}

	// --- Channels -------------------------------------------------------------
	function onChannelChange(channel: ChannelKey, label: string, event: Event) {
		if (!card) return;
		const on = (event.target as HTMLInputElement).checked;
		cards.setChannel(card.id, channel, on);
		toast(`${label} ${on ? 'on' : 'off'}`, { status: 'info' });
	}

	// --- Daily spend limit ----------------------------------------------------
	// Reward-early: the field's own gok-input line carries the over-ceiling rule
	// (`maxMinor`); this page-level message carries the "below today's spend" rule,
	// reserved so the row never shifts. A valid amount applies live (instant
	// optimistic feedback) and confirms with a single debounced success toast — the
	// MoneyInput composite fires `onchange` on every keystroke, so the toast is
	// coalesced rather than fired per character (see DS-friction note in the PR).
	let limitError = $state('');
	// Re-key the MoneyInput to reseed it after an external reset ("No daily limit").
	let limitKey = $state(0);
	let limitToastTimer: ReturnType<typeof setTimeout> | undefined;

	// `null` means "no daily limit" — distinct from a real €0. Seed the MoneyInput
	// empty in that case (value 0 → blank field) so the placeholder shows, and read
	// `hasLimit` to drive the no-limit placeholder + current-state copy. A real €0 is
	// never reachable here (onLimitChange treats ≤0 as "no number yet"), so an empty
	// field unambiguously reads as "no limit", never "limit of zero".
	const hasLimit = $derived(card != null && card.controls.dailyLimitMinor !== null);
	const seedLimit = $derived(card?.controls.dailyLimitMinor ?? 0);
	const frozen = $derived(card?.controls.frozen ?? false);

	function onLimitChange(minor: number) {
		if (!card || frozen) return;
		const spentToday = cards.spentTodayMinor(card.id);
		// An empty / zero field is "no number yet", not a €0 cap — leave the current
		// state untouched and let the explicit "No daily limit" button clear it.
		if (minor <= 0) {
			limitError = '';
			return;
		}
		if (minor < spentToday) {
			limitError = `That's below what I've already spent today (${formatMoney(spentToday, 'EUR')}).`;
			return;
		}
		limitError = '';
		cards.setDailyLimit(card.id, minor);
		clearTimeout(limitToastTimer);
		limitToastTimer = setTimeout(() => {
			toast(`Daily limit set to ${formatMoney(minor, 'EUR')}`, { status: 'success' });
		}, 600);
	}

	function clearLimit() {
		if (!card || frozen) return;
		cards.clearDailyLimit(card.id);
		limitError = '';
		clearTimeout(limitToastTimer);
		limitKey += 1; // remount the MoneyInput → empty field
		toast('No daily limit', { status: 'info' });
	}

	$effect(() => () => clearTimeout(limitToastTimer));
</script>

{#if !card}
	<div class="missing">
		<gok-empty-state>
			<p class="missing-title gok-headline-5">Card not found</p>
			<p class="missing-body">This card doesn’t exist, or it has been closed.</p>
			<gok-link slot="actions" href="/cards">Back to cards</gok-link>
		</gok-empty-state>
	</div>
{:else}
	{@const allOff = cards.allChannelsOff(card)}
	{@const ceiling = card.controls.ceilingMinor}
	{@const status = cards.displayStatus(card)}
	<div class="page">
		<header class="head">
			<gok-link href="/cards/{card.id}">&larr; {cardTypeLabel} card</gok-link>

			<!-- TODO: swap in a mini card-art (CardArt) once C01 lands; kept a
			     self-contained token block here to avoid a parallel-build import. -->
			<div class="identity">
				<div class="identity-text">
					<p class="identity-kind gok-eyebrow">{cardTypeLabel} card · {networkLabel}</p>
					<p class="identity-pan gok-tabular-nums">•• {card.last4}</p>
				</div>
				<gok-tag size="s" variant="readonly" dot={status === 'Frozen'}>{status}</gok-tag>
			</div>
		</header>

		<!-- Freeze — the prominent, fully reversible control. -->
		<section class="block" aria-labelledby="freeze-heading">
			<div class="freeze-row">
				<h2 id="freeze-heading" class="block-title gok-headline-5">Freeze card</h2>
				<gok-switch
					accessible-label="Freeze card"
					{@attach setProps({ checked: card.controls.frozen })}
					{@attach on('change', onFreezeChange)}
				></gok-switch>
			</div>
			<p class="help">Freezing blocks new payments. You can unfreeze anytime.</p>
		</section>

		<gok-divider></gok-divider>

		<!-- Channels — three independent instant settings. -->
		<section class="block" aria-labelledby="channels-heading">
			<h2 id="channels-heading" class="block-title gok-headline-5">Card use</h2>
			<p class="help">Turn each way to pay on or off. Changes apply right away.</p>

			<ul class="rows">
				{#each CHANNELS as channel (channel.key)}
					<li class="setting-row">
						<span class="setting-label" id="channel-{channel.key}">{channel.label}</span>
						<gok-switch
							accessible-label={channel.label}
							{@attach setProps({
								checked: card.controls[channel.key],
								disabled: card.controls.frozen
							})}
							{@attach on('change', (e) => onChannelChange(channel.key, channel.label, e))}
						></gok-switch>
					</li>
				{/each}
			</ul>

			{#if card.controls.frozen}
				<p class="help note">Unfreeze to change these.</p>
			{:else if allOff}
				<gok-alert status="info">
					This card can’t be used until you turn a channel back on.
				</gok-alert>
			{/if}
		</section>

		<gok-divider></gok-divider>

		<!-- Daily spend limit — reward-early money input + a clear affordance. -->
		<section class="block" aria-labelledby="limit-heading">
			<h2 id="limit-heading" class="block-title gok-headline-5">Daily spend limit</h2>
			<p class="help">
				How much this card can spend in a day.
				<span class="gok-tabular-nums">Up to {formatMoney(ceiling, 'EUR')}.</span>
			</p>

			<div class="limit-field">
				{#key limitKey}
					<MoneyInput
						currency="EUR"
						label="Daily spend limit"
						value={seedLimit}
						placeholder={hasLimit ? undefined : 'No limit'}
						maxMinor={ceiling}
						readonly={card.controls.frozen}
						onchange={onLimitChange}
					/>
				{/key}
				<p class="field-message" role="status" aria-live="polite">{limitError}</p>
			</div>

			<div class="limit-actions">
				<gok-button
					variant="secondary"
					size="s"
					{@attach setProps({ disabled: card.controls.frozen })}
					{@attach on('click', clearLimit)}
				>
					No daily limit
				</gok-button>
				{#if !hasLimit}
					<span class="help current">No daily limit — this card can spend up to its ceiling.</span>
				{/if}
			</div>

			{#if card.controls.frozen}
				<p class="help note">Unfreeze to change this.</p>
			{/if}
		</section>

		<gok-divider></gok-divider>

		<!-- Region allow-list — read-only for now (editable multi-select needs F10). -->
		<section class="block" aria-labelledby="regions-heading">
			<div class="regions-head">
				<h2 id="regions-heading" class="block-title gok-headline-5">Where this card works</h2>
				<gok-tag size="s">Soon</gok-tag>
			</div>
			<p class="help">The countries this card can be used in.</p>

			<!-- TODO: F10 multi-select regions (editable allow-list; home region pinned). -->
			{#if card.controls.regions.length === 0}
				<p class="anywhere">Anywhere — no country restriction.</p>
			{:else}
				<ul class="region-tags">
					{#each card.controls.regions as code (code)}
						<li>
							<gok-tag variant="readonly" dot={code === card.controls.homeRegion}>
								{regionName(code)}{code === card.controls.homeRegion ? ' (home)' : ''}
							</gok-tag>
						</li>
					{/each}
				</ul>
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

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.identity {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		margin-block-start: var(--gok-space-200);
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface);
	}

	.identity-text {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.identity-kind {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.identity-pan {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-large-size);
		color: var(--gok-color-text);
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-200);
	}

	.block-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.help {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.note {
		font-style: italic;
	}

	.freeze-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-200);
	}

	.setting-label {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.limit-field {
		display: flex;
		flex-direction: column;
		max-inline-size: 22rem;
	}

	.field-message {
		margin: 0;
		min-block-size: var(--gok-type-body-small-line);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-status-error);
	}

	.limit-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200) var(--gok-space-300);
	}

	.current {
		flex: 1 1 auto;
	}

	.regions-head {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.anywhere {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.region-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gok-space-200);
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
