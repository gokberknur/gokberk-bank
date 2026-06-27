# Playbook: Rewards & cashback (M02)

The deep playbook for the `/rewards/**` surface — spec `.planning/features/money/M02-rewards.md`.
Read this when you're scoping or reviewing a *specific* rewards surface and need the earning/redeem mechanics,
the disclosure rules, and the per-surface "definition of done". The cross-cutting refs frame the ethics and
scope; this one is the worked detail of an honest loyalty layer — **a thank-you, not a slot machine**.

The governing line of this whole sub-area: rewards must be **genuinely valuable, plainly disclosed, and never
manipulative**. No confetti, no streaks, no leaderboards, no spend-more-to-unlock. If a mechanic exists to
drive transactions the customer wouldn't otherwise make, it doesn't ship. (The ethics live in
`references/regulatory-and-trust.md`; this is how the surfaces are actually built.)

## Contents

- [The earning contract](#the-earning-contract) — derive cashback, never invent it
- [Cashback & points balance](#cashback--points-balance)
- [Offers grid & offer detail](#offers-grid--offer-detail)
- [Activate an offer](#activate-an-offer)
- [Redeem](#redeem)
- [Points & cashback history](#points--cashback-history)
- [Disclosure rules (the no-dark-patterns spine)](#disclosure-rules-the-no-dark-patterns-spine)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The earning contract

Cashback **earned** is derived, like every spend number, from the `F03` ledger — it is not a free-floating
balance someone tops up:

- **Earned = pure function of qualifying transactions.** `cashbackEarnedMinor` = for each transaction matching
  an activated offer's rule, `floor(amountMinor × rewardPct)`, **capped** at the offer's `capMinor`. Integer
  minor units; `floor` (round in the customer's favour only if you decide so explicitly and consistently —
  never silently round earnings *down* in a way that loses cents the customer is owed). The qualification rule
  (which categories/merchants earn) is an **open question in the spec — tune against the `F03` seed and label it**.
- **Settings, not spend, persist.** Offer activation state and the wallet credit from a redemption persist via
  `F04`/seed; the *earned* figure is recomputed from transactions. Pending vs settled mirrors how the
  underlying transaction settles — never fake a settled credit.
- **Points vs cashback (open question).** Whether points and cashback are one unified balance or two separate
  currencies is unresolved in the spec — decide explicitly; if separate, a points→reward catalog is needed.
  Don't ship an ambiguous "balance" the customer can't reason about.

## Cashback & points balance

- **Surface.** A `gok-card` ledger: **available** cashback, **pending** cashback (rendered *lighter* than
  available — distinct, never summed into one hero number), points balance, and a primary **Redeem** action.
- **Why pending-distinct matters.** Counting unsettled cashback as spendable is a small dishonesty that breaks
  trust the first time a redeem fails. Available is what the customer can act on *now*; pending is a promise,
  shown as one.
- **A11y mechanic.** Balance changes (after a redeem) announce via `aria-live="polite"`; amounts/points in
  tabular numerals so they don't jitter.
- **Edge cases.** Zero balance → calm "Nothing earned yet", not a prompt to go spend to earn. Available is
  always the redeem ceiling (see below).

## Offers grid & offer detail

- **Grid.** Flat `gok-card` offers (no `F11` chart): merchant, the reward ("3% back" / "200 points"), a terms
  summary, validity dates, and an Activate control. **One** offer may be featured with a single accent mark
  (a `gok-badge` or a 2px accent rule) — **never an accent fill**, never a wall of competing highlights.
- **Quality over quantity.** A single genuinely-better featured offer beats a wall of mediocre ones (a
  differentiator in `references/customer-requirements.md`). Don't pad the grid to look generous.
- **Offer cards are real interactive elements** — `gok-card interactive` wrapping a slotted `<a>`/`<button>`,
  **never a clickable div** (keyboard + screen-reader reachable).
- **Offer detail (`/rewards/[offerId]`).** Full terms in a `gok-card` ledger — **covered spend, cap, expiry**
  spelled out — plus activate/deactivate and the transactions that qualified (so the earning is auditable, not
  a black box).
- **Expired offers.** Status `gok-tag` "Expired", **non-activatable** — disabled control, not a dead link that
  looks live.

## Activate an offer

- **Optimistic + reversible.** Toggling activation (a labelled `gok-switch` / `gok-button`) updates the UI
  immediately with a `gok-toast` confirm; on failure, **roll back** and surface a `gok-alert` (no blame). This
  is the low-stakes branch of the money spine (`.planning/ux/patterns.md` §2, §5) — no dialog needed.
- **No pressure to activate.** Activation is the customer's choice; the offer states its real terms and waits.
  No countdown-to-activate, no "only 2 left!", no manufactured urgency.
- **Edge cases.** Activating an expired offer is blocked at the source. Re-activating after deactivate is fine
  and non-punitive. Activation never itself moves money — it only changes which future spend qualifies.

## Redeem

The one **forced-decision** moment in this sub-area — value moves, so it follows the money spine fully:

1. **Choose** what to redeem: cashback → a wallet (via `gok-select`), or points → a reward; and the **amount**
   (`F07` money input), **capped at available** (the input cannot exceed `availableMinor`; pending is not
   redeemable).
2. **Review** a `gok-card` ledger — what's redeemed, to where, the resulting balance.
3. **Confirm** a **forced-decision `gok-dialog`** whose primary button names the verb + amount ("Redeem
   €12.40"); the dialog traps focus. This is required even though redeem is "positive" — moving value always
   gets the deliberate confirm.
4. **Success** — the credit reflected (announced via `aria-live`), a reference, and history updated.
   Cashback-to-wallet is optimistic + reversible where the rail allows.

- **Why capped + forced-decision.** Capping at available prevents redeeming a promise that hasn't settled; the
  forced decision prevents an accidental redemption the customer can't cleanly undo. Both are trust mechanics,
  not friction for its own sake.
- **Errors.** Redeem failure → `gok-alert` + retry, **no blame** ("Couldn't redeem just now — try again"),
  primary disabled with a `gok-spinner` while in flight.
- **Edge cases.** Redeem exactly the full available balance → allowed, lands at €0 cleanly. Amount entered
  above available → corrected late, surfaced early (reward-early/punish-late, patterns §3). Concurrent
  earn-while-redeeming → recompute available against the latest ledger, never let the total go negative.

## Points & cashback history

- **Surface.** A `gok-table` (`role="grid"`): date, merchant/source, type (earned / redeemed), amount or
  points, status `gok-tag` (rule + icon + text); sortable, paginated.
- **Why it matters.** Everything earned and redeemed has a **reference and a clear history** — the
  anti-dark-pattern of *traceability*. A customer can always answer "where did this come from / where did it
  go". Obscured point values and untraceable balances are exactly what we refuse.
- **Edge cases.** Empty history → distinct copy "Nothing earned yet" (different from "No offers right now").
  A reversed/rolled-back earning shows as its own honest entry, not a silent deletion.

## Disclosure rules (the no-dark-patterns spine)

The hard rules every rewards surface inherits — the signature discipline of this sub-area:

- **Disclose before commit:** the reward %, the **cap**, the qualifying spend, the **expiry** — all visible
  before the customer activates or counts on it. **No bait** ("up to 10%") that almost never pays.
- **Never engineer spending.** A reward thanks behaviour the customer already has; it must not be designed to
  drive purchases they wouldn't otherwise make. "Spend €X more to unlock" is banned.
- **Banned mechanics, named:** confetti, hype copy ("Amazing rewards!!"), countdown-pressure to redeem,
  leaderboards, streaks-you'll-lose, spend-X-more-to-unlock, points whose value is deliberately obscured,
  ecosystem lock-in ("spend it only here" — our cashback credits a real wallet the customer already controls,
  unlike Klarna's locked balance).
- **Honest balances:** pending distinct from available; redeem capped at available; forced-decision confirm;
  full traceable history.
- **Calm voice & brand:** mono-uppercase eyebrows; **one** accent (the primary Redeem / the single featured
  offer mark), never an accent fill; hairline + flat cards, no shadow-to-pop; numerals everywhere.

## Sub-area definition of done

On top of the spec's Success Criteria and `references/definition-of-done.md`, a rewards surface is done when:

- [ ] Cashback **earned derives from qualifying `F03` transactions** in integer minor units, capped at the
      offer cap; only **settings** (activation) and the redeemed wallet credit persist.
- [ ] **Available vs pending** is shown distinctly (pending lighter), and **redeem is capped at available**;
      pending is never redeemable, the balance never goes negative.
- [ ] Activation is **optimistic + reversible** (`gok-toast`, rollback on failure); **expired offers cannot be
      activated**.
- [ ] Redeem shows a **review ledger**, ends on a **forced-decision** confirm naming the verb + amount, credits
      the wallet, and writes a **referenced history** entry.
- [ ] Every offer **discloses reward, cap, qualifying spend, and expiry** before activate/redeem — **no bait,
      no manufactured urgency**.
- [ ] **No banned mechanic** anywhere — confetti, hype, streaks, leaderboards, spend-more-to-unlock, obscured
      points, lock-in.
- [ ] Offer cards are **real interactive elements** (slotted `<a>`/`<button>` + `interactive`), the redeem
      dialog **traps focus**, balance changes **announce via `aria-live`**, status is **rule + icon + text**,
      **one accent** per view (no accent fill), tabular numerals.
- [ ] Distinct empty states for **no offers** vs **no history**.
