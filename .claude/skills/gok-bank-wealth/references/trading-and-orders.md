# Sub-area playbook — Trading & orders (V02, V03, V04)

The deep, narrow guidance for the **order spine**: the instrument detail page that precedes a trade, the order
ticket that places it, and the blotter that manages it. This is the highest-stakes investing surface — money
moves, and a fat-finger or a buried fee is where a broker loses trust. Be exact.

Specs (read the relevant one first): `.planning/features/invest/V02-instrument-detail.md`,
`V03-place-order.md`, `V04-orders-management.md`. For the regulatory framing behind these rules (MiFID ex-ante
costs, best execution, slippage, step-up), see `references/regulatory-and-trust.md`; for the bar, see
`references/definition-of-done.md`. Apply them here — don't restate them.

## Contents

1. Instrument detail (V02) — the deep read before a trade
2. The order ticket (V03) — anatomy & order types
3. Cost preview & buying power — reward-early
4. The forced-decision confirm & slippage
5. Honest terminal state
6. Orders management (V04) — the blotter
7. Money math
8. Edge cases · Competitive bar · Sub-area DoD

---

## 1. Instrument detail (V02) — the deep read before a trade

The research surface a Nordnet-style user expects before committing. Route `/invest/instrument/[symbol]`.

- **Price chart** — candlestick **or** line, `gok-segmented` type + range (1D/1W/1M/1Y/Max) both as
  `role="radiogroup"`. Candle up/down read by **sign + rule + icon**, never hue alone. A crosshair tooltip
  reads OHLC/price. Ships a **visually-hidden data-table fallback** — the chart is never the only access to the
  series.
- **Key stats differ by instrument type.** A stock shows P/E, market cap, dividend yield, 52-week range, beta,
  day range, volume; an ETF/fund shows TER, AUM, SRRI; crypto shows supply/market cap. Render **"—"** for a
  field that doesn't apply rather than a fake zero. This per-type difference is the single most common bug here.
- **Depth / order book is simulated — say so.** A two-sided bid/ask ladder (mid in the middle) labelled
  **"Indicative depth (simulated)"**. Never present it as a real market; if animated, keep motion quiet (brand).
- **Position join.** When the user holds the instrument, show qty / average cost / market value / unrealised
  P&L inline so the page doubles as a position view. Not-held → the block hides; **Buy stays available**.
- **Sticky Buy/Sell CTA.** The one accent is the Buy CTA + the active segment. It stays reachable on scroll and
  keeps its label. Buy and Sell are **not** colour-coded green/red — the side segment + label carries it.

## 2. The order ticket (V03) — anatomy & order types

A `gok-drawer` trade form, route `/invest/order/[symbol]`. It turns intent into a confirmed order through the
money spine (`.planning/ux/patterns.md` §2): ticket → cost preview → review → forced-decision confirm → done.

**Fields, in order:**

- **Side** — `gok-segmented` Buy / Sell. A **Sell shows a realised-P/L estimate** (vs average cost) and is
  **capped at held quantity** — you can't sell what you don't hold.
- **Order type** — Market / Limit / Stop. Each carries a different *truth*:
  - **Market** — fills now at the prevailing price. The price is **indicative**; the final price may differ.
    This is the order that re-acknowledges **slippage** at confirm (§4).
  - **Limit** — fills only at the limit price or better. Rests as **Working** if not immediately marketable.
    A limit far from the market gets a **"far from market" warning** with an explicit proceed-anyway ack — the
    fat-finger guard against a stray price.
  - **Stop** — triggers a (market/limit) order when the price crosses the stop. Also rests as **Working**.
- **Quantity — shares ↔ notional.** A `gok-segmented` toggle: enter shares (number, fractional rules applied)
  *or* a cash notional ("buy €50 of"). Show a correct **live mirror** ("≈ N shares" / "≈ €X"). Fractional is
  per-instrument: enforce the whole-share rule + **tick size** where fractional isn't allowed, and explain the
  block rather than silently rounding.
- **Limit/Stop price** — a conditional field shown *only* for Limit/Stop; announce it on appearance (a11y).
- **Time in force** — DAY / GTC (GTD if dated). DAY expires at close; GTC rests until filled/cancelled.

## 3. Cost preview & buying power — reward-early

A live `gok-card` ledger that updates **as the user builds the ticket** — the investing equivalent of Wise's
"you send / they get" panel, and the heart of the "what will this cost, can I afford it?" anxiety.

Disclose, before the commit (MiFID ex-ante — `references/regulatory-and-trust.md`):

- **Estimated price · estimated total · commission/fee** — aggregated, never a fee revealed after.
- **FX line (rate + margin)** whenever the **instrument currency ≠ the funding wallet currency**. Show the rate
  *and* the margin as plain line items — don't bury the margin in a blended rate (the Bitpanda anti-pattern).
- **Buying power before / after** — the deltas by rule+sign, not colour.

