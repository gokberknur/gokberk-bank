<svelte:head>
	<title>gökberk bank</title>
	<meta name="description" content="A personal banking + investing demo, built with the gökberk design system." />
</svelte:head>

<main>
	<p class="eyebrow">gökberk bank</p>
	<h1>Hello, world.</h1>
	<p class="lede">
		A personal banking &amp; investing demo — Revolut feel, Nordnet depth, the breadth of a
		traditional bank. Built with SvelteKit, dogfooding the gökberk design system.
	</p>
	<p class="status">Scaffold live. Surfaces coming next.</p>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family:
			ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		color: #101012;
		background: #fafaf9;
	}

	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.75rem;
		max-width: 42rem;
		margin-inline: auto;
		padding-inline: 1.5rem;
	}

	.eyebrow {
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.75rem;
		color: #1a5a34;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.lede {
		margin: 0;
		font-size: 1.125rem;
		line-height: 1.5;
		color: #44444a;
	}

	.status {
		margin: 0.5rem 0 0;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8125rem;
		color: #6b6b72;
	}
</style>
