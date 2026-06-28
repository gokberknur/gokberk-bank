<script lang="ts">
	// The payments landing (P10 hub). A full-width board: the things I can do with
	// money, then a quick-send strip of the people I pay most. Only two surfaces are
	// live this phase — Send money and Payees — so the rest render as muted "Soon"
	// tiles (the same progressive-enablement idiom the nav uses) rather than linking
	// to a 404. The forest-green accent stays unspent here; the tiles are ink on
	// paper, and a quick-send tile seeds the send draft before handing to the flow.
	import { goto } from '$app/navigation';
	import { payments } from '$lib/state/payments.svelte';
	import { maskIban } from '$lib/payments/iban';
	import type { Payee } from '$lib/data/types';

	type IconName =
		| 'arrow-right'
		| 'square-check'
		| 'plus'
		| 'dash'
		| 'settings'
		| 'circle-dot'
		| 'neutral';

	type Action = { label: string; desc: string; href: string; icon: IconName };

	const ready: Action[] = [
		{ label: 'Send money', desc: 'Pay a person or business', href: '/payments/transfer', icon: 'arrow-right' },
		{ label: 'Exchange', desc: 'Convert between my wallets', href: '/payments/exchange', icon: 'settings' },
		{ label: 'Payees', desc: 'Manage who I pay', href: '/payments/payees', icon: 'square-check' }
	];

	const soon: Action[] = [
		{ label: 'Request', desc: 'Ask someone to pay me', href: '', icon: 'plus' },
		{ label: 'Split a bill', desc: 'Share a cost across people', href: '', icon: 'dash' },
		{ label: 'Top up', desc: 'Add money to a wallet', href: '', icon: 'plus' },
		{ label: 'Scheduled', desc: 'Standing orders and future-dated', href: '', icon: 'circle-dot' },
		{ label: 'Direct debits', desc: 'Mandates I’ve set up', href: '', icon: 'neutral' }
	];

	// The four most-recently-paid payees, never-paid last. A spread keeps the shared
	// list immutable; the comparator pushes null `lastUsedAt` to the bottom.
	const recent = $derived(
		[...payments.payees]
			.sort((a, b) => {
				if (a.lastUsedAt === b.lastUsedAt) return 0;
				if (a.lastUsedAt === null) return 1;
				if (b.lastUsedAt === null) return -1;
				return a.lastUsedAt < b.lastUsedAt ? 1 : -1;
			})
			.slice(0, 4)
	);

	/** What to show under a payee's name: a masked IBAN, a gök handle, or a dash. */
	function account(p: Payee): string {
		if (p.iban) return maskIban(p.iban);
		if (p.handle) return p.handle;
		return '—';
	}

	/** Seed the send draft for this payee, then open the (pre-filled) send flow. */
	function quickSend(p: Payee) {
		payments.setDraft({ payeeId: p.id, recipientKind: 'payee' });
		goto('/payments/transfer');
	}
</script>

<div class="page">
	<header class="head">
		<p class="head-eyebrow gok-eyebrow">Payments</p>
		<h1 class="head-title gok-headline-2">Move my money</h1>
		<p class="head-sub">Send, request, and manage everyone I pay — in one place.</p>
	</header>

	<section class="actions" aria-label="What I can do">
		<ul class="action-grid">
			{#each ready as action (action.label)}
				<li class="action-cell">
					<gok-card interactive style="position: relative">
						<a class="stretched" href={action.href} aria-label={action.label}></a>
						<div class="tile">
							<gok-icon name={action.icon} size="m" class="tile-icon"></gok-icon>
							<h2 class="tile-label gok-headline-6">{action.label}</h2>
							<p class="tile-desc">{action.desc}</p>
						</div>
					</gok-card>
				</li>
			{/each}

			{#each soon as action (action.label)}
				<li class="action-cell">
					<gok-card class="tile-card is-soon">
						<div class="tile">
							<gok-icon name={action.icon} size="m" class="tile-icon"></gok-icon>
							<div class="tile-head">
								<h2 class="tile-label gok-headline-6">{action.label}</h2>
								<gok-tag size="s">Soon</gok-tag>
							</div>
							<p class="tile-desc">{action.desc}</p>
						</div>
					</gok-card>
				</li>
			{/each}
		</ul>
	</section>

	<section class="recent" aria-labelledby="recent-heading">
		<div class="recent-head">
			<h2 id="recent-heading" class="recent-title gok-headline-4">Recent payees</h2>
			<gok-link href="/payments/payees">All payees</gok-link>
		</div>

		<ul class="recent-grid">
			{#each recent as payee (payee.id)}
				<li class="recent-cell">
					<gok-card interactive style="position: relative">
						<button
							type="button"
							class="stretched"
							onclick={() => quickSend(payee)}
							aria-label={`Send money to ${payee.name}`}
						></button>
						<div class="payee">
							<p class="payee-name gok-headline-6">{payee.name}</p>
							<p class="payee-acct gok-tabular-nums">{account(payee)}</p>
						</div>
					</gok-card>
				</li>
			{/each}
		</ul>
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

	.head-eyebrow {
		margin: 0;
		color: var(--gok-color-text-muted);
	}

	.head-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.head-sub {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Actions board --- */
	.actions,
	.recent {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
	}

	.action-grid,
	.recent-grid {
		display: grid;
		gap: var(--gok-space-400);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.action-grid {
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
	}

	.recent-grid {
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
	}

	.action-cell,
	.recent-cell {
		display: flex;
	}

	.action-cell :global(gok-card),
	.recent-cell :global(gok-card) {
		inline-size: 100%;
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.tile-icon {
		margin-block-end: var(--gok-space-200);
		color: var(--gok-color-text);
	}

	.tile-head {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}

	.tile-label {
		margin: 0;
		color: var(--gok-color-text);
	}

	.tile-desc {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* "Soon" tiles read as unavailable: muted ink, no pointer affordance. */
	.is-soon .tile-label {
		color: var(--gok-color-text-muted);
	}

	.is-soon .tile-icon {
		color: var(--gok-color-text-muted);
	}

	/* --- Quick-send strip --- */
	.recent-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-200);
	}

	.recent-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.payee {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
	}

	.payee-name {
		margin: 0;
		color: var(--gok-color-text);
	}

	.payee-acct {
		margin: 0;
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	/* The whole tile is one click target via a stretched, focusable overlay. */
	.stretched {
		position: absolute;
		inset: 0;
		z-index: 1;
		padding: 0;
		border: none;
		background: none;
		border-radius: var(--gok-radius-m);
		cursor: pointer;
	}

	.stretched:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
	}
</style>
