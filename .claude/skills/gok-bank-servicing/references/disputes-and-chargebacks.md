# Playbook — disputes & chargebacks (S02)

Deep mechanics for `/support/disputes/*` — the **highest-stakes servicing job**: getting money back on a
charge that's wrong. Disputing money is stressful and often follows a scam or an error, so this flow is the
purest expression of the brand's no-blame voice. Three things are central and load-bearing: **honest
eligibility gating**, **provisional-credit transparency**, and **never implying fault**. This playbook is the
*how*; read `regulatory-and-trust.md` for the scheme/PSD2 frame and `competitive-benchmarks.md` for the Monzo
bar. Scope authority: `.planning/features/support/S02-disputes.md` and `.planning/ux/ux-flows.md §11`.

## Contents

- [The wizard, step by step](#the-wizard-step-by-step)
- [Eligibility gating — honest, never a dead end](#eligibility-gating--honest-never-a-dead-end)
- [Reasons, scheme codes, and branching](#reasons-scheme-codes-and-branching)
- [The merchant-first nudge](#the-merchant-first-nudge)
- [Provisional credit — the honesty point](#provisional-credit--the-honesty-point)
- [The tracker state machine](#the-tracker-state-machine)
- [No-blame copy — concrete](#no-blame-copy--concrete)
- [Edge cases](#edge-cases)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The wizard, step by step

A resumable wizard built on `F05` (route `/support/disputes/new/[step]`), pre-filled from the transaction
(`A05`), then a tracker at `/support/disputes/[id]`. Persist the draft under the flow id
(`gok-bank-draft:dispute`) so deep-link/refresh restores the step + data. Supply each step's `validate`
only — forward-gating lives in the `F05` composite, and **Back never validates**.

1. **Transaction** (`/new/transaction`) — the disputed charge pre-filled from `A05` (merchant, amount, date,
   card, status) as a **read-only `gok-card` ledger**; the user confirms this is the charge. **Eligibility
   gates fire here** (below).
2. **Reason** (`/new/reason`) — a labelled `gok-radio-group`: not recognised / duplicate charge / not
   received / faulty or not as described / wrong amount. The choice drives the next step's branching.
3. **Details** (`/new/details`) — context via the app-local textarea; the **merchant-first branch** for
   "not received"/"faulty"; date/amount specifics where relevant (`F06` date, `F07` money for partial/wrong
   amount).
4. **Evidence** (`/new/evidence`) — `F09` upload (receipts, merchant emails, screenshots), type/size guarded,
   **optional but encouraged** with plain copy on what helps the case.
5. **Review** (`/new/review`) — a ledger of transaction + reason + statement + attachments, with a per-row
   "Edit" jumping back to the owning step, and the transparent **provisional-credit note**.
6. **Submit** — a **forced-decision** `gok-dialog` (it's a formal claim) confirming the facts; on submit the
   case is **Raised**. Light danger tone; **no step-up by default** (below).
7. **Tracker** (`/[id]`) — the status timeline (below); add-evidence and withdraw while investigating.

## Eligibility gating — honest, never a dead end

Eligibility lives in a **pure module** (`src/lib/disputes/eligibility.ts`) and gates at step 1. The rule that
governs all of it: **a gate states a clear reason AND offers an alternative — never a silent dead end.** A
worried customer told only "you can't dispute this" loses trust instantly. Each gate is a real `gok-alert`
(announced to assistive tech):

- **Outside-window** — schemes set time limits (commonly ~120 days from the transaction or expected
  delivery). Too old → blocked, but with the reason ("This charge is outside the dispute window") **and** an
  alternative: raise a complaint via `S01`. Never a bare block.
- **Card-replaced** — the card was reissued since the charge. Per the spec's open question, default to a
  **note, not a hard block** ("Your card was replaced since this charge — it may affect the case") and let
  the user proceed; say why (over-blocking a legitimate dispute is worse than a flagged-risk one).
- **Already-disputed (dedupe)** — a case already exists for this transaction → route to the existing tracker,
  don't let a second case open.

Surface gates **before** the user invests effort in reason/evidence — gating at step 1, not at submit, is the
respect-the-user mechanic.

## Reasons, scheme codes, and branching

The reason enum (`src/lib/disputes/reasons.ts`) maps to scheme **reason-code families** (Visa/Mastercard):
*fraud / not recognised*, *processing errors / duplicate*, and *consumer disputes* (not received, not as
described, wrong amount). The reason drives two things: the **branching** at Details and the **evidence
hints** at Evidence (what actually helps this kind of case — a receipt for a duplicate, merchant
correspondence for "not received"). Keep the mapping in `reasons.ts` so the wizard reads it; don't hardcode
per-reason logic across components.

## The merchant-first nudge

For *not received* / *not as described* reasons, schemes often **require** the cardholder to have attempted
resolution with the merchant first. Model this as a **nudge, not a barrier** (`MerchantFirstNudge.svelte`):
ask whether the user contacted the merchant; if not, suggest it — *"Often the merchant can fix this fastest —
but you can dispute now if this looks like fraud."* — and **always keep a "dispute anyway" path** for clear
fraud. The nudge helps the user (faster resolution, better odds) without blocking them. Never make it a wall;
clear fraud bypasses it entirely.

## Provisional credit — the honesty point

This is the single most important honesty point in the whole app. While a dispute is investigated, a
**temporary** credit may be posted so the customer isn't out of pocket — but it **can be reversed** if the
dispute isn't upheld. The rule is absolute: **state provisional credit as temporary and reversible every time
it appears** — on review, on the tracker, in any alert. Never present it as a settled refund; the first
silent reversal of a "refund" the user thought was final destroys trust permanently.

- On **Review**, the provisional-credit note states whether/when a temporary credit applies and that it may
  be reversed.
- On the **tracker**, when applied, an info `gok-alert`: *"Temporary credit of €X — may be reversed if the
  dispute isn't upheld."*
- Money is integer **minor units** (`provisionalCreditMinor`), tabular numerals.
- Per the spec's open question, which reasons/amounts qualify and the auto-reversal trigger are mock rules
  (ask-first on specifics); whatever the rule, the *temporary/reversible* framing never bends.

## The tracker state machine

The tracker (`DisputeTracker.svelte`, `gok-progress`/timeline) tells the truth in four stages:
**Raised → Investigating → Provisional credit → Resolved**, where Resolved is **upheld or declined, each with
plain reasoning**. Expose the current stage by **rule + icon + text** (not colour) so assistive tech reads it.
While **Investigating**, the user can **add evidence** and **withdraw** the dispute. A declined outcome
explains *why* and what the customer can still do (the no-dead-end posture from the complaints frame) — a
decline is never a shrug. Provisional credit, when it appears as a stage, carries its temporary/reversible
framing (above).

## No-blame copy — concrete

The voice is the trust. Make it concrete:

- **Say:** "Let's look into this charge." / "Tell us what happened." / "We've raised your dispute." Neutral,
  on the user's side.
- **Don't say:** "You claim you didn't receive…" / "You say the charge is wrong…" / "Your allegation…" — any
  phrasing that interrogates a stressed (often scammed) customer. Never imply fault, not in a gate, not in a
  decline.
- One earned accent (the active step + the single primary); editorial eyebrows; calm confidence, **no
  legalese dump** — convey the scheme reality in plain language, don't paste the rulebook.

## Submit friction — lighter than e-sign, on purpose

A dispute is a **formal claim, not a money-move by the user**, so the forced-decision confirm carries a
**light** danger tone and **no mandatory step-up** unless policy says otherwise (the spec's open question;
default to no step-up and say why). Contrast e-sign, which *always* steps up because the user is committing
themselves legally. Don't copy e-sign's gravity here — over-friction on a stressed customer's path to getting
money back is its own failure.

## Edge cases

- **Outside-window** → gated at step 1 with reason + the `S01` complaint alternative; never a bare block.
- **Card-replaced** → note + proceed (default), not a hard block.
- **Already-disputed** → route to the existing case; no duplicate.
- **Merchant-first** on "not received"/"faulty" → nudge with a dispute-anyway path for clear fraud.
- **Deep-link / refresh mid-wizard** → restore the step + draft data (persisted under the flow id).
- **Withdraw while investigating** → allowed; resolves the case as withdrawn, no blame.
- **Resolved-declined** → plain reasoning + what the user can still do; never a silent close.
- **A non-card complaint** lands here by mistake → route to `S01`; the dispute wizard is card chargebacks
  only.

## Sub-area definition of done

On top of the cross-cutting `definition-of-done.md`:

- [ ] The wizard is **pre-filled from `A05`** and runs transaction → reason → details → evidence → review →
      submit with `gok-progress` showing the step fraction; deep-link/refresh restores step + data.
- [ ] **Eligibility is gated honestly** — outside-window / card-replaced / already-disputed each get a clear
      reason **and an alternative**, never a silent dead end.
- [ ] *Not received* / *faulty* reasons branch to a **merchant-first nudge** that still offers a
      **dispute-anyway** path for clear fraud.
- [ ] **Provisional credit is shown as temporary and reversible** every time it appears — review, tracker,
      alerts — never as a settled refund; amounts in integer minor units, tabular numerals.
- [ ] Submit is a **forced-decision** dialog (light danger tone, **no step-up** unless policy says); the case
      starts **Raised**.
- [ ] The tracker advances **Raised → Investigating → Provisional credit → Resolved** (upheld/declined, each
      with **plain reasoning**) by rule + icon + text; add-evidence and withdraw work while investigating.
- [ ] **No-blame copy throughout** — "Let's look into this charge", never "You claim…"; declines explain why
      and what's next.
- [ ] A non-card complaint is **routed to `S01`**; axe clean on review + tracker.
