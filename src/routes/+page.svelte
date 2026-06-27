<script lang="ts">
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';

	// Column definitions handed to gok-table as a DOM property (see setProps).
	const columns = [
		{ key: 'account', label: 'Account', sortable: true },
		{ key: 'iban', label: 'IBAN' },
		{ key: 'balance', label: 'Balance', align: 'end', sortable: true }
	];

	let rows = $state([
		{ account: 'Main · EUR', iban: 'DE89 3704 0044 0532 0130 00', balance: '€4,820.50' },
		{ account: 'Savings · EUR', iban: 'DE12 5001 0517 0648 4898 90', balance: '€12,300.00' },
		{ account: 'Travel · USD', iban: 'DE44 5001 0517 5407 3249 31', balance: '$1,240.10' }
	]);

	function handleSort(e: Event) {
		// Proof-of-interop only: gok-table emits the hyphenated `gok-sort` event
		// with `detail: { key, direction }`. We read it to show the wiring works.
		const { key, direction } = (e as CustomEvent).detail ?? {};
		void key;
		void direction;
		// A02 (accounts) implements the real sort/reorder against `rows`.
	}
</script>

<svelte:head>
	<title>gökberk bank</title>
	<meta name="description" content="Web components, tokens, and theming are live." />
</svelte:head>

<main>
	<section class="hero">
		<p class="gok-eyebrow">Foundation check</p>
		<h1>gökberk<span class="dot">.</span> bank</h1>
		<p class="lead">Web components, tokens, and theming are live.</p>

		<div class="actions">
			<gok-theme-switch label="Theme"></gok-theme-switch>
			<!-- gok-button is a custom element whose shadow root already exposes a real,
			     focusable <button>. We subscribe to its `click` through the `on` attachment
			     (the repo's interop primitive) rather than `onclick`: framework event sugar
			     makes Svelte treat the host as a static element and demand bogus ARIA roles /
			     tabindex that would duplicate the shadow button's semantics. -->
			<gok-button variant="primary" {@attach on('click', () => goto('/home'))}>
				Enter the app
			</gok-button>
		</div>
	</section>

	<section class="proof">
		<gok-table
			accessible-label="Accounts"
			{@attach setProps({ columns, rows })}
			{@attach on('gok-sort', handleSort)}
		></gok-table>
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section-gap);
		min-block-size: 100dvh;
		padding-block: var(--gok-space-900);
		padding-inline: var(--gok-space-500);
		max-inline-size: 64rem;
		margin-inline: auto;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--gok-space-300);
		padding-block-start: var(--gok-space-800);
	}

	.hero h1 {
		margin: 0;
		max-inline-size: 20ch;
	}

	.dot {
		color: var(--gok-color-primary);
	}

	.lead {
		margin: 0;
		max-inline-size: 42ch;
		color: var(--gok-color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--gok-space-400);
		margin-block-start: var(--gok-space-400);
	}

	.proof {
		max-inline-size: 48rem;
		inline-size: 100%;
		margin-inline: auto;
	}
</style>
