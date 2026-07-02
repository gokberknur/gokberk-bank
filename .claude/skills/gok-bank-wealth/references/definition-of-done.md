# Wealth & Brokerage — definition of done

The quality bar an investing surface must clear before you'll sign it off. This is the domain lens, on top of
the feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review.
If a surface fails any of these, it's not done.

## Correctness & order truth

- [ ] The order ticket is correct to the cent: estimated total, fee, and FX line (rate + margin, when
      instrument ccy ≠ funding wallet) computed from integer **minor units** / scaled-integer rates — never
      float-multiply for FX or quantity.
- [ ] Quantity toggles shares ↔ notional with a correct live mirror; fractional/whole-share + tick-size rules
      are enforced per instrument.
- [ ] Terminal state is honest: market + open → **Filled**; limit/stop resting → **Working**; market closed →
      **Queued**. Crypto sends are **Pending → Confirming** with a tx hash + confirmations — never faked.
- [ ] Buying power before/after is shown and correct; insufficient buying power **blocks** the confirm.
- [ ] Portfolio/holdings math is right: day-change, unrealised P/L, weights (sum to 100%), and FX conversion to
      the home currency — derived, never stored pre-rounded.

## Safety, cost & risk disclosure

- [ ] Every cost (estimated total, fee, FX margin) is disclosed on **review**, before the forced-decision
      confirm — MiFID-style ex-ante, never revealed after.
- [ ] Prices are labelled **indicative**; a **market** order re-acknowledges slippage ("the final price may
      differ — markets move"); a stale quote re-prices before confirm.
- [ ] Value-moving commits use a forced-decision `gok-dialog tone="danger" no-dismiss` naming verb + amount;
      step-up (`F12`) fires over the threshold; a declined step-up leaves state unchanged.
- [ ] Funds show a **risk band (1–7, rule+mark+text)** and the **ongoing charge / TER** with a unit, plus the
      "fees reduce returns; past performance doesn't predict future returns" caveat on the fact sheet.

## Crypto-specific

- [ ] Address format/checksum validated **reward-early**; a network-mismatch is warned.
- [ ] A send forces a **network-confirmation dialog that names the network** and states it can't be reversed,
      before any funds move.
- [ ] Receive shows the address + a locally-rendered (monochrome) QR + copy + a "send only <ASSET> on
      <NETWORK>" caution.

## Validation & error handling

- [ ] Insufficient buying power, limit far from market, fractional-not-allowed, market-closed, invalid address
      all surface **reward-early** (as built), cleared live on fix.
- [ ] Errors say what happened and what to do; they never blame the user (incl. a Rejected order — explain why).

## States, feedback & a11y

- [ ] Loading (skeleton mirroring layout), empty, filtered-empty, error, market-closed, and pending states are
      all present and correct per `.planning/ux/patterns.md`.
- [ ] Charts have a **non-visual data-table fallback** (not chart-only); grids are sortable `role="grid"` with
      announced sort; range/type/filter switches are `role="radiogroup"`; tabular numerals throughout.
- [ ] Direction is **never colour alone**: P/L, day-change, and candles read by sign + icon + status role;
      **Buy/Sell are not colour-coded**; status badges carry text + a rule/mark.

## Consistency

- [ ] `gok-table` `columns`/`rows` set as DOM **properties** (never attributes); events via `on(...)`; **no
      `bind:`** on custom elements.
- [ ] Reuses the shared order draft + pricing/FX engines and the chart wrappers (don't fork per-instrument or
      per-rail logic); buying power is consistent with `gok-bank-accounts`.
- [ ] The one earned accent is the primary action / active segment only — never spent on a gain.

## Investing-depth epic (V08–V15) — additional gates

These hold *on top of* the gates above, for the depth surfaces:

- [ ] **Recurring plans (V10):** a plan's next-run, projected-balance impact, and per-run order are honest and
      **reuse P05 + V03 + A04** (no bespoke scheduler or round-up engine); **pause is reversible**, **stop is a
      forced-decision**; a run funds only from buying power (never moves cash — that's payments); a skipped run
      (insufficient funds) is stated plainly, no blame.
- [ ] **Live-or-seed honesty (V14):** the app renders correctly with the **network disabled** (seed is
      system-of-record); no live call blocks first paint; live/delayed figures carry the **"indicative /
      delayed"** label; degradation to the seed is silent; **no backend/proxy** (`ADR-006`).
- [ ] **Analytics honesty (V12):** realized vs unrealized is cost-basis-correct from integer minor units; TWR
      and the benchmark are **rebased**; the projection is a **neutral calculator** (user-set assumptions + the
      past-performance caveat), **never advice**; **no tax-lot optimisation engine**.
- [ ] **Charting restraint (V08):** the indicator/overlay set is a small curated list, each with a data-table
      fallback; **no drawing-tool sprawl**; candle direction by shape, comparison by rebasing — never hue alone.
- [ ] **Discovery calm (V11, V13):** search + lists + movers **inform, never hype** — no "top picks/best", no
      most-bought/social/copy signals; price alerts fire via **F13** with neutral, no-nudge copy.
- [ ] **ISK wrapper (V15):** a factual account-type label + a seeded flat-tax line only — **no tax engine**, no
      capital-gains math, no document generation (stub to `gok-bank-servicing`).

## The gut check

Would a real investor trust this to place a €5,000 order, or send crypto to a new address, without hesitating
about the cost, the price, the affordability, or the irreversibility? If any part would make them pause on
cost, fill, FX, or finality — it's not done.
