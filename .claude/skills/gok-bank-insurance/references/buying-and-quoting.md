# Playbook — buying & quoting (the quote → buy wizard)

The sub-area playbook for **N01** (`.planning/features/insurance/N01-buy-quote.md`): the save-as-you-go
wizard at `/insurance/quote/[step]` that takes a user from *product* to a *bound, e-signed policy*. This is
**deeper and narrower** than the domain-lens refs — it's the build-time mechanics of the buy flow. For the
*why* behind equal-weight cover, read `references/cover-vs-exclusions.md`; for the regulatory lineage,
`references/regulatory-and-trust.md`. This file is how those doctrines become a working wizard, step by step.

The wizard rides the foundation **wizard composite** and the **money spine** — never reinvent them; read
`.planning/ux/patterns.md` §1 (wizard) and §2 (review → confirm → success) first. What follows is what's
*insurance-specific* on top.

## The five steps — what each must deliver

The route is `/insurance/quote/[step]`; steps are `product | cover | details | quote | buy`. The step-state
model (`{ steps, currentIndex, data, validity[], visited[] }`) persists to a rune store + the URL, resumable
via a draft token. **Advance only when the current step is valid; Back never validates; unvisited steps
aren't clickable.** One primary (Continue), one secondary (Back).

1. **Product** — a `gok-card` grid of lines (home / contents / travel / motor / gadget / pet). Each card is a
   single accent **mark**, never a coloured fill — one accent per view. Selecting a line **seeds the cover
   model**: it determines the cover levels, the add-on catalogue, the excess options, and *the covered/excluded
   clause lists*. WHY this is step one: under IDD this is the start of the **demands-and-needs** conversation —
   you're identifying what the customer needs to insure before you propose cover, not dumping a generic policy.

2. **Cover** — the configuration step, and where premium becomes *live*:
   - **Level** via `gok-segmented` (Essential / Standard / Premium) — the selected item is the one accent.
   - **Add-ons** via a `gok-checkbox` list, **each with a visible price delta** (`+€1.20/mo`). The delta is not
     optional polish — it's the IDD transparency principle: the customer sees the cost of each choice *as they
     make it*, not bundled into a surprise total.
   - **Excess** via `gok-select`. Make the trade-off legible: a higher excess lowers the premium but raises
     what the customer pays at claim time. Don't let the excess be the thing they only discover when they claim.
   - **Premium recomputes live** (reward-early). The readout shows a quiet `gok-spinner` while recalculating;
     **pin the layout** so nothing jumps. A **reserved message line** prevents shift. Announce the new premium
     via `aria-live="polite"` — a screen-reader user must hear the price move too.

