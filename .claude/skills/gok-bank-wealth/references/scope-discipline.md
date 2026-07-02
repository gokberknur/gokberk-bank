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

**Investing-depth epic (V08–V15)** — deepens the shipped pillar; each cleared the CPO gate with the
reshapings recorded in `V08-15-trading-depth-overview.md`:

- **Charting & instrument depth** (V08–V09): a *curated* TradingView-style subset (volume pane, crosshair
  OHLC, MA/RSI/MACD/Bollinger, one rebased comparison overlay, finer timeframes) + the V02-deferred detail
  (news, fundamentals, simulated depth-ladder, dividend history). Drawing-tool sprawl is **out**.
- **Recurring & savings plans** (V10): monthly savings / auto-invest / round-up-to-invest — a recurring
  investment on **P05**'s schedule + **V03**'s order + **A04**'s round-up engine. We supply the payload, not
  a new scheduler.
- **Price alerts** (V11): above/below threshold, fired via **F13**; calm and factual, no nudge-to-trade.
- **Portfolio analytics depth** (V12): realized/unrealized split, TWR, rebased benchmark, a *neutral*
  projection calculator, per-position contribution.
- **Discovery & search** (V13): global search + neutral curated lists + a calm movers view (market-context,
  never a hype leaderboard).
- **Live market-data adapter** (V14): bounded live crypto + FX over the seed — see the amended feed clause
  below + **`ADR-006`**.
- **ISK account wrapper** (V15): a thin flat-tax account-type representation (no tax engine).

## What we do NOT build (and why)

- **Real order routing / a real exchange, broker, or PSP.** Still off-limits — all orders, fills, depth, and
  tx hashes are simulated deterministically; never wire a real broker or chain. **Market data is the one
  narrow exception** (`ADR-006`, V14): a *bounded* live-data **enhancement** may overlay the deterministic
  seed for **crypto + FX** (keyless, browser-direct) and, behind a verification flag, equities — but **the
  seed stays system-of-record**, live **degrades silently** back to it, funds stay mock, every live figure is
  labelled **"indicative / delayed"**, and **no backend/proxy** is ever added. Live *quotes*, never live
  *execution*.
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
- "Add 400 indicators + drawing tools like TradingView" → no; a *curated* honest subset (volume, crosshair,
  a few indicators, one comparison). Drawing-tool sprawl fights the calm and isn't where retail trust is won.
- "Build a savings-plan scheduler / a round-up engine" → no; **reuse P05's schedule + A04's round-up**. V10
  supplies the investing payload, not a second scheduler or a second round-up basis.
- "Make the projection tell them how much to invest" → no; the projection is a **neutral calculator** with
  user-set assumptions — recommending a contribution is advice, and we're execution-only.
- "Add a top-movers / most-bought leaderboard" → still no; a *neutral* movers view as market-context is fine,
  a hype/social/copy leaderboard is not.
- "Wire real live prices everywhere / add a proxy for stock data" → only within `ADR-006`: crypto + FX keyless
  over the seed, equities flagged; **no backend/proxy**, funds stay mock, the seed is always the fallback.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not adding margin or options — they're
appropriateness-gated, high-risk, and off-brand for a calm retail broker. The in-scope set (cash equities,
funds/ETFs, spot crypto) already exercises the full order spine and FX, and keeps us execution-only, which is
what this demo is for." A good no protects the product and teaches the team the domain.
