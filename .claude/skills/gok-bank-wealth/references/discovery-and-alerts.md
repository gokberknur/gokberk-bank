# Sub-area playbook — Discovery & alerts (V11, V13)

The deep, narrow guidance for the **find-an-instrument surface** and the **price-alert engine** — the two
outward-facing "how do I find and watch something" slices. They share one signature guardrail that governs
every decision in both: **discovery informs, it never hypes.** This is the calm, execution-only reading of a
TradingView screener + Revolut price alerts, stripped of the engagement machinery — no "top picks", no "most
bought", no "hot", no leaderboard, no nudge-to-trade. Everything here is factual data and neutral routing; the
moment a surface starts ranking-as-endorsement or urging a trade, it has failed. (This is a *different* slice
from the existing `discovery.md`, which owns watchlists + funds/dividends — V05/V06. Don't conflate them.)

Specs (read the relevant one first): `.planning/features/invest/V13-discovery-search.md`,
`V11-price-alerts.md`. Bound by the CPO reshaping in `V08-15-trading-depth-overview.md`: global search + neutral
lists ship, **movers only as calm market-context**; alerts fire through **`F13`**, restraint DoD. For the
no-hype brand rule see `references/scope-discipline.md`; for the bar, `references/definition-of-done.md`.
Apply them — don't restate.

## Contents

1. The signature guardrail — inform, never hype
2. Global search (V13) — reuse F10 + F14, don't build a palette
3. Neutral curated lists — categories, never "top picks"
4. The calm movers view — a magnitude sort, not an engagement signal
5. The seed-universe expansion dependency
6. Price alerts (V11) — fire through F13, one taxonomy
7. Restraint copy + friction matched to stakes
8. The threshold guard + minor-unit crossing · Edge cases · Sub-area DoD

## 1. The signature guardrail — inform, never hype

Every hard call in this slice resolves the same way: **does this inform, or does it hype?** A category label
("Technology", "Europe", "ETFs") informs; a "Best ETFs" ranking hypes. A factual sort of today's biggest moves
informs; "🔥 Trending / Most bought / 12k others bought this" hypes. A crossing alert that states a fact
informs; "Don't miss it — buy now" hypes. We are execution-only: discovery routes the user to a page or a
ticket and gets out of the way. If a proposed element ranks-as-endorsement, counts social proof, or urges a
trade, it's out — this is eToro's lane, not ours.

## 2. Global search (V13) — reuse F10 + F14, don't build a palette

Search has two entry points and **V13 builds neither primitive**. App-wide, the **`F14` command palette**
already indexes instruments; V13 registers the expanded universe + a **"Buy <symbol>" / "View <symbol>"** verb
into that existing registry, so Cmd/Ctrl-K finds any instrument. On `/invest/discover`, the page search field
reuses the **`F10` combobox** — the same free-text-filter pattern as `V05`'s AddInstruments — matching symbol +
name **case/diacritic-insensitively and deduped**, full WAI-ARIA combobox keyboard nav (active-descendant,
focus held in the box, result count announced). Committing routes to `/invest/instrument/[symbol]`; each row
carries a trailing **Buy** affordance handing off to `V03`. Do not build a second palette or a bespoke search
index.

## 3. Neutral curated lists — categories, never "top picks"

A rail of **factual groupings derived from instrument metadata** — by **sector**, **region**, **asset-class**,
and named **themes** (a theme is a saved neutral query over metadata, e.g. "Global equity ETFs",
"Semiconductors" — a *category label*, never a ranked pick-list). Switched via `gok-tabs`/`gok-segmented` (the
active tab carries the one accent). Each list is a sortable `gok-table`: symbol · name · last price · day change
(rule+sign+arrow+text) · sparkline (with a **text equivalent** so meaning isn't chart-only); row-activate →
`V02`, trailing Buy → `V03`. Lists are **derived at render** from seed metadata — never stored "top" tables.
The differentiator over Avanza's lists is exactly the neutrality: these are filters, not somebody's
recommendation.

## 4. The calm movers view — a magnitude sort, not an engagement signal

Movers is the guardrail's sharpest test. It ships as **market-context only**: today's biggest gainers and
losers as two short accessible grids, ranked by **absolute day-change magnitude** — a factual sort of a derived
number (`lastPriceMinor` vs `priorCloseMinor`), **not** an engagement signal. Columns: symbol · name · last ·
change % (rule+sign+arrow+text). **No "trending", no counts of "others buying", no "hot", no copy signals of
any kind.** The distinction that keeps it honest: we sort by |Δ| because that *is* the biggest move — we do not
sort by what's being bought, viewed, or hyped, because that would import the social-leaderboard the scope
discipline forbids. Crypto/FX may overlay **live** figures via `V14` (labelled indicative/delayed) with a
silent seed fallback; market-closed shows moves at last close with a neutral note.

## 5. The seed-universe expansion dependency

Discovery only earns its place against a **broader universe** than today's ~13 instruments — **search, lists,
and movers over a demo-sized list are theatre.** The target is **~60–80 names** spanning more sectors, regions,
and asset-classes (funds included) so groupings and movers have real breadth. **V13 does not build the
universe** — that's an `F03` seed job; V13 consumes whatever it seeds and derives everything (lists, movers)
from that metadata. Flag this dependency early: the value of the whole slice scales with the seed, and shipping
discovery against 13 names undersells it.

## 6. Price alerts (V11) — fire through F13, one taxonomy

A threshold alert tells the user when a price crosses a level they set — **and nothing more.** The whole
feature routes through one discipline: **it fires through `F13`, never a parallel stack.** The user arms an
**above/below** threshold (`F07` money input, stored integer **minor units**) on an instrument, **one-shot or
repeating**; the alert engine watches quotes (the `F03` seed series, or a live crypto crossing when `V14` is
enabled) and on a crossing calls `F13`'s `notify()` under the **existing market-alerts taxonomy** → a polite
toast + a bell-drawer entry + an activity-feed line (landing on `/activity`, `X02`). One-shot flips to **fired**
(muted); repeating re-arms after the price crosses back. It does **not** grow a second notifications stack, a
second store, or a second taxonomy — reuse F13's contract end to end.

## 7. Restraint copy + friction matched to stakes

The fired line is **neutral fact** — "AAPL is above €190.00" + a "View instrument" link — carrying **zero**
urgency, "don't miss", "buy now", or nudge-to-trade language. An alert reports a crossing; it does not
editorialize and it does not sell. And because arming/muting/deleting an alert is **low-stakes and reversible**,
the friction matches: **create / mute / delete are optimistic + `gok-toast` + undo — never a forced-decision
dialog.** (Contrast the order spine, where a value-moving commit *is* forced — here nothing moves money, so a
dialog would be ceremony without stakes.) Status (armed / muted / fired) reads by **rule + icon + text**, never
colour; the create primary + active condition segment are the only accent.

## 8. The threshold guard + minor-unit crossing · Edge cases · Sub-area DoD

**Crossing math:** compare in **integer minor units** against the quote (`>=` for above, `<=` for below) —
**never float-compare**. A **threshold == current-price guard** blocks create until the value moves off the last
price (a note on a **reserved line**, no row shift). The seeded series drives deterministic crossings, so a fire
happens with the **network disabled**; a live Binance crossing fires the *same* path.

**Edge cases:** loading (skeleton + quiet search) · no-search-results (distinct from empty-query) · empty-list
(a category with zero members, distinct from filtered-empty) · movers market-closed (last-close note) · movers
live-unavailable (silent seed fallback + indicative label, never a broken panel) · no-alerts empty · armed /
muted / fired · threshold-equals-price guard · error (retry). Keep every message line reserved.

**Competitive bar:** TradingView screener + Avanza lists for discovery; Revolut/eToro/TradingView for alerts —
beat all of them on calm: neutral categories not "best ETFs", a magnitude sort not a hype leaderboard, an alert
that states a fact not a nudge. See `references/competitive-benchmarks.md`.

**Sub-area DoD:**

- [ ] Global search finds any instrument by symbol/name (case/diacritic-insensitive, deduped) via `F10`, full WAI-ARIA keyboard nav; commit → `V02`, Buy → `V03`.
- [ ] The `F14` palette resolves "Buy/View <symbol>" for the expanded universe — a verb registered, not a new palette.
- [ ] Neutral lists group by sector/region/asset-class/theme as **factual categories** (zero "best"/"top" framing); each a sortable grid → `V02`, Buy → `V03`.
- [ ] Movers shows biggest gainers + losers as **market-context** ranked by |day-change|; movement by rule+sign+arrow+text; `V14` overlay indicative with seed fallback.
- [ ] The seed-expansion dependency is flagged (~60–80 names, `F03`'s call); discovery derives lists/movers from that metadata, never stored "top" tables.
- [ ] Alerts: Above/Below with `F07` threshold (minor units), one-shot/repeating; **optimistic + toast + undo, no dialog**; per-row mute + delete same.
- [ ] A seeded crossing fires **exactly once** via `F13` (market-alerts taxonomy) — polite toast + drawer + feed — neutral copy linking to the instrument; a live crypto crossing fires the same path; network-off seed path still fires.
- [ ] **Zero hype** — no "hot"/"trending"/"recommended"/"best"/"most-bought", no urgency/nudge in a fired line; status by rule+icon+text; crossings minor-unit, never float.
- [ ] Discovery never places an order; `columns`/`rows` as properties; no `bind:`; no live call blocks first paint; axe clean on the combobox, list, movers grids, and alerts drawer.
