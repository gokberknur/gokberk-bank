# Caching & degradation — the seed-fallback contract

This is the heart of the layer: **one seam, seed underneath, live on top, degradation invisible.** Get this
right and a dead API never shows the user anything worse than today's polished mock.

## The result envelope

Every `adapter.ts` call returns the value **plus its provenance**, so consumers can label honestly:

```ts
type Sourced<T> = { value: T; source: 'live' | 'cached' | 'seed'; asOf: string /* ISO date from the data */ }
```

- `live` / `cached` → show the **"indicative / delayed"** affordance.
- `seed` → the deterministic baseline; no live label (it never claimed to be live).

## The call flow (every quote/candles/fxRate)

```
1. key = `${kind}:${symbol}:${range}`
2. cache hit & fresh (<15 min)?           → return { source:'cached' }
3. flag off for this asset class?          → return seed { source:'seed' }
4. fetch provider with AbortController + ~3–4s timeout
     ok   → normalize to the seed's shape → cache → return { source:'live' }
     fail (throw / non-2xx / 429 / timeout) → return seed { source:'seed' }   // silently
```

Failure is **never** surfaced as an error state — it degrades to seed. The only "error" a user sees is the
seed, which is the same quality as today.

## The 15-minute cache (`cache.ts`)

An in-memory `Map<string, { value, expires }>` (module-scoped; no persistence needed — a reload re-seeds).
TTL = 15 min for quotes/candles; FX can be longer (EOD data). This is what keeps 800/day (Twelve Data) and
CoinGecko's 30/min within budget. **Never** bypass the cache in a loop over a list.

## Never block first paint

Consumers render the **seed synchronously**, then hydrate:

```svelte
let quote = $state(seedQuote(symbol));          // instant, from the seed
$effect(() => { adapter.quote(symbol).then(q => { quote = q; }); });   // swaps in live when it arrives
```

No `await` on a network call in a `+page.ts`/`load`. The chart, the price, the portfolio all show *something
correct* on frame one, and get *sharper* when live data lands. (Author this `.svelte`/`.svelte.ts` through the
Svelte MCP — async-around-runes has sharp edges.)

## WebSocket lifecycle (Binance, visible crypto only)

Open on mount of the on-screen crypto asset, close on unmount; reconnect with exponential backoff; on repeated
failure, stop and rely on cache/seed. One socket, one visible asset — never a socket per watchlist row.

## Testing (Vitest — the seed path is load-bearing)

- **Network-disabled → green.** Mock all providers to throw; every surface still renders seed values; no
  unhandled rejection; no error state shown.
- **Cache TTL.** Two calls inside 15 min → one provider hit; after expiry → a second hit.
- **Degradation.** 429 / timeout / malformed JSON each → seed fallback, `source:'seed'`, no throw upward.
- **Label correctness.** The "indicative / delayed" affordance appears **iff** `source !== 'seed'`.
- **Shape parity.** A `live` result and the `seed` result are the **same type** (minor units, `Candle`,
  scaled-int FX) — a consumer can't tell them apart structurally.
