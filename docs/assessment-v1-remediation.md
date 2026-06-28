# Assessment v1 — remediation backlog

CPO-prioritized fix plan for the 105 findings from assessment v1 (full findings live in the git-ignored
`assessmentv1/`; the CPO rollup is `assessmentv1/index.md`). **Verdict: Reshape-to-ship** — the money
spines are correct and well-gated; what blocks ship is a small set of trust-breaking defects plus the app
being unusable on a phone. Fix in batch order below. Each fixed item flips its `test.fixme` E2E to active.

Gate owner: `gok-bank-product-owner`. Order is by what breaks the **primary relationship** and the
**disclose-then-commit** promise.

Legend: `[ ]` todo · `[x]` done (committed) · each item → its finding ID(s) + owning domain expert.

## Batch 0 — Ship blockers (S1). Must clear before ship.
- [x] **MON-Q-01** redeem double-click double-charges → single-flight latch in `RedeemFlow.svelte` (gok-bank-money) — fixed, spec active
- [x] **ACC-Q-01** transaction detail drawer "unreachable" → **false positive**: the drawer opens *and*
  reopens under a real click on the row's select control (the QA agent's synthetic clicks didn't trigger
  the custom checkbox). No code change — reverted a wrong attempt; the active E2E now proves reachability.
  Residual DS gap (no full-row click / no keyboard activation) logged in dogfooding #12, not ship-blocking.
  (gok-bank-accounts)
- [x] **PLT-U-01** 9/14 sections unbrowsable on mobile → the mobile "More" tab now opens a bottom overflow
  sheet listing every NAV section (≤2 taps to all 14); guarded by `e2e/platform/mobile-nav.mobile.spec.ts`
  on the iPhone/WebKit project (gok-bank-ux)

