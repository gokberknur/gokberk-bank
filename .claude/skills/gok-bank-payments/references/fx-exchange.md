# Playbook — multi-currency FX exchange

The deep mechanics of the **exchange** sub-area: converting between the user's *own* currency wallets at a
live rate, on the dedicated `/payments/exchange` surface (`P04`). This is the canonical FX moment, and it
exports the **quote engine** every cross-currency send reuses. Read it when shaping, reviewing, or signing
off the exchange surface — or any rate line elsewhere.

It goes deeper than `regulatory-and-trust.md` (which states the FX disclosure rule) and `sending-and-rails.md`
(which *consumes* the quote). Here is where the linked-input math and the rate lifecycle actually live.

## Why exchange is its own surface, not a send

The other flows *move* money to someone; exchange **transforms** the user's own money. So it's deliberately
**not** the `F05` wizard — it's one focused screen + a confirm. And because the bank owns both wallets, the
conversion **settles instantly and finally** — there is **no pending state and no cancel window**, ever. If
you find yourself adding a `Processing` tag here, you've misunderstood the surface.

But it still earns a **forced-decision confirm** (`gok-dialog tone="danger" no-dismiss`): the rate is a
real, irreversible commitment of value at a moment in time. Instant + final ≠ low-stakes.

## The linked money inputs — the signature mechanic

Two `F07` money inputs, one per side (From / To), **linked**: editing either side computes the other from
the rate. Get this right and it feels magic; get it wrong and the caret jumps or the figures drift.

- Hold a **single source-of-truth amount** + a flag for which side is **active** (the one the user is
  typing). The inactive side **renders the computed value** — it is never an independent input.
- Type "100" in EUR → "≈ $108.40" computes on USD. Type a USD *target* → the EUR cost computes back. Both
  directions must work.
- **Caret-stable:** recomputing the inactive side must not move the caret in the active one, and must not
  shift layout. Reserve the rate-line/message space so a re-quote doesn't jump the page.
- **Never `bind:`** — set via `setProps`, read `input`/`change` via `on` (the repo's WC interop rule).

## The rate model — mid, margin, your-rate

Transparency *is* the trust signal. The rate line is a `gok-card` showing **all three numbers side by side**:

- **Mid-rate** — the honest mid-market reference (what Wise built a company on showing).
- **Margin** — your markup, **disclosed**, never buried. When a tier waives it, state **"No markup"** (e.g.
  Metal) as *fact*, not a sell.
- **Your rate** — mid adjusted by margin; the rate the conversion actually uses.

The anti-pattern you exist to prevent (see `competitive-benchmarks.md`): showing *only* the marked-up rate
and hiding the margin. If the user can't see the markup, the flow is wrong.

All math is **integer minor units** with a **scaled-integer rate** — never float-multiply for conversion.
Rounding must be deterministic and consistent across the linked-compute and the final settle.

## The rate-lock countdown & re-quote lifecycle

A quote is live for a TTL (open question, ~30 s — align with `F12`/the spec). The lifecycle:

1. **Quote fetched** → rate line populated, **countdown** starts in an `aria-live` polite region.
2. **Countdown runs** while the user decides; the inactive side stays computed at the locked rate.
3. **Expiry** → re-quote, **recompute** the linked side, surface a `gok-alert`. (Open question: silent
   auto-re-quote vs requiring a tap — confirm against the spec; default to honest, visible re-quote.)
4. **At confirm** → **re-check the rate**. Expired → re-quote and **block** until the user re-confirms the
   fresh figure. The confirm always commits the rate the user is *currently looking at*, never a stale one.

The rule from `regulatory-and-trust.md`: a rate quote should **expire** rather than charge a stale rate.
This surface is where that rule is made visible.

## Confirm → instant success

- **Confirm** names the verb + amount: "Convert €100". Step-up (`F12`) **only over a high threshold** —
  it's an own-money move, so the bar is *higher* than a payee send (align with `F12`).
- **Success is instant:** both wallet balances update at once; receipt + reference + a **Converted** status
  `gok-tag`. No pending, no cancel. Calm copy: "Converted €100 to $108.40" — no hype, no celebration.

## The shared engine — `fx.ts`

`src/lib/payments/fx.ts` is the **single source** `P01` (internal cross-ccy) and `P03` (SWIFT FX) import:
`quote(pair) → {mid, margin, rate, ttl}`, `convert()`, min/max per pair, optional flat fee by tier. Pure,
mock, deterministic from `F03`.

Guard this boundary: **never let a send flow fork its own rate logic.** One engine, one rounding rule, one
margin policy — or the same conversion gives two answers in two places, which is a trust-killing bug.

## Edge cases the exchange must handle

- **Same-currency pair** → blocked with a quiet note (there's nothing to convert).
- **Swap affordance** → flips From/To **and re-quotes** (the reverse pair may have a different rate/margin).
- **Min/max per pair** → reward-early, primary disabled with the reason.
- **Insufficient funds** → checked against **available** (not current) balance, reward-early.
- **Recompute on re-quote** → no layout shift, caret stable on the active side.
- **Quote expired at confirm** → re-quote + block until re-confirmed.
- **Error fetching a quote** → retry + no-blame `gok-alert`; never show a blank rate as if it were 1:1.

## Competitive patterns to match or beat

- **Wise** — the gold standard for mid-rate transparency; show the mid openly, break out the margin.
- **Revolut** — clear rate + rate-lock countdown; "no markup on plan" hook. Match the speed, stay calmer.
- The gök angle: the margin is *always* visible, "No markup" is stated as fact not sold, and the success is
  a quiet statement of what happened — numerals everywhere, one earned accent on Convert.

## Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, the exchange surface is done only when:

- [ ] Editing either side computes the other correctly at the displayed rate, **caret-stable**, no shift.
- [ ] The rate line shows mid-rate, margin (or "No markup"), and your-rate together; the countdown is
      announced via `aria-live`.
- [ ] Quote expiry re-quotes and recomputes; confirm re-checks and commits the **fresh** rate.
- [ ] Min/max per pair and insufficient **available** funds blocked reward-early; same-currency blocked.
- [ ] On confirm both balances update **instantly**; a `Converted` tag + reference appear; **no** pending
      state and **no** cancel window exist anywhere on the surface.
- [ ] All conversion is integer minor units with a scaled-integer rate — **no float-multiply**.
- [ ] `fx.ts` is the single engine `P01`/`P03` import; no forked rate logic.
- [ ] The gut check: can the user see exactly what markup they're paying before they convert?
