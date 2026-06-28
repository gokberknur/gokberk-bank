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
- [ ] **Forced-decision dialog contract** (dogfooding #33): guard parent drawer `gok-cancel`/`gok-close` on
  `e.target === e.currentTarget` + trap Escape on `no-dismiss` confirms; add missing `no-dismiss` to money-out
  confirms. Clears MON-Q-02, INV-Q01, CRY-Q-01, INS-Q-02, PAY-Q-01 (gok-bank-ux + touched domains)
- [ ] **ghost-button footgun** (dogfooding #18): replace invalid `variant="ghost"` so destructive actions
  aren't painted as the green accent. Clears INS-Q-01, CARD-Q-01, ACC-U-03 (gokberk-design boundary: use `secondary`)

## Batch 2 — Disclose-then-commit / persistence (trust-critical S2).
- [ ] **CARD-Q-02** over-ceiling limit clamps silently (disclosed ≠ committed) (gok-bank-cards)
- [ ] **CRY-Q-02** disclosed network fee never debited (gok-bank-wealth)
- [ ] **PAY-Q-06** completed FX conversion doesn't persist across navigation (gok-bank-payments)
- [ ] **SVC-Q-02** e-signed document's signed status doesn't persist to the vault (gok-bank-servicing)
- [ ] **PAY-Q-02** SEPA Instant presented as cancellable + fully reverses (gok-bank-payments)

## Batch 3 — Remaining functional S2s.
- [ ] **PAY-Q-03 / PAY-Q-04** silent no-op cancels on standing orders / mandates (gok-bank-payments)
- [ ] **PAY** missing confirmation-of-payee (gok-bank-payments)
- [ ] **SVC-Q-01** reply to a resolved ticket doesn't reopen it (gok-bank-servicing)
- [ ] **ACC-Q** / **CARD-Q** / **INS-Q** / **INV-Q** remaining S2s per per-domain files

## Batch 4 — Platform polish (S3/S4, cheap, app-wide).
- [ ] **favicon.svg 404** on every route → add `static/favicon.svg` (ACC-Q-05, LEND-Q-03, MON-Q-03, CRY, PLT-Q-06)
- [ ] **/settings 404** bare unstyled page → add a settings root (IDN-Q-02, PLT-Q-05)
- [ ] native `<input type=date>` → the F06 date picker on the flows that regressed (ACC-Q-03, IDN-U-02, insurance claim)
- [ ] dead "Soon" stubs that point at live routes → wire or hide (PLT-Q-01, ACC-U-02, INV-U-01, MON-U-02, CARD-Q-05)

## Batch 5 — UX ergonomics (gok-bank-ux-led; larger, post-blocker).
- [ ] **Scroll-hunted primary actions + header whitespace** (~12 surfaces) → shared sticky-CTA pattern + trim
  header band (ACC-U-01, PAY-U-01/04, CARD-U-01, LEND-U-01/02, INS-U-04/05, INV-U-05, CRY-U-01/02, SVC-U-2)
- [ ] **Cross-domain stepper inconsistency** (LEND-U-03 — three apply flows, three steppers) → unify on the wizard composite

## Deferred / backlog (not ship-blocking).
- Pure S4 cosmetics (tabular-numeral lapses, minor alignment), the funds fact-sheet/Buy build-out (INV-U-01
  scope), spend-analytics drill-downs (MON-U-02 scope) — these are feature work, not defects; route through the
  normal council, not this remediation.

## Ship condition
Batches **0 + 1 + 2** clear → shippable. Batch 3 strongly recommended pre-ship. Batches 4–5 are
post-ship polish that can ship incrementally.
