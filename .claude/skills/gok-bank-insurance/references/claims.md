# Playbook — claims (file & track)

The sub-area playbook for **N03** (`.planning/features/insurance/N03-claims.md`): the file-a-claim wizard at
`/insurance/claims/new/[step]` and the tracker at `/insurance/claims/[id]`. A claim is filed when something has
*already gone wrong* — a stolen phone, a flooded flat, a cancelled trip — so the person is stressed, possibly
out of pocket, and braced to be doubted. Every mechanic here exists to make the process **calm, honest, and
no-blame**.

This is **deeper and narrower** than the domain-lens refs. For the claims *philosophy* — why no-blame, the
posture, the claim-vs-dispute boundary — read `references/claims-doctrine.md` and don't restate it. This file
is the build mechanics: the wizard steps, the honest gating, the tracker, the edge cases.

## The filing wizard — five steps

Rides the foundation **wizard composite** (`.planning/ux/patterns.md` §1) and the **money spine** §2 for the
submit confirm. Route `/insurance/claims/new/[step]`; steps `policy | incident | evidence | review` then a
submit dialog. Advance only when valid; **Back never validates**; draft persists under
`gok-bank-draft:<flowId>` and resumes the exact step with evidence intact.

1. **Policy** — pick the policy the claim is against (`gok-select` / `gok-card` list of active policies from
   N02). **Show that policy's cover summary inline** — the same equal-weight `CoverLedger`. WHY here: the user
   should see the **exclusion before they spend effort** on a claim that can't succeed. This is the payoff of
   equal-weight cover at *purchase* (N01) reaching all the way to the claim: nobody files blind against cover
   they were never told about.

2. **Incident** — the heart of the gather, and where honest gating lives:
   - **Type** via `gok-segmented` / `gok-select` (theft / damage / loss / liability / medical / cancellation).
   - **Date** via the F06 date picker.
   - **Description** via `gok-input` / `<textarea>` in the gok field frame, with a **reserved message line**.
   - **Outside-window warning** — if the incident date falls outside the policy's claim window, surface a
     `gok-alert` **warning** and require a **forced acknowledgement** to proceed. **Warn, don't block** (by
     default): a legitimate edge case shouldn't be silently barred. Some products *may* hard-block — that's an
     Open Question, **ask first**.
   - **Duplicate-claim check** — if a similar open claim exists, surface a `gok-alert` stated as **fact** ("You
     already have an open claim for this incident"), offering the existing claim. It's a flag, **not an
     accusation**.

3. **Evidence** — upload photos / receipts / reports via the **F09 file-drop**. Each item lists type + size,
   with **remove** and **retry-on-error**. Evidence is *forgiving*: a failed upload is never a dead-end — the
   user is already stressed, so the mechanic absorbs friction rather than adding it.

4. **Review** — a read-only `gok-card` ledger (policy, type, date, description, evidence count) with per-row
   **"Edit"** that jumps back to the owning step. **Restate the outside-window / duplicate flags honestly** here
   — you don't let the user forget what they acknowledged. (No new gating; just an honest mirror.)

5. **Submit** — a **forced-decision** `gok-dialog` confirm ("Submit claim"). Success → the tracker, with a
   **reference** the user can quote. The reference is the anxiety-closing receipt.

## Honest gating — warn vs block vs flag

Three distinct mechanics, three distinct tones — keep them straight:

- **Outside-window = warn + forced ack.** A `gok-alert` *warning*, proceed-anyway behind a forced
  acknowledgement. It informs; it doesn't wall. Hard-block only where a product explicitly requires it (ask
  first). The claim-window itself keys off the policy's cover dates (set in N01) — so this gate is only as
  honest as the cover period the customer saw at purchase.
- **Duplicate = flag, as fact.** A `gok-alert` *info* offering the existing open claim. Never "you're trying to
  claim twice"; always "you already have an open claim for this — here it is."
- **Decline (at decision, not filing) = clear no-blame reason.** Not a gate on the way in, but the same posture:
  a specific reason tied to the actual cover/exclusion, never a brush-off.

None of these mechanics blame. A flag is a fact offered to help, not a charge laid against the customer. (The
posture in full: `references/claims-doctrine.md`.)

## The tracker — a quiet ledger, not a party

At `/insurance/claims/[id]`: a **`gok-progress format="fraction"`** stage indicator plus a status `gok-tag`
(rule + icon + text, never colour alone). Three **honest** stages:

