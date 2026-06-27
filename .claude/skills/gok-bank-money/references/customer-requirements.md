# PFM & rewards — customer requirements

What money-management and rewards customers actually need, framed as jobs-to-be-done. Use this to scope
features and judge priority — a surface earns its place by serving one of these jobs and ending in an action,
not by adding another chart or another badge.

## Core jobs-to-be-done

- **"Tell me where my money went — honestly, at a glance."** The dominant PFM job. A truthful category
  breakdown and a clear in/out/net for the period. The win is *understanding without effort*; the failure is
  a number the customer doesn't trust or can't act on.
- **"Help me not overspend, without nagging me."** Budgets with progress, warned *early* before the limit,
  never scolded after it. The job is *gentle control* — set a limit, watch it, get a heads-up in time to
  change course.
- **"Find the money leaking out that I forgot about."** The subscription detector and top merchants. The job
  is *recovering forgotten spend* — surface recurring charges with cadence + next date, and a path to
  cancel/dispute. This is the single feature customers credit with saving them real money.
- **"Show me I'm making progress."** The savings rate (net ÷ income) and month-over-month comparison. The job
  is *a sense of direction* — am I doing better than last month? — conveyed calmly, never as a grade.
- **"Reward me for banking here — and make it actually worth it."** Cashback balance, offers, redeem. The job
  is *a genuine thank-you the customer can spend*, with the terms in plain sight, not a game that tricks them
  into spending more.

## Segments and what they weigh

- **The anxious budgeter** — wants the budget progress + early warning above all; fears the red wall and the
  guilt. Calm, no-blame framing is the product for them.
- **The optimiser** — wants the subscription detector, top merchants, and MoM deltas; hunting for waste and
  efficiency. Give them precision and a clear action per finding.
- **The glancer** — opens it for 10 seconds: where did it go, am I okay this month. One honest donut + the
  net line serves them; don't bury it under analytics.
- **The rewards-motivated** — opens `/rewards` for the cashback balance and offers; wants value that's
  obviously real and redeemable, not points that expire into nothing.

## Must-haves (table stakes — a serious PFM has all of these)

- Spend by category for the period (donut/bar) with each category's amount + share, derived from the ledger.
- Income vs expense (in / out / net) and a **savings rate**.
- Per-category **budgets** with progress and an **early** near-limit warning.
- A **subscription detector** (recurring charge → cadence → next estimated date → action).
- **Top merchants** ranked by spend, and a **month-over-month** comparison.
- A **monthly trend** so a single month has context.
- Every chart with a **non-visual equivalent** (summary + data table) — charts are never the only representation.
- A **cashback / rewards balance**, an **offers** grid, and a **redeem** flow with the terms disclosed.

## Nice-to-haves (differentiators — earn delight, never at the cost of clarity or honesty)

- Drill from any category/merchant straight into the underlying transactions (reuse the accounts grid).
- "Left to spend" / projected end-of-month framing — only if the projection is honest and clearly an estimate.
- Smart, *opt-in* observations ("Subscriptions are up €18 vs last month") — informative, never a push to act.
- A single, genuinely-better featured offer rather than a wall of mediocre ones.
- Cashback that credits a real wallet the customer already has, redeemable on their terms.

## What customers fear (design against these)

- **A number they can't trust.** A miscategorised charge, a total that disagrees with the accounts page. →
  derive from the one ledger; make categories visible and correctable.
- **Being judged.** "You spent too much on takeaways." → inform, never moralise; no shaming copy, no red wall.
- **Being manipulated into spending.** Offers and gamification engineered to drive consumption. → rewards are
  a thank-you with plain terms, never a slot machine.
- **Their behaviour being used against them.** Spend data is intimate. → show it to them; never weaponise it.
- **Reward fine print.** Hidden caps, surprise expiry, points worth nothing. → disclose cap, qualifying
  spend, and expiry up front.
