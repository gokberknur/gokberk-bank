# Tier 2 — Missing primitives hand-built in the bank (P1)

The DS ships no element for these, so the bank built an app-local composite (or fell back to a raw native
control) for each. **All but `gok-textarea` are absent from `tasks/backlog.md`** — they are genuine gaps with
proven demand: each was needed on real screens, sometimes many. Where a composite exists, it is a **working
reference implementation** the DS can lift the API and acceptance from (it composes `gok-*` + `--gok-*` tokens
only — it never restyles a DS component). [← index](index.md)

> The bank ships these under `src/lib/components/` per ADR-004. Promoting any of them retires the corresponding
> app-local file.

---

## P1 · `gok-money` — currency / numeric-format input

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #4, #14, #15, #16, #24, #25, #26

**Need / why.** Every amount field needs grouped, currency-aware money entry over an integer **minor-unit**
canonical value. `gok-input type="number"` **can't render grouped money** (`1,234.50`), so the composite uses
`type="text"` + `inputmode="decimal"`; and because `gok-input`'s inner `<input>` lives in **shadow DOM and is
unreachable**, live caret-stable grouping is impossible — grouping is deferred to blur.

**Where it bit (use-cases).** Every send/exchange/top-up/limit/loan/order amount field — the single most-used
input in a bank.

**Evidence — the composite ([`src/lib/components/money/MoneyInput.svelte`](../../src/lib/components/money/MoneyInput.svelte)) and the two shadow-DOM constraints it encodes:**

```svelte
<!-- src/lib/components/money/MoneyInput.svelte:108-135 -->
function onInput(event) {
  // Sanitise LIVE but do NOT group — live grouping needs caret restoration inside
  // gok-input's inner <input>, which is in shadow DOM and unreachable from here (#15).
  display = sanitizeLive(raw, decimals);
  value = toMinor(display, decimals);   // canonical value is always integer minor units
  commit();
}
function onChange() {   // group on blur, never live
  display = display.trim() === '' ? '' : formatMinorPlain(value, decimals);
}
```

```css
/* :155 — tabular numerals only work by inheriting across the shadow boundary (#16) */
.money-field { font-variant-numeric: tabular-nums; }  /* fragile: relies on the inner input not resetting it */
```

