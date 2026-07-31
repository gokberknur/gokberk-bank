<script lang="ts">
	// V10 · Start a savings plan — the create wizard for a recurring investment. Four steps
	// on the F05 wizard model (what to invest in → how much & from where → how often & when →
	// review), then a mandate step-up and a forced-decision confirm, and a calm success view.
	// It supports three targets — a single instrument, a fund, or an equal-weight basket
	// (custom per-leg weights are out of scope this pass). A plan is a standing commitment,
	// so setup ALWAYS asks me to prove it's me (the consent-once-at-setup mandate) before the
	// deliberate forced-decision confirm; a projected overdraw is surfaced reward-early as a
	// loud gok-alert, never a hard block — it's my call.
	//
	// Pre-targeting: an instrument/fund surface can deep-link here with ?target=SYM&kind=…;
	// when the symbol resolves, the Target step is OMITTED from `steps` entirely (a clean
	// three-step flow) rather than auto-advanced. Single source of truth is `wizard.data`
	// (the draft, bar the end-rule, assembled from three fields). `persist: false` — a made
	// plan is a one-time result, never resumed. Interop is strictly `setProps`/`on` from
	// wc.svelte — never `bind:` on a gok-* host; the date ISO is read off `event.detail.value`.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { setProps, on } from '$lib/wc.svelte';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import { formatMoney, formatDate } from '$lib/format';
	import { plans } from '$lib/invest/plans.svelte';
	import type { SavingsPlan, PlanKind, PlanCadence } from '$lib/invest/plans.svelte';
	import {
		nextRun,
		occurrences,
		projectedBalance,
		anyOverdraw,
		TODAY_ISO,
		addDays
	} from '$lib/payments/schedule';
	import type { EndRule } from '$lib/payments/schedule';
	import { INSTRUMENTS } from '$lib/data/market';
	import { instrumentOf } from '$lib/data/portfolio';
	import { FUNDS, isFundTradeable } from '$lib/data/funds-data';
	import type { Currency } from '$lib/data/money';
	import { equalWeights } from '$lib/invest/basket';
	import { perRunCostMinor } from '$lib/invest/plan-run';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import { createWizard } from '$lib/components/wizard/wizard-store.svelte';
	import type { StepDef } from '$lib/components/wizard/types';
	import MoneyInput from '$lib/components/money/MoneyInput.svelte';
	import StepUp from '$lib/components/security/StepUp.svelte';
	import PlanLedger from '$lib/components/invest/PlanLedger.svelte';

	// The smallest a plan can run — a €10 soft minimum (integer minor units).
	const MIN_RUN_MINOR = 1000;

	// ── The draft the wizard carries. The three end-* fields assemble into an EndRule. ──
	interface PlanDraftData {
		/** The Instrument/Fund segmented — ignored when useBasket. */
		mode: 'instrument' | 'fund';
		useBasket: boolean;
		/** The instrument/fund target symbol. */
		symbol: string;
		/** 2+ instruments when useBasket. */
		basketSymbols: string[];
		amountMinor: number;
		walletId: string;
		cadence: PlanCadence;
		startIso: string;
		endKind: EndRule['kind'];
		endDateIso: string;
		endCount: number;
		roundUpFunded: boolean;
	}

	// ── Wallets (read once; they don't change mid-flow). Default to the primary EUR wallet. ──
	const wallets = plans.wallets();
	const defaultWallet =
		wallets.find((w) => w.id === 'eur-main') ?? wallets.find((w) => w.primary) ?? wallets[0];

	// Tradeable funds only — a research-only fund can't open an order, so it can't be a plan.
	const tradeableFunds = FUNDS.filter((f) => isFundTradeable(f.ticker));

	// ── Pre-targeting — resolve ?target=SYM&kind=(instrument|fund) once at setup. When the
	// symbol resolves to a real instrument/fund we skip the Target step entirely. ──
	const preSymbol = page.url.searchParams.get('target') ?? '';
	const preKind = page.url.searchParams.get('kind');

	function resolvePreTarget(): { targeted: boolean; mode: 'instrument' | 'fund'; symbol: string } {
		if (!preSymbol) return { targeted: false, mode: 'instrument', symbol: '' };
		if (preKind === 'fund') {
			const ok = FUNDS.some((f) => f.ticker === preSymbol) && isFundTradeable(preSymbol);
			return ok
				? { targeted: true, mode: 'fund', symbol: preSymbol }
				: { targeted: false, mode: 'fund', symbol: '' };
		}
		return instrumentOf(preSymbol)
			? { targeted: true, mode: 'instrument', symbol: preSymbol }
			: { targeted: false, mode: 'instrument', symbol: '' };
	}
	const pre = resolvePreTarget();

	function freshData(): PlanDraftData {
		return {
			mode: pre.mode,
			useBasket: false,
			symbol: pre.symbol,
			basketSymbols: [],
			amountMinor: 0,
			walletId: defaultWallet?.id ?? '',
			cadence: 'monthly',
			// A sensible near-future default; I can move it on the schedule step.
			startIso: addDays(TODAY_ISO, 7),
			endKind: 'until-cancelled',
			endDateIso: addDays(TODAY_ISO, 365),
			endCount: 12,
			roundUpFunded: false
		};
	}

	// ── Steps. The Target step is omitted when we arrive pre-targeted (the clean skip). ──
	const targetStep: StepDef<PlanDraftData> = {
		id: 'target',
		title: 'What to invest in',
		validate: (data) => {
			if (data.useBasket) {
				if (data.basketSymbols.length < 2) return 'Pick at least two holdings for a basket.';
				return true;
			}
			if (!data.symbol) return 'Choose what to invest in.';
			return true;
		}
	};
	const amountStep: StepDef<PlanDraftData> = {
		id: 'amount',
		title: 'How much',
		validate: (data) => {
			if (data.amountMinor <= 0) return 'Enter how much to invest each run.';
			if (data.amountMinor < MIN_RUN_MINOR) return 'The smallest plan is €10 a run.';
			if (!data.walletId) return 'Choose which wallet this comes from.';
			return true;
		}
	};
	const scheduleStep: StepDef<PlanDraftData> = {
		id: 'schedule',
		title: 'How often & when',
		validate: (data) => {
			if (!data.startIso) return 'Pick the date the first run goes out.';
			if (data.endKind === 'on-date' && !data.endDateIso) return 'Pick the date it stops on.';
			if (data.endKind === 'after-count' && data.endCount < 1) return 'Enter at least one run.';
			return true;
		}
	};
	const reviewStep: StepDef<PlanDraftData> = { id: 'review', title: 'Review' };

	const steps: StepDef<PlanDraftData>[] = pre.targeted
		? [amountStep, scheduleStep, reviewStep]
		: [targetStep, amountStep, scheduleStep, reviewStep];

	const wizard = createWizard<PlanDraftData>({
		flowId: 'plan-create',
		steps,
		initialData: freshData(),
		// A made plan is a one-time result — never resume a half-built commitment.
		persist: false
	});

	/** Patch the draft immutably so reactivity flows. */
	function patch(part: Partial<PlanDraftData>) {
		wizard.data = { ...wizard.data, ...part };
	}

	// ── Derived reads off the draft. ───────────────────────────────────────────────
	const kind = $derived<PlanKind>(wizard.data.useBasket ? 'basket' : wizard.data.mode);
	const selectedWallet = $derived(wallets.find((w) => w.id === wizard.data.walletId));
	const selectedCurrency = $derived<Currency>(selectedWallet?.currency ?? 'EUR');
	const buyingPowerMinor = $derived(selectedWallet?.availableMinor ?? 0);
	const amountLabel = $derived(formatMoney(wizard.data.amountMinor, selectedCurrency));

	const CADENCE_LABEL: Record<PlanCadence, string> = { weekly: 'weekly', monthly: 'monthly' };
	const cadenceLabel = $derived(CADENCE_LABEL[wizard.data.cadence]);

	const KIND_LABEL: Record<PlanKind, string> = {
		instrument: 'Instrument',
		fund: 'Fund',
		basket: 'Basket'
	};
	const kindLabel = $derived(KIND_LABEL[kind]);

	/** The plan's display name: a basket names its leg count; a single target uses its name. */
	function planName(): string {
		if (kind === 'basket') return `Basket of ${wizard.data.basketSymbols.length}`;
		if (wizard.data.mode === 'fund') {
			return FUNDS.find((f) => f.ticker === wizard.data.symbol)?.name ?? wizard.data.symbol;
		}
		return instrumentOf(wizard.data.symbol)?.name ?? wizard.data.symbol;
	}

	// Whether any target is chosen yet — a basket needs 2+, a single needs a symbol.
	const equalPct = $derived(
		wizard.data.basketSymbols.length > 0
			? (100 / wizard.data.basketSymbols.length).toFixed(1)
			: '0'
	);

	/** Assemble the EndRule from the three end-* fields (default: until I stop). */
	function buildEnd(data: PlanDraftData): EndRule {
		if (data.endKind === 'on-date') return { kind: 'on-date', dateIso: data.endDateIso };
		if (data.endKind === 'after-count') return { kind: 'after-count', count: data.endCount };
		return { kind: 'until-cancelled' };
	}
	const endRule = $derived(buildEnd(wizard.data));

	/** The end rule in words, for the review ledger and the confirm. */
	const endInWords = $derived.by(() => {
		if (endRule.kind === 'on-date') return `Until ${formatDate(endRule.dateIso)}`;
		if (endRule.kind === 'after-count')
			return `After ${endRule.count} ${endRule.count === 1 ? 'run' : 'runs'}`;
		return 'Until I stop';
	});

	// The date-picker's own helper line carries the cadence note.
	const startHelper = $derived(`The first run goes out on this day, then repeats ${cadenceLabel}.`);

	// ── A SavingsPlan-shaped draft for the cost preview, per-run cost, and projection. ──
	const draftPlan = $derived<SavingsPlan>({
		id: 'draft',
		name: planName(),
		kind,
		symbol: kind === 'basket' ? null : wizard.data.symbol,
		legs: kind === 'basket' ? equalWeights(wizard.data.basketSymbols) : [],
		amountMinor: wizard.data.amountMinor,
		currency: selectedCurrency,
		cadence: wizard.data.cadence,
		walletId: wizard.data.walletId,
		startIso: wizard.data.startIso,
		end: endRule,
		status: 'active',
		roundUpFunded: wizard.data.roundUpFunded,
		createdIso: '',
		runHistory: []
	});

	// Per-run cost (contribution + every leg's fee) and the reward-early projection.
	const perRun = $derived(perRunCostMinor(draftPlan));
	const runs = $derived(occurrences(wizard.data.startIso, wizard.data.cadence, endRule, 4));
	const projection = $derived(projectedBalance(buyingPowerMinor, perRun, runs));
	const overdraws = $derived(anyOverdraw(projection));
	const firstOverdraw = $derived(projection.find((r) => r.overdraw));

	// ── Field handlers. ──────────────────────────────────────────────────────────────
	function onModeChange(event: Event) {
		// Switching Instrument/Fund clears the stale symbol (a fund ticker is not an instrument).
		patch({
			mode: (event.target as HTMLElement & { value?: string }).value as 'instrument' | 'fund',
			symbol: ''
		});
	}
	function onTargetChange(event: Event) {
		patch({ symbol: (event.target as HTMLElement & { value?: string }).value ?? '' });
	}
	function onUseBasketChange(event: Event) {
		patch({ useBasket: (event.target as HTMLElement & { checked: boolean }).checked });
	}
	function inBasket(symbol: string): boolean {
		return wizard.data.basketSymbols.includes(symbol);
	}
	function toggleBasket(symbol: string, event: Event) {
		const checked = (event.target as HTMLElement & { checked: boolean }).checked;
		const has = inBasket(symbol);
		if (checked && !has) patch({ basketSymbols: [...wizard.data.basketSymbols, symbol] });
		else if (!checked && has)
			patch({ basketSymbols: wizard.data.basketSymbols.filter((s) => s !== symbol) });
	}
	function onWalletChange(event: Event) {
		patch({ walletId: (event.target as HTMLElement & { value?: string }).value ?? '' });
	}
	function onCadenceChange(event: Event) {
		patch({ cadence: (event.target as HTMLElement & { value?: string }).value as PlanCadence });
	}
	function onStartInput(event: Event) {
		patch({ startIso: (event as CustomEvent<{ value: string }>).detail.value });
	}
	function onEndKindChange(event: Event) {
		patch({ endKind: (event.target as HTMLElement & { value?: string }).value as EndRule['kind'] });
	}
	function onEndDateInput(event: Event) {
		patch({ endDateIso: (event as CustomEvent<{ value: string }>).detail.value });
	}
	function onEndCountInput(event: Event) {
		const n = Number((event.target as HTMLElement & { value?: string }).value ?? '');
		patch({ endCount: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 });
	}
	function onRoundUpChange(event: Event) {
		patch({ roundUpFunded: (event.target as HTMLElement & { checked: boolean }).checked });
	}

	// ── Confirm spine: a mandate step-up, then a forced-decision dialog. ─────────────
	let stepUpOpen = $state(false);
	let confirmOpen = $state(false);
	let created = $state(false);
	let createdId = $state('');
	// The receipt is captured at create time so the success view survives a reset.
	let receipt = $state<{
		name: string;
		amount: string;
		cadence: PlanCadence;
		firstRun: string;
	} | null>(null);

	/** Final wizard action. A plan is a recurring commitment, so setup ALWAYS gates on a
	 *  mandate step-up first (consent-once-at-setup) — there is no un-gated path. */
	function onReviewComplete() {
		stepUpOpen = true;
	}

	/** Step-up cleared — proceed to the forced-decision confirm. */
	function onStepUpConfirm() {
		stepUpOpen = false;
		confirmOpen = true;
	}
	function onStepUpCancel() {
		stepUpOpen = false;
	}
	function closeConfirm() {
		confirmOpen = false;
	}

	/** The deliberate commit: create the plan, capture a receipt, show success. */
	function doCreate() {
		const p = plans.create({
			name: planName(),
			kind,
			symbol: kind === 'basket' ? null : wizard.data.symbol,
			legs: kind === 'basket' ? equalWeights(wizard.data.basketSymbols) : [],
			amountMinor: wizard.data.amountMinor,
			currency: selectedCurrency,
			cadence: wizard.data.cadence,
			walletId: wizard.data.walletId,
			startIso: wizard.data.startIso,
			end: endRule,
			roundUpFunded: wizard.data.roundUpFunded
		});
		receipt = {
			name: p.name,
			amount: formatMoney(wizard.data.amountMinor, selectedCurrency),
			cadence: wizard.data.cadence,
			firstRun: formatDate(plans.nextRunIso(p))
		};
		confirmOpen = false;
		created = true;
		createdId = p.id;
	}

	/** Move focus to the success heading when it mounts. */
	function focusHeading(node: HTMLElement) {
		node.focus();
	}

	function viewPlan() {
		goto(`/invest/plans/${createdId}`);
	}
	function allPlans() {
		goto('/invest/plans');
	}
