# Crypto — Binance + CoinGecko (the flagship "looks real" win)

Crypto is the **highest-realism-per-effort** surface: real-time, keyless, CORS-clean, WebSocket-capable. Use
**Binance** for price + candles + the live stream, **CoinGecko** for breadth (market cap, logos, movers).
Normalize both to the seed's shapes at the boundary (integer **minor units**, the `Candle` type).

## Binance (no key, `ACAO: *`)

Market-data-only host (no account, no key): **`https://data-api.binance.vision`**.

```
GET /api/v3/ticker/price?symbol=BTCEUR          → { "symbol":"BTCEUR", "price":"57234.10" }
GET /api/v3/ticker/24hr?symbol=BTCEUR           → { lastPrice, priceChangePercent, highPrice, lowPrice, volume, ... }
GET /api/v3/klines?symbol=BTCEUR&interval=1h&limit=500
    → [ [openTime, "open","high","low","close","volume", closeTime, ...], ... ]
```

Intervals: `1m 3m 5m 15m 1h 4h 1d 1w 1M`. Map the app's ranges to `(interval, limit)` (e.g. 1D→`5m`×288,
1M→`4h`, 1Y→`1d`). Prices arrive as **decimal strings** → parse and convert to minor units at the boundary
(scale by the currency's `DECIMALS`, round half-up); never keep the float.

**WebSocket (free, push):** `wss://data-stream.binance.vision/ws/btceur@trade` (trades) or
`btceur@kline_1m` (candle updates). Combined: `wss://.../stream?streams=btceur@trade/etheur@trade`. Open a
socket **only for the on-screen asset**, close on unmount, reconnect with backoff; if the socket drops, fall
back to the last cache / seed — never to a tight REST poll.

**Symbol mapping:** the seed's assets are BTC/ETH/SOL/USDC. `BTCEUR`/`ETHEUR`/`SOLEUR` exist; a EUR pair may
not exist for every asset (e.g. USDC) — keep a `symbol → binancePair` map and **fall back to the seed** when
a pair is missing rather than inventing a cross.

## CoinGecko (demo key, breadth + movers)

Base **`https://api.coingecko.com/api/v3`**; send the demo key as header **`x-cg-demo-api-key: <KEY>`**
(~30/min, 10k/mo). CoinGecko uses **coin ids**, not tickers — keep a `symbol → id` map
(`BTC→bitcoin`, `ETH→ethereum`, `SOL→solana`, `USDC→usd-coin`).

```
GET /simple/price?ids=bitcoin,ethereum&vs_currencies=eur&include_24hr_change=true
GET /coins/markets?vs_currency=eur&ids=bitcoin,ethereum,solana&price_change_percentage=24h
GET /coins/{id}/market_chart?vs_currency=eur&days=30      # for a quick line, not OHLC
```

Use CoinGecko for **market cap, 24h % (movers, feeds V13), logos, and breadth**; use Binance for the
**tradeable price + OHLC candles + live stream**. When both can answer, Binance is the price of record for a
chart; CoinGecko decorates.

## Rules specific to crypto

- Everything still degrades to the seed (`crypto-data.ts` balances + the seeded price walk) on any failure.
- Label live price **"indicative"** — it is a spot market price, not a tradeable quote in this demo.
- Minor-units conversion happens once, at the provider boundary; the rest of the app never sees a float.
