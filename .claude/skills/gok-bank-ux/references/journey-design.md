# Journey design — the method

How to turn a domain expert's requirements into a journey a customer actually moves through. The canonical,
in-repo source is `.planning/ux/ux-flows.md` (the 13 journeys) and `.planning/ux/patterns.md` (the 10
cross-cutting patterns) — **read those local files if present; if `.planning/` is absent, ask for it.**
This reference is the *method* for applying them, not a duplicate of them.

## The spine (memorise this)

Every money or commitment journey follows one shape:

**gather → review → forced-decision confirm → success with reversibility**

(`.planning/ux/ux-flows.md` header; `patterns.md` §2.) Don't reinvent the shape per feature — instantiate
it. Send-money, FX exchange, loan apply, card order, insurance buy, dispute, e-sign are all the *same
spine* with different gather steps. Your design work is: (1) what the gather steps are and in what order,
(2) what lands on review, (3) whether confirm is a forced decision or can be skipped, (4) what
reversibility the success screen carries.

### gather — collect what's needed, progressively

- Each step does **one job** and earns its place. If a field doesn't change the outcome or a decision the
  user makes, cut it or defer it. The strongest lever on completion is asking for *less* per screen
  (Wise reveals only what's needed in the moment; Monzo's single-task KYC screens beat the industry by
  ~20pp).
- **Order by certainty and stakes:** cheap, high-confidence inputs first (who am I paying), money and
  irreversible choices later (how much, which rail). This lets reward-early validation catch problems
  before the user has invested effort.
- **Progressive disclosure** is the default, not an option. Advanced/rare fields live behind "More
  options" — SWIFT charge codes (OUR/SHA/BEN), the loan's detailed finances, a payment reference, TIF on
  an order ticket. The common path stays short; power is one tap away. (`ux-flows.md` §2, §7, §10.)
- **Smart defaults** reduce friction without removing control: default the from-wallet to the one with
  funds, default speed to Instant when available, pre-fill a dispute's transaction from the drawer it was
  launched from.

### review — the trust moment, before commit

This is where the customer decides to part with money or sign something. It is **read-only** and it
**discloses everything**:

- A key/value **ledger** (`gok-card` or `gok-dialog` body): payee, masked IBAN, amount, **fee, FX rate +
  margin, what the recipient receives, ETA**. No cost may be discovered *after* this point. A user must
  never be surprised by a fee or a rate (`patterns.md` §2; the payments money-spine).
- **Trust signals live here:** Instant / No-fee badges, who-sees-what, the rate-refresh countdown. They
  reassure precisely when anxiety peaks.
- **Per-row "Edit"** jumps back to the owning step with state intact — reversibility *before* send. The
  customer never has to restart to fix one digit.
- **First-payment / new-payee warnings** surface here (confirmation-of-payee name mismatch → proceed-anyway
  forced acknowledgement). This is where fraud lives; the domain expert sets the rule, you place it on
  review.

### confirm — forced decision, for finality only

- **Irreversible / value-moving actions** end on a forced decision: `gok-dialog tone="danger" no-dismiss`,
  the primary button **naming the verb + amount** ("Send €1,200"), step-up injected over a threshold
  (`patterns.md` §2, §6). The dialog can't be dismissed by clicking away — the choice must be made.
- **Low-stakes reversible actions skip the dialog entirely** → optimistic update + `gok-toast` with
  **undo** (freeze a card, categorize, watchlist, round-up, internal transfer). A confirmation dialog on a
  reversible action is friction with no trust earned — cut it. Knowing which is which is the calibration
  job (`references/flow-heuristics.md`).

### success — close the anxiety gap, offer a way back

- Explicit, immediate success: `gok-empty-state` success + a status `gok-tag` (rule + icon + text),
  **receipt/reference**, a primary **Done**.
- **Reversibility affordance** carried on the screen: a cancel countdown ("Cancel until 23:59"), an undo,
  or "report a problem". Reversibility lives on **review + success** (`ux-flows.md` header).
- **Honest pending, never fake completion.** Internal/SEPA-Instant = done in seconds; SEPA standard, SWIFT,
  card spend, orders, loan draws = a real **pending** state held separate from settled balance
  (`patterns.md` §5). The domain expert owns which rail is which; you own showing the truth.

## The wizard / stepper pattern

For long, save-as-you-go, resumable journeys (`…/[step]` routes), the shell is the app-local **wizard
composite** (`patterns.md` §1): `gok-tabs activation="manual"` + `gok-progress format="fraction"` ("3 of
6") + a mono-uppercase eyebrow, over a step-state model `{ steps, currentIndex, data, validity[],
visited[] }` persisted to a rune store + the URL `/[step]`, resumable via a draft token.

Design rules you enforce:

- **Advance only when the current step is valid** (reward-early). **Back never validates** — going back is
  always free.
- **Exactly one primary action** (Continue) + one secondary (Back) per step. No competing CTAs.
- **Unvisited steps aren't clickable**; visited ones are. The progress indicator is honest about where the
  user is and how far is left — the single biggest completion lever (a progress bar alone lifts completion
  meaningfully).
- **Resumability is part of the design, not a nice-to-have.** Every step is Back-editable; the whole flow
  resumes via a draft token if abandoned (onboarding, loan, mortgage, insurance, dispute all require
  this). Long journeys *will* be interrupted; design for return.
- **Mobile:** the step rail collapses to "3 of 6" + the step title; wizards go full-screen (`patterns.md`
  §9). Design the mobile shape first — it's the constraint.

When to use a wizard vs. an overlay (`information-architecture.md` "Full-page vs overlay"):

- **Full-page wizard `…/[step]`** — long, resumable, save-as-you-go: onboarding, send money, add payee,
  card order, all lending apps, insurance quote/claim, dispute, e-sign.
- **`gok-drawer`** — contextual edit/detail you return from: transaction detail, payee detail, pot edit,
  card settings, order ticket.
- **`gok-dialog`** — one focused decision: forced-decision money commits, freeze, cancel standing order,
  3-DS, reveal PAN, KYC consent.

## Worked spine examples (from `ux-flows.md`)

- **Send money (§2, flagship):** recipient → amount → fx → speed/schedule → **review** (ledger + Instant/
  No-fee badge, per-row Edit, new-payee warning) → **confirm** (danger dialog "Send €X", step-up over
  threshold) → **success** (receipt, status tag, "Cancel until cut-off"). SWIFT charge option + note under
  "More options".
- **Loan apply (§7):** amount & term (live monthly estimate) → purpose → finances (progressive disclosure)
  → affordability (pending → result) → **offer** (APR, monthly, total cost = the review ledger) → **e-sign**
  (consent + step-up) → **done** (funds ETA, 14-day withdrawal note = reversibility). Declined = clear
  reason + alternatives, no blame.
- **FX exchange (§13):** linked money inputs (other side computes live) + disclosed mid-rate vs your-rate →
  **review** (convert X → receive Y, rate, fee) → **forced-decision confirm** → instant success. Rate
  expiry → re-quote.

The pattern is always the same; what changes is the gather steps and the rail truth. Your job is to make
the *shape* obvious and the steps minimal — the domain expert tells you what each rail must disclose, and
`gokberk-design` makes the ledger look right.
