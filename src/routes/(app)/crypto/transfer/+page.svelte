<script lang="ts">
	// V07 · Send / receive host. A calm full-page surface that frames the two
	// transfer directions behind one segment, an asset picker, and — when the asset
	// moves on more than one chain — a network picker. The heavy lifting lives in
	// ReceivePanel / SendPanel; this host only owns the selection (mode, asset,
	// network) and hands it down. Deep-linkable: `?mode=send|receive` and `?symbol=`
	// seed the initial view. Interop is strictly `setProps`/`on` from `wc.svelte`.
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { setProps, on } from '$lib/wc.svelte';
	import { crypto } from '$lib/state/crypto.svelte';
	import type { CryptoSymbol, Network } from '$lib/crypto/address';
	import ReceivePanel from '$lib/components/crypto/ReceivePanel.svelte';
	import SendPanel from '$lib/components/crypto/SendPanel.svelte';

	// ── Seed the initial view from the query (read once, SPA / client-only) ──
	const params = page.url.searchParams;
	const assets = crypto.assets;
	const requestedSymbol = params.get('symbol');
	const firstHeld = crypto.balances[0]?.symbol;
	const seededSymbol: CryptoSymbol =
		requestedSymbol && crypto.asset(requestedSymbol)
			? (requestedSymbol as CryptoSymbol)
			: (firstHeld ?? assets[0]?.symbol);

	let mode = $state<'receive' | 'send'>(params.get('mode') === 'send' ? 'send' : 'receive');
	let symbol = $state<CryptoSymbol>(seededSymbol);

	// The chosen asset + its networks (reactive over the asset list).
	const asset = $derived(crypto.asset(symbol));
	const networks = $derived<Network[]>(asset?.networks ?? []);
	const multiNetwork = $derived(networks.length > 1);

	// Network is local selection, kept valid for the chosen asset: when the asset
	// changes and the current network isn't one it supports, fall back to its first.
	let network = $state<Network>(crypto.asset(seededSymbol)?.networks[0] ?? 'Bitcoin');
	$effect(() => {
		const ns = networks;
		untrack(() => {
			if (!ns.includes(network)) network = ns[0];
		});
	});

	// ── Selection handlers ──
	function onMode(event: Event) {
		const value = (event.target as HTMLElement & { value: string }).value;
		mode = value === 'send' ? 'send' : 'receive';
	}

	function onSymbol(event: Event) {
		const value = (event.target as HTMLElement & { value: string }).value;
		symbol = value as CryptoSymbol;
	}

	function onNetwork(event: Event) {
		const value = (event.target as HTMLElement & { value: string }).value;
		network = value as Network;
	}
</script>

<svelte:head>
	<title>Send & receive crypto · gökberk bank</title>
</svelte:head>

<div class="page">
	<header class="head">
		<gok-link href="/crypto">&larr; Crypto</gok-link>
		<p class="head-eyebrow gok-eyebrow">Transfer</p>
		<h1 class="head-title gok-headline-3">Send &amp; receive</h1>
		<p class="head-caption">
			Move crypto to or from an external wallet. Sends confirm on-chain and can't be reversed.
		</p>
	</header>

	<!-- Direction -->
	<gok-segmented
		label="Transfer direction"
		{@attach setProps({ value: mode })}
		{@attach on('change', onMode)}
	>
		<gok-segmented-item value="receive">Receive</gok-segmented-item>
		<gok-segmented-item value="send">Send</gok-segmented-item>
	</gok-segmented>

	<!-- Asset + network selection -->
	<div class="selectors">
		<div class="field">
			<gok-select
				label="Asset"
				{@attach setProps({ value: symbol })}
				{@attach on('change', onSymbol)}
			>
				{#each assets as a (a.symbol)}
					<gok-option value={a.symbol}>{a.name} · {a.symbol}</gok-option>
				{/each}
			</gok-select>
		</div>

		{#if multiNetwork}
			<div class="field">
				<gok-select
					label="Network"
					{@attach setProps({ value: network })}
					{@attach on('change', onNetwork)}
				>
					{#each networks as n (n)}
						<gok-option value={n}>{n}</gok-option>
					{/each}
				</gok-select>
			</div>
		{:else}
			<div class="field">
				<p class="net-key gok-eyebrow">Network</p>
				<p class="net-value">{networks[0]}</p>
			</div>
		{/if}
	</div>

	<!-- Panel -->
	<section class="panel-wrap" aria-label={mode === 'send' ? 'Send crypto' : 'Receive crypto'}>
		{#if mode === 'send'}
			<SendPanel {symbol} {network} />
		{:else}
			<ReceivePanel {symbol} {network} />
		{/if}
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
		max-inline-size: 36rem;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.head-eyebrow {
		margin: var(--gok-space-200) 0 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-caption {
		margin: var(--gok-space-100) 0 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.selectors {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--gok-space-300);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		min-inline-size: 0;
	}

	.net-key {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.net-value {
		margin: 0;
		padding-block: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.panel-wrap {
		display: block;
	}

	@media (min-width: 32rem) {
		.selectors {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
