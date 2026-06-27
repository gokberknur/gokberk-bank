# PFM & rewards — definition of done

The quality bar a money-management or rewards surface must clear before you'll sign it off. This is the
domain lens, on top of the feature spec's own Success Criteria, the `gokberk-design` visual gate, and
`gok-bank-ux`'s flow review. If a surface fails any of these, it's not done.

## Derivation & correctness (the spine)

- [ ] Every number — spend by category, trend, top merchants, income/expense, savings rate, cashback earned —
      is a **pure function of the `F03` transactions ledger**. No parallel spend store.
- [ ] Totals **reconcile to the accounts page** to the cent; the donut and the ledger never disagree.
- [ ] Money is integer **minor units**; savings rate and percentages computed without float-multiplying money.
- [ ] Budgets and reward state persist only their **settings** (limit, activation) via `F04`; the spend and
      the earnings are derived, never seeded separately.
- [ ] Estimates (subscription next-date, projected spend) are **labelled as estimates**, never as facts.

## Honest categorisation & insight-drives-action

- [ ] Categorisation is **visible and correctable**; a miscategorised charge can be fixed and the numbers
      above it re-derive.
- [ ] Every panel ends in an **action** (set a budget, cancel a subscription, drill into transactions) — no
      vanity charts.
- [ ] MoM deltas convey direction by **sign + text**, never colour alone.

## Responsible nudges (no shame)

- [ ] Budget warnings fire **reward-early** (approaching the limit), framed factually ("€420 of €600").
- [ ] Over-budget is shown by **rule + `gok-tag`**, never a red fill or a red wall; copy is neutral, never
      scolding, guilting, or moralising.
- [ ] No insight surfaces a sensitive inference (health, religion, politics) back as a label or a nudge — the
      neutral category and the transactions only.

## Rewards (no dark patterns)

- [ ] Every offer discloses the **reward, cap, qualifying spend, and expiry** before activate/redeem; no
      bait ("up to X%"), no manufactured urgency.
- [ ] Activation is **optimistic + reversible** (`gok-toast`, rollback on failure); expired offers can't be
      activated.
- [ ] Redeem is **capped at available**, shows a review ledger, and ends on a **forced-decision** confirm.
- [ ] Pending cashback is rendered **distinctly (lighter)** from available; everything earned/redeemed has a
      reference and a clear history.
- [ ] No confetti, hype copy, streaks, leaderboards, challenges, or spend-more-to-unlock anywhere.

## States, accessibility & feedback

- [ ] Loading, empty (no transactions vs no budgets vs no offers vs no history — **distinct copy each**),
      error, and pending states all present per `.planning/ux/patterns.md`.
- [ ] **Every chart has a non-visual equivalent** — a text summary and an accessible data-table fallback;
      charts are never the only representation.
- [ ] Charts read the `--gok-*` token bridge and **re-theme on `data-theme`**; **one accent** for the focused
      series/CTA, neutral ramp for the rest — no rainbow.
- [ ] Balance changes announced via `aria-live`; status by rule + icon + text; tabular numerals everywhere.

## Consistency

- [ ] Pending vs. settled, available vs. current balance are consistent with `gok-bank-accounts`.
- [ ] Reuses the shared chart wrappers and money/format helpers; the transactions drill-down reuses the
      accounts grid (A02) — don't fork ledger logic.
- [ ] The journey matches the patterns `gok-bank-ux` enforces; scope matches what you declared in.

## The gut check

Would a real customer trust this picture of their money and feel **respected, not judged or played**? If any
chart can't be acted on, any number could disagree with the accounts page, any nudge could read as shame, or
any reward could feel like a trick — it's not done.
