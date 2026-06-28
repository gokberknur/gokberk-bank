# Tier 3 — API refinements on already-shipped components (P2)

These components exist and work; each item is a **bounded API gap** the bank hit on real screens. They don't
shift the brand — they let already-shipped components express patterns the design language already mandates
(e.g. "status by rule + icon + text, never colour alone"). [← README](README.md)

---

## R1 · `gok-table` — rich/status cells, per-cell renderer, and a row-activate event

**Priority:** P2 (high — heaviest single ask) · **Reconciliation:** NEW · **Dogfooding:** #8, #11, #12, #27

**Need / why.** `gok-table` cells are **formatted strings** (`column.format(value, row)` returns text). Four
consequences bit the bank:
- **Status can't render as rule+icon+text** in the grid (#11) — only the bare word "Pending"/"Settled", so the
  design-language status signature is only half-honoured inside a table.
- **Sparklines / mini-charts can't live in a cell** (#8) — `renderCell` returns a Lit `Node`, unusable from
  Svelte without coupling to the DS render layer.
- **No distinct row-activate event** (#12) — opening a row reuses `gok-selection-change` (select == open), and
  the activation is **checkbox-only** (no full-row click, select control is `tabindex="-1"` → no keyboard
  activation). After a detail drawer closes, the row stays in the selection `Set`, so re-clicking the **same**
  row emits nothing and the drawer won't reopen without driving selection as a controlled prop.
- **Net result** (#27): the portfolio holdings grid — sparkline + rule+icon delta per row — had to be
  **hand-built** as an accessible `<table>`, abandoning `gok-table` entirely on the heaviest data screen.

**Where it bit (use-cases).** Transaction ledger (status cells + row→drawer), portfolio holdings (sparkline +
delta + row→instrument), watchlists, any grid where a row opens a detail or a cell shows a shape/chart.

**Evidence — the controlled-selection reopen workaround (#12):**

```ts
// Drive `selection` as a CONTROLLED prop and clear it on drawer close, or the same row never reopens.
{@attach setProps({ selection: selectedId ? new Set([selectedId]) : new Set() })}
{@attach on('gok-selection-change', onActivateRow)}   // there is no distinct "activate" event
```

and the string-only cell forcing a NaN sentinel to blank a balance ([`TransactionGrid.svelte`](../../src/lib/components/accounts/TransactionGrid.svelte)):

```ts
// format() only sees the cell value, not the row — so "blank the balance for pending rows" needs a NaN sentinel
format: (v) => (Number.isNaN(v) ? '—' : formatMoney(v, currency))
```

**Proposed DS behaviour / API.**
- A **per-cell slot/snippet renderer** — a framework-agnostic way to project an arbitrary node into a cell
  (named-slot-per-column, or a `column.cell` yielding a host-owned node) — plus typed **column kinds**
  (`badge`/`status`/`sparkline`/`delta`) so rule+icon status and mini-charts are first-class.
- A distinct **`row-activate`** event + a **full-row / keyboard-activatable** option, independent of selection.

**Acceptance criteria.**
- A status column renders a `gok-tag` (rule+icon+text) and a sparkline column renders a `gok-sparkline`, both
  from Svelte, without importing the DS Lit render layer.
- Activating a row (mouse on the row body **and** keyboard) emits `row-activate`; re-activating the same row
  after a drawer closes emits it again (no consumer-side selection juggling). The bank's hand-built holdings
  grid can return to `gok-table`.

---

## R2 · `gok-tag` — status variant + leading-icon slot

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #23

**Need / why.** `gok-tag` variants are `default`/`selected`/`readonly` with no leading-icon slot, so
"status by rule + icon + text, never colour alone" **can't be expressed by the tag itself**. The bank inlines a
small SVG + the word into the default slot.

**Where it bit (use-cases).** Card status (Active / Frozen / Expired), policy status, order status — anywhere a
status tag should carry a shape.

**Proposed DS behaviour / API.**

```svelte
<gok-tag status="success"><svg slot="icon">…</svg>Active</gok-tag>
```

**Acceptance criteria.**
- A status variant set (or a `status` prop) + a leading-`icon` slot, so the rule + icon + text signature is
  first-class without inlining SVG. Sibling of R1 (status cells) and R3 (empty-state tone).

---

## R3 · `gok-empty-state` — `success` / status `tone`

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #34

**Need / why.** Variants are `default`/`compact` only — a layout switch, not a tone — so a **successful-outcome**
panel (the centred media + title + body + actions layout) can't signal success through the component.

**Where it bit (use-cases).** Order-a-card / replacement success, schedule-created success, any "done" screen
that wants the empty-state layout with a positive read.

**Proposed DS behaviour / API.**

```svelte
<gok-empty-state tone="success"> … </gok-empty-state>
```

**Acceptance criteria.**
- A `tone`/status set (at least `success`) that adjusts the media affordance (e.g. accent check treatment)
  while keeping the layout; never colour-alone (pairs with an icon/word).

---

## R4 · `toast` — `action` / undo affordance

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #35

**Need / why.** `toast(message, { status?, duration? })` carries only text — no slot or callback for an inline
action — so the canonical **"Removed AAPL · Undo"** pattern (an undoable low-stakes removal) can't be expressed.

**Where it bit (use-cases).** Watchlist row remove; any reversible micro-action (remove / archive / dismiss).

**Proposed DS behaviour / API.**

```ts
toast('Removed AAPL', { status: 'success', action: { label: 'Undo', onClick: () => restore() } });
```

**Acceptance criteria.**
- An optional `action: { label, onClick }` (or an `undo` helper) renders an inline action in the toast and fires
  the callback; keyboard reachable; respects the toast's live-region semantics.

---

## R5 · `gok-segmented` — typed `CustomEvent<{ value }>` detail

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #21

**Need / why.** The `change` event detail is typed as a bare `Event` in the CEM, so every consumer reads the
selected value off `e.target.value` with a cast — boilerplate in every handler.

**Where it bit (use-cases).** Every `gok-segmented` `change` handler (direction/density facets, frequency,
rate-type, period toggles).

**Evidence.**

```ts
// the cast we repeat because the event isn't typed
const value = (e.target as HTMLElement & { value: string }).value;
```

**Acceptance criteria.**
- The `change` event is a typed `CustomEvent<{ value: string }>` in the CEM, so `e.detail.value` is available
  without a cast. (Pure typing/manifest change.)

---

## R6 · `gok-radio` — selectable-card variant / reflected selected state

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #17

**Need / why.** Building the send-money recipient picker wanted payee **cards** with a selected-state border, but
`gok-radio`'s `checked` doesn't reflect to a statically-prunable attribute (`.payee[checked] {…}` is dropped by
`svelte-check` as an unused selector) and there's no `--gok-radio-*` selected hook. The bank wraps the host radio
in app-local card chrome and drives the selected border from its own state.

**Where it bit (use-cases).** Recipient picker, plan/tier choosers, any "pick one rich option" card list.

**Proposed DS behaviour / API.** A selectable-card variant, **or** a reflected `[checked]`/`--gok-radio-*`
selected hook so consumers can style the selected state from light DOM.

**Acceptance criteria.**
- A consumer can render a rich radio "card" and style its selected state from light DOM (reflected attribute or
  token hook) without tracking selection in parallel app state.

---

## R7 · `gok-icon` — payments/finance glyph set or slotted custom SVG

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #20

**Need / why.** The icon set (~23 glyphs) is thin for a fintech IA — no people/payees, request, split, exchange,
scheduled, or direct-debit glyph — so payments-hub tiles fall back to generic `plus`/`dash`/`settings` and read
mostly from their label.

**Where it bit (use-cases).** Payments hub tiles, nav, action buttons across money flows.

**Proposed DS behaviour / API.** Expand the set with a payments/finance group, **or** allow a slotted custom SVG
path so consumers can supply domain glyphs without forking the set.

**Acceptance criteria.**
- Either a documented payments/finance glyph group ships, or `gok-icon` accepts a slotted/custom path with the
  same sizing/`currentColor` semantics as built-in glyphs.

---

## R8 · `gok-input` — uncontrolled-initial-value idiom + tabular-numeral hook

**Priority:** P2 · **Reconciliation:** NEW · **Dogfooding:** #19, #16

**Need / why.** Two smaller `gok-input` gaps:
- **No uncontrolled-initial value** (#19): restoring a persisted wizard draft needs to set each field's value
  **once on mount** (a reactive `value` risks a caret reset), so the bank uses an `initField` `{@attach}` that
  reads the draft through `untrack(...)`.
- **No tabular-numeral hook** (#16): tabular figures on the value rely on `font-variant-numeric` **inheriting
  across the shadow boundary** into the inner input — fragile if the inner input ever resets it.

**Where it bit (use-cases).** Add-payee draft restore; every money/number field that wants column-aligned digits.

**Proposed DS behaviour / API.** A documented **uncontrolled-initial-value** affordance (or `defaultValue`), and
a `--gok-input-value-font` / `--gok-input-*` hook for value typography so tabular numerals don't depend on
inheritance.

**Acceptance criteria.**
- A documented way to seed an initial value without a reactive binding (no caret reset on restore); a token hook
  guarantees tabular numerals on the value without relying on cross-shadow inheritance.

---

## R9 · `gok-card interactive` — establish a positioned containing block (or document it)

**Priority:** P2 · **Reconciliation:** SUPERSEDES (an app-side fix is in place) · **Dogfooding:** #28

**Need / why.** The "stretched overlay `<a>`" idiom (one anchor `position:absolute; inset:0` over a card) makes a
whole card a link — but `gok-card` **doesn't establish a containing block**, so the overlay resolves against the
nearest *positioned* ancestor and **escapes the card to blanket the page**. On the offers grid, the last card's
overlay swallowed clicks everywhere (the page "Redeem" button navigated to the wrong offer). Hosting a
*separately* clickable inner control also needs manual `z-index` layering + a click-stop.

**Where it bit (use-cases).** Any "whole card is a link" pattern, especially grids of linked cards with an inner
action (offers, wallets).

**Evidence — the workaround:**

```css
.offer { position: relative; }   /* bound the stretched overlay to the card, not the page */
```

**Proposed DS behaviour / API.** `gok-card[interactive]` should **establish a positioned containing block**
(`position: relative` on the host) so a stretched-link overlay is bounded to it — or, at minimum, **document**
that an interactive/overlay card must be a positioned containing block, with a "card as link + action slot"
recipe.

**Acceptance criteria.**
- A stretched-link overlay inside an interactive `gok-card` is bounded to that card (clicks outside it don't hit
  the overlay), with no consumer-supplied `position: relative`. A test with a grid of linked cards confirms each
  link targets its own card.
