<script lang="ts">
	// X01 recent activity — the latest five events as a hairline list. Each row is
	// a real link into that wallet's ledger (/accounts/[walletId]); the section's
	// "See all activity" is a disabled "Soon" because the unified feed (X02) isn't
	// built. Amounts read by sign (tabular), pending shown by a text marker.
	import { recentActivity } from '$lib/home/insights';
	import { formatMoney, formatRelative } from '$lib/format';
	import { TODAY } from '$lib/data/time';

	let rows = $derived(
		recentActivity(5).map((txn) => ({
			id: txn.id,
			walletId: txn.walletId,
			merchant: txn.merchant,
			when: formatRelative(txn.date, TODAY),
			amount: formatMoney(txn.amountMinor, txn.currency, { signDisplay: true }),
			pending: txn.status === 'pending'
		}))
	);
</script>

<div class="block">
	{#if rows.length > 0}
		<ul class="list">
			{#each rows as row (row.id)}
				<li class="row">
					<a
						class="link"
						href={`/accounts/${row.walletId}`}
						aria-label={`${row.merchant}, ${row.amount}, ${row.when}${row.pending ? ', pending' : ''}`}
					>
						<span class="primary">
							<span class="merchant">{row.merchant}</span>
							{#if row.pending}
								<span class="pending">Pending</span>
							{/if}
						</span>
						<span class="meta">
							<span class="amount gok-tabular-nums">{row.amount}</span>
							<span class="when">{row.when}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">No activity yet.</p>
	{/if}

	<div class="more">
		<gok-button variant="secondary" size="s" disabled>See all activity</gok-button>
		<gok-tag size="s">Soon</gok-tag>
	</div>
</div>

<style>
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
	}

	.list {
		margin: 0;
		padding: 0;
		list-style: none;
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row {
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.link {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gok-space-300);
		padding-block: var(--gok-space-300);
		text-decoration: none;
		color: inherit;
	}

	.link:hover {
		color: var(--gok-color-text);
	}

	.link:focus-visible {
		outline: var(--gok-border-width-strong) solid var(--gok-color-primary);
		outline-offset: calc(-1 * var(--gok-border-width-strong));
		border-radius: var(--gok-radius-s);
	}

	.primary {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--gok-space-200);
		min-inline-size: 0;
	}

	.merchant {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		font-weight: var(--gok-font-weight-medium);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.pending {
		font-family: var(--gok-font-family-mono);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--gok-space-100);
		text-align: end;
	}

	.amount {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.when {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.empty {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.more {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}
</style>
