# Design-system handoff — gökberk-bank dogfooding v1

A consumer-to-maintainer **spec**, not a backlog dump. It turns the friction logged while building
[gökberk-bank](https://bank.gokberk.se) against `@gokberknur/design-system@0.4.1` into actionable design-system
work — each item states the *need*, shows the **real source** (where it bit, the workaround, the desired
call-site), and reframes the wish as **testable acceptance criteria** a DS agent can build and verify against.

> **Source of truth:** the bank's app-side log, [`docs/dogfooding-findings.md`](../dogfooding-findings.md)
> (findings `#1`–`#40`). This handoff curates, dedupes, and prioritizes those into DS work items.
>
> **Delivery is the DS team's call.** This is the artifact; filing it into `tasks/backlog.md` / issues is theirs.

---

## Assumptions

> Per spec-driven discipline — correct any of these and the items shift.

1. The canonical DS repo is `gokberknur/gokberk-design-system` (publishes `@gokberknur/design-system@0.4.1`);
   work is tracked in `tasks/backlog.md` (GitHub issues exist but are unused).
2. The bank consumes only **published** APIs (npm `^0.4.x`), so every workaround here is a real consumer
   constraint, not a local fork.
3. Components named in Tier 1 / Tier 3 are **already shipped** (button, dialog, table, tag, toast, segmented,
   empty-state, input, radio, card, icon, progress) — those items are **hardening / API requests**, not builds.
4. Tier 2 names (`gok-money`, `gok-otp`, `gok-date-picker`, `gok-combobox`, `gok-multi-select`, `gok-slider`,
   `gok-stepper`, `gok-step-up`, `gok-action-bar`, `gok-page-header`, `gok-file-upload`, carousel/`gok-sparkline`)
   were checked against the current `custom-elements.json` — **none collide** with an existing element.
   `gok-textarea` is the one already on the backlog → **annotate, don't re-file**.
5. The bank is a **mobile-first** (iPhone / Mobile Safari, WebKit) SPA built from `gok-*` web components driven
   via DOM properties/events (`setProps`/`on` in [`src/lib/wc.svelte.ts`](../../src/lib/wc.svelte.ts)), never
   framework `bind:`. Several findings are sharpest at that shadow-DOM ↔ Svelte boundary.
6. The brand bar (`gokberk-design.skill`) is authoritative for *visuals*; nothing here asks the DS to change a
   colour or break monochrome restraint — only to close behavioural/API gaps.

## How to read

- **Priority** — `P0` silent footgun that already shipped a real bug (any consumer hits it) · `P1` missing
  primitive hand-built in the bank (proven demand) · `P2` API refinement on a shipped component.
- **Reconciliation** — `NEW` (absent from the DS backlog) · `ANNOTATE` (a backlog line already exists; add the
  bank's evidence/use-case) · `SUPERSEDES` (replaces an app-side workaround that should retire on ship).
- Each item carries its originating **dogfooding `#N`** so a maintainer can read the raw note.
- Code excerpts cite a real bank path + line range. They are *evidence*, not prescriptions — the DS owns the
  final shape; the **acceptance criteria** are the contract.

## Files

| File | Tier | Items |
|------|------|-------|
| [`01-footguns.md`](01-footguns.md) | **P0** — silent footguns that shipped bugs | F1–F5 |
| [`02-missing-primitives.md`](02-missing-primitives.md) | **P1** — hand-built primitives (proven demand) | P1–P13 |
| [`03-api-refinements.md`](03-api-refinements.md) | **P2** — API gaps on shipped components | R1–R9 |
| [`appendix-wontfeed.md`](appendix-wontfeed.md) | — | findings intentionally **not** fed, with reason |

## Headline (read this first)

Five **P0 footguns** are the highest-value fixes here — each is invisible to `npm run check` and each shipped a
**real defect** in the bank that any consumer would also hit:

1. `gok-button` accepts an **invalid `variant`** and silently renders `primary` → two loud green buttons shipped.
2. `gok-button` **silently ignores `href`** → four dead navigation CTAs shipped.
3. A typo'd **`var(--gok-*)` token** resolves to an invalid value with no error → transparent panels / square
   corners shipped.
4. A **nested `gok-dialog`** tears down its parent (composed close events) → a loan payoff silently aborted.
5. A `gok-dialog` **occluded under an open `gok-drawer`** looks perfect but is unclickable → two "cancel" flows
   read as broken (external QA mis-filed them as state bugs).

A single systemic guard — **warn on unknown enum prop values + lint `var(--gok-*)` names against the shipped
catalog at authoring time** (item **F2**) — would have caught three of the five before they shipped.

## Cross-reference — every dogfooding `#` is accounted for

| `#` | Finding (short) | → Spec item | Bank source (evidence) |
|----:|-----------------|-------------|------------------------|
| 1 | No chart/sparkline primitive | P13 | `src/lib/charts/` |
| 2 | No stepper/wizard | P6 | `src/lib/components/wizard/` |
| 3 | No date / date-range picker | P3 | native `<input type=date>` across flows |
| 4 | No money/currency input | P1 | `src/lib/components/money/MoneyInput.svelte` |
| 5 | No OTP input | P2 | `src/lib/components/security/OtpInput.svelte` |
| 6 | No file-upload/dropzone | P11 | KYC / claims / docs flows |
| 7 | No combobox/multi-select | P4 | payee & instrument search, watchlists |
| 8 | `gok-table` sparkline cells | R1, P13 | hand-built holdings grid |
| 9 | `gok-progress` indeterminate | appendix (wontfix) | — |
| 10 | Node-24 / Cloudflare build pin | appendix (bank-infra) | `.nvmrc` |
| 11 | `gok-table` rich/status cells | R1 | `TransactionGrid.svelte` |
| 12 | `gok-table` no row-activate | R1 | `e2e/accounts/wallet-ledger.spec.ts` |
| 13 | `gok-segmented` not form-assoc | appendix (wontfix) | — |
| 14 | `gok-input` number can't group | P1 | `money-format.ts` |
| 15 | `gok-input` no caret-stable grouping | P1 | `MoneyInput.svelte` (group-on-blur) |
| 16 | `gok-input` no tabular hook | R8, P1 | `MoneyInput.svelte` style note |
| 17 | `gok-radio` no selectable card | R6 | send-money recipient picker |
| 18 | `gok-button` ghost→primary silent | F1, F2 | success/statements screens |
| 19 | `gok-input` no uncontrolled-initial | R8 | add-payee draft restore |
| 20 | `gok-icon` thin set | R7 | payments hub tiles |
| 21 | `gok-segmented` untyped event detail | R5 | every segmented `change` handler |
| 22 | No card-art / carousel | P12 | `CardArt` / `CardStrip` |
| 23 | `gok-tag` no status/icon | R2 | card status tag |
| 24 | `MoneyInput` no commit/blur hook | P1 | `MoneyInput.svelte` |
| 25 | `MoneyInput` no external error | P1 | card daily-limit rule |
| 26 | `MoneyInput` value seed-only | P1 | `MoneyInput.svelte` |
| 27 | `gok-table` can't host dense visuals | R1 | hand-built holdings grid |
| 28 | `gok-card interactive` containing block | R9 | offers grid overlay bug |
| 29 | Unknown `--gok-*` tokens silent | F2 | transfer / OrderTicket / drawers |
| 30 | No slider/range | P5 | loan apply, mortgage calc |
| 31 | No `gok-textarea` | P10 (ANNOTATE) | support ticket |
| 32 | No step-up / re-auth dialog | P7 | `src/lib/components/security/StepUp.svelte` |
| 33 | `gok-dialog` nested teardown | F3 | `PayoffDialog` / `OverpayDrawer` |
| 34 | `gok-empty-state` no success tone | R3 | order-a-card success |
| 35 | `toast` no action/undo | R4 | watchlist remove |
| 36 | `gok-table` rows identity-gated | F5 | request cancel stale cell |
| 37 | `gok-dialog` occluded under drawer | F4 | standing-order / DD cancel |
| 38 | No sticky action bar | P8 | `src/lib/components/layout/StickyActionBar.svelte` |
| 39 | No page-header scaffold | P9 | `src/lib/components/layout/PageHeader.svelte` |
| 40 | `gok-button` `href` ignored | F1, F2 | home CTAs, top-up receipt |

**40 / 40 findings routed** — 22 spec items + 3 appendix entries (some findings inform more than one item).
