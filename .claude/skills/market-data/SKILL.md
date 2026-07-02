---
name: market-data
description: >-
  Market-data integration how-to for the gökberk bank app — the guide for wiring, editing, or
  debugging ANY live or delayed market feed the app calls directly from the browser (no backend).
  Use this WHENEVER work touches fetching real prices, quotes, candles/OHLC, FX rates, market
  movers, or crypto tickers from an external API: the crypto price chart going live, a real FX
  rate on a wallet, an instrument quote, a WebSocket price stream, the 15-minute cache, the
  "indicative / delayed" label, a provider's CORS/rate-limit behaviour, or the seed→live fallback
  — anything under `src/lib/market/**` or any surface that shows a live-or-delayed number. Trigger
  it EVEN IF the user just says 'make the crypto prices real', 'add live FX', 'fetch the AAPL
  quote', 'why is the price stale', or 'wire up Binance/CoinGecko/Frankfurter/Twelve Data'. It owns
  HOW the adapter layer is built to honour ADR-006: the deterministic seed stays system-of-record,
  live data overlays it and degrades silently, no backend/proxy is ever added, and every live
  figure is labelled indicative. It composes WITH — never overrides — the Svelte MCP (how `.svelte`
  is written), `gokberk-design` (how it looks), `layerchart-v2` (how charts render), and
  `gok-bank-wealth` (what a number must mean). Do NOT use it to design an investing surface (that's
  `gok-bank-wealth`), to theme or draw a chart (that's `layerchart-v2`), or for the deterministic
  seed itself (that's the F03 mock-data layer).
---

# Market data — live feeds in gökberk bank

The app is a **static SPA with no backend** (ADR-003). **ADR-006** opened a *narrow* door to real market
data: a **bounded live-data enhancement layer** under `src/lib/market/**` where the **deterministic seed
(`src/lib/data/market.ts`) remains the system of record**, and live data merely *overlays* it and **degrades
silently back to it**. This skill is the how-to for building that layer without breaking the app's calm,
its offline demo, or ADR-003.

**Read `ADR-006-live-market-data.md` and the V14 spec before writing any adapter.** The rules below are not
suggestions — they are what keeps a flaky third-party API from ever making the demo look broken.

## This skill sits under the standing authorities — it does not replace them

1. **Svelte MCP governs how the code is written.** Author every `.svelte`/`.svelte.ts` consumer through the
   `svelte:svelte-file-editor` agent — reactive `$state`/`$derived` around async data has sharp edges.
2. **`gokberk-design` governs how it looks and reads** — including the "indicative / delayed" label's tone.
3. **`layerchart-v2` owns chart rendering/theming.** This skill delivers *data* in the seed's shape; the
   chart wrapper renders it. Never theme a chart here.
4. **`gok-bank-wealth` owns what a number must mean** (indicative-price framing, cost/risk disclosure). This
   skill owns *how the number arrives*, not *what it says*.

## The one constraint that decides everything: CORS + no backend

A provider is only usable if it answers **browser** requests with `Access-Control-Allow-Origin` **and** needs
no proxy. Two silent killers: **HTTP-only free tiers** (mixed-content-blocked on our HTTPS origin) and
**API keys in the URL** (visible in devtools — acceptable for a throwaway demo key, never for a secret). Any
provider that needs a proxy (Yahoo, Tiingo, Marketstack) is **out** — a proxy is a backend, and that breaches
ADR-003.

## Provider router — pick by asset class

| Asset class | Provider(s) | Key? | Cadence | Read the reference |
|---|---|---|---|---|
| **Crypto** (committed) | **Binance** (REST + WebSocket) + **CoinGecko** (breadth, movers, logos) | No key | Real-time | `references/crypto-binance-coingecko.md` |
| **FX** (committed) | **Frankfurter** (ECB reference rates) | No key | Daily (EOD) | `references/fx-frankfurter.md` |
| **Equities / ETFs** (experimental, flagged) | **Twelve Data** (on-demand) | Free key (in client) | Delayed/intraday | `references/equities-twelvedata.md` |
| **Mutual funds** | — none free — | — | — | Stays **seeded**; do not promise live funds. |

Cross-cutting: `references/providers-and-cors.md` (the full comparison + the verification gate) and
`references/caching-and-degradation.md` (the seed-fallback contract, the 15-min cache, the label, the tests).

## The golden rules (from ADR-006 — enforce every one)

1. **Seed is source-of-record + fallback.** The app must pass with the network disabled. Live is additive,
   never load-bearing. Every adapter path ends in the seed on error / timeout / 429 / flag-off — **silently**.
2. **Match the seed's shape.** Adapters return exactly what the seed produces — integer **minor units**,
   the `Candle` OHLC type, **scaled-integer** FX — so every consumer (PriceChart, portfolio, crypto) is
   provider-agnostic and unchanged. Normalize at the provider boundary, never leak a provider's JSON upward.
3. **Label the truth.** Any live-or-delayed figure carries the **"indicative / delayed"** affordance the
   wealth MiFID framing wants. Never imply a tradeable real-time quote.
4. **Respect free limits.** A **15-minute** in-memory cache; fetch **on-demand** for the visible symbol only —
   **never poll a whole watchlist**; WebSocket only where it's free (Binance) and only for the on-screen asset.
5. **Never block first paint.** Render the seed immediately; let live data hydrate over it. No `await` on a
   network call in a load path.
6. **No backend, no proxy, no secrets.** Keyless providers preferred; the one keyed provider (Twelve Data)
   uses a throwaway free key, documented as client-visible, behind a feature flag.
7. **Verify before you enable equities.** Run the 30-second in-browser `fetch()` CORS + candle test
   (`references/equities-twelvedata.md`) from the deployed origin before flipping the equities flag on.
   Crypto + FX are already confirmed browser-direct.

## The module shape (spec: V14)

```
src/lib/market/
├── types.ts        shared shapes — mirror the seed (minor units, Candle, scaled-int FX)
├── adapter.ts      the public API: quote() / candles() / fxRate() — unify + fallback + label
├── cache.ts        15-min in-memory TTL cache (keyed by symbol+range)
├── flags.ts        feature flags (equities on/off, live master switch)
└── providers/
    ├── binance.ts      crypto REST + WS (no key)
    ├── coingecko.ts    crypto breadth / movers (demo key header)
    ├── frankfurter.ts  FX (no key)
    └── twelvedata.ts   equities on-demand (keyed, flagged)
```

Consumers import only `adapter.ts`. If every provider fails, `adapter.ts` returns the seed value and marks it
non-indicative (it *is* the seed). This is the whole game: **one seam, seed underneath, live on top,
degradation invisible.**
