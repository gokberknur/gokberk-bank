<script lang="ts">
	// F07 · Money / currency input composite. An app-local gap-filler (dogfooding
	// #4): the design system has no money type, so this wraps `gok-input` with a
	// currency affix, per-currency decimals, locale grouping, paste sanitisation,
	// and reward-early validation. It NEVER restyles gok-input — it only composes
	// it and reads `--gok-*` tokens.
	//
	// The canonical value is always an integer **minor-unit** amount (cents). No
	// float ever touches money: minor units in, minor units out, formatting only
	// at the edges via the pure helpers in `money-format.ts`.
	//
	// Web-component interop: gok-input's value/error are set as DOM *properties*
	// (via `setProps`) so our formatting wins, and its composed `input`/`paste`/
	// `change` events are subscribed via `on` — never `bind:` on a custom element.
	import { untrack } from 'svelte';
	import { setProps, on } from '$lib/wc.svelte';
	import { currencySymbol } from '$lib/format';
	import type { Currency } from '$lib/data/money';
	import {
		currencyDecimals,
		sanitizeLive,
		toMinor,
		formatMinorPlain,
		parsePaste
	} from './money-format';

	interface Props {
		/** The canonical amount in integer **minor units** (cents). */
		value?: number;
		/** ISO 4217 currency — drives decimals, the symbol, and the accessible name. */
		currency: Currency;
		/** Visible label (the currency is appended for the accessible name). */
		label?: string;
		/** Placeholder; defaults to the locale zero pattern (e.g. "0.00"). */
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		/** When set, reward-early "not enough balance" validation against this cap. */
		balanceMinor?: number;
		/** Optional lower bound (minor units) — surfaces punish-late, on blur. */
		minMinor?: number;
		/** Optional upper bound (minor units) — surfaces reward-early, once crossed. */
		maxMinor?: number;
		/** Called whenever the canonical minor-unit value changes. */
		onchange?: (minor: number) => void;
	}

	let {
		value = $bindable(0),
		currency,
		label = 'Amount',
		placeholder,
		disabled = false,
		readonly = false,
		balanceMinor,
		minMinor,
		maxMinor,
		onchange
	}: Props = $props();

	const decimals = $derived(currencyDecimals(currency));
	const symbol = $derived(currencySymbol(currency));

	// The currency rides the accessible name (the affix symbol alone isn't a name):
	// e.g. "Amount (EUR)". A11y note in the spec — the field name conveys currency.
	const fieldLabel = $derived(`${label} (${currency})`);

	// Default placeholder is the locale zero pattern: "0.00" (2dp), "0" (0dp).
	const zeroPattern = $derived(decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0');
	const resolvedPlaceholder = $derived(placeholder ?? zeroPattern);

	// The string shown in the field. Seeded from any preset value so a prefilled
	// amount reads premium (grouped, fixed decimals) at rest. While mounted, the
	// field is the source of truth for what's displayed.
	let display = $state(untrack(() => (value === 0 ? '' : formatMinorPlain(value, decimals))));

	// The active error message (empty = valid). Surfaced on gok-input's gated
	// error line; the reserved message line keeps a row of fields from shifting.
	let error = $state('');

	// Set once the field has been left (blur/commit). Gates the punish-late `min`
	// rule so we don't nag while the user is still typing toward a valid amount.
	let touched = $state(false);

	/**
	 * Reward-early / punish-late validation. Over-balance and over-max surface the
	 * moment a bound is crossed (live); below-min waits until the field is touched
	 * (blur). All three clear live the instant the value becomes valid. Copy is
	 * plain and no-blame ("Not enough balance — you have …", not "Error: …").
	 */
	function runValidation() {
		if (balanceMinor != null && value > balanceMinor) {
			error = `Not enough balance — you have ${formatMinorPlain(balanceMinor, decimals)} ${symbol}`;
		} else if (maxMinor != null && value > maxMinor) {
			error = `Enter ${formatMinorPlain(maxMinor, decimals)} ${symbol} or less`;
		} else if (minMinor != null && touched && value < minMinor) {
			error = `Enter ${formatMinorPlain(minMinor, decimals)} ${symbol} or more`;
		} else {
			error = '';
		}
	}

	function commit() {
		onchange?.(value);
		runValidation();
	}

	function onInput(event: Event) {
		const raw = (event.target as HTMLInputElement).value;
		// Sanitise LIVE but do NOT group: digits + one dot, capped decimals,
		// ungrouped. Live grouping would need caret restoration inside gok-input's
		// inner <input>, which lives in shadow DOM and is unreachable from here —
		// so grouping is deferred to blur (dogfooding note). Ungrouped keeps the
		// caret natural because the sanitised string matches what was typed.
		display = sanitizeLive(raw, decimals);
		value = toMinor(display, decimals);
		commit();
	}

	function onPaste(event: Event) {
		event.preventDefault();
		const text = (event as ClipboardEvent).clipboardData?.getData('text') ?? '';
		// parsePaste understands both en-IE ("1,234.50") and European ("1.234,50").
		display = parsePaste(text, decimals);
		value = toMinor(display, decimals);
		commit();
	}

	function onChange() {
		// Blur / commit: normalise to grouped, fixed decimals so the field reads
		// premium at rest — but keep an empty field empty so the placeholder shows.
		touched = true;
		display = display.trim() === '' || display === '.' ? '' : formatMinorPlain(value, decimals);
		commit();
	}
</script>

<gok-input
	class="money-field"
	type="text"
	inputmode="decimal"
	label={fieldLabel}
	placeholder={resolvedPlaceholder}
	{disabled}
	{readonly}
	reserve-message
	{@attach setProps({ value: display, error })}
	{@attach on('input', onInput)}
	{@attach on('paste', onPaste)}
	{@attach on('change', onChange)}
>
	<span slot="leading" class="affix" aria-hidden="true">{symbol}</span>
</gok-input>

<style>
	/*
	 * Tabular numerals so amounts in a column align. font-variant-numeric is an
	 * inherited property, so setting it on the host gok-input flows across the
	 * shadow boundary into its inner <input> (which doesn't reset it). The amount
	 * stays neutral — no accent; money fields are not the earned-green focus.
	 */
	.money-field {
		font-variant-numeric: tabular-nums;
	}

	.affix {
		font-variant-numeric: tabular-nums;
		color: var(--gok-color-text-muted);
	}
</style>
