# Bug taxonomy — severity, categories, and the anatomy of a repro

## Severity rubric (S1–S4)

Severity answers one question for the product owner: **how much should this block release?** It is about
impact, not effort. Assign it from the user's and the money's point of view.

| Sev | Name | Definition | Examples | Ship gate |
|-----|------|------------|----------|-----------|
| **S1** | Blocker | Money/data loss or corruption; a core task is impossible; the app crashes/strands the user; security/auth bypass | Disclosed fee ≠ committed fee; double-charge on double-submit; transfer can't complete; login loops; balance shows wrong number | Must fix before ship. No exceptions. |
| **S2** | Major | A core task is badly degraded but has a workaround; a state is uncovered on a P0/P1 surface; a regression in shipped behaviour | Error sprung on submit instead of inline; no pending state on a transfer so it looks done when it isn't; row won't reopen; two primary buttons on a money action | Fix before ship unless explicitly waived by the product owner. |
| **S3** | Minor | Secondary feature breakage; cosmetic-but-noticeable UI defect; console error with no user-visible effect; missing empty/filtered state on a P2/P3 surface | Filtered-empty shows the zero-data copy; uncaught console error on a read screen; misaligned cell; wrong icon | Should fix; can ship with it logged. |
| **S4** | Cosmetic | Polish; trivial visual nit; copy typo (route to gokberk-design for wording) | 1px misalignment; tabular-numeral lapse; truncation that still reads | Backlog; non-blocking. |

When unsure between two levels, pick the higher and say why — over-flagging a money path is cheaper than
under-flagging it. A defect on a **P0 money surface** is at least S2.

## Defect categories (the `type` field)

- **functional** — the thing does the wrong thing or nothing (submit fails, validation missing, wrong
  result). Owner = domain expert.
- **regression** — something that worked before is now broken. Tag the suspected cause if known; always
  back with an E2E spec so it can't recur silently.
- **ui-visual** — renders wrong: hierarchy (two accents), alignment, overflow, truncation, theme/dark-mode,
  density. Report the breakage; the visual *fix* is `gokberk-design`'s call.
- **state-coverage** — a missing or wrong empty / loading / inline-error / page-error / pending state.
  Owner = `gok-bank-ux` (the state matrix), domain expert in cc.
- **console-network** — uncaught error, unhandled rejection, failed mock fetch (404/500), noisy warning.
  Capture the console/network log as evidence.
- **navigation** — broken link, dead route, wrong active highlight, back-button strands, deep link 404s,
  "Soon"/disabled item that's actually reachable.
- **data-integrity** — money not in minor units, float drift, FX mismatch, totals that don't reconcile,
  wrong locale grouping. Always at least S2 on a money surface.
- **a11y** — keyboard can't complete the flow, focus lost on step change, error not announced, focus trap
  in a dialog, reduced-motion ignored. (Flow-level; component a11y is the design system's.)

## Anatomy of a reproducible finding

A finding without a reproduction is a rumour. Every entry must let a junior engineer see it from the
write-up alone:

1. **ID** — `<DOMAIN>-Q-<n>` (e.g. `PAY-Q-03`). UX-audit uses `-U-`.
2. **Title** — one line, what's wrong, not what you did. "Disclosed FX rate doesn't match committed amount"
   not "tested exchange".
3. **Severity + type** — from the rubrics above.
4. **Route / screen** — the exact URL (`/payments/exchange`) and the precise sub-state.
5. **Steps to reproduce** — numbered, from a known start (logged-in home), each step an action a person can
   repeat. Include the data you entered.
6. **Expected vs actual** — the spec-backed expectation, then what actually happened. Cite the spec/section
   when you have it.
7. **Evidence** — the screenshot path in `assessmentv1/<domain>/screenshots/` and/or the snapshot/console
   excerpt. No evidence → it's a "note", flagged as unverified.
8. **Owner + gate** — the domain expert skill that owns the fix area, plus `gok-bank-product-owner` for the
   ship decision.
9. **Suggested fix area** — *where* to look (component, store, validation), not the visual/brand fix.
10. **Linked E2E** — the `e2e/<domain>/…spec.ts` test that now guards it (for S1/S2).
11. **Status** — `open` / `ack` / `fixed` / `wontfix`.

## Don't file these as bugs

- Intended-by-design stack behaviour (blank flash before registration; `gok-spinner` for unknown waits;
  determinate-only progress) — see `test-strategy.md`. If you suspect the design itself is wrong, that's a
  hand-off to `gok-bank-ux` / `gok-bank-ux-audit`, not a QA defect.
- Ergonomics ("too many steps", "button too far down") — that's `gok-bank-ux-audit`'s finding, filed in
  `ux-findings.md`. Hand it over rather than logging it as a bug.
- Visual taste ("I'd use a different green") — that's `gokberk-design`. Report *breakage* (contrast fails,
  two accents), not *taste*.
