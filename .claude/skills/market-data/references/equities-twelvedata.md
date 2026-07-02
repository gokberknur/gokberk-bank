# Equities / ETFs — Twelve Data (experimental, flagged, on-demand)

Equities is the **hard** asset class: no keyless browser-direct option, tight free limits, and CORS that
secondary sources disagree on. So equities-live is **experimental, gated behind a feature flag and the
verification gate** (`providers-and-cors.md`). Until the gate passes, **equities stays seeded** and the app
is unchanged — that is the correct, shippable default.

**Twelve Data** is the best free option because it actually covers **European exchanges** and offers
intraday OHLC, browser-callable. Base **`https://api.twelvedata.com`**. Limits: **800 calls/day, 8/min**.
The key rides in the URL (client-visible → **throwaway free key only**).

```
GET /quote?symbol=AAPL&apikey=KEY                         → { close, change, percent_change, ... }
GET /price?symbol=AAPL&apikey=KEY                          → { price }
GET /time_series?symbol=AAPL&interval=1day&outputsize=90&apikey=KEY   → { values:[ {datetime,open,high,low,close,volume}, ... ] }
```

European names need an exchange/MIC hint: `symbol=ASML&exchange=XAMS`, or `AAPL:NASDAQ`. Prices are decimal
strings → convert to **minor units** at the boundary.

## Discipline (because 800/day is tiny)

- **On-demand only.** Fetch when an instrument detail view opens — **never** poll a watchlist or the portfolio.
  A single watchlist refresh could blow the daily budget.
- **Cache hard.** 15-min TTL (`caching-and-degradation.md`); a re-open inside the window hits cache, not the API.
- **One symbol per call** where possible; batch only if the endpoint supports it and the budget allows.
- **Flag-gated.** `flags.equitiesLive` defaults **off**. Flip it on only after the verification gate passes on
  the deployed origin; record the result in the V14 spec.
- **Fall back to seed** on 429 / timeout / CORS error — silently, always.

## Finnhub (secondary) — verify candles first

Finnhub gives real-time **US** quotes + news + a free WebSocket (50 symbols), base
`https://finnhub.io/api/v1`. But its **stock candle endpoint moved to premium** on the free tier — verify
`/stock/candle` actually returns data before depending on it (the gate covers this). Good for a US quote or a
news strip; not a reliable free candle source.

## What stays seeded no matter what

**Mutual fund NAVs / TER / fact sheets** have **no free source** — funds (V06) stay deterministic. Do not
promise live fund data anywhere.
