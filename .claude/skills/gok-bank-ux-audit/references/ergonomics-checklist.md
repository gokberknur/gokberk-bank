# Ergonomics checklist — run this on every screen you audit

Concrete, per-screen checks. Run them on the built app (desktop + a mobile viewport) with playwright-cli,
capture screenshots as evidence, and turn each failure into a finding. These are about *effort and
reachability*, not breakage (that's QA) and not design intent (that's gok-bank-ux).

## Set up the look first

- [ ] Load the screen authenticated (saved storageState) at a **common laptop height** (e.g. 1280×800) and
      take a screenshot — this is your "at rest, above the fold" view.
- [ ] Reload at the **mobile target — iPhone / Mobile Safari (WebKit), 390×844** — and screenshot. This
      is your thumb-reach view, and it must be the WebKit engine (the device class the app ships to), not a
      Chromium mobile emulation, since Safari's rendering and viewport quirks are part of the experience.
- [ ] Name **the one job** the user came here to do, in one sentence. Everything below is graded against it.

## Primary-action reachability

- [ ] Is the primary action **visible at rest** (in the above-the-fold screenshot) on desktop? If the user
      must scroll to find it, that's `reachability`, ≥S2 on a P0/P1 task.
- [ ] On mobile, is the core action in the **lower-reachable / thumb zone** (sticky CTA, bottom tab), not
      stranded in a top corner? A top-right primary on a phone is a stretch finding.
- [ ] Is there **exactly one** obvious primary action, or does the user have to choose between several
      equally-weighted CTAs to figure out which one does their job? (Multiple solid-green buttons is also a
      QA visual bug — hand the bug to QA, keep the "which do I press?" confusion as yours.)
- [ ] If the action is necessarily below a lot of content, is it made **sticky** so it follows the user?

## Task effort

- [ ] Walk the core task to completion and **count**: screens/steps, clicks+taps, fields, and explicit
      decisions. Record the numbers (method: `task-completion-audit.md`).
- [ ] Compare to **intent** (`.planning/ux/ux-flows.md`) and a **benchmark** (Revolut/Wise/Monzo for the
      same job). Effort meaningfully above either is a finding.
- [ ] Is every step **earning its place**? Mark any step that could collapse, autofill, default, or be
      progressively disclosed.
- [ ] Does **Back / cancel** preserve entered data, or punish the user by clearing it?

## Scroll burden

- [ ] To *understand* the screen (what's my balance / status), how far must the user scroll? Key info above
      the fold?
- [ ] To *act*, how far must the user scroll? Count it.
- [ ] On a long screen, does the most-important thing come **first**, or is the user scrolling past
      secondary cards to reach it?

## Friction calibration

- [ ] Is friction **present where trust is earned** — step-up/confirmation on new-payee or large or
      irreversible money actions? Missing guard on a consequential action = finding (and hand the *security*
      angle to QA/identity).
- [ ] Is friction **absent where it's wasted** — no needless confirmation dialog on a reversible,
      low-stakes action (moving own money, toggling a setting)? Wasted friction = finding routed to
      gok-bank-ux.

## Consistency

- [ ] Does this screen's primary verb (add / send / cancel / filter) sit and behave **the same** as the
      equivalent on other domains? Note any place the user must re-learn the pattern.
- [ ] Same component for the same job (a `gok-table` ledger, a wizard stepper, a money input) across
      domains?

## Information scent

- [ ] From the entry point (nav, home, an empty state), can the user **tell where to go** to do this task
      without trial-and-error? Are labels and empty-state CTAs pointing the way?
- [ ] Does the screen title / eyebrow / breadcrumb confirm the user is in the right place?

## Reachability by keyboard (flow-level)

- [ ] Can the user **reach and operate the primary action by keyboard** without a mouse?
- [ ] Does **focus land sensibly** on each step / when a dialog or drawer opens, and not get lost when
      content updates? (Component-level a11y is the design system's; the *journey* reachability is yours.)

## States from the user's eye

- [ ] When there's no data, does the **empty state** tell the user what to do next (a CTA), or just say
      "nothing here"? (Whether the state *exists* is QA's check; whether it's *helpful* is yours.)

For each failure, write a finding per `reporting-format.md`: severity by experience impact, type, the cost
(with numbers / screenshots), and the owner (gok-bank-ux to redesign, or the domain expert for
task-inherent friction) + gok-bank-product-owner. Skip N/A checks explicitly — don't let silence read as a
pass.
