# Wealth & Brokerage — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship. Use this at every scope decision; when something feels like creep, say so and point here.

## What gökberk bank delivers (in scope)

- **Portfolio overview** (V01): holdings grid + allocation + total value / total return / P&L, in the home
  currency.
- **Instrument detail** (V02): candlestick/line chart + ranges, key stats, about, dividends, simulated depth,
  news/related, a Buy/Sell CTA.
- **Place an order** (V03): Buy/Sell × market/limit/stop × shares↔notional, live cost + buying-power preview,
  review → forced-decision confirm → terminal state (Filled / Working / Queued).
- **Orders management** (V04): the blotter — working / filled / cancelled, sort/filter, cancel (forced) +
  modify.
- **Watchlists** (V05): multiple named lists, add via combobox, optimistic remove + undo.
- **Funds/ETFs explorer + dividends** (V06): filterable fund grid with fee + risk band, a fact sheet, a
  dividend calendar/history with yield-on-cost.
- **Crypto wallet** (V07): balances + price charts, buy/sell, send/receive with a forced network confirmation.

This set fully exercises the order spine, multi-currency FX, honest settlement state, and the crypto
irreversibility gate. It's a complete, credible execution-only investing product for a pan-European demo.

## What we do NOT build (and why)

- **Real order routing / market data / a real exchange or PSP.** It's a mock demo — all quotes, fills, depth,
  and tx hashes are simulated deterministically. Never wire a real broker, feed, or chain.
- **Advice, robo-advisory, or "recommended" portfolios.** We're **execution-only** (MiFID). No "best pick",
  no model portfolios, no suitability-driven recommendations. Suggesting trades is a different (heavier)
  regulatory product we don't model.
- **Leverage, margin, derivatives, options, CFDs, futures, perpetuals.** High complexity, high risk,
  appropriateness-gated, and off-brand for a calm retail broker. Cash equities, funds/ETFs, and spot crypto
  only.
- **Social / copy trading, leaderboards, "top movers", gamified streaks.** eToro's lane, not ours — it pushes
  hype over informed decisions and fails the no-hype brand.
- **Real on-chain self-custody / seed phrases / DeFi / staking / bridging.** Balances are custodial demo-style;
  we model the **send irreversibility** lesson, not a real wallet stack.
- **Cash in/out, deposits, withdrawals, funding the brokerage account.** That's money movement — it belongs to
  `gok-bank-payments` (and balances to `gok-bank-accounts`). The order ticket *reads* buying power; it doesn't
  move cash into the account.
- **Tax-lot optimisation engines, full KID/tax-statement generation.** A "view KID" / "view statement" stub is
  fine; the documents vault itself is `gok-bank-servicing`. High effort, low demo value here.

## Creep signals — push back when you see these

- "Let's add options / margin / CFDs" → no; cash equities, funds/ETFs, spot crypto only — leverage is
  appropriateness-gated and off-brand.
- "Add copy-trading / a top-movers leaderboard" → no; we're execution-only and no-hype.
- "Recommend what to buy" → no; execution-only means no advice, no 'best'.
- "Build real crypto self-custody with seed phrases" → no; custodial demo; we model the send-irreversibility
  lesson, not a key-management stack.
- "Let them fund the account from this screen" → that's `gok-bank-payments`; the ticket only reads buying power.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not adding margin or options — they're
appropriateness-gated, high-risk, and off-brand for a calm retail broker. The in-scope set (cash equities,
funds/ETFs, spot crypto) already exercises the full order spine and FX, and keeps us execution-only, which is
what this demo is for." A good no protects the product and teaches the team the domain.