## Batch 1 — Systemic single-fixes (cheap, clear many findings at the source).
- [x] **ghost-button footgun** (dogfooding #18): replaced all 10 invalid `variant="ghost"` with `secondary`
  across 6 files — zero `ghost` left in source. Destructive triggers are now quiet, not the green accent.
  Clears INS-Q-01, CARD-Q-01, ACC-U-03; specs flipped active.
- [x] **Forced-decision dialog contract** (dogfooding #33). Two shapes, both fixed:
  - *Drawer-hosted confirms* (MON-Q-02 RedeemFlow, INV-Q01 OrderTicket, S2): guard `closeDrawer` on
    `e.target === e.currentTarget`, drop the confirm's `gok-cancel`/`gok-close` wiring, and `preventDefault`
    the drawer's own `gok-cancel` while the confirm is open (DS contract — keeps it open).
  - *Standalone `no-dismiss` confirms* (PAY-Q-01 send+exchange, CRY-Q-01 crypto, INS-Q-02 insurance
    cancel/withdraw/submit/buy, S3): drop the dialog's `gok-cancel`/`gok-close`→close wiring so Escape has no
    listener (the DS already blocks dismissal under `no-dismiss`); the explicit footer button still closes it.
  All specs active. NOTE: ~15 other `no-dismiss` dialogs across the app share the standalone pattern and
  should get the same sweep as a follow-up (tracked in dogfooding #33).

## Batch 2 — Disclose-then-commit / persistence (trust-critical S2).
- [x] **CARD-Q-02** over-ceiling limit clamped silently → `onLimitChange` now rejects over-ceiling with a
  no-blame error and doesn't apply it; toast reflects the stored value (gok-bank-cards). Spec active.
- [x] **PAY-Q-02** SEPA Instant presented as cancellable + fully reversed → Instant is final/Settled, the
  cancel/reverse affordance removed; cancel-until-cut-off reserved for the standard rail (gok-bank-payments).
- [x] **SVC-Q-02** e-signed status didn't persist to the vault across reload → documents store overlays the
  signed-state from the persisted e-sign session (reactive, reload-safe) (gok-bank-servicing). Spec active.
- [x] **CRY-Q-02** disclosed network fee never debited → `recordSend`/`placeSend` now charge the fee in crypto
  units on top of the send, so held balance drops by units + fee (gok-bank-wealth).
- [~] **PAY-Q-06** "completed FX conversion doesn't persist across navigation" → **by-design, not a defect.**
  Investigation: the data layer's `appendTransaction`→`applyToWallet` *already* mutates `currentMinor`/
  `availableMinor` for the settled FX legs, and `convert()` bumps `revision`, so both balances update in-session
  everywhere (the finding's own "New exchange shows the deduction" confirms it). The only divergence is across a
  **full reload**, which regenerates the seed — the documented app-wide demo behavior ("Nothing is persisted — a
  reload regenerates the seed"), identical for every money movement. An initial per-surface balance mutation was
  written then reverted (it double-counted against `applyToWallet`). CPO call: no per-surface fix; the receipt
  copy is honest within the session. (gok-bank-payments + gok-bank-product-owner)

## Batch 3 — Remaining functional S2s.
- [x] **PAY-Q-03 / PAY-Q-04** "silent no-op cancels" on standing orders / mandates → **mis-diagnosed.** The
  cancel/pause handlers work (proven: a direct JS click cancels correctly). The real bug: the forced-decision
  confirm `gok-dialog` was authored as a *sibling after* `</gok-drawer>`, so it was occluded by the open
  drawer's top-layer backdrop and **physically unclickable** (every click hit `<main>`; reproduced in real
  `@playwright/test`). Fixed by nesting each confirm inside its drawer (top layer → clickable) + the #33
  teardown guards; also covers the MandatesManage dispute dialog. Logged as dogfooding #37. Specs active.
- [x] **PLT-Q-03** Home "Net worth" headline excluded the investment portfolio (understated ~60%) →
  `getNetWorthEurMinor` now adds the portfolio value; the trend series carries it as a flat offset so the
  chart endpoint reconciles; the hero caption gains an "Investments" term (gok-bank-ux / accounts / wealth). Spec active.
- [x] **PLT-Q-02** command-palette Enter ignored match score (fixed group order) → `search()` now orders
  groups by their best member's score (exact prefix > fuzzy), so the top hit is the first row + Enter target,
  keeping the eyebrow grouping (gok-bank-ux). Spec active.
- [x] **ACC-Q-02** running-balance column incoherent in date-desc ledger → **CPO call** (resolved the hide-vs-fix
  fork in favour of *correct, not hidden*). Root cause: the seed assigns `runningBalanceMinor` in ascending
  (date, id) settlement order, but `applyView`'s id tiebreak was direction-independent, so the date-desc view
  scrambled same-day rows; pending rows were stamped with the current balance. Fix: (1) `txn-filter.ts` tiebreak
  now follows the sort direction → date-desc is strict reverse-settlement order; (2) `TransactionGrid` +
  `TransactionDrawer` blank the balance for non-settled rows. The fixme spec was rewritten to the *true*
  invariant — settled rows reconcile row-to-row (newer.balance − older.balance == newer.amount), not a flawed
  monotonic assumption — and is now active (gok-bank-accounts). Spec active.
- [x] **PAY-Q-05** missing confirmation-of-payee → **built** (CPO ship: anti-APP-fraud is table-stakes for a
  premium EU neobank). A deterministic CoP sim (`confirm-payee.ts`, name-match by IBAN hash) feeds a new
  SEPA-only "Confirm" step in the add-payee wizard: a clean match shows a positive confirmation; a mismatch
  surfaces the registered account name in a `gok-alert` and **gates Continue** behind an explicit
  "I've checked this is correct" acknowledgement (the wizard's forward-gating via the step's `validate`).
  No-blame copy per gok-bank-payments `collecting-and-payees` / `regulatory-and-trust`. Two E2E paths (match
  proceeds; mismatch blocks until acknowledged). Duplicate-payee detection remains the one deferred TODO.
- [x] **SVC-Q-01** reply to a resolved ticket didn't reopen it → `addReply` now flips a `resolved` ticket
  back to `open` on reply, honoring the on-screen "a reply reopens the conversation" promise (gok-bank-servicing). Spec active.
- [ ] **ACC-Q** / **CARD-Q** / **INS-Q** / **INV-Q** remaining S2s per per-domain files

## Batch 4 — Platform polish (S3/S4, cheap, app-wide).
- [ ] **favicon.svg 404** on every route → add `static/favicon.svg` (ACC-Q-05, LEND-Q-03, MON-Q-03, CRY, PLT-Q-06)
- [ ] **/settings 404** bare unstyled page → add a settings root (IDN-Q-02, PLT-Q-05)
- [ ] native `<input type=date>` → the F06 date picker on the flows that regressed (ACC-Q-03, IDN-U-02, insurance claim)
- [ ] dead "Soon" stubs that point at live routes → wire or hide (PLT-Q-01, ACC-U-02, INV-U-01, MON-U-02, CARD-Q-05)

## Batch 5 — UX ergonomics (gok-bank-ux-led; larger, post-blocker).
- [x] **5A Foundation** — three reusable patterns: `StickyActionBar` (extracted from the proven instrument/crypto
  `.cta-bar`), `PageHeader` (standard eyebrow+title+caption that trims the header→content void), and the
  `Wizard` footer made sticky on mobile (fixes the Continue/submit on every wizard flow at once). Trade pages
  refactored onto `StickyActionBar` (DRY).
- [~] **Scroll-hunted primary actions + header whitespace** → shared sticky-CTA + header trim. **Done (5B):**
  INV-U-05 (Place order pinned), INS-U-04 (policy actions pinned), CARD-U-01 (reveal/settings pinned),
  CRY-U-01 (SendPanel CTA sticky on mobile), SVC-U-2 (support header shortcut → form). PAY-U-01/INS-U-05/
  LEND-U-01 ride the sticky wizard footer (5A). Each with a mobile (WebKit) reachability spec
  (`*.reachability.mobile.spec.ts`, `toBeInViewport`). **Done (5D):** ACC-U-01 — /home dashboard flattened to
  flat grid children; on mobile (single column) recent activity now rides high (right after balances) while
  desktop keeps the sticky right rail via `grid-template-areas`; mobile order spec added.
  **Done (LEND-U-02):** the mortgage calculator now pins a compact, mobile-only sticky monthly-payment readout
  at the top (hidden on desktop, where the results column already sits beside the inputs); mobile reachability
  spec added.
  **Deferred to council (CPO call):** CRY-U-02 / PAY-U-04 (the broad header-void
  sweep across every crypto/payments surface — S3, low-value churn; the `PageHeader` trim mechanism is in place
  for routes that adopt it). → council/design queue.
- [x] **5C Stepper consistency** (LEND-U-03, INS-U-02) — **CPO reshape:** a full `createWizard` migration of
  the mortgage / credit-line flows was rejected as high-risk/low-value — they're decision-gated state machines
  (amount → soft-check → eligible/referred/declined → offer → sign), not the forward-gated linear model the
  composite assumes, and the loan reference flow itself runs its outcome phases outside the composite. Instead,
  extracted the composite's progress signal into a shared `WizardProgress` ("Step k of N" + `gok-progress`
  fraction) and dropped it into credit-line, mortgage, and the insurance quote (which had *no* indicator at
  all). Every multi-step flow now shows the same progress signal without rewriting compliant disclosure logic.
  Consistency spec added. **Deferred to council** (documented, not done here): **LEND-U-04** (loans signs inline
  vs mortgage/credit-line routing to `/documents/[id]/sign` — rerouting a working compliant flow is risk without
  clear value) and **PAY-U-03** (collapse scheduled frequency/start/end into one step — S3 effort, moderate-risk
  refactor of a working wizard). → moved to the council/design queue.

## Deferred / backlog (not ship-blocking).
- Pure S4 cosmetics (tabular-numeral lapses, minor alignment), the funds fact-sheet/Buy build-out (INV-U-01
  scope), spend-analytics drill-downs (MON-U-02 scope) — these are feature work, not defects; route through the
  normal council, not this remediation.

## Ship condition
Batches **0 + 1 + 2** clear → shippable. Batch 3 strongly recommended pre-ship. Batches 4–5 are
post-ship polish that can ship incrementally.
