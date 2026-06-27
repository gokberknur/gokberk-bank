# Insurance — claims doctrine (no-blame, calmly tracked)

How a claim must feel and behave. Read this for anything in `N03` (file & track a claim). A claim is filed
when something has already gone wrong — a stolen phone, a flooded flat, a cancelled trip — so the person is
stressed, possibly out of pocket, and bracing to be doubted. The whole flow exists to be **calm, honest, and
no-blame**.

## The core posture

- **No blame, ever.** Copy never implies fault, dishonesty, or failure. "Tell us what happened", not "State
  your version of events." "We couldn't approve this claim — here's why", not "Your claim was rejected for
  non-compliance." A decline always carries a clear, specific, human reason. The user is a customer who paid
  for protection, not a suspect.
- **Calm, not celebratory.** The tracker is a quiet ledger, not a party. No confetti on submit, no "Woohoo!"
  No celebratory progress bar — a claim is not a purchase. Restraint signals that you're taking it seriously.
- **Honest about time.** Review is a *real pending state*. Never fake an instant decision. Show "In review —
  usually decided within N days." The Lemonade "3-second payout" is their brand; ours is *honest pacing* — we
  don't pretend a human/AI has decided when they haven't.

## The stages — Submitted → In review → Decision

A `gok-progress format="fraction"` stage indicator plus a status `gok-tag` (rule + icon + text, never colour
alone). Three honest stages:

1. **Submitted** — received, with a reference the user can quote. The anxiety-closing receipt.
2. **In review** — pending. A `gok-alert` info sets the expectation ("Usually decided within N days").
   No fake motion; the stage simply holds until it resolves.
3. **Decision** — **approved** or **declined**. Approved: clear next step (payout/repair path). Declined: a
   specific, no-blame reason tied to the actual cover/exclusion ("This claim falls under flood damage, which
   this policy doesn't cover" — and *that's why equal-weight exclusions at purchase matter*).

## The filing wizard — gather, gate honestly, confirm

Per `N01`'s spine and `.planning/ux/patterns.md` §1–2, a save-as-you-go wizard: **Policy → Incident →
Evidence → Review → Submit**. The domain-specific guardrails:

- **File against the right cover.** Step 1 shows the chosen policy's cover summary inline, so the user files
  against cover that actually applies. (Equal-weight cover/exclusions again — they should see the exclusion
  *before* they spend effort on a claim that can't succeed.)
- **Outside-window: warn, don't (by default) block.** If the incident date falls outside the policy's claim
  window, surface a `gok-alert` warning and require a **forced acknowledgement** to proceed — informative, not
  a wall. Some products *may* hard-block (ask first, per spec); the default is warn-and-proceed, because a
  legitimate edge case shouldn't be silently barred.
- **Duplicate check.** If a similar open claim exists, surface a duplicate `gok-alert` — stated as fact ("You
  already have an open claim for this incident"), offering the existing claim, not an accusation.
- **Evidence is forgiving.** File-drop (`F09`): add, remove, retry-on-error per item. A failed upload is never
  a dead-end.
- **Review restates the flags honestly.** Outside-window / duplicate flags reappear on the read-only review —
  you don't let the user forget what they acknowledged.
- **Submit is a forced-decision dialog.** `gok-dialog` confirm ("Submit claim"); success → tracker + reference.

## Withdraw — always available while open

While a claim is open, the user can **withdraw** it (a forced-decision dialog). People file in panic and
sometimes resolve the issue themselves; let them back out cleanly, no penalty, no guilt.

## Where claims stop and a sibling starts

- A **card/payment dispute or chargeback** (the merchant charged wrong, goods never arrived) is **not** an
  insurance claim — it's a transaction dispute. Route to **`gok-bank-servicing`** (`S02`). Don't let "I want
  my money back for this purchase" become an insurance claim.
- **Paying out** a claim, or the user *paying* a premium, is money movement → **`gok-bank-payments`**.
- **Decision documents** and signed copies live in the vault → **`gok-bank-servicing`** (`D01`).

## The gut check

Read the worst path — a **declined** claim — as the customer. Do they understand *why*, does the reason tie to
a cover limit they could have seen at purchase, and does any word make them feel accused or stupid? If the
decline reads as a brush-off or a blame, it's not done.
