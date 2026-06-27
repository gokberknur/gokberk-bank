# Sub-area playbook — Personal loan servicing (L02)

The deep, narrow playbook for servicing an **active personal loan** — spec
`.planning/features/lending/L02-loan-servicing.md`. This narrows the cross-cutting refs to the
post-origination surface: the summary, the complete repayment schedule, the overpayment with its effect
preview, the early payoff forced decision, the payoff chart, and the documents. Two of these acts move
money irreversibly, so they ride the money spine (`.planning/ux/patterns.md` §2).

Servicing is **not** origination — there is no offer, no representative example, no fresh disclosure set
here. The disclosure that matters is **the exact figure of an irreversible act, shown first**: the exact
payoff and the interest saved, before the borrower commits. (For the mortgage equivalent — the
virtualized 360-row schedule and the ERC overpayment — see `mortgages.md`; this playbook is the
*unsecured* loan, which has **no ERC** by default.)

## 1. Summary — what the borrower owes, at a glance

A header ledger (`gok-card`):

- **Outstanding balance**, **original amount**, **APR**, **monthly payment**, **next payment date**,
  **payments made / remaining**, and a `gok-progress format="fraction"` ("18 of 60").
- One primary action cluster: **"Overpay" · "Pay off early."** Exactly one earns the accent; flat,
  hairline, calm.
- Numbers are stated as fact, tabular numerals; pending amounts render lighter than settled.

## 2. The repayment schedule — amortization is the truth

A `gok-table` (#, due date, payment, principal, interest, remaining balance), drawn from the **shared
amortization generator** (the same one L01 uses — don't fork per-product math):

- The schedule **sums**: principal + interest = payment each row; the remaining balance **decrements to
  exactly zero at term**. Reconcile the final row so it lands on zero — a residual is a bug.
- **Paid** rows tagged (status `gok-tag`), the **next-due** row marked — distinguished by
  rule+icon+text, never colour alone. Numeric columns tabular.
- `paginated` or `virtualized` for long terms. Set `columns`/`rows` via `setProps`; subscribe to
  `gok-sort` / `gok-page-change` via `on`; **no `bind:`**; **never restyle `gok-table` visuals**.

## 3. Overpay — preview the effect before confirm

An overpayment reduces the balance; the borrower must **see what it does** before committing:

- A money input (`F07`) for the extra amount, with a **live effect preview**: "Reduces your term by 4
  months" **or** "Lowers your payment to €X" — per the loan's rule. The saving is *shown*, not just
  asserted (`customer-requirements.md` differentiator).
- An unsecured personal loan has **no ERC** by the consumer-friendly default, so an overpayment is a
  **reversible-within-window** act: optimistic + a **cancel-window** affordance, **not** a forced danger
  dialog. Friction matches stakes (`scope-discipline.md`). (Contrast the mortgage, where an
  allowance-exceeding overpayment *does* force the ERC decision — `mortgages.md` §6.)
- Flow: money input → effect preview → review ledger → confirm ("Pay €X") → success (`gok-tag`, updated
  balance, cancel-window per policy).
- Confirm the overpayment behaviour with the spec: shorten term, lower payment, or let the user choose?
  It changes both the preview copy and the math. And confirm the cancel-window policy (until daily
  cut-off vs none).

## 4. Pay off early — the forced decision

Settling the loan early is **irreversible** and is the one act on this surface that earns the full
forced-decision spine. The CCD gives the borrower the right to repay early and get a **reduction in the
total cost of credit** (the unaccrued interest) — so the figure must be exact and the saving visible:

- A **settlement ledger** shown *first*: outstanding principal, **accrued interest to date**, any
  early-settlement adjustment, the **total payoff figure**, and the **interest saved vs running to
  term**.
- For an unsecured loan the consumer-friendly default is **interest-to-date only** (no settlement charge)
  — confirm with the spec whether to model an adjustment at all.
- The confirm is `gok-dialog tone="danger" no-dismiss`, naming the figure first: **"Pay off €X — this
  closes the loan,"** with **step-up** (`F12`). Declining step-up returns with **no change**.
- **Honest finality**: the payoff is held **pending** (`gok-tag` Processing) until it **clears**, then
  "closed." **Never mark the loan closed before settlement clears** — faking finality is the incumbent
  anti-pattern we refuse (`competitive-benchmarks.md`). Money never moves before the forced-decision
  confirm; funding routes through `gok-bank-payments`.

## 5. The payoff chart — make the saving visible

`F11` (ECharts) line/area of projected **balance-to-zero**: the **original glide path vs the post-action
path** (post-overpayment or post-payoff), so the saving is *seen*, not just stated. The "saved" series
earns the accent. The chart reads `--gok-*` via the `F11` token bridge — **no chart logic in the
route** — and has an adjacent accessible data summary / description for screen readers.

## 6. Documents

The credit agreement, statements, and — after payoff — the **settlement/redemption letter** link to the
documents vault (`D01`). The vault and e-sign mechanics are **consumed from `gok-bank-servicing`**, not
reimplemented; you specify *that* a settlement letter is produced and *what* it confirms.

## 7. Edge cases this surface must handle

- **Insufficient funding wallet** on overpay/payoff — surfaced **reward-early** (as typed), blocked,
  no-blame.
- **Pending settlement** — held separate from "closed"; the summary reflects pending, not done.
- **Payment failure (transient)** — retry via `gok-alert`, no blame; distinct from a decline.
- **Empty schedule** — shouldn't happen; guard it (a serviced loan always has a schedule).
- **Overpay then cancel** — within the cancel-window, the balance reverts cleanly.
- **Accrued-interest timing** — the payoff figure is interest *to the settlement date*; recompute it at
  the moment of the dialog, not a stale value.

## 8. Competitive angle (narrowed)

Beat the incumbent's two servicing failures: a statement with **no schedule view** (we show every row),
and a payoff marked **"closed" before it clears** (we hold it pending honestly). Match the better
servicing tools on the **overpayment effect preview** and the **glide-path chart** that *shows* the
saving. (Full benchmarks: `competitive-benchmarks.md`.)

## 9. Sub-area definition of done (on top of `definition-of-done.md`)

- [ ] The summary shows outstanding balance, APR, monthly payment, next payment date, and progress
      "k of N".
- [ ] The repayment schedule renders **every** payment with principal / interest / remaining balance;
      paid and next-due rows distinguished by rule+icon+text; the balance hits **zero at term**.
- [ ] Overpay **previews its effect** (shorter term **or** lower payment) before confirm and updates the
      balance; it is reversible-within-window (cancel-window), **not** a forced dialog.
- [ ] Early payoff shows the **exact settlement figure + interest saved** first, requires **step-up**, is
      a **forced-decision** dialog; declining returns with no change; the loan is held **pending until it
      clears**, then closed.
- [ ] The payoff chart shows the **original vs post-action** balance glide path with an accessible
      summary.
- [ ] Insufficient funding-wallet balance is surfaced reward-early, no-blame.
- [ ] One shared amortization generator with L01; integer minor units; integer-scaled rates; money moves
      only after the forced-decision confirm.
