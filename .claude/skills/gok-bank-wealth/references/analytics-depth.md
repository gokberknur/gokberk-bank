# Sub-area playbook — Portfolio analytics depth (V12, with V15)

The deep, narrow guidance for the **analytics layer** that sits on top of the `V01` portfolio — "how did I
actually do, and what could a plan look like" at **Nordnet/Avanza depth**, kept calm and execution-only. Five
additions layer onto the shipped `V01` summary/grid/allocation/performance chart: a **realized vs unrealized
P/L split**, **time-weighted return** beside the simple return, a **rebased benchmark overlay**, **per-position
contribution**, and a neutral **projection calculator**. Plus a note on **`V15`** — the ISK flat-tax line
surfaces *here*, as a factual seeded line. The whole slice is **display + illustration only**: it explains the
past honestly and lets the user model a future *they* parameterise — it never advises, never optimises tax,
never says "recommended".

Specs (read the relevant one first): `.planning/features/invest/V12-portfolio-analytics-depth.md`,
`V15-isk-account-wrapper.md`. Bound by the CPO reshaping in `V08-15-trading-depth-overview.md`: **no tax-lot
engine**, projection stays a **neutral calculator, never a "recommended contribution"**; V15 is a **thin label
+ flat-tax line only**. Extends the `V01` mechanics in `references/portfolio-and-performance.md`. For the bar,
`references/definition-of-done.md`. Apply them — don't restate.

## Contents

1. Realized vs unrealized split — display-only, state the basis
2. TWR beside the simple return — why both
3. Rebased benchmark — both lines to 100
4. Per-position contribution
5. The projection is a calculator, not advice
6. V15 — the ISK flat-tax line, a factual seeded line
7. Money math · Edge cases · Sub-area DoD

## 1. Realized vs unrealized split — display-only, state the basis

