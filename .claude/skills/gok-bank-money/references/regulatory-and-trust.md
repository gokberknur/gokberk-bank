# PFM & rewards — framing, ethics & trust

The framing a PFM and engagement lead holds in mind. gökberk bank is a **mock demo** — we don't aggregate
real accounts or run a real loyalty scheme — but the experience should be *shaped by* how regulated PFM and
ethical engagement actually work, because that's what separates a bank that respects you from an app that
mines you. This is the **signature discipline of this domain**: responsible nudges and no dark patterns.
Informed, not preachy — use this to get the behaviour right, not to lecture the UI.

## The open-banking concept (PSD2 / AIS) — model the respect

- **Account Information Services (AIS)** under PSD2 let a provider aggregate a customer's accounts — *with
  explicit consent* — to give them a single view to manage their money. That's the *spirit* of this domain:
  insight in service of the customer, on data they've agreed to share.
- We don't aggregate external banks (it's a demo over one seeded ledger), but the principle holds: the
  customer's data is shown back **to them**, to help **them** — never repurposed silently.
- **Design implication:** frame PFM as *your money, understood*, not *us profiling you*. If we ever introduce
  cross-account or external-data framing, it is consent-first and reversible.

## GDPR & behavioural data — spend patterns are sensitive

- The sum of someone's transactions reveals **special-category data**: health (a clinic, a pharmacy),
  religion (a donation), politics, sexuality. Categorising and charting spend is processing intimate data.
- **Data minimisation & purpose limitation:** derive only what serves the customer's stated job (understand,
  budget, save). Don't manufacture insights to drive engagement metrics.
- **Design implication:** never surface a sensitive inference back as a label or a nudge ("we noticed you're
  spending on healthcare…"). Show the transactions and the neutral category; let the customer interpret. The
  data is theirs to read, not ours to comment on.

## Responsible-spending nudges — the difference is *intent*

- A nudge and a dark pattern both use behavioural psychology; the line is **whose interest it serves.** An
  ethical nudge guides the customer toward a choice *they'd want for themselves*; a dark pattern serves the
  business at the customer's expense.
- **The nudge ceiling (do):** a timely, factual heads-up the customer can act on — "You've spent €420 of
  €600", "This subscription renews in 3 days", "Net saved this month: €310". Reward-early, aligned to a goal
  the customer set, easy to dismiss.
- **Over the line (don't):** shame or guilt ("You overspent again"), loss-framing pressure ("Don't lose your
  streak"), manufactured urgency, comparison-to-others, or any nudge that pushes *more transactions* rather
  than *better outcomes*. A budget that's blown is reported neutrally, never scolded.

## No dark patterns in rewards — a thank-you, not a slot machine

- **Cashback/offers must be genuinely valuable and plainly disclosed:** the percentage, the **cap**, the
  qualifying spend, the **expiry** — all visible before the customer activates or counts on it. No bait
  ("up to 10%") that almost never pays.
- **Never engineer spending.** A reward must not be designed to drive purchases the customer wouldn't
  otherwise make. We thank existing behaviour; we don't manufacture it.
- **Banned mechanics:** confetti, hype copy ("Amazing rewards!!"), countdown-pressure to redeem,
  leaderboards, streaks-you'll-lose, spend-X-more-to-unlock, points whose value is deliberately obscured.
  These are the gamification anti-patterns that drive *shallow activity and overspending*, not wellbeing.
- **Honest balances:** pending cashback shown distinctly (lighter) from available; redeem **capped at
  available**; a forced-decision confirm on redeem; a reference and clear history for everything earned and
  spent.

## Trust & safety bar (what the experience must convey)

- **Honest numbers:** every total derives from the one ledger and reconciles to the accounts page; estimates
  (subscription next-date, projected spend) are labelled as estimates.
- **No judgment:** insight informs, never moralises; over-budget is informative, conveyed by rule + tag, not
  a red wall.
- **No manipulation:** rewards are disclosed and never engineered; nudges serve the customer's goal and are
  easy to dismiss.
- **The customer's data is theirs:** shown back to help them, never weaponised, never a silent profile.
