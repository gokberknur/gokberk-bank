# Sub-area playbook — Recurring & savings plans (V10)

The deep, narrow guidance for the **savings-plan spine** — the flagship of the depth epic. This is
recurring, automated investing (månadssparande / auto-invest / round-up-to-invest) into a single instrument,
a fund/ETF, or a small named basket. It is the highest-value new surface in the pillar because it converts a
one-off trader into a **primary, habitual relationship** — but its stakes are subtle: a plan runs *unattended*,
so every honesty rule the order ticket enforces at the moment of a trade must hold for a trade the user won't
be watching. The signature discipline: **compose, don't rebuild** — the plan is the marriage of two engines we
already own, plus a payload.

Spec: `.planning/features/invest/V10-recurring-savings-plans.md` (read it first). This is bound by the CPO
reshaping in `V08-15-trading-depth-overview.md`: build on **`P05`**'s schedule + **`V03`**'s order spine;
round-up **extends `A04`**, never a second engine. For the ex-ante cost framing see
`references/regulatory-and-trust.md`; for the bar, `references/definition-of-done.md`. Apply them — don't restate.

## Contents

1. A plan is not a scheduler and not an order engine
2. The plan payload — instrument / fund / basket
3. Each run is a real V03 order
4. The consent model — mandate-once vs step-up-per-run
5. Round-up-to-invest extends A04 (a destination, not an engine)
6. Pause vs stop — friction matched to stakes
7. Honest run outcomes — Filled / Queued / Skipped
8. Money math · Execution-only · Edge cases · Sub-area DoD

## 1. A plan is not a scheduler and not an order engine

The single most important thing to get right: **V10 builds neither the scheduler nor the order engine.** `P05`
owns the schedule primitives — frequency, start date, end rule, next-run, projected-balance impact, the
business-day/holiday fall-forward, the reversible pause, the forced-decision cancel. `V03` owns the order spine
— cost preview, buying power, fractional rules, terminal state. V10 **composes them** and adds only the plan
payload (target + weights + cadence + amount). If you find yourself writing a `nextRun` calculator or an order
placer, stop — you're rebuilding an engine that exists. The value of the flagship is that it is *thin*: it
inherits the correctness of two hardened spines rather than forking a third that will drift.

## 2. The plan payload — instrument / fund / basket

Three target kinds via `gok-segmented`: **Instrument** / **Fund or ETF** / **Basket**. Instrument and fund are
chosen through the `F10` combobox over the seed universe (funds from `V06`). A **basket** is 2–N holdings each
carrying a weight; an **Equal vs Custom** switch sets the split. Custom weights are entered as % but held as
**integer basis points summing to `10000`** — never floats, and validated so no leg rounds to zero. The split
is the *user's*, stated plainly. Whether a run **rebalances to weight** (drift-correcting) or does a **plain
split** is an ask-first policy — but **rebalance-as-advice is out of scope either way**: we never nudge the
weights toward an "optimal" mix. The basket is a convenience for splitting one amount, not a model portfolio.

## 3. Each run is a real V03 order

This is what makes the plan honest: **every triggered run places a real `V03` buy**, funded from the source
wallet (the plan *reads* buying power — funding/cash movement stays with `gok-bank-payments`; V10 never moves
cash into the account). For a basket, the per-run amount is split by `weightBps` into **one `V03` order per
leg**. Each run persists a real order to `F04`, so **`V04` lists it and `V01` reflects the holding** — the
plan's contribution history is just a join over those order ids, showing each past run as an executed order
with its date, filled qty, fee, FX, and terminal state, linking back to the order in the blotter. There is no
parallel "plan ledger" of fake fills; the blotter is the system of record.

## 4. The consent model — mandate-once vs step-up-per-run

The consent question is the one genuinely novel regulatory wrinkle. A `V03` trade is confirmed live with a
step-up per commit — but a plan is *unattended*, so a per-run step-up would break the automation. The lean is a
**consent-once mandate at setup**: the create confirm is a `gok-dialog tone="danger" no-dismiss` naming the
commitment ("Start a €200 monthly plan into [target]"), and an `F12` **mandate step-up** authorises the
recurring runs then — the same shape as a `P05`/SEPA standing-order mandate. Runs afterward execute unattended
under that mandate. A **declined step-up leaves no plan** (no side effect). Whether **editing** the
amount/cadence re-mandates (a fresh `F12`) is an ask-first call — lean yes for a material change. Confirm the
final model with `O02`/`F12`; do not invent a bespoke consent flow.

## 5. Round-up-to-invest extends A04 (a destination, not an engine)

