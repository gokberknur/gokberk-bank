# Regression checklist — run this on every screen before free-exploring

These are the cross-cutting checks every screen gets, seeded from the real footguns already logged in
`docs/dogfooding-findings.md`. Run them first; they catch the repeat offenders fast. Then free-explore the
screen's own behaviour.

## On every screen

- [ ] **Console is clean.** No uncaught errors, no unhandled rejections, no failed mock fetches (404/500)
      on load or on the primary interaction. (chrome-devtools `list_console_messages` /
      `list_network_requests`.)
- [ ] **One accent per context.** Exactly one primary (solid-green) action in a given context. Two solid
      greens = the invalid-variant footgun (dogfooding #18: a `ghost`/other invalid `gok-button variant`
      silently falls back to `primary`). Flag as `ui-visual`, S2 on a money action.
- [ ] **All four+ states reachable and correct** — empty (zero-data), filtered-empty (search→0), loading
      (skeleton not blank-spinner), inline error, page error, pending. Open each; a missing or wrong one is
      `state-coverage`.
- [ ] **Navigation is honest.** Every link/CTA goes somewhere real; the active nav highlight matches the
      route; back button doesn't strand; a "Soon"/disabled item isn't actually reachable; deep-linking the
      route directly (reload on it) doesn't 404 (SPA fallback should serve it).
- [ ] **Theme + density hold.** Toggle light/dark (and density if exposed) — no hardcoded colour leaking,
      no contrast failure, no broken layout. Status is conveyed by icon + text, never colour alone.
- [ ] **Numbers are tabular and grouped right.** Money grouped per locale (`1,234.50`), tabular numerals,
      and **integer minor-units** under the hood — no float drift, no lost cent.
- [ ] **Keyboard can complete it.** Tab through; the primary action is reachable and operable by keyboard;
      focus is visible; focus isn't lost on dynamic updates.

## On any table / ledger (`gok-table`)

- [ ] **Row reopen works (dogfooding #12).** Click a row → drawer opens → close → click the **same** row
      again → drawer reopens. If it doesn't, that's the controlled-selection bug, `functional` S2.
- [ ] **Sort, paginate, filter** each fire and update without throwing; filtered-to-zero shows the
      *filtered*-empty copy, not the zero-data copy.
- [ ] **Status cells** read as word + (ideally) icon, never colour alone (the grid is word-only by DS
      limitation — confirm the full rule+icon shows in the row's detail drawer).

## On any money flow (P0)

- [ ] **Disclosed = committed.** The fee/rate/ETA on review exactly matches what moves on the ledger and
      shows on the receipt — to the cent. Mismatch = `data-integrity` S1.
- [ ] **No double-submit.** Double-click / double-Enter the confirm → exactly one transaction.
- [ ] **Forced-decision confirm is forced.** Irreversible action's `gok-dialog tone="danger" no-dismiss`
      can't be escaped by backdrop/escape; declining has no side effect.
- [ ] **Failure recovers.** Inject a failed commit (mock route) → no double-charge, no half-state, a
      no-blame recovery message saying what happened + what to do.
- [ ] **Validate early.** Bad IBAN / insufficient funds / over-limit / age-gate caught as the user types,
      not sprung on submit.

## On any input composite

- [ ] **Money input** keeps the numeric keypad (`inputmode=decimal`), groups on blur, canonical value in
      minor units (dogfooding #14/#15 — live-ungrouped is expected, not a bug).
- [ ] **OTP / code input** advances on type, retreats on backspace, accepts paste-to-fill, arrow-navigates
      (dogfooding #5).
- [ ] **Date / date-range, file-upload, combobox/multi-select** composites each open, accept input, and
      validate; dropzone shows progress; combobox filters free-text.

## On any security / step-up gate

- [ ] **Step-up is cancellable** with no side effect on cancel (dogfooding #32), and the confirm is disabled
      until "verified".
- [ ] Consequential actions (revoke, sign-out-all, passkey add/remove, 2FA change, large/new-payee send)
      actually gate behind it.

When a check is N/A for a screen, skip it explicitly (don't silently drop it). When a check fails, it's a
finding — write it up per `bug-taxonomy.md` and, for S1/S2, lock it with an E2E spec.
