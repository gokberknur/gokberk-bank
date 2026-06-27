# Sub-area playbook — Discovery (V05, V06)

The deep, narrow guidance for the **research & tracking** surfaces that feed the order ticket: watchlists, the
funds/ETFs explorer, and the dividend calendar/history. Lower-stakes than the order spine (no money moves
here) — so the discipline is different: keep it **light and reversible** where the trade surfaces are heavy and
forced, but be exact on **fee, risk, and yield**, because that's where a passive investor gets fleeced.

Specs (read the relevant one first): `.planning/features/invest/V05-watchlists.md`,
`V06-funds-dividends.md`. For the PRIIPs/UCITS framing behind the risk band + fee caveat, see
`references/regulatory-and-trust.md`; for the bar, `references/definition-of-done.md`. Apply them — don't
restate them.

## Watchlists (V05) — light, reversible tracking

The lightweight counterpart to the portfolio grid: instruments the user tracks but may not own. Routes
`/invest/watchlists` and `/invest/watchlists/[id]`.

- **Multiple named lists** ("Tech", "Dividends") with create / rename / delete, switched via `gok-tabs` or
  `gok-segmented`. The active list tab carries the one accent.
- **Grid columns:** symbol · name · last price · day change (sign+rule+icon) · a sparkline column · optional
  bid/ask · a trailing **remove** action per row. Sortable `role="grid"`, tabular; `columns`/`rows` as DOM
  **properties**, **no `bind:`**. Row click → `/invest/instrument/[symbol]`.
- **Add via the `F10` combobox/multi-select** over the instrument universe; chosen instruments **append, deduped**
  (adding AAPL twice does nothing). Selection via `on('gok-selection-change'/'change', …)`.
- **Remove is low-stakes → no dialog.** This is the key contrast with the order spine: a watchlist remove is
  reversible and cheap, so it's **optimistic + `gok-toast` with undo** ("Removed AAPL · Undo"), never a forced
  confirm. Forcing a dialog on a reversible remove is the anti-pattern — match the friction to the stakes.
- **Sparkline cells need a text equivalent.** Same `gok-table` `column.format`-returns-a-string limitation as
  V01: pair any sparkline with the day-change value as text so meaning isn't chart-only. Reordering within a
  list (drag) is an **ask-first** scope question — sort-only is a fine default.

## Funds/ETFs explorer (V06) — fee & risk, transparently

A filterable `gok-table` of funds with a fact sheet per fund. Route `/invest/funds`. The job is **"help me pick
a fund without getting fleeced on fees"** — so fee and risk are first-class, shown plainly, never ranked as
"best".

- **Filter facets:** asset class · region · **risk band** · **max ongoing charge** (via `gok-segmented` /
  `gok-select` / `F10`). The max-ongoing-charge filter is the differentiator — it lets a cost-conscious saver
  cap fees directly.
- **Columns:** name · ticker · asset class · **ongoing charge / TER** (the fee indicator, **with a unit** —
  "0.20%") · **risk band** (1–7 SRRI-style, by **rule+mark+text**, e.g. "Risk 5 of 7", never colour) · 1Y
  return · fund size. Sort + filter; row click → fact sheet.
- **Risk band rendering.** PRIIPs/UCITS funds carry a **Summary Risk Indicator (SRI) 1–7**. Render it as a
  labelled value with a rule/mark, *readable without colour* ("Risk 5 of 7"). Whether you use the full SRRI 1–7
  or a simpler 3-band Low/Medium/High is an **ask-first** model decision — but the rule+mark+text treatment is
  fixed regardless.
- **Fact sheet** (a `gok-drawer` or detail route): objective · top holdings · fee breakdown · risk indicator ·
  a small performance chart (`F11`, with a data-table fallback) · a **Buy CTA → V03**. Carry the plain
  disclosure: **"Fees reduce returns. Past performance doesn't predict future returns."** A "view KID" stub is
  on-brand; a full KID engine is out of scope (`references/scope-discipline.md`).
- **Never rank funds as "best"/"top".** We're execution-only — no advice, no recommendation framing. The
  explorer informs; it doesn't push.

## Dividends (V06) — calendar, history, yield-on-cost

Upcoming and paid dividends, with the yield on the user's cost basis for held instruments. Route
`/invest/dividends`.

- **Calendar / History** toggled by a `gok-segmented` `role="radiogroup"`. **Calendar (Upcoming):** ex-date ·
  pay-date · instrument · amount · declared yield. **History:** date · instrument · amount · **yield-on-cost**
  (when held) + a **running total received**.
- **Yield-on-cost is derived from the cost basis**, integer minor units, no float drift: `annual dividend ÷
  cost basis`. For an **un-held** instrument it's **"—"**, not zero — the distinction matters (zero implies a
  held position paying nothing). The running total is a sum of the derived history rows, not a stored number.

## Multi-currency

A fund or dividend-paying instrument may be priced in a currency other than the home wallet. Convert amounts,
yields, and the running total through a **disclosed scaled-integer FX rate** where fund ccy ≠ home ccy — same
rule as the portfolio. Never float-multiply.

## Edge cases this sub-area must handle

- **Watchlists:** loading (skeleton) · **empty-list** ("This watchlist is empty. Add an instrument.") ·
  **no-lists** (first-run create-a-list CTA) · **search-empty** (combobox "No matches") · market-closed (last
  close + neutral note). Three *distinct* empties — don't reuse one copy for all.
- **Funds:** **filtered-empty** ("No funds match these filters" + clear-filters, distinct from a zero-data
  empty) · loading (`gok-table loading` + skeleton fact sheet) · error (retry).
- **Dividends:** empty upcoming / empty history (quiet inline empties) · **not-held** → yield-on-cost "—".

## Competitive bar

Trade Republic for the calm, low-ceremony watchlist and savings-plan spirit; eToro for fractional/euro-cost-
averaging discovery done clearly. Beat all of them on **fee + risk transparency**: a unit on every fee, a risk
band readable without colour, yield computed from real cost basis. The differentiator isn't more facets — it's
a fund you understand the cost and risk of before you open the ticket. See `references/competitive-benchmarks.md`.

## Sub-area definition of done

- [ ] Watchlists: create / rename / delete / switch; grid sorts; add via `F10` combobox **dedups**; remove is
      **optimistic + undo, no dialog**; sparkline cells carry a text equivalent; row click → instrument detail.
- [ ] Watchlist empty-list / no-lists / search-empty states are **distinct**; loading + error present.
- [ ] Funds grid filters by asset class, region, risk band, **and max ongoing charge**; sorts every column.
- [ ] Fee shows **with a unit**; risk shows by **rule+mark+text** ("Risk 5 of 7"), never colour-only.
- [ ] Fact sheet: objective, holdings, fee breakdown, risk, a performance chart (data-table fallback), Buy →
      V03, and the "fees reduce returns / past performance" caveat; **no "best"/"top" ranking**.
- [ ] Dividend calendar toggles Upcoming/History; **yield-on-cost** correct for held (derived from cost basis),
      "—" for un-held; running total correct.
- [ ] Filtered-empty distinct from zero-data; FX disclosed where fund ccy ≠ home; minor-unit math; axe clean on
      grids + combobox + drawer; `columns`/`rows` set as properties.