Round-up-to-invest is a **new destination on `A04`'s existing round-up engine**, full stop. `A04` already owns
the spare-change rule (transaction → round to the nearest unit → sweep the difference). V10 adds a **plan** as a
place that swept change can land, instead of a pot. It does **not** build a second round-up basis, a second
sweep, or a parallel accumulator. A round-up-funded plan carries a quiet mark in the list. If you're tempted to
compute round-ups here, you've crossed the boundary — route back to `A04`.

## 6. Pause vs stop — friction matched to stakes

The pause/stop distinction is a brand-honesty test, and it must match the friction to the stakes:

- **Pause is reversible and cheap** → a `gok-switch`, **optimistic + `gok-toast` + undo**, no dialog. Pausing
  keeps the plan; forcing a confirm on a reversible pause is the anti-pattern.
- **Stop ends a future commitment** → a `gok-dialog tone="danger" no-dismiss` forced decision, mirroring
  `P05`'s cancel. Stopping is deliberate because it is the destructive act.

**Edit** amount/cadence is a drawer, re-validated reward-early (and possibly re-mandated per §4).

## 7. Honest run outcomes — Filled / Queued / Skipped

A run resolves to the honest `V03` terminal state, never a faked Fill:

- **Market open → Filled.** **Market closed → Queued** (runs at the open).
- **Insufficient funds on the day → Skipped**, recorded honestly with **no blame and no penalty**:
  "This run was skipped — [wallet] didn't have €200 on 1 Jul. The plan continues next month." A skipped run is a
  fact, not a failure; the plan carries on.
- **Fractional per target is honest** — a fractional-capable instrument buys a fractional qty; a whole-share
  target **rounds the contribution down and carries the integer-minor remainder to the next run** (stated in the
  preview so expectations are set before commit).

## 8. Money math · Execution-only · Edge cases · Sub-area DoD

**Money math:** amount as integer **minor units**; basket weights as integer **bps summing to 10000**; FX via a
**scaled-integer rate** where target ccy ≠ wallet ccy (rate + margin disclosed **before** confirm, per run);
per-run fractional qty as a fixed-precision integer of shares (reuse `V03` `fractional`); the carried remainder
in integer minor units. Never float-multiply an amount, a weight, or FX — the recurring nature compounds a
cent-losing bug.

**Execution-only — the line that defines the surface:** the app offers the **mechanism** to automate a habit,
**never a recommendation**. No "recommended amount", no "optimal allocation", no "most popular plan". Copy
offers verbs ("Set an amount", "Choose a cadence"), never a suggestion. This is the flagship's whole trust
proposition: it helps you automate *your* decision, it doesn't make the decision for you.

**Edge cases:** loading (table + preview skeleton) · empty (no plans → orienting CTA) · insufficient projected
balance (reward-early `gok-alert`, confirm blocked, from `P05`'s projection) · market-closed run (Queued) ·
paused · skipped-run · fractional round-down + carry · error (retry, no blame) · declined step-up (no plan).

**Competitive bar:** Trade Republic and Avanza for the savings-plan *habit* done calmly; Trading212 for
auto-invest breadth. Beat them on honesty: every run is a real order in the blotter, every fee + FX disclosed
before the mandate, pause reversible and stop forced, skipped runs stated as fact. See
`references/competitive-benchmarks.md`.

**Sub-area DoD:**

- [ ] Create a plan into a single instrument, a fund/ETF, or a small basket (weights equal or custom, integer bps summing to 10000).
- [ ] Amount via `F07`; cadence weekly/monthly with day-of-month/-week via `F06`; source wallet; start via `F06`; end rule — **all reusing `P05`**.
- [ ] Preview discloses each run's est. total, fee, and FX (when target ccy ≠ wallet) + the projected-balance impact; insufficient projected balance blocks confirm reward-early.
- [ ] Create confirm is a forced-decision dialog naming the commitment; an `F12` **mandate** authorises the runs at setup; a declined step-up leaves no plan.
- [ ] Each run places a **real `V03` buy** (reads buying power) appearing in `V04` with its terminal state — Filled (open) or Queued (closed); never a faked Fill.
- [ ] Round-up-to-invest points **`A04`'s** engine at a plan destination — extends `A04`, not a second engine.
- [ ] Plans list shows next run · amount · target · status by rule+icon+text; detail shows schedule + contribution history as executed orders + Edit.
- [ ] Pause/resume optimistic + reversible (toast + undo); **Stop** is the forced-decision dialog; a skipped run is recorded no-blame and the plan continues.
- [ ] **No advice** — zero "recommended"/"optimal"/"most popular" copy; money, weights, FX all integer; `columns`/`rows` as properties; no `bind:`; axe clean on the wizard, list, detail, and stop dialog.