3. **Details** — the *insured-items / sums-insured* and *date-range* step:
   - Sums insured / insured items via `gok-input` with money through the **F07** money composite (integer
     **minor units**, currency affix, caret-stable formatting). Sums insured drive the premium, so validate
     them reward-early (over the line-max → surface as they type).
   - **Cover dates** (start + end) via the **F06 date-range picker**. Validate **start < end** and **within the
     product's cover-period limits** (e.g. annual travel ≤ 365 days, per-trip ≤ the product cap). The date
     range is a real risk boundary — it's the cover period the IPID names, and later the claim-window in N03
     keys off it.
   - Address / region via a pan-EU country `gok-select`. Region can gate eligibility and pricing; keep it
     honest (a country we don't cover → clear decline + alternative, never a dead-end).

4. **Quote** — the brand's centre of gravity. The headline premium shows **both monthly and annual** (F07
   formatting, tabular numerals). Below it, **the equal-weight ledger**: a `gok-accordion` with two sections,
   **What's covered** and **What's not covered**, at *identical heading level, type scale, colour role, and
   default open/closed state*. This is the non-negotiable — derive both panels from the **one** `CoverLedger`
   component so neither can drift quieter. A `gok-card` **key-facts ledger** carries excess, single-item
   limits, sums insured, and the **cooling-off period**. (The full doctrine + anti-patterns:
   `references/cover-vs-exclusions.md`. Don't restate it — *enforce* it here.)
   - States to build: **loading the quote** = `gok-skeleton` on the premium *and* the accordion;
     **recalculating** = quiet `gok-spinner` on the premium readout, layout pinned; **ineligible/declined** =
     clear reason + alternatives, no blame, never a silent fail.

5. **Buy** — the finalised act. Payment method via `gok-select` (wallet / card), then the **e-sign** hand-off.
   - **Forced-decision confirm**: `gok-dialog tone="danger" no-dismiss`, primary **"Buy and sign"** (name the
     verb, not "Get protected now!"). Binding a policy is irreversible-at-the-moment, so it earns the dialog —
     same money-spine rule as a payment confirm.
   - **E-sign routes through D02** (review → consent → step-up → signed), owned by `gok-bank-servicing`. You
     *require* signing and state that it happens; you do **not** build the signing ceremony. Likewise the
     **payment** is money movement → `gok-bank-payments`; step-up (F12) over a threshold sits at the seam.
   - **Success**: policy active; documents **and the signed copy** land in the vault (D01); link to N02. And —
     critically — **restate the cooling-off truth on success**: "You can cancel within 14 days for a full
     refund." Finality and reversibility coexist; show both (see N02 for where the window is honoured).

## Cover vs exclusions — the signature discipline, in this flow

This is the one thing the buy flow exists to get right, so reinforce it at build time:

- **The exclusions appear on the *quote*, on-screen, before the forced-decision buy** — never only inside a
  linked IPID PDF, never behind a "Show details" the covered list doesn't also sit behind, never in a
  smaller/greyer/secondary text token, never `tone="danger"` red (an exclusion is a neutral *fact*, not an
  error). If "What's covered" defaults open, so does "What's not covered."
- **One component, two panels.** The covered and excluded lists are the same `CoverLedger` rendered twice;
  building them separately is how one silently drifts quieter. The N01 test asserts both render at *identical
  heading level and type size* — that machine check is your backstop, not your goal. The goal: a customer who's
  about to claim for the *excluded* thing could never say "nobody told me."
- **WHY it lives in the buy flow specifically:** the moment a customer learns an exclusion at *claim* time is
  the moment trust dies. Surfacing it at *purchase* is the honest, premium move — and it's the literal intent
  of the IPID's side-by-side "what is / what is not insured." When someone argues "make exclusions quieter to
  lift conversion," that's the wrong instinct: a buyer scared off by an honest exclusion was a furious claimant
  in waiting. Equal weight is not traded for conversion. Full stop.

## IDD / IPID specifics that shape this wizard

- **Demands-and-needs** = the product + cover + details steps. We tailor cover to what's being insured rather
  than selling a one-size policy; that *is* the regulatory conversation, done as UX.
- **No-advice ≠ no-responsibility.** This is a self-serve, non-advised sale, but it must still be suitable and
  clearly disclosed. Clarity does the work advice would: the equal-weight ledger, the IPID key-facts, the
  cooling-off note. (Background: `references/regulatory-and-trust.md`.)
- **IPID before commit.** Premium (monthly + annual), excess, limits, sums insured, **key exclusions**, and the
  cooling-off window are *all on the quote* before the buy dialog. No surprise on the first statement.
- **Cooling-off window is product-specific.** 14 calendar days for most non-life; **30 days for life**. Use the
  correct window per product; never invent a refund figure — derive it from the stated cooling-off / pro-rata
  rule (the value itself is an Open Question in N01 — *ask first*, don't assume).

## Edge cases & states to handle

- **Recalculating premium** — quiet spinner on the readout, layout pinned, `aria-live` announces the new value.
  Never blank the price or let the row jump.
- **Ineligible / declined cover** — a clear reason (region, age, sum-insured over the line cap) **and** an
  alternative (a different level, a different product). No blame, no dead-end.
- **Insufficient funds at buy** — surface reward-early (before the dialog), corrected late; the money mechanics
  belong to `gok-bank-payments`, you just state the disclosure.
- **Invalid step** — field errors with a **reserved message line**; forward blocked, Back still free.
- **Draft resume** — a returning user re-enters the exact step with cover + dates + sums intact.
- **Motor / home extra detail** (vehicle reg, property survey) — an N01 Open Question; **scope per product, ask
  first**, don't silently bolt on steps.
- **Premium cadence default** (monthly vs annual) — an Open Question shared with N02; *ask*, don't assume.

## Definition of done — buy & quote

Ship only when **all** hold (these are the N01 Success Criteria, made operational):

- [ ] User completes product → cover → details → quote → buy and ends with an **active policy**.
- [ ] Premium reflects **level × add-ons × excess × sum-insured**; **both monthly and annual** shown, tabular.
- [ ] "What's covered" and "What's not covered" render at **identical heading level + type size**, from the one
      `CoverLedger`; exclusions are on-screen, neutral-toned, before the buy dialog.
- [ ] Cover dates use the **F06 date-range** picker; validates start < end and within product limits.
- [ ] Buy is a `gok-dialog tone="danger" no-dismiss`; signing routes through **D02**; payment via
      `gok-bank-payments`; step-up over threshold via F12.
- [ ] Success places policy docs **+ a signed copy** in the vault (D01); the **cooling-off window is restated**
      on success; link to N02.
- [ ] Ineligible / insufficient-funds surfaced **reward-early**, no-blame; recalculating pins layout +
      announces via `aria-live`.
- [ ] axe clean on quote + buy; `npm run check` + `npm run build` green; no hardcoded hex/px; **one accent per
      view**; money as integer minor units (never float-multiply rates).