Two rows plus a total: **Unrealized** (current holdings vs average cost, reusing `V01`'s
`unrealizedPlEurMinor`) and **Realized** (summed from the `F04` `orders` store's **executed sells**, `V04`).
The rule that keeps this in scope: it is **display-only, and it states its cost-basis method as a factual
note** ("Cost basis: average cost"). **No lot reconstruction, no tax-lot optimisation engine** — realized P/L
is read off seeded executed sells, never re-derived from reconstructed lots to minimise a tax bill. Whether the
seed labels the basis average-cost or FIFO is ask-first, but it is display-only either way and the label just
states which. Never fabricate a realized figure that isn't backed by an executed sell in `F04`. Both rows read
by **sign + word + icon**, never colour alone; a "view statement" link **stubs** to the `gok-bank-servicing`
vault (`D01`) — we don't generate the document here.

## 2. TWR beside the simple return — why both

The `V01` simple total-return figure gains a sibling **time-weighted return**, with a `gok-tooltip`
("Time-weighted — removes the effect of when you added money"). The *why* matters and belongs in the copy: a
simple return is flattered by well-timed deposits; TWR strips the timing of contributions so "good" is
honestly comparable. TWR is derived from `performanceSeries(range)` by **geometrically chaining per-session
returns**, split at any seeded contribution marker so a deposit never counts as gain; with no flows it reduces
to the series' cumulative return. Both figures are signed; **neither is coloured green** — the accent is never
spent on a positive number.

## 3. Rebased benchmark — both lines to 100

The `V01` performance chart gains a "Compare to index" `gok-switch`; on, it draws the portfolio and a
**seeded benchmark index both rebased to 100** at the range start (each point ÷ start × 100). Plotting an
absolute portfolio value against an index *level* is meaningless — the rebase is the honesty. Changing the
`V01` range **re-rebases both** at the new start. The rebasing is a **display transform, not stored**; the
legend is **text + rebased value, never colour-only**. Which seeded index ships (a broad European
total-return series vs a global one), and whether it ever pulls a live index via `V14`, is ask-first — if the
seed is missing or the live index degrades, the switch **disables gracefully** with a neutral "Benchmark
unavailable" note and the portfolio line still draws.

## 4. Per-position contribution

A compact ranked list (or `gok-table`) of each holding's **contribution to total return** — `unrealizedPl ÷
totalCost` in **bps**, summing to the portfolio's unrealized return — sorted by magnitude so the top drivers
and drags read at a glance, each row by **sign + icon**, row → `/invest/instrument/[symbol]`. This is
attribution, not advice: it explains *where* the return came from; it never says which to buy or sell more of.
A single-position portfolio shows one row at 100%.

## 5. The projection is a calculator, not advice

This is the hardest line in the slice to hold, and the CPO bound it explicitly. The projection is a
**neutral what-if calculator**, clearly headed **"Illustration"**: a monthly-contribution slider (mirrored by
an `F07` money input), a **user-editable expected annual return** (its default disclosed *as an assumption*),
and a horizon segmented (5/10/20 yr). Output — projected value, total contributed, projected growth — each
labelled **illustrative**, computed as a pure function (monthly compounding, rounded to EUR minor for display,
returning the start value for zero/zero inputs). A **fixed caveat line** is mandatory: "Assumptions you set —
not advice. Past performance doesn't predict future returns." It **never** says "recommended contribution",
"you should invest", or "target" — it reflects the user's own numbers back. The distinction that keeps us
execution-only: the *user* sets every assumption; we only do the arithmetic. The projection region is announced
as an illustration on a polite live region ("Illustrative projected value: €X").

## 6. V15 — the ISK flat-tax line, a factual seeded line

The Swedish **investeringssparkonto (ISK)** surfaces here as a **thin representation, not a calculator** — the
last-priority stretch item, reshaped to a label + a line + an explainer. In this analytics section it is a
**factual seeded line**: the schablonskatt **rate** (e.g. 1.086%), the **basis in words** ("a flat yearly tax
on the account value"), and the **rate year** ("2026 rate") — rendered from a scaled-integer bps value via
`F07`, present only for an ISK account, **absent** for a standard securities account. The hard rule: **no tax
engine** — never multiply the live portfolio value by the rate at runtime; that would be the tax calculation we
explicitly don't build. The account-type field is **owned by `gok-bank-accounts`** (`A01`/`A03` shape,
coordinated so the label and any accounts surface read one source); V15 only represents it. The "what is an
ISK?" explainer states the benefit **and** the trade-off (taxed even in a down year, even if you never sell) at
**equal weight** — the same cover-vs-exclusions discipline the insurance specs (`N01`) use — and a
"view tax summary" link **stubs** to the servicing vault. No accent is spent on the label; no "tax-efficient!"
selling.

## 7. Money math · Edge cases · Sub-area DoD

**Money math:** everything is integer **EUR minor units**; realized/unrealized P/L and cost basis are **never
float-multiplied** (average cost stays in minor units, FX via the scaled-integer rate); returns are **basis
points**; the rebase uses a display-only ratio; the projection compounds monthly and rounds to minor for
display only. Reuse `portfolio.ts`'s existing derivations (`getPositions`/summary/`performanceSeries`/
`dayChangeBps`) — add `realizedPlEurMinor`, `twrBps`, `benchmarkSeries`, `positionContributions` **beside**
them; never duplicate the grid math.

**Edge cases:** no history (realized €0; TWR/benchmark/contribution collapse to an empty state; the projection
still works from €0) · single position (one contribution row at 100%) · benchmark unavailable (switch disabled,
neutral note, portfolio line still drawn) · projection zero inputs (projected value = start, flat, stated
plainly, no negative framing) · loading (skeleton mirrors each card) · stale/indicative prices (inherit `V01`'s
caption). Every chart — performance + benchmark, contribution — carries a **visually-hidden data-table
fallback** (rebased values included); nothing is chart-only.

**Competitive bar:** Nordnet/Avanza for the analytics depth (realized/unrealized, TWR, benchmark,
attribution). Beat them on calm and honesty: TWR *beside* the simple number with the why in a tooltip, both
lines rebased, a projection that is unmistakably the user's illustration and never a recommendation, an ISK
line that is a fact not a sales pitch. See `references/competitive-benchmarks.md`.

**Sub-area DoD:**

- [ ] P/L split shows unrealized (holdings vs avg cost) + realized (executed sells) summing to total, each by sign + icon, with the "cost basis: average cost" note; **no tax-lot engine**.
- [ ] TWR renders beside the simple return with a tooltip; derived from the seeded performance series; equals the cumulative return with no flows.
- [ ] The performance chart overlays a **seeded benchmark rebased to 100** alongside the portfolio; the range re-rebases both; the switch disables gracefully when the benchmark is unavailable.
- [ ] Per-position contribution ranks holdings by share of total return (sign + icon), summing to the portfolio return; a row opens the instrument.
- [ ] The projection is a **calculator** from user-set assumptions with the "not advice / past performance" caveat; zero inputs return the start value; **zero "recommended"/"should"/"target" copy**.
- [ ] V15: an ISK account shows the account-type label + a **factual flat-tax line** (rate + basis + year from seed, no `value × rate` at runtime); a standard account shows no line; the explainer states benefit + trade-off at equal weight; account-type coordinated with `gok-bank-accounts`.
- [ ] Empty (no history), single-position, and benchmark-unavailable states render; every chart has a data-table fallback; the projection is announced as illustrative.
- [ ] Money integer-only, no float drift; P/L never colour-alone; the accent never lands on a gain or the projected value; `columns`/`rows` as properties; no `bind:`; axe clean on all cards + charts.
