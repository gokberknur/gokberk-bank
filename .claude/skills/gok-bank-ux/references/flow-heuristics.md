# Flow heuristics — usability, friction, conversion

The judgement layer: how to tell whether a flow is too heavy, too risky, too confusing — and how to fix
it. Apply these on top of the spine in `references/journey-design.md`. Source of truth for *this app's*
patterns: `.planning/ux/patterns.md`.

## Nielsen's heuristics, applied to banking

The ten classic heuristics, read through a money lens:

1. **Visibility of system status.** The user always knows where they are and what's happening: the wizard
   fraction ("3 of 6"), a real **pending** state for unsettled money, the instant-spend push within ~1s
   (`patterns.md` §10). Silence after a money action is the worst failure — it triggers "did it go
   through?".
2. **Match the real world.** Speak the customer's language: "what they receive", "arrives by Thursday",
   not "settlement T+1". Money in the customer's mental model (available vs current balance, held funds
   itemised — `patterns.md` §3).
3. **User control and freedom.** Back is always free and never validates. Per-row Edit on review.
   Cancel-until-cutoff and undo. An emergency exit from every overlay.
4. **Consistency and standards.** Every value journey uses the *same* spine and the *same* wizard shell —
   the customer learns the bank once. A confirm dialog always means finality; a toast-with-undo always
   means reversible. Don't make "Continue" mean different things on different steps.
5. **Error prevention.** Better than recovery. Reward-early validation (funds, IBAN checksum, limits, age
   gate) stops the error before submit. Confirmation-of-payee stops the wrong-IBAN send. Forced-decision
   confirm stops the accidental irreversible commit.
6. **Recognition over recall.** Saved payees, recent recipients, smart defaults, the command palette
   (`patterns.md` §8). Don't make the user remember an IBAN or re-type what the app already knows.
7. **Flexibility / efficiency.** Power lives behind progressive disclosure ("More options"), keyboard
   shortcuts (Cmd/Ctrl-K), repeat-a-payment from a transaction. Fast path for the common case, full
   control for the expert — neither blocks the other.
8. **Aesthetic / minimalist design.** Every field, badge, and step earns its place. This is *your* mandate
   to cut. (The *look* of the minimalism is `gokberk-design`'s; the *count* of steps and fields is yours.)
9. **Help users recover from errors.** Plain-language, no-blame, actionable: *what happened + what to do*.
   "Your bank rejected this card — try another card." Never a code, never blame. See error recovery below.
10. **Help and documentation.** Inline and contextual: a `gok-tooltip` on the FX margin, "why we ask" on a
    KYC field, the representative example on a loan offer. Disclosure beats a separate help page.

## Friction vs. trust — the calibration

Friction is a **budget you spend to earn trust**, not a default. The fintech paradox: the very steps built
to inspire confidence (KYC loops, re-auth, confirmations) erode it when applied where no trust is at
stake. ~34% of onboarding quits come from being asked too much / too many verification loops; ~39% from
waiting. So:

**Spend friction where money or identity is at real risk:**

- New payee, large amount, or odd pattern → **step-up** + confirmation-of-payee name-match warning
  (`patterns.md` §6; the domain expert sets the threshold).
- Irreversible / value-moving commit → **forced-decision** `gok-dialog tone="danger" no-dismiss`,
  primary button names verb + amount.
- Reveal PAN/PIN, e-sign, change limits → step-up (cached briefly to avoid nagging — `patterns.md` §6).

**Remove friction everywhere trust isn't in question:**

- Internal transfer, freeze card, categorize, watchlist, round-up → **optimistic update + toast with undo**
  (`patterns.md` §5). No dialog. Moving your own money is housekeeping, not a transaction.
- **Progressive disclosure** keeps the common path short; advanced fields don't tax the 90%.
- **Smart defaults + autofill + recognition** (saved payees, default wallet, HTML5 input types that
  trigger the right mobile keyboard) shave inputs without removing choice.

**The trade-off is explicit and gateable.** When you add a step to reduce risk, or drop a guardrail to cut
friction, name the trade-off so `gok-bank-product-owner` can adjudicate. "I'd skip the confirm dialog on
internal transfers (reversible, undo covers it) — that removes one tap from the most common flow" is a
product call, not a silent one.

## Form design

- **Fewest fields that do the job.** Each field is a chance to abandon. Cut, defer (progressive
  disclosure), or derive (don't ask what you can infer).
- **One primary action per screen.** Competing CTAs split intent and slow decisions.
- **Inline, reward-early validation.** Validate as the user types or on blur, not on submit — inline
  validation lifts conversion meaningfully and prevents the submit-time wall of red. Keep already-entered
  data on any error; never clear the form.
- **Right input for the job:** money input with currency affix + locale grouping + caret-stable formatting
  (`patterns.md` §3); masked IBAN/postcode; date picker; HTML5 `type`/`inputmode` so mobile shows the
  right keyboard.
- **Reserve the message line** so an appearing error/hint doesn't shift the row (`patterns.md` §3, §4).
- **Tabular numerals** for all money; pending lighter than settled.

## Error recovery

The recovery copy *structure* is yours (the *tone/wording* is `gokberk-design`'s voice). Structure:

- **What happened** — plainly, no code, no jargon. "This IBAN doesn't look right."
- **What to do** — the next action. "Check the last 4 digits, or pick a saved payee."
- **No blame** — never "you entered an invalid value". The system owns the problem.
- **A path forward** — a retry, an alternative, a shortcut to support where relevant.
- **Preserve context** — keep their input, keep their place; recover, don't restart.

State coverage for errors (inline vs page) lives in `references/state-and-microcopy.md`.

## Cognitive load

- **Chunk** the journey into single-job steps; a wizard with six one-task steps beats one page with thirty
  fields. Fewer screens *and* fewer fields per screen both lower load — balance them.
- **One decision at a time.** Don't make the user choose rail, speed, and charge-option on the same screen
  as entering the amount.
- **Defer the rare.** Progressive disclosure is load management, not just tidiness.
- **Recognition over recall** (heuristic 6) is a load lever: every remembered thing is load removed.

## Conversion / drop-off

- **Progress visibility** is the highest-leverage onboarding lever — an honest "3 of 6" / progress bar
  lifts completion. Never hide how far is left.
- **Front-load value, back-load friction** where the domain allows: let the user feel progress before the
  heaviest verification (N26 introduces features as the user engages, rather than demanding a full profile
  up front).
- **Waiting is abandonment.** Pending/verifying steps need honest status ("usually under a minute"),
  skeletons not blank spinners, and — where safe — optimistic progress. ~39% quit on waiting.
- **Resumability** recovers the interrupted: draft token + Back-editable steps turn an abandonment into a
  return.
- **Measure where they fall.** When asked to "improve a flow with drop-off", first locate the step that
  bleeds (too many fields? a surprise fee on review? a waiting state with no status?), then fix that step —
  don't redesign the whole journey blind.

## Mobile-first

This app's shell is mobile-first by spec (`patterns.md` §9): bottom tab bar (Home · Accounts · **Pay**
[center] · Invest · More), wizards full-screen, drawers as bottom-sheets, tables → stacked cards or
horizontal scroll with a frozen first column. Design the **mobile shape first** — it's the tighter
constraint, and the majority surface. Touch targets, thumb-reachable primary actions, the right keyboard
per field, and no hover-only affordances. What works on mobile scales up; the reverse rarely holds.
