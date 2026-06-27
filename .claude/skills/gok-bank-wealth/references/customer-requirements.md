# Wealth & Brokerage — customer requirements

What investing and crypto customers actually need, framed as jobs-to-be-done. Use this to scope features and
judge priority — a trading surface earns its place by serving one of these jobs well, not by adding options or
order types nobody asked for.

## Core jobs-to-be-done

- **"Tell me what I own and how it's doing — honestly."** The dominant job. Total value in my home currency,
  today's move, all-time P/L, and a holdings grid I can scan and sort. Calm and exact beats busy and hyped.
- **"Let me research before I commit."** A price chart (candlestick or line) over a range, the key stats, what
  the thing actually is, dividends, and recent news — enough to decide without leaving the app.
- **"Let me place an order and know exactly what it costs before I confirm."** Side, type, quantity (shares or
  cash), and a live cost preview — estimated total, fee, FX, and remaining buying power — *before* the commit.
  The anxiety is "what will this actually cost me, and can I afford it?"
- **"Keep an eye on things I don't own yet."** Watchlists — lightweight tracking with last price, day change,
  and a sparkline, add/remove without ceremony.
- **"Help me pick a fund without getting fleeced on fees."** Funds/ETFs explorer with fee and risk indicators,
  a fact sheet, and dividends/yield — the job is *fair, transparent cost* and a believable risk picture.
- **"Hold and move crypto without losing it to a mistake."** Balances, a price chart, buy/sell, and send/
  receive — where the deep fear is sending on the wrong network or to the wrong address and never getting it
  back.

## Segments and what they weigh

- **The long-term saver / passive investor** — funds/ETFs, low fees, dividends, set-and-track; cares about
  cost transparency and risk band more than candlesticks.
- **The active retail trader** — instrument detail, candlesticks, limit/stop orders, the order blotter; wants
  speed, control, and an order ticket that's correct to the cent.
- **The expat / multi-currency investor** — holds instruments in USD/EUR/GBP; cares that FX is disclosed and
  home-currency value is honest.
- **The crypto holder** — balances, volatility awareness, and above all a send flow that can't be fat-fingered
  onto the wrong network.

## Must-haves (table stakes — a serious broker has all of these)

- Portfolio overview: total value (home ccy), today's move, all-time P/L, a sortable holdings grid with
  per-row last price / day change / market value / unrealised P/L / weight.
- Instrument detail with a ranged candlestick/line chart, key stats, dividends, and a clear Buy/Sell CTA.
- An order ticket: Buy/Sell × market/limit/stop × shares↔notional, with a live cost + buying-power preview and
  a forced-decision confirm.
- Orders blotter: working / filled / cancelled, sortable, with cancel/modify on working orders.
- Watchlists; a funds/ETFs explorer with fee + risk; a dividend calendar/history.
- Crypto: balances, price charts, buy/sell, and send/receive with a forced network confirmation.
- Full cost + risk disclosure **before** confirm; "prices indicative"; deltas by sign + rule + icon.

## Nice-to-haves (differentiators — earn trust, not at the cost of clarity)

- A benchmark overlay on the performance chart; allocation donut/treemap.
- Yield-on-cost on held dividend payers; a running total of dividends received.
- A per-row sparkline on holdings/watchlists with a text equivalent.
- A simulated depth/order-book ladder, clearly labelled "indicative / simulated".
- Fractional shares / notional ("buy €50 of") for small, regular investing.

## What customers fear (design against these)

- **A fat-finger order — wrong side, wrong quantity, wrong price.** → review ledger + forced-decision confirm
  naming verb + amount; "far from market" warning on a stray limit.
- **A surprise cost or a bad FX rate.** → disclose estimated total, fee, and FX margin on review; show buying
  power before/after.
- **A faked fill.** → honest terminal state (Filled / Working / Queued); never pretend the market is open.
- **Sending crypto into the void.** → reward-early address validation, network-mismatch warning, and a forced
  network-confirmation dialog that names the network and states it can't be reversed.
- **Being hyped into a bad decision.** → no "best"/"top" framing, no confetti on a green day; risk and fee
  shown plainly.
