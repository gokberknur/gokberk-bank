# Sub-area playbook — Portfolio & performance (V01)

The deep, narrow guidance for the **investing home**: the holdings grid, the allocation chart, the
performance chart with ranges + benchmark, and the total-value / total-return / P&L summary. This is the
heaviest read-only data surface in the app and the entry to every other invest screen.

Spec: `.planning/features/invest/V01-portfolio.md` (the scope authority — read it first). This playbook adds
the domain mechanics the spec assumes you already know. For the framing behind a rule here (MiFID ex-ante,
"indicative"), see `references/regulatory-and-trust.md`; for the quality bar, `references/definition-of-done.md`.
Don't restate those — apply them.

## The dominant job, and what it demands

The job is **"tell me what I own and how it's doing — honestly."** Calm and exact beats busy and hyped.
Everything below serves one rule: a number on this screen is either *correct and disclosed* or it isn't on
the screen. No guessed live prices, no pre-rounded totals, no gain dressed up in green.

## Holdings grid — the dense numeric core

Model it as Nordnet-grade depth rendered in gökberk's calm. `gok-table`, `columns`/`rows` as DOM
**properties** (objects can't survive attribute stringification), sortable `role="grid"`.

- **Column set (the must-haves):** symbol · name · last price (instrument ccy) · day change (% and absolute,
  by sign+rule+icon) · market value (home ccy) · unrealised P&L (home ccy, by sign+rule+icon) · weight % ·
  a recent-price sparkline. Numeric columns `numeric: true` → right-aligned, tabular figures.
- **Sort is the primary interaction.** Every numeric column sorts; the active sort is *announced* (aria), not
  just visually marked. Default sort by market value descending (biggest position first) — that's what an
  investor scans for.
- **Row click → `/invest/instrument/[symbol]`.** The grid is also navigation; keep the whole row a target,
  keyboard-reachable, focus returned correctly.
- **Sparkline-cell gap (live dogfooding finding).** The published `gok-table` `column.format` returns a
  display *string*, so a true inline chart isn't a first-class cell renderer. Decide explicitly per the
  V01/V05 open question: a thin app-local sparkline column augmenting the rendered grid, a Unicode/SVG trend
  glyph, or log the gap — but never block the grid on it, and always pair the sparkline with a **text
  equivalent** (the day-change value) so meaning isn't chart-only.

## The math — derive, never store pre-rounded

Every figure is derived at render time from integer **minor units** and scaled-integer FX rates. Float-
multiplying a price by a quantity or an FX rate is the bug that loses a cent and the user's trust.

- **Market value** = `quantity × last_price`, in instrument ccy, then converted to home ccy via the disclosed
  scaled-integer FX rate. Fractional quantity is a fixed-precision integer of shares — never a JS float.
- **Day change** is measured against the instrument's **prior close**, not against your cost basis. Absolute
  and % both shown; both carry sign+icon.
- **Unrealised P&L** = `market value − cost basis` (cost basis = average cost × quantity). This is *unrealised*
  — distinct from realised P/L booked on a Sell (which the order ticket estimates). Don't conflate the two.
- **Weights sum to 100%.** Compute weights from home-ccy market values, and make the displayed weights add up
  — a rounding residual that makes them sum to 99.9% reads as a bug. Allocate the residual deterministically.
- **Totals** (total value, today's move, all-time return) are sums of the derived rows, not separately stored
  numbers that can drift from the grid beneath them.

## Multi-currency — instrument ccy vs reporting ccy

A pan-European portfolio holds USD/EUR/GBP instruments. The summary and the home-ccy columns convert through a
**disclosed** FX rate; the instrument's own price stays in its native ccy with a currency badge. Never silently
convert — the expat investor's whole anxiety is "is the home-currency number honest?" The reporting currency
(home EUR wallet vs a user-selectable reporting ccy) is an **ask-first** decision; default to the home wallet.

## Allocation — donut / treemap

By asset class by default (a treemap alternative behind a `gok-segmented` view toggle, by instrument). Each
slice labels its **weight**; the legend is **text + value**, never colour-only — a colour-blind user must read
the split from labels alone. Weights here are the same weights as the grid; don't recompute a second way.

## Performance chart — ranges + benchmark

- **Ranges** 1D / 1W / 1M / 1Y / Max as a `role="radiogroup"` segmented switch; switching swaps the series, not
  the page. Reserve the chart footprint so a range change or load doesn't shift layout.
- **Benchmark overlay** (a broad index) toggles on/off. To compare a portfolio against an index honestly,
  **rebase both to a common start** (index to 100, or both to % return from the range start) — plotting an
  absolute portfolio value against an index level is meaningless. Tooltip reads **value + return** at the
  hovered point.
- **Return basis.** A portfolio that took deposits/withdrawals needs time-weighted vs money-weighted return to
  be honest; for the demo, state the basis you use plainly rather than implying a precision you don't model.
- **Non-visual fallback is mandatory.** Every chart ships a visually-hidden data table of the same series — the
  data is never chart-only (a hard DoD + axe gate).

## Direction is never colour alone

P/L, day-change, and any delta read by **sign + rule + icon**: a leading ▲/▼, an explicit `+`/`−`, and the
`--gok-color-status-*` role applied to *the number only*. The one earned accent is spent on the primary "Place
order" button and the selected range segment — **never on a gain**. No confetti on a green day. (Visual
treatment is `gokberk-design`'s call; you own that direction must survive greyscale.)

## Edge cases this surface must handle

- **Empty** (no holdings) → `gok-empty-state` orienting to funds/first buy, not a dead screen.
- **Market closed** → show last close with a neutral "as of HH:MM / last close" caption; never fake a live tick.
- **Stale price** → a muted "as of" caption; don't present a stale quote as current.
- **Error** (data/chart fetch) → `gok-alert` + retry with the shell preserved, not a blank page.
- **Fractional & zero/short positions** → fractional renders at its true precision; a fully-sold position drops
  off; don't render a phantom row.

## Competitive bar (calibrate against these)

Match **Nordnet/Avanza** on grid depth (dense, sortable, tabular, per-row day-change + P&L) and **Trade
Republic** on the calm "balance + cash + portfolio movement" summary glance. Beat all of them on cost/return
honesty: rebased benchmark, weights that sum, FX disclosed, direction by rule. If the portfolio feels shallower
than Nordnet *or* noisier than Trade Republic, it's wrong. See `references/competitive-benchmarks.md`.

## Sub-area definition of done

- [ ] Total value, today's move, all-time P&L render in the home ccy, each by sign + icon + rule.
- [ ] Holdings grid sorts every numeric column with an *announced* sort; rows show last price, day change,
      market value, unrealised P&L, weight, sparkline; row click → instrument detail.
- [ ] All figures derived from integer minor units + scaled-integer FX; weights sum to 100%; no pre-rounded
      stored totals; fractional quantity exact.
- [ ] Performance chart switches ranges and overlays a **rebased** benchmark; tooltip shows value + return;
      a non-visual data-table fallback exists.
- [ ] Allocation donut/treemap labels weights with a text+value legend (not colour-only).
- [ ] Empty, market-closed, stale-price, loading (skeleton mirroring layout), and error states all present.
- [ ] Direction by sign+rule+icon throughout; the accent never lands on a gain; axe clean on grid + charts.