**Reward-early, every blocker as the user builds:** can't afford it, limit far from market, fractional not
allowed, market closed → surface it *while building*, not on submit. **Insufficient buying power blocks the
confirm** with no-blame copy that says what happened and the fix. The ticket *reads* buying power — it never
funds the account (that's `gok-bank-payments`; see `references/scope-discipline.md`).

## 4. The forced-decision confirm & slippage

The commit is deliberate and it tells the truth about price. A `gok-dialog tone="danger" no-dismiss` that
closes only via its footer action — never place the order before this confirm fires.

- **The primary names the verb + amount** — "Buy €1,000 of AAPL" — so there's no ambiguity about side or size.
- **Step-up (`F12`)** fires over a threshold (the threshold is an ask-first value, possibly distinct from
  payment thresholds). A **declined step-up returns to review with no side effect** — state unchanged.
- **Market orders re-acknowledge slippage:** "Prices indicative — the final price may differ; markets move."
  A Bitpanda-style slippage cap that cancels beyond a threshold is a credible, trust-building touch.
- **A stale quote re-prices before confirm** — never confirm against a price that's gone stale.

## 5. Honest terminal state

The outcome is derived deterministically from order type + market state, and it never lies:

- **Market + market open → Filled.**
- **Limit/Stop resting → Working.**
- **Market closed → Queued** (runs at the open) — *never* a faked Fill on a closed market.

The done screen shows the right status `gok-tag` + a reference id + links to the order and to repeat. The order
persists to state so the blotter (V04) lists it.

## 6. Orders management (V04) — the blotter

One `gok-table` surface, route `/invest/orders`, that closes the loop on every placed order.

- **Columns:** time · symbol · side · type · qty · limit/stop · filled qty · status. Numeric right-aligned,
  tabular. `columns`/`rows` as DOM **properties**; sort via `on('gok-sort', …)`; **no `bind:`** on custom
  elements.
- **Status by rule/mark + text** — Working / Filled / Cancelled / Queued / Rejected as a `gok-badge`, never
  colour-only. A **Rejected order explains why** with no blame ("Rejected — insufficient buying power at
  submit").
- **Filter** All / Working / Filled / Cancelled as a `role="radiogroup"`; distinguish **empty** (no orders) from
  **filtered-empty** ("No working orders" + clear-filter) — different copy.
- **Working orders are manageable; terminal orders are read-only.** A row → detail `gok-drawer` exposes
  **Modify** (limit/qty, re-validated reward-early) and **Cancel** *only* for Working orders. Filled/Cancelled
  expose neither.
- **Cancel is a forced-decision** `gok-dialog no-dismiss tone="danger"` ("Cancel this order? It won't
  execute."); on success the row moves to Cancelled optimistically + a `gok-toast`. Whether **Modify** is true
  in-place or **cancel-and-replace** (some venues only allow the latter) is an ask-first decision.

## 7. Money math (the rule under everything)

Money as integer **minor units**; FX via a **scaled-integer rate** (never float-multiply); fractional qty as a
fixed-precision integer of shares. Estimated total, fee, and the FX line all computed from these — a float
multiply is the cent-losing bug. Reuse the shared order-draft + pricing/FX engines; don't fork per-instrument or
per-rail logic, and keep buying power consistent with `gok-bank-accounts`.

## 8. Edge cases · Competitive bar · Sub-area DoD

**Edge cases:** loading quote (skeleton on the preview ledger) · insufficient buying power (block + reward-early)
· market closed (→ Queued) · limit far from market (warn + ack) · fractional not allowed (block + explain) ·
quote stale (re-price) · submit error (retry, no blame) · step-up declined (no side effect) · Sell capped at
held qty.

**Competitive bar:** Nordnet for order-type rigour and the blotter; Trade Republic for explaining Market/Limit/
Stop plainly and for calm; the live cost preview beats Bitpanda's embedded-spread opacity by disclosing fee +
FX margin as line items. See `references/competitive-benchmarks.md`.

**Sub-area DoD:**

- [ ] Buy and Sell tickets complete for a same-ccy and a cross-ccy instrument (FX line shown + correct).
- [ ] Quantity toggles shares ↔ notional with a correct live mirror; fractional/tick-size rules enforced.
- [ ] Limit/Stop reveal the price field; "far from market" warns + requires an explicit ack.
- [ ] Cost preview shows est. total, fee, FX (rate+margin), buying power before/after; insufficient power blocks
      the confirm reward-early with no-blame copy.
- [ ] Confirm is a forced-decision dialog naming verb+amount; step-up over threshold; decline = no change;
      market orders re-acknowledge slippage; a stale quote re-prices.
- [ ] Terminal state honest — Filled (market, open) / Working (limit/stop) / Queued (market closed); the order
      appears in the blotter.
- [ ] Blotter: status by rule/mark+text, Rejected explained; only Working orders expose Modify/Cancel; cancel is
      forced; empty vs filtered-empty distinct.
- [ ] Buy/Sell never colour-only; the accent is the primary/active segment only; minor-unit + scaled-int math;
      `columns`/`rows` as properties; axe clean on ticket, review, confirm, blotter.
