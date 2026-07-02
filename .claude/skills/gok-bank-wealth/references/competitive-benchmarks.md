# Wealth & Brokerage — competitive benchmarks

How the best run investing and crypto, so gökberk bank can match or beat them. Use this to calibrate "how good
does this have to be?" — the answer is usually "as deep as Nordnet, as calm as the best neobank, and clearer
than any of them on cost and risk."

## The bar-setters

- **Nordnet / Avanza** — the **depth** standard for Nordic retail brokerage: dense, sortable holdings grids
  with tabular numerics, real candlesticks, key stats, dividends, order types (market/limit/stop), and an
  order blotter. If our portfolio/instrument surfaces feel shallower than Nordnet, they're under-built.
- **Trade Republic** — **clarity + restraint**: a clean portfolio with balance + cash visible, a simple but
  honest order manager that explains Market / Limit / Stop, savings plans, fractional. The closest in spirit to
  gökberk's editorial calm. Match the simplicity without losing the order-type rigour.
- **Revolut (trading)** — investing as one feature in a broad app; fast, fractional, multi-currency, with a
  visible cost/FX line. Good at making a first order feel approachable; sometimes thin on research depth.
- **eToro** — **fractional shares + euro-cost-averaging** done well, clear limit-order education, and a strong
  portfolio P/L view. (Their social/copy-trading is explicitly **out of scope** for us — see scope-discipline.)
- **Bitpanda** — the **crypto + brokerage** benchmark: buy/sell with limit orders, an explicit **slippage
  control** (cancels beyond a 5% threshold), and broad asset coverage. The cautionary tale: their fees are
  embedded in the spread and **opaque** — we do the opposite and disclose the fee/margin up front.

## Patterns worth stealing

- **Nordnet's dense, sortable holdings grid** with right-aligned tabular figures and per-row day-change/P&L.
- **Trade Republic's "balance + cash + portfolio movement" glance** — the calm summary header.
- **A live cost preview that updates as you build the ticket** (price, fee, FX, buying power before/after) —
  the investing equivalent of Wise's "you send / they get" panel.
- **eToro/Trade Republic limit-order affordances** with a plain "far from market" sanity check.
- **Bitpanda's slippage cap** on market/limit orders — a credible, trust-building "we won't fill at a crazy
  price" mechanic.
- **A forced network-confirmation on crypto sends** (the serious exchanges all gate this) naming the network +
  irreversibility, with a copy-able address + QR on receive.

## Anti-patterns to avoid (where even the good ones slip)

- **Embedding the fee in the price** (Bitpanda's opacity). We disclose the fee and FX margin as line items.
- **Colour-coding Buy green / Sell red** as the only signal, or painting gains green and losses red with no
  sign/icon. Fails colour-blind users and our brand; use sign + rule + icon, label the side.
- **Faking a fill when the market is closed.** Show **Queued** and run at open.
- **Hyped, gamified investing** — confetti on a green day, "top movers" framing, urgency nudges. Not us.
- **A research page that's chart-only** with no data fallback, or an order ticket that hides the total until
  after you commit.
- **Crypto sends with a soft, dismissible warning.** The network confirm must be a forced decision.

## The investing-depth bar (V08–V15)

The depth epic covers surfaces V01–V07 didn't; who sets each bar, and where gökberk wins:

- **Savings plans — Avanza *månadssparande* + Trade Republic + Trading212 *Pies / AutoInvest*.** The habit that
  wins the primary relationship: set an amount + a day + a target and forget it (Avanza in ~3 minutes;
  Trading212 adds baskets with target weights). Match the capability; build it on the **P05 schedule + V03
  order** spines with full cost transparency and **no advice** — we offer the mechanism, never "invest €X".
- **Charting — TradingView (curated).** Uncontested on depth (400+ indicators, drawing tools) — do **not**
  chase it. The bar we hold is a *curated honest* subset (volume, crosshair OHLC, MA/RSI/MACD/Bollinger, one
  rebased comparison), each with a data-table fallback. Restraint is the brand.
- **Analytics — Nordnet / Avanza.** Realized vs unrealized, TWR, a rebased benchmark, a projection tool. Match
  the depth; keep the projection a **neutral calculator**, never a "future value" promise.
- **Price alerts — Revolut / eToro / TradingView.** Table-stakes-adjacent now; ours is the **calm** version —
  factual "X is above €Y", no urgency, no nudge-to-trade.
- **ISK — Avanza.** The account every Swede invests through (flat schablonskatt, no capital-gains filing). A
  local-flavor delighter — *represented* as a factual flat-tax line, not a tax engine.
- **Live data — the credibility play.** Bitpanda/Revolut feel "real" because prices move; we get crypto + FX
  live nearly free (keyless). But a demo that **breaks** live is worse than a polished mock — the seed stays
  system-of-record and live only *overlays* it (`ADR-006`).

## The gökberk angle

Match Nordnet on depth and Trade Republic on calm; **beat** all of them on cost and risk transparency. Where
Bitpanda buries the fee in the spread and eToro leans social, we show the estimated total, the commission, and
the FX margin as plain line items, label every price indicative, render P/L and direction by sign + rule +
icon (never hue alone), and gate the irreversible crypto send behind a network-named, no-dismiss confirm. The
differentiator isn't a flashier chart — it's an order you understand completely, and can afford, before you
place it.
