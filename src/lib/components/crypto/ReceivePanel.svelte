<script lang="ts">
	// V07 · Receive — show my deterministic wallet address for the chosen asset +
	// network as a locally-rendered monochrome QR glyph plus the canonical address
	// text (monospace, selectable), a one-tap copy, and a plain caution that this
	// address only accepts this asset on this network. The caution is carried by a
	// ruled box + words (never colour alone). No money moves here — it's read-only.
	import { on } from '$lib/wc.svelte';
	import { crypto } from '$lib/state/crypto.svelte';
	import { toast } from '$lib/state/toasts.svelte';
	import type { CryptoSymbol, Network } from '$lib/crypto/address';
	import QrCode from './QrCode.svelte';

	interface Props {
		/** The asset to receive. */
		symbol: CryptoSymbol;
		/** The network its address is for. */
		network: Network;
	}

	let { symbol, network }: Props = $props();

	const address = $derived(crypto.receiveAddressFor(symbol, network));
	const assetName = $derived(crypto.asset(symbol)?.name ?? symbol);
	const qrLabel = $derived(`QR code for my ${assetName} address on ${network}`);

	async function copy() {
		try {
			await navigator.clipboard.writeText(address);
			toast('Address copied', { status: 'success' });
		} catch {
			toast('Couldn’t copy — select the address and copy it manually', { status: 'error' });
		}
	}
</script>

<div class="panel">
	<div class="qr-wrap">
		<QrCode
			value={address}
			label={qrLabel}
			note="This QR code is for scanning only. The address text below it is the canonical value."
		/>
	</div>

	<div class="address-block">
		<p class="address-eyebrow gok-eyebrow">My {symbol} address · {network}</p>
		<p class="address gok-tabular-nums" id="receive-address">{address}</p>
		<gok-button variant="secondary" {@attach on('click', copy)}>Copy address</gok-button>
	</div>

	<!-- Caution: a ruled box + words, never colour alone. -->
	<p class="caution" role="note">
		Send only {symbol} on {network} to this address. Anything else is lost.
	</p>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-500);
	}

	.qr-wrap {
		display: flex;
		justify-content: center;
	}

	.address-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gok-space-200);
		inline-size: 100%;
		max-inline-size: 26rem;
	}

	.address-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.address {
		margin: 0;
		inline-size: 100%;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border);
		border-radius: var(--gok-radius-m);
		background: var(--gok-color-surface-strong);
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
		text-align: center;
		word-break: break-all;
		user-select: all;
	}

	.caution {
		margin: 0;
		inline-size: 100%;
		max-inline-size: 26rem;
		padding: var(--gok-space-300);
		border: var(--gok-border-width-hairline) solid var(--gok-color-border-strong);
		border-radius: var(--gok-radius-m);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text);
		text-align: center;
	}
</style>
