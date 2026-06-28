# Heuristic framework — Nielsen's 10, plus the banking ergonomic lens

You evaluate the built app against established usability heuristics, sharpened for a money app. Use this to
*name* what's wrong in a way the team can act on — "violates recognition over recall" is more useful than
"feels clunky."

## Nielsen's 10, applied to gökberk bank

1. **Visibility of system status** — the user always knows what's happening: a pending transfer says
   "pending", a soft credit check says "checking…", a slow load shows a skeleton. *Faked completion* and
   *silent waits* are the violations.
2. **Match between system and the real world** — plain language, real-world money concepts (available vs
   current balance, IBAN, "you'll receive"), not internal jargon (rail codes, enum names) in the UI.
3. **User control and freedom** — clear exits: cancel a flow, undo a reversible action, go back without
   losing entered data. A wizard that drops your input on Back is a violation.
4. **Consistency and standards** — the same action behaves the same everywhere (see "Consistency" below).
   Follow the app's own `.planning/ux/patterns.md`, not novelty per screen.
5. **Error prevention** — validate early (reward-early), guard destructive actions, disable the confirm
   until valid. Preventing the error beats a good error message.
6. **Recognition rather than recall** — show options; don't make the user remember a payee's IBAN, the last
   amount, or which tab held the thing. Smart defaults and recently-used reduce recall load.
7. **Flexibility and efficiency** — accelerators for repeat users (recent payees, saved amounts, the
   command palette) without burdening first-timers. Progressive disclosure serves both.
8. **Aesthetic and minimalist design** — every element earns its place; the screen isn't a wall of cards
   the user must scroll past to reach the one action they came for. (Visual *taste* is `gokberk-design`'s;
   *clutter that adds effort* is yours.)
9. **Help users recognize, diagnose, recover from errors** — no-blame errors that say what happened + what
   to do, in plain words, with the recovery action right there.
10. **Help and documentation** — contextual help where a decision is hard (SWIFT charge codes, KYC, FX
    spread), not a buried manual.

## The banking ergonomic lens (your differentiators)

Beyond the classic 10, you measure these — they're where a money app wins or loses:

- **Primary-action reachability.** Name the screen's one job; locate its action. Grade:
  *visible at rest* (above the fold / in the thumb zone) → *sticky* (follows on scroll) → *scroll-hunted*
  (user must scroll to find it) → *hidden* (behind a menu/overflow). Scroll-hunted on a core task is at
  least S2. Capture a desktop screenshot at a common laptop height (e.g. 800px) and a mobile screenshot.
- **Task effort.** The number of steps / clicks-taps / fields / decisions to complete the core job, on the
  *built* flow. Compare to intent (`.planning/ux/ux-flows.md`) and a benchmark. Effort above intent is a
  finding with a number. (Method: `task-completion-audit.md`.)
- **Scroll burden.** How far the user scrolls to (a) understand the screen and (b) act. A dashboard where
  the balance and the primary actions are below the fold makes every visit start with a scroll.
- **Thumb reach (mobile).** On a phone viewport, the core action must sit in the lower-reachable zone, not
  the top corner. A bottom-tab or sticky CTA is reachable; a top-right "Send" is a stretch.
- **Information scent.** Can the user tell, without clicking, where to go to do their task? Labels, nav
  grouping, and empty-state CTAs should point the way. Weak scent shows up as "I didn't know where to
  start."
- **Consistency across domains.** The same verb should have the same shape app-wide: where "add", "send",
  "cancel", "filter" live, what they look like, how confirmation works. Inconsistency forces re-learning
  each screen — a real, measurable cost.
- **Friction-vs-trust calibration.** Friction is a budget. Spend it where trust is earned (step-up on a
  new-payee large send, forced-decision on irreversible money) and remove it everywhere else (moving own
  money between pots should feel free). Flag both *missing* friction (an irreversible action with no guard)
  and *wasted* friction (a confirmation on a reversible, low-stakes action).

## Severity, the ergonomic way

You use the same S1–S4 labels as QA, but graded by **experience impact**, not breakage:

- **S1** — the core task is so heavy/hidden that a real user would abandon or fail it (primary action
  hidden behind a menu; 10 steps for a one-step job; an irreversible action with no guard).
- **S2** — significant friction or a scroll-hunted primary action on a P0/P1 task; an inconsistency that
  forces re-learning a money flow; missing guard on a consequential action.
- **S3** — noticeable friction on a secondary task; weak information scent; minor inconsistency.
- **S4** — polish: a slightly long label, a marginally roomy layout that still reads.

When the friction is *inherent to the task* (regulation forces 12 KYC fields), route it to the domain
expert and `gok-bank-product-owner` (is it worth it?). When it's the *build's design choice*, route it to
`gok-bank-ux` to redesign.
