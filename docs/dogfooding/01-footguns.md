# Tier 1 — Silent footguns that shipped real bugs (P0)

Each of these is **invisible to `npm run check`** and each produced a **real, shipped defect** in gökberk-bank.
They are the highest-value fixes in this handoff: any consumer building real screens hits them, and the failure
mode is "looks fine, behaves wrong" — the worst kind. [← README](README.md)

---

## F1 · `gok-button` — invalid `variant` silently renders `primary`, and `href` is silently ignored

**Priority:** P0 · **Reconciliation:** NEW · **Dogfooding:** #18, #40

**Need / why.** `gok-button` ships three variants (`primary`/`secondary`/`negative`). Two authoring mistakes
pass every check and ship broken UI:
- An **unknown `variant`** (e.g. `ghost`) fails `validateEnum` and **falls back to `primary`** — so a *quiet*
  action renders as a second loud green accent. Shipped on the send-success and statements screens as two
  filled-green buttons flooding a deliberately accent-free surface.
- An **`href` attribute** is **silently dropped** — `gok-button` is a `<button>`, not a link, and has no `href`
  prop, but it accepts the attribute without warning. Shipped **four genuinely non-navigating CTAs** (home
  "See budgets" / "See all activity", the top-up receipt's "View wallet" / "Activity").

**Where it bit (use-cases).** Any third (tertiary) action beside a primary + secondary; any "button that should
be a link". Recurred across home, payments, statements, the success screens.

**Evidence — the workaround we ship instead of `href`:**

```svelte
<!-- src/lib/components/home/QuickActions.svelte:20-27 — navigation must be hand-wired -->
<gok-button
  class="action"
  variant="secondary"
  {@attach on('click', () => goto(action.href))}
>
  <NavIcon slot="icon" name={action.icon} />
  {action.label}
</gok-button>
```

Every link-styled-as-button in the app carries this `on('click', goto)` boilerplate because `href` does nothing.
For quiet actions we are forced to reuse `secondary`, so a three-level hierarchy (primary / secondary / quiet)
collapses to two.

**Proposed DS behaviour / API.**

```svelte
<!-- 1. A real third tier so hierarchy reads in three levels -->
<gok-button variant="tertiary">Clear all</gok-button>

<!-- 2. First-class href → renders a real <a> with button styling + role/keyboard semantics -->
<gok-button variant="secondary" href="/budgets">See budgets</gok-button>
```

**Acceptance criteria.**
- A `tertiary` (quiet/ghost) variant exists: visually subordinate to `secondary`, no accent fill.
- Setting `href` renders an anchor (`role`/keyboard/`target`/`rel` semantics correct); `on('click')` still fires;
  `disabled` is honoured. A Storybook story + a test assert navigation occurs on click and `Enter`.
- An **unknown `variant`** value emits a **dev-mode `console.warn`** naming the component, the bad value, and the
  valid set (see **F2**) instead of silently coercing to `primary`.

---

## F2 · Systemic — unknown enum prop values and unknown `--gok-*` tokens both fail *silently*

**Priority:** P0 · **Reconciliation:** NEW · **Dogfooding:** #18, #29, #40

**Need / why.** Two whole *classes* of authoring error reach production with zero toolchain signal:
- **Unknown enum prop** (`variant="ghost"`, `size="md"`): `validateEnum` coerces to a default at runtime, no
  warning in the consuming app, nothing at `check`. (Cause of F1's loud-button bug.)
- **Unknown `--gok-*` token**: `background: var(--gok-color-surface-sunken)` (no such token) resolves to an
  *invalid value* → transparent panel; `border-radius: var(--gok-radius-full)` → `0` → square corners. CSS
  custom-property typos are invisible to TypeScript, `svelte-check`, and the bundler. These shipped in
  `payments/transfer`, `invest/OrderTicket`, `accounts/TransactionDrawer`, `money/RedeemFlow`, and recurred in
  the command palette (`--gok-color-overlay`, `--gok-color-border-subtle`, `--gok-type-label-small-size` — none
  exist; the real names are `--gok-color-scrim`, `--gok-color-border`, `--gok-type-caption-*`).

**Where it bit (use-cases).** Every consumer authoring against the token vocabulary or any enum'd prop — i.e.
all of them. We only ever caught these by **grepping usages against the published token list** and by eye.

**Evidence.** The two missing tokens we had to discover and swap by hand:

```diff
- background: var(--gok-color-surface-sunken);   /* → invalid → transparent */
+ background: var(--gok-color-surface-strong);    /* the real recessed surface */
- border-radius: var(--gok-radius-full);          /* → 0 → square */
+ border-radius: var(--gok-radius-pill);          /* the real full-round */
```

**Proposed DS behaviour / API.** Two authoring-time guards, both seedable from the existing build:
1. **Dev-mode warning on unknown enum values** — `validateEnum` already detects the bad value; have it
   `console.warn('[gok-button] unknown variant "ghost" — using "primary". Valid: primary|secondary|negative')`
   in dev builds (silent in prod). One change at the mixin covers every component's enums.
2. **Authoring-time token lint** — ship the generated token catalog (the `build:skill` step already produces
   one) as a consumable list, plus a tiny `stylelint`/grep rule (or a documented one) that flags any
   `var(--gok-*)` name not in the catalog. A typo then fails locally, not in production.

**Acceptance criteria.**
- An invalid enum value logs a single dev-only warning with component, bad value, and valid set; production is
  silent and unchanged.
- The published package exposes the **canonical `--gok-*` token name list** (a JSON or `.txt` artifact) that a
  consumer can lint against; a documented lint recipe exists. A known-bad token name is caught by that recipe.

---

## F3 · `gok-dialog` — composed `gok-close`/`gok-cancel` tear down a *parent* dialog when nested

**Priority:** P0 · **Reconciliation:** NEW · **Dogfooding:** #33

**Need / why.** `gok-dialog` emits **composed** `gok-close`/`gok-cancel` events that bubble through shadow
boundaries. When a parent `gok-dialog`/`gok-drawer` hosts a **nested** dialog (a forced-decision confirm, or a
step-up whose internals are a dialog) and listens for *its own* close to dismiss, the **inner** dialog's
close/cancel bubbles up to the parent's listener and closes the **whole flow**. In the bank, confirming the loan
payoff step-up silently dismissed the entire `PayoffDialog` before the loan could settle — the loan stayed
`active`. Invisible to `check`; only shows as a dead-ended flow.

**Where it bit (use-cases).** Any composition that nests an overlay inside an overlay — extremely common:
confirm-inside-drawer, step-up-inside-dialog. The bank's reusable [`StepUp`](../../src/lib/components/security/StepUp.svelte)
*is* a `gok-dialog`, so it triggers this whenever opened from another dialog.

**Evidence — the guard every parent now needs:**

```ts
// The parent must distinguish its OWN dismissal from a bubbled child dismissal.
// Event retargeting makes a bubbled event's `target` the inner dialog host, so:
function onParentClose(e: Event) {
  if (e.target !== e.currentTarget) return; // a nested dialog closed — ignore it
  closeTheParent();
}
```

This `e.target === e.currentTarget` guard had to be added to `PayoffDialog` and `OverpayDrawer` after the bug,
and is now a standing rule for anyone nesting our overlays.

**Proposed DS behaviour / API.** Remove the footgun at the source — either:
- make `gok-close`/`gok-cancel` **non-composed** (don't cross shadow boundaries), or
- provide an **"own-dismissal only"** affordance (e.g. the event only fires on the element the user actually
  dismissed, or a documented `closedBy`/`target` contract), so a parent never reacts to a child's close.

**Acceptance criteria.**
- A nested `gok-dialog` inside a parent `gok-dialog`/`gok-drawer` can open and close **without** dismissing the
  parent, with no consumer-side `target === currentTarget` guard. A Storybook story + test prove a confirm
  dialog can be cancelled while its hosting drawer stays open.

---

## F4 · `gok-dialog` placed as a sibling after an open `gok-drawer` is occluded — visible but unclickable

**Priority:** P0 · **Reconciliation:** NEW · **Dogfooding:** #37

**Need / why.** An open `gok-drawer` renders in the **top layer** (`popover="manual"` + `::backdrop`). A
forced-decision confirm `gok-dialog` authored as a *sibling after* `</gok-drawer>` renders in the **normal**
layer: its panel paints visually on top (perfect-looking modal, scrim and all) but sits **beneath the drawer's
top-layer backdrop**, so every pointer click lands on `<main>`. A direct `.click()` proves the handler works,
but no real user or Playwright click can reach it. This shipped the standing-order and DD-mandate cancel
confirms as **dead** — and external QA mis-filed them as "state no-op" bugs because the modal *looked* fine
(invisible to `check` **and** to a screenshot).

**Where it bit (use-cases).** Any "confirm an action taken from inside a drawer" pattern — payments cancel/pause,
manage flows. The natural authoring instinct (drawer, then a sibling confirm dialog) is the broken one.

**Evidence — the workaround:** nest the confirm **inside** the drawer so it shares the top layer (as
`RedeemFlow`/`OrderTicket` already do), and pair with the F3 teardown guard:

```svelte
<gok-drawer {@attach setProps({ open })}>
  …drawer content…
  <!-- the confirm MUST live inside the drawer, not as a sibling after it -->
  <gok-dialog tone="danger" no-dismiss {@attach setProps({ open: confirmOpen })}> … </gok-dialog>
</gok-drawer>
```

**Proposed DS behaviour / API.** Give `gok-dialog` a **top-layer/portal opt-in** so it can promote itself above
an open drawer regardless of DOM position; *or*, at minimum, **detect** an open top-layer sibling and emit a
dev-mode warning ("a gok-dialog opened beneath an open gok-drawer's backdrop will be unclickable — nest it").

**Acceptance criteria.**
- A `gok-dialog` opened while a `gok-drawer` is open is **clickable** without being a DOM child of the drawer
  (via a portal/top-layer opt-in), **or** a dev warning fires when that occlusion is detected. A Playwright
  test clicks the confirm's button through a real pointer event and the handler runs.

---

## F5 · `gok-table` — `rows` setter is reference-identity gated, so in-place mutations render stale

**Priority:** P0 · **Reconciliation:** NEW · **Dogfooding:** #36

**Need / why.** The `rows` DOM property only re-renders when handed a **new array reference**. Replacing a row
*immutably inside the same backing array* — `arr[i] = { ...arr[i], status }`, the idiomatic data-layer update —
keeps the array reference, so the grid silently shows the **stale cell**. In the bank, cancelling a payment
request updated the open-count header (a separate `$derived`) but the row's Status badge stayed "Open".
Invisible to `check`; only visible when a mutation fails to paint.

**Where it bit (use-cases).** Any live grid whose rows mutate in place — status changes, optimistic updates,
cancels. The common reactive idiom (mutate the item, keep the array) is exactly what fails.

**Evidence — the workaround (force a fresh reference every time):**

```ts
// setProps({ rows }) shows a stale Status until the array identity changes, so:
{@attach setProps({ rows: [...requests.all()] })}   // spread = new reference every render
```

**Proposed DS behaviour / API.** Either diff `rows` by **length + shallow cell content** (not array identity)
before deciding to skip a render, or **document loudly** that `rows` is reference-compared and a fresh array is
required (a one-line note on the prop + a dev warning when the same reference is set twice with changed contents
would both help).

**Acceptance criteria.**
- Mutating a row's field and re-setting `rows` (same array reference) updates the rendered cell, **or** the
  prop's documented contract makes the requirement unmissable and a Storybook example shows the correct
  fresh-array pattern. A test mutates a cell in place and asserts the DOM updates.
