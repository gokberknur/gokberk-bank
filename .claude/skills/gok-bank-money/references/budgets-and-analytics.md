# Playbook: Budgets & spend analytics (M01)

The deep playbook for the `/budgets/**` surface — spec `.planning/features/money/M01-budgets-analytics.md`.
Read this when you're scoping or reviewing a *specific* analytics panel and need the derivation mechanics,
the edge cases, and the per-panel "definition of done". The cross-cutting refs frame the ethics and the
scope; this one tells you how each number is actually computed and where it breaks. Everything here obeys the
one rule: **every figure is a pure function of the `F03` transactions ledger** that `gok-bank-accounts` owns —
no parallel spend store, reconciling to the accounts page to the cent.

## Contents

- [The derivation contract](#the-derivation-contract) — the rules every panel below inherits
- [Spend by category](#spend-by-category-donut--bar) (donut / bar)
- [Monthly trend](#monthly-trend-stacked-bar) (stacked bar)
- [Budget creation & progress](#budget-creation--progress)
- [Income vs expense & savings rate](#income-vs-expense--savings-rate)
- [Top merchants](#top-merchants)
- [Subscription detector](#subscription-detector)
- [Month-over-month comparison](#month-over-month-comparison)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The derivation contract

Inherited by every panel below, so it's stated once:

- **One spine.** Inputs are the `F03` transactions for the selected period (the `gok-segmented` period selector
  + `F06` date-range). Budgets persist only their *settings* (`{ categoryId, limitMinor, period }`) via `F04`.
  Nothing re-seeds spend.
- **Minor units, integer math.** Sum in integer minor units; never float-multiply money. Ratios (savings rate,
  category share, budget fraction) are computed as `numeratorMinor / denominatorMinor` at the *last* step, for
  display only — the underlying money stays integer.
- **Sign convention.** Decide once and hold it: outflows negative, inflows positive in the ledger; "spend" is
  `abs(sum of outflows)`. Transfers between the customer's own accounts/pots are **neither income nor expense** —
  exclude them or every number doubles. Refunds are negative spend (they reduce the category total), not income.
- **Re-derive on period switch.** Changing the period re-runs every derivation; no panel caches a stale total.
- **Reconcile.** The sum of category spend must equal the period's total outflow on the accounts page. If it
  doesn't, a category bucket or the transfer/refund handling is wrong — fix the derivation, never paper over it.
- **Honest categorisation.** Categories come from the transaction's own category (visible, correctable). An
  uncategorised charge goes to a real **"Uncategorised"** bucket — never silently dropped, never guessed into a
  sensitive label. Correcting a charge re-derives every number above it.

## Spend by category (donut / bar)

- **Derivation.** Group period outflows by category; each slice = `{ category, totalMinor, share }` where
  `share = totalMinor / periodOutflowMinor`. Sort descending. Collapse the long tail into "Other" past ~6–8
  slices so the chart stays legible — but keep "Uncategorised" as its own visible slice, never folded into "Other".
- **The action.** Selecting a slice filters the detail list below and offers a drill into that category's
  transactions (reuse the A02 grid) and a "Set a budget for this" path. A donut you can't click is a vanity
  chart — cut it.
- **Brand mechanics.** Neutral ramp for all slices; **one** accent for the *focused* (selected) slice only.
  Never a rainbow of saturated category colours — that's noise pretending to be information.
- **Non-visual equivalent (required).** A text summary ("Top category: Groceries, €312, 28%") plus the legend/
  table listing every category's amount + share. The chart is never the only representation.
- **Edge cases.** Zero spend in period → `gok-empty-state`, not an empty donut. A single category at 100% → render
  honestly, don't fabricate slices. Refund-heavy category nets negative → show €0 floor or an explicit "net
  refund" note, never a negative slice.
- **Competitive note.** Revolut Analytics is dense and busy; match its depth, stay far calmer — one accent, one
  donut, the action attached.

## Monthly trend (stacked bar)

- **Derivation.** For each of the last N months (default ~6), bucket outflows by category → a stacked bar per
  month. Use the **same category→position mapping and the same neutral ramp order across all months**, or the
  eye can't track a category between bars.
- **The action.** Gives a single month context ("is this month unusual?") and links into the heavy month / the
  MoM panel. Trend that doesn't answer "am I trending up or down" is decoration.
- **Edge cases.** Partial current month → mark it as in-progress (lighter / labelled), don't let a half-month
  read as a drop. Months with no data (new user) → show the real short history, don't back-fill zeros as if
  tracked. Category that appears only some months → still positioned consistently.
- **Non-visual equivalent.** A data table: months × categories with totals.

## Budget creation & progress

- **Creation.** `F07` money input for the limit + `gok-select` category, persisted via `F04` as
  `{ categoryId, limitMinor, period }`. Borrow **Monzo Targets' best idea**: *suggest* an achievable limit from
  the customer's own recent average for that category — framed "Based on your last 3 months" — never imposed,
  always editable. This is a suggestion, not a rebuke.
- **Progress derivation.** `spentMinor = period outflow for that category`; `fraction = spentMinor / limitMinor`,
  surfaced via `gok-progress`. Over-budget → `fraction > 1`; clamp the *bar* at 100% but state the real overage
  in text ("€640 of €600 — €40 over").
- **The nudge — reward-early, never punish-late.** Warn as the customer *approaches* the limit (a near-limit
  `gok-alert` at a sensible threshold, e.g. ~80–90%), factually: "You've spent €420 of €600." Over-budget is
  **informative** — a status `gok-tag` by rule + text, **never a red fill, never a red wall, never scolding
  copy**. "You overspent again" is banned; "€40 over your €600 limit" is the bar. (The ethics live in
  `references/regulatory-and-trust.md`; this is the mechanic.)
- **Period semantics (open question — confirm).** Calendar-month reset vs rolling 30-day, and whether an
  unspent budget rolls over, are open in the spec — decide explicitly and label it; don't let "this month"
  mean two different windows across panels.
- **Edge cases.** No budgets yet → distinct `gok-empty-state` "Set your first budget" CTA (different copy from
  "no transactions"). Budget on a category with zero spend → 0%, calm, not a prompt to go spend. Deleting a
  category's transactions mid-period re-derives progress down.

## Income vs expense & savings rate

- **Derivation.** Over the period: `incomeMinor = sum(inflows)`, `expenseMinor = abs(sum(outflows))`,
  `netMinor = incomeMinor − expenseMinor`; **exclude internal transfers** from both sides. `savingsRate =
  netMinor / incomeMinor` (guard `incomeMinor === 0` → show "—", not `NaN`/∞; never divide by zero).
- **The action.** A calm in/out/net `gok-card` ledger and a "Net saved: €310" line that gives a *sense of
  direction*, never a grade. Negative net → state it plainly ("€80 over your income this period"), no red wall,
  no guilt.
- **Edge cases.** Income-less period (between paydays) → savings rate undefined, show "—" with a one-line why.
  A windfall (refund, transfer-in misclassified) can spike the rate — this is why transfer exclusion matters.

## Top merchants

- **Derivation.** Group outflows by normalised merchant (trim the noisy suffixes banks append — store codes,
  city, ref numbers — so "TESCO STORES 2847 LONDON" and "TESCO STORES 1123" collapse to "Tesco"); rank by
  total spend; show top ~5–10 with count + total.
- **The action.** Each row drills into that merchant's transactions; pairs naturally with the subscription
  detector ("this top merchant is a recurring charge"). A ranked list that goes nowhere is filler.
- **Edge cases.** Merchant normalisation is a heuristic — when unsure, **don't over-merge** (merging two real
  merchants is worse than leaving them split). Keep it transparent and conservative.

## Subscription detector

This is the **headline feature** — Emma's whole pitch, the one analytics feature customers credit with saving
them real money. Treat it as a flagship, not a footnote.

- **Derivation (heuristic).** Find merchants with **≥3 charges at a regular cadence** (monthly / 4-weekly /
  yearly) and a **stable amount** (within a small tolerance for FX/price drift). Output per detection:
  `{ merchant, cadence, lastAmountMinor, lastDate, nextEstimatedDate, status }`. Thresholds (amount tolerance,
  cadence window) are an **open question in the spec — tune against the `F03` seed and label the assumptions**.
- **The action.** Each row links to the merchant's transactions + a **cancel/dispute hint** ("renews in 3 days
  — cancel via the merchant"). This is the verb that earns the panel.
- **Honesty.** `nextEstimatedDate` is an **estimate** — label it as such (the DoD requires it). A price rise on
  a known subscription is a *factual, money-saving* signal worth surfacing (à la Snoop); a motivational poster
  is not.
- **Edge cases.** Avoid false positives: a thrice-visited coffee shop at a coincidentally similar amount is
  **not** a subscription — require genuine cadence regularity, and prefer a missed detection over a wrong one.
  Annual subscriptions need a long enough window (don't claim "monthly" on two yearly charges). A cancelled
  subscription (no charge past its due date) → mark "Ended", don't keep projecting a phantom next date.

## Month-over-month comparison

- **Derivation.** Per category: `deltaMinor = thisMonthMinor − lastMonthMinor`; also a percentage where last
  month is non-zero. New-this-month (no prior) and gone-this-month (no current) are real states — label them,
  don't show a misleading ∞%.
- **Direction by sign + text, never colour alone.** ▲/▼ glyph **plus** the signed amount **plus** a word — a
  colour-blind or grayscale reader must get the same answer. This is non-negotiable (DoD + a11y).
- **Tone.** "Eating out: €40 more than last month" — neutral fact. Not "You're overspending on eating out."
  Up isn't bad and down isn't good; the customer decides what the delta means.
- **Edge cases.** Partial current month vs full last month is an apples-to-oranges trap — compare like windows
  (month-to-date vs same-day-last-month) or label the comparison clearly.

## Sub-area definition of done

On top of the spec's Success Criteria and `references/definition-of-done.md`, an analytics panel is done when:

- [ ] Its number is a **pure function of `F03`** for the selected period, in integer minor units, and the sum
      of category spend **reconciles to the accounts page** to the cent (transfers excluded, refunds netted).
- [ ] **Period switch re-derives** it; no stale cache.
- [ ] It ends in a **verb** — drill, set-a-budget, cancel, see-why — or it's cut as a vanity chart.
- [ ] Any chart ships a **text summary + data-table fallback**, reads the `--gok-*` bridge, and **re-themes on
      `data-theme`**; **one accent** for the focused series, neutral ramp for the rest — no rainbow.
- [ ] Budget warnings fire **reward-early**; over-budget is **rule + `gok-tag`**, never a red fill, copy never
      scolds. Deltas read by **sign + text**, not colour.
- [ ] Estimates (subscription next-date, projected spend) are **labelled as estimates**; categorisation is
      **visible and correctable** and re-derives everything above it.
- [ ] Distinct empty states for **no transactions** vs **no budgets** (different copy + CTA); divide-by-zero
      (savings rate with no income) shows "—", never `NaN`/∞.
