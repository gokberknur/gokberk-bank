# Flow-level accessibility

Component accessibility — a button's role, an input's label, a dialog's focus trap — belongs to the
**design system** (`gok-*` components ship it) and to `gokberk-design`. This reference is the layer above:
the **journey** must be operable by keyboard and screen reader *as a whole*, across steps, overlays, and
async transitions. A wizard made of perfectly accessible widgets can still be an inaccessible journey if
focus is lost between steps or a step change is never announced. That gap is yours to close.

> Complements, never duplicates, component a11y. If the question is "is this button labelled", that's the
> component / `gokberk-design`. If it's "where does focus go when step 3 loads, and how does a screen
> reader user know they advanced", that's here.

## Focus order through a journey

- **On step change**, move focus deliberately — to the new step's heading (or its first field). Don't
  leave focus on the now-gone "Continue" button or let it fall to `<body>` (which dumps the screen-reader
  user at the top and forces them to re-traverse). The wizard composite owns this move; you spec it.
- **On Back**, focus returns predictably — to the step heading, with prior input intact (Back never
  validates, per `patterns.md` §1).
- **On per-row "Edit" from review**, focus lands on the field being edited, and returning to review
  restores focus to that row. The edit-and-return loop must not lose the user's place.
- **Logical tab order** within each step matches the visual order; the single primary action (Continue) is
  reachable without tabbing through every secondary affordance first.

## Keyboard journeys — complete the whole flow without a mouse

The test is end-to-end: can a keyboard-only user complete onboarding, send money, or apply for a loan from
the first field to the success screen? Each surface type:

- **Wizard / stepper** (`patterns.md` §1): `gok-tabs activation="manual"` means arrowing the step rail
  moves focus and Enter/Space selects — but forward navigation is *guarded by validity*, so the keyboard
  path is Continue (when valid) → next step. Back is always available. Unvisited steps aren't focusable as
  jump targets. The whole flow must be drivable by Tab + Enter + arrows.
- **Dialog** (`gok-dialog`, incl. forced-decision and 3-DS push): focus moves *into* the dialog on open and
  is **trapped** until a decision; Escape closes a dismissible dialog but a `no-dismiss` forced-decision
  dialog requires an explicit choice (the component traps; you ensure the *decision* is keyboard-reachable
  and the primary button is focused appropriately). On close, focus returns to the element that opened it.
- **Drawer** (`gok-drawer` — transaction detail, order ticket, card settings): focus enters the drawer,
  is reachable throughout, Escape closes, and focus returns to the launching control. A drawer the keyboard
  can open but not escape is a trap.
- **Command palette / step-up interceptor** (`?cmd`, `?step-up`): opens with focus in the input, fully
  arrow-navigable, Escape cancels with **no side effect** (the original intent resumes only on success —
  `patterns.md` §6).

## Announcements (screen-reader)

Sighted users see the journey progress; non-sighted users must be *told*. Use live regions and ARIA state:

- **Step changes** are announced — the new step's number and title ("Step 3 of 6, Identity"). A silent
  step change leaves the screen-reader user unsure anything happened. `aria-current="step"` marks the
  active step in the rail.
- **Progress** is programmatic, not just visual — the "3 of 6" fraction reaches assistive tech, not only
  the eyes (`gok-progress` exposes value/max; ensure the fraction is announced, not painted).
- **Validation / errors** announce via a live region as they appear (`role="alert"` / `aria-live`), tied to
  the field (`aria-describedby`, `aria-invalid`) — the reward-early inline error must *speak*, not just
  turn the line red. Colour-not-alone (brand rule) already covers the visual; the announcement covers the
  audible.
- **Pending / async results** announce when they resolve ("Processing", then "Sent, reference …"). The
  anxiety gap is worse without sight — close it audibly.
- **Optimistic actions + undo:** the toast's action (undo) is reachable and its appearance announced; an
  undo the screen-reader user can't find is no undo.

## Skip-ahead & efficiency

- **Don't force linear re-traversal.** A returning/expert user shouldn't tab through every completed step.
  Visited steps are navigable; the command palette (Cmd/Ctrl-K) is a global skip-ahead to actions and
  destinations (`patterns.md` §8).
- **Skip links / landmarks:** the app shell's main content is reachable past the persistent sidenav/navbar
  so a keyboard user isn't re-tabbing the chrome on every route (`patterns.md` §9). Each wizard step is a
  landmarked region with a heading.
- **Resumability is an a11y feature too:** a draft token + Back-editable steps mean an interrupted
  assistive-tech user returns where they were, not to the start.

## Reduced motion

- **Honour `prefers-reduced-motion`** across the journey, not just per component: step transitions,
  drawer/sheet slides, the instant-spend push animation, success affordances. The brand's motion is
  already "quiet"; reduced-motion takes it to essentially none — transitions become instant, decorative
  motion is dropped, meaning is never carried by motion alone.
- **Motion never the sole signal.** A step advancing, a success, a pending state must read without the
  animation (status by rule + icon + text — the brand rule — covers this; verify it holds when motion is
  off).

## Flow-a11y checklist (run on any multi-step or overlay journey)

- [ ] Focus moves to the new step's heading/first field on every step change; returns predictably on Back.
- [ ] The entire journey completes by keyboard alone, first field to success.
- [ ] Dialogs/drawers trap focus while open and restore it to the opener on close; Escape behaves correctly
      (and a forced-decision dialog still requires a keyboard-reachable choice).
- [ ] Step changes, progress, errors, and async results are announced via live regions / ARIA state.
- [ ] `aria-current="step"` and a programmatic progress value are present, not just a visual bar.
- [ ] Skip links / landmarks let keyboard users bypass the persistent shell.
- [ ] `prefers-reduced-motion` is honoured journey-wide; no meaning depends on motion alone.
- [ ] Resumability (draft token, Back-editable) returns interrupted users to their place.
