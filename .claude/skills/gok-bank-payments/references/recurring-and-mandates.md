# Playbook — recurring payments & mandates

The deep mechanics of the **recurring** sub-area: payments that repeat or that *others* are authorised to
pull. Two specs, two opposite directions of money — scheduled payments & standing orders (`P05`, **push**)
and SEPA Direct Debit mandates (`P06`, **pull**). Read it when shaping, reviewing, or signing off anything
that recurs or that grants a merchant the right to collect.

It applies the scheme rules from `regulatory-and-trust.md` (standing order vs direct debit; SDD refund
rights) to the actual manage-and-cancel surfaces. Don't restate the law; get the push/pull mechanics right.

## Contents

- [The central truth: push ≠ pull — never conflate them](#the-central-truth-push--pull--never-conflate-them)
- [Scheduled & standing orders (P05) — push, you control](#scheduled--standing-orders-p05--push-you-control)
- [Pause vs cancel — the forced-decision asymmetry](#pause-vs-cancel--the-forced-decision-asymmetry)
- [Direct debit mandates (P06) — pull, you authorise](#direct-debit-mandates-p06--pull-you-authorise)
- [Edge cases the recurring flows must handle](#edge-cases-the-recurring-flows-must-handle)
- [Competitive patterns to match or beat](#competitive-patterns-to-match-or-beat)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The central truth: push ≠ pull — never conflate them

The defining failure of incumbent banks (see `competitive-benchmarks.md`) is presenting standing orders and
direct debits as one undifferentiated "recurring". They are **opposite directions of money** with opposite
controls, and the user must always know which one they're looking at:

| | **Standing order** (P05) | **SEPA Direct Debit mandate** (P06) |
|---|---|---|
| Direction | **Push** — you send | **Pull** — merchant collects |
| Initiated by | The payer (you) | The payee (merchant) |
| Amount | Fixed, you set it | Variable, the merchant sets each collection |
| Created where | **In-app**, by you | **Merchant-side** — you can't create one here |
| Your control | Edit / pause / cancel freely | View / cancel the mandate / dispute a collection |
| Safety net | It's your money leaving on your terms | **Refund rights** under the SDD scheme |

The practical rule: **the user can *create* a standing order in `P05`; they can never *create* a mandate in
`P06`.** Mandates arrive because the user set them up on a merchant's site. `P06` is visibility + control,
not creation. If a flow lets a user "add a direct debit", it's wrong.

## Scheduled & standing orders (P05) — push, you control

A future-dated one-off *or* a recurring push to a payee. Reuses `P02`'s recipient + amount steps, then adds
the recurrence machinery. Mechanics:

- **Frequency** — `gok-segmented`: Once / Weekly / Monthly (extendable to fortnightly/quarterly; confirm the
  initial set per the spec's open question). "Once" is the future-dated single payment; the rest recur.
- **Start date** — `F06` date picker. A **weekend/holiday start shifts to the next business day** — and you
  **must note the shift** plainly, never silently move it. Use the business-day/holiday calendar.
- **End rule** — `gok-radio-group`, mutually exclusive: **On a date** / **After N payments** / **Until
  cancelled**. Exactly one active.
- **Projected-balance check** — a `gok-card` preview of the next few runs, each with date + amount, and the
  **resulting projected available balance**. If a run would overdraw, flag it **reward-early** with a
  `gok-alert`. This is the standing order's killer feature: the user sees the *commitment*, not just the
  first payment. Sum occurrences as **integers** — never float money.
- **Confirm** — forced-decision `gok-dialog tone="danger" no-dismiss` "Schedule €X"; step-up (`F12`) over
  threshold for the standing-order **mandate** (the recurring authorisation, not a SEPA SDD mandate).
- **Success** — `Scheduled` status `gok-tag` + the next-run preview; link to the manage table.

**Manage** (`/payments/scheduled`): a `gok-table` — payee, amount, frequency, next run, status (Scheduled /
Paused / Completed). Row → a `gok-drawer` to edit, pause/resume, or cancel.

## Pause vs cancel — the forced-decision asymmetry

The same trap as elsewhere: friction must match stakes, and **pause and cancel are not the same action.**

- **Pause** keeps the order. It's reversible → optimistic `gok-switch` + a `gok-toast`, **no dialog**. The
  user can resume it any time; nothing is lost.
- **Cancel** stops a future commitment for good → **forced-decision** `gok-dialog tone="danger" no-dismiss`.
  It's destructive: the schedule is gone.

Conflating them (a dialog on pause, or a silent cancel) breaks the contract. Pause is cheap and reversible;
cancel is deliberate and final. Model each honestly.

## Direct debit mandates (P06) — pull, you authorise

Visibility and control over the mandates that let merchants pull from the user's EUR wallet. The surface
answers the everyday anxiety: *"who can take my money, how much did they take, and what's coming?"*

- **Mandate list** (`/payments/direct-debits`) — a `gok-table`: creditor, mandate reference (masked), last
  collected (amount + date), next collection (date), status `gok-badge` (Active / Paused / Cancelled). A
  leading section lists **upcoming collections (next 30 days)** as a compact `gok-card` ledger so near-term
  outflow is obvious. Empty → `gok-empty-state` ("No direct debits set up").
- **Mandate detail** (`/payments/direct-debits/[id]`, a deep-linkable `gok-drawer`) — creditor identity,
  mandate reference + creditor identifier, the wallet it debits, collection history, the upcoming collection.
- **Cancel mandate** — forced-decision `gok-dialog tone="danger" no-dismiss`. Copy must explain, no-blame,
  that **the merchant may still bill another way** ("This stops future collections. The company may contact
  you to arrange another way to pay."). On confirm, status flips to Cancelled and future collections drop off
  the upcoming list. Step-up is *optional* here (low monetary risk — confirm the policy with `F12`).
- **Dispute a collection** — pick a past/upcoming collection → reason (`gok-radio-group`: not authorised /
  amount wrong / already paid / duplicate) → review → confirm. Creates a dispute that **hands off to `S02`**
  (the disputes tracker) and states the **SEPA refund window** plainly.

The **refund-window** framing (from `regulatory-and-trust.md`): a SEPA Direct Debit is refundable within the
scheme window — **8 weeks no-questions for an authorised collection, up to 13 months for an unauthorised
one**. State it plainly so the user knows their protection exists; confirm exact copy with `S02`.

## Edge cases the recurring flows must handle

- **Weekend/holiday start or run** → shift to next business day **with a visible note**, never silent.
- **Projected overdraw** → reward-early `gok-alert` listing the offending run; don't wait for the run to fail.
- **Pause then resume** → fully reversible, no data lost, no dialog.
- **Editing amount/date mid-life** (P05 open question) → may need a fresh step-up (treat as re-mandating);
  confirm the rule.
- **Cancel a mandate** → future collections drop off immediately; history is retained (greyed), not deleted.
- **Dispute** → creates one `S02` record per collection with the chosen reason; show "Under review" status.
- **User tries to create a direct debit in-app** → there's no such flow; mandates are merchant-side only.

## Competitive patterns to match or beat

- **Monzo** — best-in-class everyday clarity on scheduled payments + a clean direct-debit list with upcoming
  collections surfaced. Warm, human microcopy.
- **Incumbents** — the contrast: standing-order vs direct-debit confusion, poor next-run visibility. We win
  by labelling the direction unmistakably and showing the projected commitment.
- The gök angle: the **projected-balance preview** (push) and the **upcoming-collections ledger** (pull) both
  answer "what's leaving and when" before it happens — calm, factual, numerals, one accent.

## Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, a recurring surface is done only when:

- [ ] Standing order (push) and direct debit (pull) are **never** conflated; the user always knows the
      direction and who controls it.
- [ ] The user can create a future-dated one-off and a recurring standing order with each end rule (date /
      count / until-cancelled); the projected-balance preview lists upcoming runs and flags overdraw
      reward-early.
- [ ] A weekend/holiday start shows the next-business-day shift note; recurrence math sums integer minor units.
- [ ] **Pause is reversible + dialog-free** (optimistic + toast); **cancel is forced-decision**.
- [ ] Mandates can be viewed and cancelled/disputed but **never created** in-app; the refund window is stated
      plainly; a dispute hands off to `S02` with the chosen reason.
- [ ] Upcoming collections (next 30 days) are listed with dates + amounts; status by rule + icon + text.
- [ ] Empty + loading states render; axe clean; the gut check: does the user see every future commitment
      before it leaves their account?