</script>

<svelte:head>
	<title>Start a savings plan · gökberk bank</title>
</svelte:head>

<div class="page">
	{#if created}
		<!-- Success: an Active status tag + the plan receipt. Calm, not loud. -->
		<section class="outcome">
			<gok-empty-state>
				<span slot="media" class="mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
						<path
							d="M12 7v5l3 2"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" />
					</svg>
				</span>

				<h1 class="outcome-title gok-headline-3" tabindex="-1" {@attach focusHeading}>
					{receipt?.name} is set up
				</h1>

				<gok-tag size="m" dot>Active</gok-tag>

				<dl class="ledger receipt">
					<div class="row">
						<dt>Amount</dt>
						<dd class="gok-tabular-nums">{receipt?.amount}</dd>
					</div>
					<div class="row">
						<dt>How often</dt>
						<dd class="cap">{receipt?.cadence}</dd>
					</div>
					<div class="row">
						<dt>First run</dt>
						<dd class="gok-tabular-nums">{receipt?.firstRun}</dd>
					</div>
				</dl>

				<div slot="actions" class="outcome-actions">
					<gok-button variant="primary" {@attach on('click', viewPlan)}>View plan</gok-button>
					<gok-button variant="secondary" {@attach on('click', allPlans)}>All plans</gok-button>
				</div>
			</gok-empty-state>
		</section>
	{:else}
		<header class="head">
			<BackLink href="/invest/plans" label="Plans" />
			<p class="eyebrow gok-eyebrow">Savings plans</p>
			<h1 class="title gok-headline-2">Start a savings plan</h1>
			<p class="lead">
				I'll invest a set amount on a schedule — into one holding, a fund, or an equal-weight
				basket. I can pause or stop it anytime.
			</p>
		</header>

		<Wizard {wizard} submitLabel={`Start ${amountLabel}`} onComplete={onReviewComplete}>
			{#if wizard.current.id === 'target'}
				<!-- Step 1 · what to invest in. Reward-early: a target (or 2+ basket holdings) required. -->
				<section class="step-fields" aria-label="What to invest in">
					{#if !wizard.data.useBasket}
						<gok-segmented
							label="Invest in"
							{@attach setProps({ value: wizard.data.mode })}
							{@attach on('change', onModeChange)}
						>
							<gok-segmented-item value="instrument">Instrument</gok-segmented-item>
							<gok-segmented-item value="fund">Fund</gok-segmented-item>
						</gok-segmented>

						<gok-select
							label={wizard.data.mode === 'fund' ? 'Choose a fund' : 'Choose an instrument'}
							placeholder="Search holdings"
							{@attach setProps({ value: wizard.data.symbol })}
							{@attach on('change', onTargetChange)}
						>
							{#if wizard.data.mode === 'fund'}
								{#each tradeableFunds as fund (fund.ticker)}
									<gok-option value={fund.ticker}>{fund.name}</gok-option>
								{/each}
							{:else}
								{#each INSTRUMENTS as inst (inst.symbol)}
									<gok-option value={inst.symbol}>{inst.name} · {inst.symbol}</gok-option>
								{/each}
							{/if}
						</gok-select>
					{/if}

					<gok-switch
						{@attach setProps({ checked: wizard.data.useBasket })}
						{@attach on('change', onUseBasketChange)}
					>
						Build a basket instead
					</gok-switch>

					{#if wizard.data.useBasket}
						<fieldset class="basket">
							<legend class="basket-legend">Pick holdings for the basket</legend>
							<ul class="basket-list">
								{#each INSTRUMENTS as inst (inst.symbol)}
									<li class="basket-item">
										<gok-checkbox
											{@attach setProps({ checked: inBasket(inst.symbol) })}
											{@attach on('change', (event) => toggleBasket(inst.symbol, event))}
										>
											{inst.name} · {inst.symbol}
										</gok-checkbox>
									</li>
								{/each}
							</ul>
							{#if wizard.data.basketSymbols.length > 0}
								<p class="quiet">Equal weights — {equalPct}% each.</p>
							{/if}
						</fieldset>
					{/if}
				</section>
			{:else if wizard.current.id === 'amount'}
				<!-- Step 2 · how much per run + the funding wallet, with a live per-run cost preview. -->
				<section class="step-fields" aria-label="Amount per run">
					<MoneyInput
						value={wizard.data.amountMinor}
						currency={selectedCurrency}
						label="Amount per run"
						balanceMinor={buyingPowerMinor}
						onchange={(minor) => patch({ amountMinor: minor })}
					/>

					<gok-select
						label="From wallet"
						{@attach setProps({ value: wizard.data.walletId })}
						{@attach on('change', onWalletChange)}
					>
						{#each wallets as wallet (wallet.id)}
							<gok-option value={wallet.id}>{wallet.name} · {wallet.currency}</gok-option>
						{/each}
					</gok-select>

					<PlanLedger plan={draftPlan} />
				</section>
			{:else if wizard.current.id === 'schedule'}
				<!-- Step 3 · how often + when it starts + (in "More options") when it ends. -->
				<section class="step-fields" aria-label="How often and when">
					<gok-segmented
						label="How often should it run?"
						{@attach setProps({ value: wizard.data.cadence })}
						{@attach on('change', onCadenceChange)}
					>
						<gok-segmented-item value="weekly">Weekly</gok-segmented-item>
						<gok-segmented-item value="monthly">Monthly</gok-segmented-item>
					</gok-segmented>

					<gok-date-picker
						label="When does the first run go out?"
						min={TODAY_ISO}
						helper={startHelper}
						{@attach setProps({ value: wizard.data.startIso })}
						{@attach on('input', onStartInput)}
						{@attach on('change', onStartInput)}
					></gok-date-picker>

					<!-- Native <details> — the DS ships no gok-disclosure; "Until I stop" is the default,
					     so the end rule stays folded away for the common path. -->
					<details class="more">
						<summary class="more-summary">More options</summary>
						<div class="more-body">
							<gok-radio-group
								label="When should it stop?"
								orientation="vertical"
								{@attach setProps({ value: wizard.data.endKind })}
								{@attach on('change', onEndKindChange)}
							>
								<gok-radio value="until-cancelled">Until I stop</gok-radio>
								<gok-radio value="on-date">On a date</gok-radio>
								<gok-radio value="after-count">After a number of runs</gok-radio>
							</gok-radio-group>

							{#if wizard.data.endKind === 'on-date'}
								<div class="indent">
									<gok-date-picker
										label="Stop on"
										min={wizard.data.startIso}
										helper="The last run happens on or before this date."
										{@attach setProps({ value: wizard.data.endDateIso })}
										{@attach on('input', onEndDateInput)}
										{@attach on('change', onEndDateInput)}
									></gok-date-picker>
								</div>
							{:else if wizard.data.endKind === 'after-count'}
								<div class="indent">
									<gok-input
										type="number"
										label="Number of runs"
										min="1"
										inputmode="numeric"
										{@attach setProps({ value: String(wizard.data.endCount) })}
										{@attach on('input', onEndCountInput)}
										{@attach on('change', onEndCountInput)}
									></gok-input>
								</div>
							{/if}
						</div>
					</details>
				</section>
			{:else}
				<!-- Step 4 · review — a read-only ledger, the per-run cost, the projected impact,
				     the round-up option, and the mandate note. -->
				<section class="step-fields" aria-label="Review">
					<dl class="ledger">
						<div class="row">
							<dt>Target</dt>
							<dd>{planName()} · {kindLabel}</dd>
						</div>
						<div class="row">
							<dt>Amount</dt>
							<dd class="gok-tabular-nums">{amountLabel}</dd>
						</div>
						<div class="row">
							<dt>How often</dt>
							<dd class="cap">{cadenceLabel}</dd>
						</div>
						<div class="row">
							<dt>Starts</dt>
							<dd class="gok-tabular-nums">{formatDate(wizard.data.startIso)}</dd>
						</div>
						<div class="row">
							<dt>Ends</dt>
							<dd>{endInWords}</dd>
						</div>
						<div class="row">
							<dt>First run</dt>
							<dd class="gok-tabular-nums">
								{formatDate(nextRun(wizard.data.startIso, wizard.data.cadence))}
							</dd>
						</div>
					</dl>

					<PlanLedger plan={draftPlan} />

					{#if overdraws && firstOverdraw}
						<gok-alert status="warning">
							<span slot="title">
								This would take {selectedWallet?.name ?? 'my wallet'} below zero on {formatDate(
									firstOverdraw.dateIso
								)}
							</span>
							I can still start it — I'll just need funds in by then.
						</gok-alert>
					{/if}

					<gok-switch
						{@attach setProps({ checked: wizard.data.roundUpFunded })}
						{@attach on('change', onRoundUpChange)}
					>
						Fund it with round-ups too
					</gok-switch>

					<gok-alert status="info">I'll verify it's me before the plan starts.</gok-alert>
				</section>
			{/if}
		</Wizard>
	{/if}
</div>

<!-- Mandate step-up — a plan is a recurring commitment, so setup always verifies it's me. -->
<StepUp
	open={stepUpOpen}
	title={`Start a ${cadenceLabel} plan into ${planName()}?`}
	consequence={`This sets up a ${cadenceLabel} plan of ${amountLabel}, ${endInWords.toLowerCase()}.`}
	confirmLabel="Verified — review"
	tone="danger"
	onConfirm={onStepUpConfirm}
	onCancel={onStepUpCancel}
/>

<!-- The deliberate commit: a forced-decision dialog (no-dismiss, danger tone). -->
<gok-dialog
	tone="danger"
	size="s"
	heading="Start this plan"
	no-dismiss
	{@attach setProps({ open: confirmOpen })}
	{@attach on('gok-cancel', closeConfirm)}
	{@attach on('gok-close', closeConfirm)}
>
	<p class="confirm-body">
		Start a <strong>{cadenceLabel}</strong> plan of
		<strong class="gok-tabular-nums">{amountLabel}</strong> into {planName()}?
	</p>
	<dl class="confirm-ledger">
		<div class="row">
			<dt>Starts</dt>
			<dd class="gok-tabular-nums">{formatDate(wizard.data.startIso)}</dd>
		</div>
		<div class="row">
			<dt>Ends</dt>
			<dd>{endInWords}</dd>
		</div>
	</dl>

	<div slot="footer" class="confirm-actions">
		<gok-button variant="secondary" {@attach on('click', closeConfirm)}>Cancel</gok-button>
		<gok-button variant="primary" {@attach on('click', doCreate)}>Start {amountLabel}</gok-button>
	</div>
</gok-dialog>

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
		/* Trim the sparse header→content gap to the standard ~32px. */
		margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section));
	}

	.eyebrow {
		margin: 0;
		margin-block-start: var(--gok-space-200);
		color: var(--gok-color-text-muted);
	}

	.title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.lead {
		margin: 0;
		max-inline-size: 46rem;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	/* --- Step fields --- */
	.step-fields {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		max-inline-size: 32rem;
	}

	.quiet {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text-muted);
	}

	.indent {
		padding-inline-start: var(--gok-space-300);
		border-inline-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	/* --- Basket picker (app-local, composes gok-checkbox) --- */
	.basket {
		margin: 0;
		padding: 0;
		border: none;
	}

	.basket-legend {
		padding: 0;
		margin-block-end: var(--gok-space-200);
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.basket-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.basket-item {
		padding-block: var(--gok-space-200);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.basket-item:first-child {
		border-block-start: none;
	}

	/* --- "More options" disclosure (native details; no gok-disclosure exists) --- */
	.more {
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
		padding-block-start: var(--gok-space-300);
	}

	.more-summary {
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		font-weight: var(--gok-font-weight-medium);
		color: var(--gok-color-text);
		cursor: pointer;
	}

	.more-summary:focus-visible {
		outline: var(--gok-focus-ring-width) solid var(--gok-color-focus-ring);
		outline-offset: var(--gok-focus-ring-offset);
		border-radius: var(--gok-radius-s);
	}

	.more-body {
		display: flex;
		flex-direction: column;
		gap: var(--gok-space-400);
		margin-block-start: var(--gok-space-400);
	}

	/* --- Key/value ledgers --- */
	.ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--gap-action-row);
		padding-block: var(--gok-space-300);
		border-block-start: var(--gok-border-width-hairline) solid var(--gok-color-border);
	}

	.row:first-child {
		border-block-start: none;
	}

	.row dt {
		flex: none;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-small-size);
		line-height: var(--gok-type-body-small-line);
		color: var(--gok-color-text-muted);
	}

	.row dd {
		margin: 0;
		text-align: end;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.cap {
		text-transform: capitalize;
	}

	/* --- Confirm dialog --- */
	.confirm-body {
		margin: 0;
		font-family: var(--gok-font-family-text);
		font-size: var(--gok-type-body-regular-size);
		line-height: var(--gok-type-body-regular-line);
		color: var(--gok-color-text);
	}

	.confirm-body strong {
		font-weight: var(--gok-font-weight-semibold);
	}

	.confirm-ledger {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: var(--gok-space-300) 0 0;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--gok-space-200);
	}

	/* --- Success outcome --- */
	.outcome {
		padding-block: var(--gok-space-700);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 3rem;
		block-size: 3rem;
		border-radius: var(--gok-radius-pill);
		color: var(--gok-color-primary);
	}

	.outcome-title {
		margin: 0;
		color: var(--gok-color-text);
	}

	.receipt {
		inline-size: 100%;
		max-inline-size: 22rem;
		margin-inline: auto;
		text-align: start;
	}

	.outcome-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--gok-space-200);
	}

</style>
