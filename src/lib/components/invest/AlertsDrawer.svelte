<script lang="ts">
	// V11 · Price-alerts drawer. The bell's sibling overlay (driven by ?alerts in the shell): a
	// create form up top, then the managed set below. Rows carry status by a rule+icon+word badge
	// (never colour alone); mute/arm is a switch and delete is a button — both optimistic with
	// toast-undo from the store (low-stakes + reversible, so no danger dialog). The host drawer owns
	// focus, the scrim and Escape (open fed as a property; closed on gok-close / gok-cancel).
	import { setProps, on } from '$lib/wc.svelte';
	import { formatMoney } from '$lib/format';
	import { INSTRUMENTS } from '$lib/data/market';
	import { alerts, type PriceAlert } from '$lib/invest/alerts.svelte';
	import AlertForm from '$lib/components/invest/AlertForm.svelte';

	let { open, symbol, onclose }: { open: boolean; symbol?: string; onclose: () => void } = $props();

	type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';
	type IconName = 'circle-dot' | 'minus' | 'check';
	// Status by rule + glyph + word (mirrors ScheduledManage). armed = watching (info/circle-dot),
	// muted = held (neutral/minus), fired = it did its job (success/check).
	const STATUS_META: Record<PriceAlert['status'], { label: string; variant: BadgeVariant; icon: IconName }> = {
		armed: { label: 'Armed', variant: 'info', icon: 'circle-dot' },
		muted: { label: 'Muted', variant: 'neutral', icon: 'minus' },
		fired: { label: 'Fired', variant: 'success', icon: 'check' }
	};
	const CONDITION_LABEL = { above: 'Above', below: 'Below' } as const;
	const MODE_LABEL = { once: 'Once', repeating: 'Repeating' } as const;

	const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));
	const list = $derived([...alerts.list]);
	const heading = $derived(symbol && BY_SYMBOL.has(symbol) ? `Price alerts · ${symbol}` : 'Price alerts');

	function ruleLine(a: PriceAlert): string {
		const inst = BY_SYMBOL.get(a.symbol);
		const level = inst ? formatMoney(a.thresholdMinor, inst.currency) : '';
		return `${CONDITION_LABEL[a.condition]} ${level} · ${MODE_LABEL[a.mode]}`;
	}
	function onToggle(a: PriceAlert, e: Event) {
		const armed = (e.target as HTMLElement & { checked: boolean }).checked;
		if (armed) alerts.arm(a.id);
		else alerts.mute(a.id);
	}
</script>

<gok-drawer
	placement="end"
	{heading}
	{@attach setProps({ open })}
	{@attach on('gok-close', onclose)}
	{@attach on('gok-cancel', onclose)}
>
	<div class="wrap">
		<!-- The drawer is mounted once in the shell and reused (only `open` toggles), while AlertForm
		     seeds its `symbol` state once. Key on scope + open so every open remounts a fresh form
		     pointed at the current `?alerts=SYMBOL`. Creating an alert keeps the drawer open (open
		     stays true → key unchanged → no remount), so in-progress input is never disrupted. -->
		{#key `${symbol ?? ''}:${open}`}
			<AlertForm {symbol} />
		{/key}

		<section class="manage">
			<p class="manage-label gok-eyebrow">Your alerts</p>
			{#if list.length === 0}
				<gok-empty-state>
					<p class="empty-title gok-headline-6">No price alerts yet</p>
					<p class="empty-body">Set one above and I’ll tell you when the price crosses your level.</p>
				</gok-empty-state>
			{:else}
				<ul class="list">
					{#each list as a (a.id)}
						<li class="row">
							<div class="info">
								<span class="sym">{a.symbol}</span>
								<span class="rule gok-tabular-nums">{ruleLine(a)}</span>
							</div>
							<gok-badge variant={STATUS_META[a.status].variant} size="s">
								<span class="badge-inner">
									<gok-icon name={STATUS_META[a.status].icon} size="s" aria-hidden="true"></gok-icon>
									{STATUS_META[a.status].label}
								</span>
							</gok-badge>
							<div class="actions">
								<gok-switch
									accessible-label={a.status === 'armed'
										? `Mute ${a.symbol} alert`
										: `Arm ${a.symbol} alert`}
									{@attach setProps({ checked: a.status === 'armed' })}
									{@attach on('change', (e) => onToggle(a, e))}
								></gok-switch>
								<gok-button
									variant="tertiary"
									size="s"
									accessible-label={`Delete ${a.symbol} alert`}
									{@attach on('click', () => alerts.remove(a.id))}
								>
									Delete
								</gok-button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<p class="disclosure">Prices are indicative. You’ll be notified in-app when a level is crossed.</p>
	</div>

	<div slot="footer" class="footer">
		<gok-button variant="secondary" {@attach on('click', onclose)}>Close</gok-button>
	</div>
</gok-drawer>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-section);
	}
	.manage {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-300);
		padding-block-start: var(--gok-space-400);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}
	.manage-label {
		margin: 0;
		color: var(--gok-color-text-muted);
	}
	.empty-title {
		margin: 0;
		color: var(--gok-color-text);
	}
	.empty-body {
		margin: 0;
		margin-block-start: var(--gok-space-100);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}
	.list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Row: instrument + rule grow; badge + controls sit to the end and wrap under on a narrow drawer. */
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gok-space-200) var(--gok-space-300);
		padding-block: var(--gok-space-300);
		border-block-end: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}
	.row:last-child {
		border-block-end: 0;
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-100);
		flex: 1 1 10rem;
		min-inline-size: 0;
	}
	.sym {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-semibold);
		color: var(--gok-color-text);
	}
	.rule {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}
	.badge-inner {
		display: inline-flex;
		align-items: center;
		gap: var(--gok-space-100);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: var(--gok-space-200);
	}
	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}
	.disclosure {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-footnote-size);
		line-height: var(--gok-type-footnote-line);
		color: var(--gok-color-text-muted);
	}
</style>
