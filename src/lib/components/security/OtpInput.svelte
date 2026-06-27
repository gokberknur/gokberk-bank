<script lang="ts">
	// F08 one-time-code input — an app-local 6-box OTP composite (dogfooding gap #5:
	// the DS has no OTP / one-time-code primitive). It is a tokened set of native
	// single-character inputs (gok-input's inner field lives in shadow DOM, so a
	// boxed code can't be built from it). The canonical value is the joined string,
	// exposed two-way via $bindable — the parent derives "looks complete" from its
	// length. Type-to-advance, backspace-to-retreat, arrow nav, and paste-to-fill.
	//
	// SIMULATED: nothing is verified here — any 6 digits "look correct"; the real
	// check is the step-up that follows.
	import type { Attachment } from 'svelte/attachments';

	let {
		value = $bindable(''),
		length = 6,
		label = 'Enter the 6-digit code',
		describedBy
	}: {
		/** The joined code (two-way). */
		value?: string;
		/** Number of boxes. */
		length?: number;
		/** Group label for assistive tech. */
		label?: string;
		/** id of a description element, wired onto every box. */
		describedBy?: string;
	} = $props();

	// One DOM handle per box, for focus management. A plain array filled by an
	// attachment (read imperatively in handlers, never in markup — so no reactivity).
	const inputs: HTMLInputElement[] = [];
	function ref(i: number): Attachment<HTMLInputElement> {
		return (node) => {
			inputs[i] = node;
		};
	}

	// The per-box characters, derived from the canonical value.
	const boxes = $derived(Array.from({ length }, (_, i) => value[i] ?? ''));

	/** Write `ch` into box `i`, keeping `value` the single source of truth. */
	function setBox(i: number, ch: string) {
		const arr = Array.from({ length }, (_, k) => value[k] ?? '');
		arr[i] = ch;
		value = arr.join('').slice(0, length);
	}

	function onInput(i: number, e: Event) {
		const el = e.target as HTMLInputElement;
		const digit = el.value.replace(/\D/g, '').slice(-1);
		setBox(i, digit);
		el.value = digit; // mirror the single accepted digit back into the box
		if (digit && i < length - 1) inputs[i + 1]?.focus();
	}

	function onKeydown(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !boxes[i] && i > 0) {
			e.preventDefault();
			setBox(i - 1, '');
			inputs[i - 1]?.focus();
		} else if (e.key === 'ArrowLeft' && i > 0) {
			e.preventDefault();
			inputs[i - 1]?.focus();
		} else if (e.key === 'ArrowRight' && i < length - 1) {
			e.preventDefault();
			inputs[i + 1]?.focus();
		}
	}

	function onPaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, length);
		if (!text) return;
		value = text;
		const next = Math.min(text.length, length - 1);
		inputs[next]?.focus();
	}
</script>

<div class="otp" role="group" aria-label={label}>
	{#each boxes as digit, i (i)}
		<input
			{@attach ref(i)}
			class="box gok-tabular-nums"
			type="text"
			inputmode="numeric"
			autocomplete={i === 0 ? 'one-time-code' : 'off'}
			maxlength="1"
			aria-label={`Digit ${i + 1} of ${length}`}
			aria-describedby={describedBy}
			value={digit}
			oninput={(e) => onInput(i, e)}
			onkeydown={(e) => onKeydown(i, e)}
			onpaste={onPaste}
		/>
	{/each}
</div>

<style>
	.otp {
		display: flex;
		gap: var(--gok-space-200);
	}

	.box {
		inline-size: 2.75rem;
		block-size: 3.25rem;
		padding: 0;
		border: var(--gok-border-width-strong) solid var(--gok-color-border);
		border-radius: var(--gok-radius-s);
		background: var(--gok-color-surface);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-headline-6-size);
		line-height: 1;
		text-align: center;
		color: var(--gok-color-text);
		transition: border-color var(--gok-motion-duration-fast) var(--gok-motion-ease-standard);
	}

	.box:focus {
		outline: none;
		border-color: var(--gok-color-primary);
		box-shadow: 0 0 0 var(--gok-focus-ring-width) var(--gok-color-focus-ring);
	}

	@media (max-width: 24.375rem) {
		.otp {
			gap: var(--gok-space-100);
		}

		.box {
			inline-size: 2.4rem;
			block-size: 3rem;
		}
	}
</style>
