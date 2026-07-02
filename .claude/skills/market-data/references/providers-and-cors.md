# Providers & CORS — the comparison and the verification gate

The full picture behind the router in SKILL.md. The job is a **static SPA with no backend**, so a provider is
usable only if it answers browser requests with CORS **and** needs no proxy.

## Comparison (free tiers, browser-direct focus)

| Provider | Covers | Cadence | History | Free limit | Key | Browser-direct? | Verdict here |
|---|---|---|---|---|---|---|---|
| **Binance** (`data-api.binance.vision`) | Crypto spot | **Real-time** | Full klines | Very generous (weight-based); WS free | **No** | **Yes** (`ACAO: *`) | **Use** — crypto price/candles + WS. |
| **CoinGecko** (demo) | Crypto breadth, market cap, movers, logos | ~1–2 min | Daily/intraday chart | ~30/min, 10k/mo | Demo (header) | **Yes** | **Use** — breadth + movers alongside Binance. |
| **Frankfurter** | FX (ECB, ~30 ccy) | Daily (EOD) | Full ranges | Unlimited | **No** | **Yes** | **Use** — FX + FX history. |
| **Twelve Data** | Stocks/ETFs/FX/crypto, incl. **European** exchanges | RT some / else delayed | Intraday + EOD OHLC | **800/day, 8/min** | Free (in URL) | **Likely — verify** | **Flagged** — equities on-demand, after the gate. |
| **Finnhub** | US RT quotes, FX, crypto, news | Real-time (US) | ⚠ stock candles moved to premium | 60/min | Free | Likely — verify | Secondary; **verify candle access** first. |
| **Alpha Vantage** | Global + indicators | EOD/intraday | Full + 50 indicators | **25/day** | Free | Yes | Too low for a live UI; one-off only. |
| **FMP (Basic)** | US stocks + fundamentals | EOD | EOD | 250/day | Free | Usually | Fundamentals stay seeded here anyway. |
| **Yahoo Finance** | Everything | ~15 min | Full | fragile | crumb+cookie | **No — anti-scrape** | **Out** (needs a proxy). |
| **Tiingo / Marketstack** | Stocks/ETFs | EOD | Yes | low | Free | **No** (Marketstack also HTTP-only) | **Out** (proxy / mixed-content). |
| **IEX Cloud** | — | — | — | — | — | — | **Dead** — shut down Aug 2024. |

## Two silent killers

- **HTTP-only free tier** → mixed-content-blocked on our HTTPS origin (Marketstack). Reject.
- **Key in the URL** → visible in devtools. Fine for a **throwaway demo key** (Twelve Data), never a secret.

## The verification gate (run before enabling equities)

Crypto (Binance/CoinGecko) and FX (Frankfurter) are confirmed browser-direct — no gate. **Equities via Twelve
Data / Finnhub is unverified** (secondary sources disagree on CORS + whether candles are gated to premium). So
before flipping `flags.equities` on, run this **30-second test from the deployed origin's devtools console**:

```js
// CORS + payload smoke test — run on https://bank.gokberk.se (the real origin), not localhost
await fetch('https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=5&apikey=demo')
  .then(r => r.json()).then(d => console.log('twelvedata', d.status, d.values?.length))
  .catch(e => console.error('twelvedata CORS/fetch failed', e));
await fetch('https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&count=5&token=demo')
  .then(r => r.json()).then(d => console.log('finnhub', d.s ?? d.error))
  .catch(e => console.error('finnhub CORS/fetch failed', e));
```

**Pass = JSON candles returned with no CORS error.** If either fails, equities stays **seeded** and the flag
stays off — the app is unchanged (seed is system-of-record). Record the result in the V14 spec's Open
Questions before shipping any live-equities claim. Never let this block crypto/FX, which don't need it.
