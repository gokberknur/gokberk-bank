# FX — Frankfurter (ECB reference rates, no key)

Frankfurter wraps the **ECB reference rates**: keyless, CORS-clean, full history. It is **daily (EOD)** —
perfect for a banking FX line, not for intraday FX trading (which we don't do). Base:
**`https://api.frankfurter.dev/v1`** (mirror: `api.frankfurter.app`).

```
GET /latest?base=EUR&symbols=USD,GBP,SEK          → { base:"EUR", date:"2026-07-01", rates:{ USD:1.08, ... } }
GET /2024-01-15?base=EUR&symbols=USD              # a specific past day
GET /2024-01-01..2024-06-30?base=EUR&symbols=USD  # a time series (for an FX history chart)
```

## Normalize to the seed's FX shape

The seed stores FX as **scaled integers** (`EUR_PER_UNIT_SCALED`, EUR-per-unit ×1e6 — see `src/lib/data/
money.ts` and the V14 contract). Frankfurter returns **EUR-**base** rates** (units-per-EUR), so **invert**:

```
eurPerUnitScaled(symbol) = round( 1 / rates[symbol] * 1_000_000 )
```

Do the inversion + scaling once, at the boundary; downstream code keeps using scaled-integer math (never
float-multiply an amount by a rate — that's the wealth/money-math rule).

## The weekend/holiday gotcha

The ECB publishes on **TARGET business days only** — no weekend/holiday rates. `/latest` returns the **most
recent business day**, and its `date` may be a few days old. Surface that honestly: the FX line is labelled
**"indicative / delayed"** and, where it matters, shows the `date`. Never fabricate a weekend rate; the seed
already models a fixed mid-rate, so degradation is seamless.

## Scope

Use Frankfurter for the **multi-currency wallet conversion line and any FX-history chart**. It does **not**
cover crypto (use Binance/CoinGecko) or a live trading spread. FX margin/fees for a payment remain the
domain of `gok-bank-payments`; this only supplies the **mid-rate**.
