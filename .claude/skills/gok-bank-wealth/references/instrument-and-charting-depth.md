# Sub-area playbook — Instrument & charting depth (V08, V09)

The deep, narrow guidance for the **single-instrument research page** and the **chart panel** inside it —
deepening the `V02` surface from a polished demo into the page a serious investor actually reads before a
trade. Two specs, one surface: `V08` grows the chart from a lone candlestick into a stacked multi-pane read;
`V09` fills in the deferred detail panels (news, fundamentals, depth, dividend history, related). The
discipline here is **depth done honestly** — every line has a table behind it, every live number wears its
label, and *nothing on this page is advice*. This is where a broker either earns "serious" or reads as a toy.

Specs (read the relevant one first): `.planning/features/invest/V08-charting-depth.md`,
`V09-instrument-detail-depth.md`. Neighbours: the chart wraps `F11`/**LayerChart v2** (consult the
`layerchart-v2` skill), live crypto candles ride `V14`/`ADR-006` (consult the `market-data` skill). For the
"indicative" framing see `references/regulatory-and-trust.md`; for the bar, `references/definition-of-done.md`.
Apply them — don't restate them.

## Contents

1. The curated honest indicator subset (V08) — why four, not four hundred
2. Volume pane + the crosshair OHLC readout
3. One rebased comparison overlay + finer timeframes
4. Drawing tools deferred — the refusal, and why
5. Instrument detail depth (V09) — the deferred panels
6. Live vs seed — reconciling V14 + LayerChart v2
7. Every line has a table · Edge cases · Sub-area DoD

## 1. The curated honest indicator subset (V08) — why four, not four hundred

TradingView ships 400+ studies; we ship **four, done well** — moving average (SMA/EMA), RSI, MACD, Bollinger
bands — each an independently toggleable `gok-switch`. The restraint *is* the product decision: a wall of
indicators reads as noise and fights the brand's calm, and most are redundant or superstition. Overlays
(MA, Bollinger) draw on the price pane; **RSI and MACD each open their own sub-pane** sharing the one x-axis
and one synchronized crosshair. Indicator math is **pure and deterministic from the integer-minor-unit OHLCV**
— computed, never seeded separately, so a line can never disagree with the bars under it. Defaults
(SMA/EMA periods, RSI 14 + 30/70, MACD 12/26/9, Bollinger 20/2σ) are an **ask-first** call, but the treatment
is fixed: neutral hairline guides, an ink ramp distinguished by weight/dash + label, **never a rainbow**.

## 2. Volume pane + the crosshair OHLC readout

A hairline **volume sub-pane** docks under price, sharing the x-axis; bar direction (up/down close) is carried
by **shape/fill, not hue** — the same rule the candles obey (up hollow, down filled). The **crosshair readout**
is a *reserved line* above the price pane narrating the bar under the cursor — date · O · H · L · C · volume
(plus the comparison value when overlaid). It is an `aria-live="polite"` region on a fixed line so a hover
never shifts layout, and at rest it holds the **latest bar** rather than collapsing. This readout is how a
screen-reader user reads any bar without a chart — treat it as load-bearing a11y, not decoration.

## 3. One rebased comparison overlay + finer timeframes

Exactly **one** comparison overlay — a benchmark index or a second instrument — added via `gok-select` (or the
`F10` combobox for the wider universe). Both series **rebase to a common start** (indexed to 100 / 0 %): plotting
a €190 stock against a 4,800-point index is meaningless, so the rebase is non-negotiable, and where histories
differ you rebase from the **later** common start and note the clipped origin. Timeframes extend to
**1D (intraday) · 1W · 1M · 3M · 6M · YTD · 1Y · 5Y · Max**. The accent is spent **only** on the active
segment — never on the "winning" line of the comparison, never on a gain. Rebase math uses a scaled-integer
ratio, never a float multiply.

## 4. Drawing tools deferred — the refusal, and why

**No freehand drawing tools** — trendlines, shapes, annotations, a drawing toolbar. This is a deliberate
deferral, not an oversight: drawing tools are the sprawl that turns a calm read into a cluttered workbench,
they invite the user to editorialize a chart into a "signal" (which drifts toward implied advice), and they
carry disproportionate build + a11y cost for a demo. Say so plainly if asked. The curated subset in §1 already
covers what a retail investor reaches for; the ceiling is TradingView **curated + honest**, not TradingView
maximal.

## 5. Instrument detail depth (V09) — the deferred panels

`V02` stood up the header, chart, key-stats ledger, about blurb, and the sticky Buy/Sell CTA; V09 adds the
research panels it deferred — **all seeded, all factual**, hung off an Overview/Fundamentals `gok-tabs` sub-nav
(URL `?tab=…`, deep-linkable, back-button clean, CTA sticky across tabs):

- **News / research strip** — headline · source · relative timestamp, newest first, each a **link stub** to a
  mock target. Never a real feed; never editorialized around a rising price.
- **Fundamentals tab, branched by instrument type** — **stock** → revenue, EPS, sector peers + the dividend
  history; **ETF** → holdings, ongoing charge/TER, tracked index; **crypto** → an honest
  "fundamentals don't apply to this asset" panel, never fabricated equity stats. An N/A field reads a labelled
  "Not applicable", not a bare dash and never a fake zero.
- **Simulated depth-ladder** — a two-sided bid/ask `gok-table` (mid in the middle) extending `V02`'s builder,
  **explicitly labelled "Simulated depth — not a live order book."** Market-closed swaps to last close + a
  neutral note, never a live-looking book.
- **Dividend-history table** — ex/pay date · amount · yield-on-cost (when held), **reusing the `V06` dataset**
  joined to the cost basis; a running total received; a non-payer shows a quiet "has not paid a dividend."
- **Related / similar strip** — peers by sector (stocks) / asset class (ETFs) / other crypto, each linking to
  its own `[symbol]` page.

**The hard line: zero advice.** No analyst ratings, no "buy rating", no "top pick", no price targets, no
"recommended". We're execution-only — the page presents factual data and routes to the ticket; it never tells
the user what to think. A "follow/alert" affordance rides `V11` via `F13`, not a new stack here.

## 6. Live vs seed — reconciling V14 + LayerChart v2

The **deterministic seed is system-of-record** (`ADR-006`). Crypto price/candles may render **live** via `V14`
(Binance klines/WS) with the seed as silent fallback; equities candles stay **seeded** (Twelve Data flagged);
fundamentals, news, depth, and dividend history are **always seeded**. Every live-or-delayed figure wears the
**"indicative / delayed"** tag; a fetch/timeout/rate-limit degrades to seed with **no alert**, the label just
reflecting the source. The app must be green with the network off — verify that path, not just the live one.
Charting is a LayerChart v2 composition themed **only** through the `--gok-*` bridge; whether the multi-pane
crosshair + candlestick is mature enough to replace the incumbent Lightweight wrapper for this dense view is an
open reconciliation with the `layerchart-v2` skill — the panel must not regress candle fidelity or crosshair
sync.

## 7. Every line has a table · Edge cases · Sub-area DoD

**The fallback rule (non-negotiable):** every indicator, the volume series, and the comparison overlay carry a
**non-visual `gok-table` data-table fallback** ("View data" `gok-disclosure`); depth + dividend history are
**real accessible `<table>`s**. A chart is never the only access to a number. Direction is **shape/sign/label,
never hue** — candles hollow/filled, volume by shape, deltas by ▲/▼ + explicit sign.

**Edge cases:** loading (skeleton sized to *each* pane, never a spinner on blank) · empty timeframe (5Y on a
young asset → compact empty inside the pane) · indicator insufficient-window (SMA-200 on 1M → switch stays on,
inline "insufficient data" note, table "—", never a wrong line) · comparison shorter-history (rebase from the
later start) · live-degraded (silent seed fallback) · market-closed (last close + neutral note) · per-panel
error isolated so the rest of the page stays usable · unknown symbol inherits `V02`'s not-found.

**Competitive bar:** TradingView for the chart (curated + honest, not maximal); Avanza/eToro for the overview
depth (chart + stats + news + about in one scroll) **minus the social feed and minus all advice**. See
`references/competitive-benchmarks.md`.

**Sub-area DoD:**

- [ ] All timeframes (incl. intraday 1D) re-render the series; volume pane docks under price, direction shape-encoded.
- [ ] Crosshair readout reports date · O/H/L/C · volume on a reserved `aria-live` line; holds the latest bar at rest.
- [ ] SMA/EMA + Bollinger overlay price; RSI + MACD open own panes; each toggles independently, matches its table fallback; insufficient windows show "—".
- [ ] One comparison overlay renders **rebased** to a common start, with a table; the accent never lands on the winner.
- [ ] No drawing tools shipped; direction never colour-alone; indicator/rebase math integer-safe, no float drift.
- [ ] Overview/Fundamentals `gok-tabs` deep-link via `?tab=…`; CTA sticky; Fundamentals branches stock/ETF/crypto with an honest N/A — **zero ratings/recommendations/price targets**.
- [ ] News strip factual (headline · source · timestamp, stub links); depth labelled "simulated"; dividend history reuses `V06` (yield-on-cost correct, "—" un-held, non-payer empty).
- [ ] Crypto renders live via `V14` with a seed fallback; every live figure labelled "indicative / delayed"; the app is green with the network disabled.
- [ ] `columns`/`rows` set as DOM properties; no `bind:`; charts theme via `--gok-*` only; axe clean on both tables, the strips, the tab panels, and every chart fallback.
