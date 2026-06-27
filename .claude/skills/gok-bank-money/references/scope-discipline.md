# PFM & rewards — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship — and in this domain, refusing the manipulative feature is the job. Use this at every scope
decision; when something feels like creep, a vanity chart, or a dark pattern, say so and point here.

## What gökberk bank delivers (in scope)

**Budgets & spend analytics (M01)** — all derived from the `F03` transactions spine:

- Spend by category (donut/bar) with amount + share; selecting a slice filters the detail.
- Monthly spend **trend** (stacked bar) across recent months.
- Per-category **budgets** with progress (`gok-progress`), warned **early** before the limit.
- Income vs expense (in / out / net) and a **savings rate** (net ÷ income).
- **Top merchants** ranked by spend.
- A **subscription detector** (recurring charge → cadence → next estimated date → action).
- **Month-over-month** per-category comparison (delta by sign + text, not colour alone).
- Drill from any category/merchant into the underlying transactions (reuse the accounts grid).

**Rewards / cashback (M02):**

- A cashback + points **balance** (available vs pending, pending shown lighter).
- An **offers** grid (merchant, reward, terms, validity) with **activate** (optimistic + toast).
- **Redeem** (cashback → a wallet, or points → a reward) capped at available, forced-decision confirm.
- A **history** of everything earned and redeemed.

This set fully exercises the derive-from-the-spine discipline and an honest loyalty layer. It's a complete,
credible PFM + rewards product for a pan-European neobank demo.

## What we do NOT build (and why)

- **A parallel spend backend or budget store.** Everything derives from the one `F03` ledger that
  `gok-bank-accounts` owns. A second source of spend is the cardinal sin — it desyncs from the truth.
- **External-account aggregation / real open-banking AIS.** It's a mock over one seeded ledger. We model the
  *respect* of AIS, not a real connector to other banks.
- **Shaming or moralising insight.** "You spend too much on X", spending grades, guilt nudges. We inform; we
  never judge. This is a refusal, not a missing feature.
- **Gamified engagement mechanics.** Streaks, leaderboards, challenges, badges-for-spending, confetti,
  spend-X-more-to-unlock. They drive shallow activity and overspending — the opposite of wellbeing.
- **Manipulative rewards.** Bait offers ("up to 10%"), hidden caps/expiry, ecosystem-lock-in balances, points
  engineered to be confusing. A reward is a disclosed thank-you or it isn't built.
- **Tax / accounting / full-blown financial-planner tooling.** High effort, out of a neobank's PFM spirit; a
  budget, a savings rate, and a subscription detector cover the demo's jobs.
- **A rainbow analytics console.** Twelve saturated category colours and a dashboard of every possible
  widget. We show the few numbers that drive action, in one accent over the neutral ramp.

## Creep signals — push back when you see these

- "Let's add a streak / leaderboard / badge to boost engagement" → no; gamified overspending, banned.
- "Show a nudge telling them they're spending too much on takeaways" → no; that shames. Show the neutral
  category and let them read it.
- "Make the featured offer 'up to 10% — limited time!'" → no; bait + manufactured urgency. State the real
  rate, cap, and expiry plainly.
- "Build a spend store so analytics is faster" → no; derive from the one ledger — a parallel store desyncs.
- "Add ten category colours so the donut pops" → no; one accent for the focused slice, neutral ramp for the
  rest.
- "Pull in their external bank accounts" → out of scope; mock over one ledger, model AIS respect only.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not adding a savings streak — loss-framing
('don't break your streak') is a dark pattern that pressures the customer for our engagement metric, not
their wellbeing. The in-scope alternative is the savings-rate trend: it shows progress honestly, the customer
reads it on their own terms, and there's nothing to lose." A good no protects the customer and teaches the
team where the ethical line is.
