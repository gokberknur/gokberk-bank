<script lang="ts">
	// F07 · Money input — a THIN ADAPTER over the DS gok-money (adopted DS 0.4.4, finding #4/P1).
	// gok-money owns grouping, the currency affix, caret-stable typing, the "(CUR)" accessible name,
	// and min/max reward-early/punish-late timing. This adapter adds the ONE thing gok-money lacks:
	// the bank's available-balance check with its no-blame copy, fed to gok-money's `error` prop.
	// Canonical value stays an integer minor-unit amount.
	import { setProps, on } from '$lib/wc.svelte';
	import { currencySymbol } from '$lib/format';
	import type { Currency } from '$lib/data/money';
	import { currencyDecimals, formatMinorPlain } from './money-format';

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
		/** Optional lower bound (minor units), passed straight to gok-money's `min`. */
		minMinor?: number;
		/** Optional upper bound (minor units), passed straight to gok-money's `max`. */
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

	// gok-money uses `label` verbatim as the accessible name and does NOT append the currency, so
	// reattach it here to preserve the "Amount (EUR)" accessible name (a11y + e2e selectors).
	const fieldLabel = $derived(`${label} (${currency})`);

	// The only check gok-money can't express: an available-balance cap with the bank's no-blame
	// copy. Reward-early (live) — surfaces the instant it is crossed; overrides gok-money's own
	// min/max message via the `error` prop.
	const balanceError = $derived(
		balanceMinor != null && value > balanceMinor
			? `Not enough balance — you have ${formatMinorPlain(balanceMinor, decimals)} ${symbol}`
			: ''
	);

	function commit(event: Event) {
		value = (event as CustomEvent<{ value: number }>).detail.value;
		onchange?.(value);
	}
</script>

<gok-money
	{currency}
	label={fieldLabel}
	reserve-message
	{@attach setProps({ value, error: balanceError, min: minMinor, max: maxMinor, placeholder, disabled, readonly })}
	{@attach on('input', commit)}
	{@attach on('change', commit)}
></gok-money>