1. **Submitted** — received, with the reference. The receipt that closes the initial anxiety.
2. **In review** — a *real pending state*. A `gok-alert` info sets the expectation ("Usually decided within N
   days"). **No fake motion, no faked instant decision** — the stage holds until it genuinely resolves. (We
   steal Lemonade's *clarity and speed of filing*, never their "instant payout" theatre; ours is honest pacing
   — see `references/competitive-benchmarks.md`.)
3. **Decision** — **approved** (clear next step: payout / repair path) or **declined** (a specific, no-blame
   reason tied to the actual cover limit: "This claim falls under flood damage, which this policy doesn't
   cover"). That sentence is *why* equal-weight exclusions at purchase matter — the decline ties back to
   something the customer could have seen when they bought.

The tracker also carries the evidence + decision documents (from the vault, D01) and a **Withdraw** action
(forced-decision dialog) **while the claim is open**. People file in panic and sometimes resolve the issue
themselves; let them back out cleanly — **no penalty, no guilt**.

**Tone:** calm, not celebratory. No confetti on submit, no "Woohoo!", no celebratory progress bar — a claim is
not a purchase. Restraint *is* the signal that you're taking it seriously.

## States to build

- **Loading** — `gok-skeleton`.
- **Invalid step** — field errors, reserved message line; forward blocked, Back free.
- **Outside-window** — `gok-alert` warning + forced ack.
- **Duplicate** — `gok-alert` info offering the existing claim.
- **Uploading** — per-file `gok-progress` / `gok-spinner`; retry on error.
- **Submitting** — disabled primary + spinner.
- **Pending review** — status `gok-tag` "In review" + `gok-alert` "Usually decided within N days."
- **Decided** — approved (next step) / declined (clear no-blame reason).
- **Error** — `gok-alert` + retry, no blame.

## Edge cases & A11y notes

- **Draft resume** — re-enter the right step with description + evidence intact (the panic-file, come-back-later
  reality).
- **Withdraw after decision** — withdraw is offered **only while open**; once decided, the action is gone.
- **Claim-window per product** — an Open Question; whether any product hard-blocks outside-window is also Open —
  **ask first**, don't assume the rule values.
- **Interim / provisional payments** — an Open Question; cross-reference `S02` disputes; don't model a payout
  rail inside the tracker without asking.
- **A11y** — each step a labelled form; the textarea labelled with the reserved message line; the file-drop
  announces added/removed files; outside-window/duplicate alerts use `role="alert"` / `status`; the tracker's
  stage change announces via `aria-live="polite"`; status by **rule + icon + text**; confirm + withdraw dialogs
  trap focus.

## Where N03 stops and a sibling starts

- **A card/payment dispute or chargeback** (wrong merchant charge, goods never arrived) is **not** an insurance
  claim — it's a transaction dispute → `gok-bank-servicing` (S02). Don't let "I want my money back for this
  purchase" become a claim.
- **Paying out** a claim (or the user *paying* a premium) is money movement → `gok-bank-payments`.
- **Decision documents / signed copies** live in the vault → `gok-bank-servicing` (D01).

## Definition of done — claims

Ship only when **all** hold (the N03 Success Criteria, operationalised):

- [ ] User files policy → incident → evidence → review → submit and lands on a **tracker with a reference**.
- [ ] Step 1 shows the chosen policy's **cover summary inline** (the equal-weight `CoverLedger`).
- [ ] **Outside-window** date shows a warning + requires a **forced acknowledgement** to proceed (no silent
      block by default).
- [ ] A similar open claim surfaces a **duplicate-claim** flag, stated as fact, offering the existing claim.
- [ ] Evidence uses **F09**; files add / remove / retry; a failed upload is never a dead-end.
- [ ] **Draft saves and restores** the correct step with data + evidence intact.
- [ ] Tracker shows **Submitted → In review → Decision** via `gok-progress format="fraction"`; review is a
      *real* pending state (no faked decision); **withdraw** is a forced-decision dialog while open; **decline
      states a clear no-blame reason** tied to cover.
- [ ] **No-blame copy throughout**; the tracker reads as a quiet ledger, not a celebration.
- [ ] axe clean (incident + tracker); `npm run check` + `npm run build` green; no hardcoded hex/px; **one accent
      per view**.