The composite also had to grow three affordances the DS version should bake in (#24/#25/#26): an `onchange`
that fires on **every keystroke** (no commit/blur hook), validation that **can't take a flow-supplied error**
(over-limit rules had to live in a separate message line), and a `value` that is **seed-only** (an external
reset needs a `{#key}` remount).

**Proposed DS behaviour / API.**

```svelte
<gok-money
  currency="EUR"            
  value={amountMinor}        
  oncommit={(minor) => …}    
  error={flowError}          
  balance-minor={available}  
/>
```

**Acceptance criteria.**
- Canonical value is an integer **minor-unit** amount; no float touches money. `currency` drives decimals,
  symbol affix, and the accessible name (`"Amount (EUR)"`).
- Grouped display at rest (`1,234.50`); the caret is stable while typing (DS owns the inner input, so it can do
  live grouping the composite couldn't).
- A **commit/blur** callback distinct from per-keystroke change; an external **`error`** prop shares the field's
  one reserved message line; setting `value` externally **reflects without a remount**.
- Tabular numerals are guaranteed via a `--gok-*` hook, not by fragile inheritance.

---

## P2 · `gok-otp` — one-time-code input

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #5

**Need / why.** 2FA, step-up, PIN, 3-DS, and e-sign all need a boxed one-time-code field. It **can't be built
from `gok-input`** (boxed single-char cells need direct control of each native input; `gok-input`'s field is in
shadow DOM). The bank built a 6-box native-input composite.

**Where it bit (use-cases).** `/security/2fa` enrol, every step-up, card PIN, 3-DS, e-sign OTP.

**Evidence — reference implementation:** [`src/lib/components/security/OtpInput.svelte`](../../src/lib/components/security/OtpInput.svelte)
(136 lines) — type-to-advance, backspace-to-retreat, arrow nav, paste-to-fill, two-way `value` via `$bindable`,
refs collected with an `{@attach}`:

```svelte
<!-- OtpInput.svelte:48-54, 70-77 — the interaction contract a gok-otp must own -->
function onInput(i, e) {
  const digit = e.target.value.replace(/\D/g, '').slice(-1);
  setBox(i, digit);
  if (digit && i < length - 1) inputs[i + 1]?.focus();   // type-to-advance
}
function onPaste(e) {
  const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, length);
  value = text;                                            // paste-to-fill the whole code
}
```

**Proposed DS behaviour / API.**

```svelte
<gok-otp length="6" value={code} onchange={…} oncomplete={(code) => verify(code)} masked={false} />
```

**Acceptance criteria.**
- Configurable `length`; type-to-advance, backspace-to-retreat, arrow nav, paste-to-fill; `autocomplete="one-time-code"`
  on the first box; group label + per-box `aria-label`. Emits a **`complete`** event when full; optional masking.
- Two-way `value` is the joined string. A test drives keyboard + paste and asserts focus movement and the
  `complete` event.

---

## P3 · `gok-date-picker` — single date + date range

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #3

**Need / why.** `gok-input` has no `date` type, so every date field is a **raw native `<input type="date">`**
tokened by hand to rhyme with `gok-input`. No range support, no shared anatomy, inconsistent across the app.

**Where it bit (use-cases).** Onboarding DOB, scheduled-payment start/end, statement range, insurance cover
dates, claim "when did it happen". The statements + scheduled flows specifically want a **range**.

**Evidence — the hand-tokened native control we repeat:**

```svelte
<!-- e.g. payments/scheduled/new — every date field is this, restyled native input -->
<input class="date-input" type="date" value={startIso} min={TODAY_ISO} oninput={onStartInput} />
```
```css
.date-input { /* ~25 lines re-deriving gok-input's border, radius, focus ring from --gok-* tokens */ }
```

**Proposed DS behaviour / API.**

```svelte
<gok-date-picker label="Start date" value={iso} min={todayIso} onchange={…} />
<gok-date-range label="Statement period" start={fromIso} end={toIso} onchange={…} />
```

**Acceptance criteria.**
- Single + range; shares `gok-input`'s label / reserved-message / focus-ring anatomy; `min`/`max`; ISO value in,
  ISO out; keyboard + locale aware. Retires the bank's ~5 hand-tokened native date fields.

---

## P4 · `gok-combobox` + `gok-multi-select` — free-text filtering & multi-value

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #7

**Need / why.** `gok-select` ships keyboard **typeahead** for small single-value sets, but there is no
**free-text filtering** combobox and no **multi-select**. Both were needed repeatedly.

**Where it bit (use-cases).** Payee search, instrument search, split-bill people, watchlist add, region
allow-lists (multi).

**Proposed DS behaviour / API.**

```svelte
<gok-combobox label="Find an instrument" items={results} onfilter={(q) => …} onselect={…} />
<gok-multi-select label="Who's splitting?" items={people} values={selectedIds} onchange={…} />
```

**Acceptance criteria.**
- Combobox filters as the user types (consumer-supplied filter or items), keyboard-navigable, ARIA combobox
  pattern. Multi-select holds an array value, chip/token display, remove-per-value, keyboard add/remove. Both
  compose with `gok-option`.

---

## P5 · `gok-slider` — single + range

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #30

**Need / why.** No range/slider control; loan amount/term and the mortgage-calculator term want a drag-to-set
slider. The bank uses a tokened native `<input type="range">` with an accent-fill gradient.

**Where it bit (use-cases).** Loan apply (amount + term), mortgage calculator (term), any future filter/settings
range.

**Proposed DS behaviour / API.**

```svelte
<gok-slider label="Term" min="1" max="30" value={years} onchange={…} format={(v) => `${v} years`} />
```

**Acceptance criteria.**
- Single (and ideally range) thumb; token-themed track/fill/thumb; standard focus ring; a labelled read-out;
  step + min/max; keyboard operable. Retires the app-local `<input type=range>` styling.

---

## P6 · `gok-stepper` / wizard

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #2

**Need / why.** Every application/transfer flow is multi-step, but the DS has no stepper/wizard. The bank built
a forward-gated composite — a purpose-built `<nav><ol>` step rail + `gok-progress format="fraction"` + step
state — *deliberately not* `gok-tabs` (which models free non-linear nav, while a wizard is forward-gated).

**Where it bit (use-cases).** Send money, add payee, schedule payment, loan/credit-line/mortgage apply, insurance
quote/claim, card order, KYC onboarding — the backbone of the app.

**Evidence — reference implementation:** [`src/lib/components/wizard/Wizard.svelte`](../../src/lib/components/wizard/Wizard.svelte)
+ [`WizardProgress.svelte`](../../src/lib/components/wizard/WizardProgress.svelte) (the shared "Step k of N"
eyebrow + `gok-progress` fraction) + `wizard-store.svelte.ts` (`createWizard` with per-step `validate`/`canEnter`,
forward-gating, optional draft persistence).

**Proposed DS behaviour / API.** A `gok-stepper` that owns the step rail + progress signal + forward-gating,
with per-step validation hooks and a sticky footer on mobile (see **P8**). The bank's `StepDef`
(`id`, `title`, `validate?(data)`, `canEnter?(data)`) is a proven shape.

**Acceptance criteria.**
- Renders a numbered step rail (current/done/disabled states) + a "Step k of N" + `gok-progress` fraction;
  forward-gated (can't skip an invalid step); `canEnter` can conditionally skip a step; back is always allowed;
  the footer's primary is reachable on mobile. A test walks a 3-step flow and asserts gating + progress.

---

## P7 · `gok-step-up` — re-auth / "prove it's you" dialog

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #32

**Need / why.** Every consequential money/security action needs an inline re-auth gate before it commits, but
the DS ships no re-auth primitive — so it was hand-rolled inline in OrderTicket, RevealDialog, SWIFT send, the
security center (revoke / sign-out-all / passkey add-remove / 2FA change), then extracted into a composite.

**Where it bit (use-cases).** Order confirm, card reveal, large/over-threshold transfers, standing-order setup,
all of `/security/**`.

**Evidence — reference implementation:** [`src/lib/components/security/StepUp.svelte`](../../src/lib/components/security/StepUp.svelte)
— a **cancellable** `gok-dialog` (declining must be possible, no side effect), a consequence line, a pluggable
verifier, and a confirm **disabled until verified** that resets every open:

```svelte
<!-- StepUp.svelte:55-59, 116-123 — the gate contract -->
function confirm() { if (!verified) return; verified = false; onConfirm(); }
…
<gok-button variant="primary" {@attach setProps({ disabled: !verified })} {@attach on('click', confirm)}>
  {confirmLabel}
</gok-button>
```

> Note: `StepUp` is itself a `gok-dialog`, so it is the most common trigger of footgun **F3** (nested teardown)
> — shipping `gok-step-up` and fixing F3 are complementary.

**Proposed DS behaviour / API.**

```svelte
<gok-step-up open={open} title="Revoke iPhone 16 Pro?" consequence="This signs that device out."
  verifier={passkeyVerify} confirm-label="Revoke" tone="danger" onconfirm={…} oncancel={…} />
```

**Acceptance criteria.**
- Cancellable (no side effect on decline); confirm gated until a **pluggable verifier** resolves; verified state
  resets on every open; `tone="danger"` renders the confirm as outline/text in the status colour (never a solid
  red fill). A test asserts confirm is inert until verification and that cancel runs no side effect.

---

## P8 · `gok-action-bar` — sticky primary-action footer

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #38

**Need / why.** On the mobile target, primary actions scroll-bury below the fold under tall hero art / long
forms. The DS has no sticky-CTA pattern, so it was hand-copied inline on the trade pages, then extracted.

**Where it bit (use-cases).** Instrument & crypto trade, card detail, insurance policy, invest portfolio, crypto
send, and every wizard footer (P6).

**Evidence — reference implementation:** [`src/lib/components/layout/StickyActionBar.svelte`](../../src/lib/components/layout/StickyActionBar.svelte)
— note the **safe-area + bottom-tab-bar clearance** that any DS version must bake in:

```css
/* StickyActionBar.svelte:30-44, 60-72 */
.cta-bar { position: sticky; inset-block-end: var(--gok-space-300); z-index: var(--gok-z-sticky);
  background: var(--gok-color-surface-translucent); backdrop-filter: blur(var(--gok-blur-chrome)); }
@media (max-width: 40rem) {
  .cta-bar { inset-block-end: calc(var(--gok-space-900) + env(safe-area-inset-bottom)); } /* clear the tab bar */
  .cta-actions :global(gok-button) { flex: 1 1 0; }                                       /* full-width on mobile */
}
```

**Proposed DS behaviour / API.** A `gok-action-bar` with a `context` slot (left) + `actions` slot (right), sticky
bottom, translucent + blur, with safe-area + tab-bar clearance configurable (the consumer knows their tab-bar
height).

**Acceptance criteria.**
- Sticks to the viewport bottom, stays above a fixed bottom nav (configurable clearance + `env(safe-area-inset-bottom)`),
  full-width actions on mobile; one earned accent (single primary). A mobile (WebKit) test asserts the primary
  is in the viewport at rest on a long page.

---

## P9 · `gok-page-header` — standard page scaffold

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #39

**Need / why.** The eyebrow + title + caption band is hand-copied across **~58 routes**, and the shared section
gap leaves a ~150–300px header→content **void** on mobile below a sparse first block (the CRY-U-02/PAY-U-04
finding). The bank built a composite that standardizes the band and trims the void.

**Where it bit (use-cases).** Nearly every route; the void was worst on crypto & payments surfaces.

**Evidence — reference implementation:** [`src/lib/components/layout/PageHeader.svelte`](../../src/lib/components/layout/PageHeader.svelte)
— the trim mechanism that reclaimed half a mobile fold:

```css
/* PageHeader.svelte:61-67 — net the first gap down without touching inter-block rhythm */
.page-header.trim { margin-block-end: calc(var(--gok-space-600) - var(--gok-space-section)); }
```

**Proposed DS behaviour / API.**

```svelte
<gok-page-header eyebrow="Mortgages" title="Mortgage calculator" caption="Model a monthly payment.">
  <gok-button slot="actions">Export</gok-button>
</gok-page-header>
```

**Acceptance criteria.**
- Mono-uppercase eyebrow + title + optional caption + optional right-aligned `actions` slot; a `trim` mode that
  nets the header→content gap to ~`--gok-space-600`. Kills the ~58-route duplication and the mobile void.

---

## P10 · `gok-textarea` — multi-line text field  *(ALREADY ON THE BACKLOG — annotate)*

**Priority:** P1 · **Reconciliation:** ANNOTATE (a `gok-textarea` line already exists in `tasks/backlog.md`) ·
**Dogfooding:** #31

**Need / why.** `gok-input` is single-line only, so any free-form prose field has no DS primitive. This is
**already tracked** — this entry just adds the bank's evidence so it can be prioritized with a real use-case.

**Where it bit (use-cases).** The support ticket (raise body + reply, S01) — the **one place the bank drops to
raw HTML** because no primitive exists. Also: dispute notes, claim descriptions.

**Evidence.** App-local tokened `<textarea>` mirroring `gok-input`'s label + reserved-message anatomy
(`--gok-*` roles, focus ring via `--gok-color-primary`).

**Acceptance criteria (to attach to the existing backlog line).**
- Reuse the `gok-input` field shell + `FormControlElement`: label, sizing (rows / auto-grow), error/help message
  line, optional char-count. Retires the bank's raw-`<textarea>` in support.

---

## P11 · `gok-file-upload` / dropzone

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #6

**Need / why.** KYC, claims, mortgage docs, and disputes all need file upload with progress; the DS ships none.
The bank composes a dropzone over `gok-progress`.

**Where it bit (use-cases).** KYC ID + selfie, insurance claim evidence, mortgage document upload, dispute
attachments.

**Proposed DS behaviour / API.**

```svelte
<gok-file-upload accept="image/*,application/pdf" multiple onfiles={(files) => …} />
```

**Acceptance criteria.**
- Drag-and-drop + click-to-browse, `accept`/`multiple`, per-file progress (composes `gok-progress`), remove a
  queued file, accessible (keyboard + announce). Error states for type/size.

---

## P12 · Carousel / scroll-snap strip (`gok-carousel`)

**Priority:** P1 · **Reconciliation:** NEW · **Dogfooding:** #22

**Need / why.** The cards wallet needs a horizontally-paged strip of card faces. The bank built `CardStrip` (a
scroll-snap rail + **roving-tabindex** keyboard nav). **Scope note:** the brand **card-art** (`CardArt`) is
intentionally app-local — it's brand object art that legitimately reaches for *core* colour tokens, not a DS
control. The **carousel/strip mechanics** are the DS-worthy part.

**Where it bit (use-cases).** Cards wallet + detail; any future "paged tiles" surface (offers, onboarding slides).

**Proposed DS behaviour / API.**

```svelte
<gok-carousel label="My cards" snap="x">
  <article>…app-owned card face…</article>
</gok-carousel>
```

**Acceptance criteria.**
- Scroll-snap horizontal rail, roving-tabindex keyboard nav (arrows move focus between items), accessible
  labelling, optional pagination dots. Hosts arbitrary app-owned content (does not dictate the slide's visuals).

---

## P13 · Chart / sparkline strategy + token-bridge

**Priority:** P1 (chart engine: likely out of DS scope; **sparkline + token-bridge: in scope**) ·
**Reconciliation:** NEW · **Dogfooding:** #1, #8, #27

**Need / why.** Dashboards, accounts, portfolio, budgets, and lending need charts (line/area/sparkline/donut/
bar/candlestick). The DS ships no chart primitive, so the bank uses **TradingView Lightweight Charts + Apache
ECharts** behind a `--gok-*` **token-bridge** that re-themes on a `data-theme` MutationObserver. Two narrower
asks fall squarely on the DS: an inline **`gok-sparkline`** (needed *inside* table rows — see **R1**), and a
documented **token-bridge contract** so every consumer themes third-party charts the same way.

**Where it bit (use-cases).** Net-worth trend, wallet balance history, portfolio performance, budget rings,
amortization, **per-row sparklines** in the holdings grid (which forced a hand-built table, R1).

**Proposed DS behaviour / API.**
- `gok-sparkline` — a tiny token-themed inline trend (values in, line/area out), usable in a table cell.
- A published **token-bridge** (the mapping of `--gok-*` → chart theme options) + the `data-theme` re-theme
  recipe, so consumers don't each re-derive it.

**Acceptance criteria.**
- `gok-sparkline` renders a token-themed trend at text size and re-themes on light/dark switch. The token-bridge
  is documented/exported so a TradingView/ECharts consumer themes from `--gok-*` without bespoke glue. (A full
  charting engine is explicitly *not* required — the bank owns that.)
