# Playbook: Ordering & card lifecycle (C02)

The sub-area deep-dive for **ordering** a card, **replacing** one, and the **report lost/stolen** path — the
moments a card is created or destroyed. The cross-cutting refs frame the wizard spine and the friction model;
this is the *how* — the conditional step model, the virtual-instant vs physical-ETA split, and the
forced-decision replace that cancels a working card. Read it when building `/cards/order` or
`/cards/[id]/replace`. Spec: `.planning/features/cards/C02-order-replace.md`. The wizard shell itself is the
`F05` composite + `patterns.md` §1/§2 — don't re-implement it here.

## The lifecycle this owns

A card has a life: **ordered → issued → active → (frozen ↔ active) → replaced/cancelled → expired**. This
sub-area owns the *creation* and *destruction* ends — ordering a new card and replacing (which cancels) an
existing one. Freeze (the reversible middle) is `C03`; expiry is a status the wallet reads. Keep the boundary
crisp: ordering **appends** a card; replacing **cancels-then-appends**; nothing here ever silently mutates a
card mid-life.

## The wizard, and why it's conditional

Runs on the `F05` wizard spine: `type → design → delivery → review → confirm → success`. The flow only
*supplies* `steps[]` + `validate`; it never re-builds the shell. The defining mechanic is that **the step
model is conditional on card type**:

- **Delivery exists only for physical cards.** Virtual and disposable cards issue instantly — there is nothing
  to ship. The wizard must **omit** the delivery step from the active step model for those types, so the
  `[step]` param maps to a live step, never a dead route. Do **not** render a delivery step and disable it;
  remove it from the model so "3 of 4" counts correctly and Back/Continue traverse only real steps.
- **Design may be reduced** for virtual/disposable (open question: do disposables have a design step at all?).
  Confirm rather than assume; default to fewer designs, not a forced full grid.
- This is the gök "advanced detail sits behind a step, not crammed onto review" rule made concrete: tracked
  shipping options belong *in* the delivery step, not piled onto the review ledger.

### Step-by-step mechanics

1. **Type** — `gok-segmented` Physical / Virtual / Disposable, each a one-line plain description with any fee
   disclosed **inline** (`gok-badge` "Free" / "€X"). Disposable explains its single-use-then-regenerate nature
   in plain words — this is where the customer learns the blast-radius concept, so don't bury it.
2. **Design** — a `gok-card` grid that behaves as a **radio-style single-select**: visible focus, `aria-checked`,
   one selected design marked by a **single accent** (a `gok-badge` or a 2px accent rule) — **never a colour
   fill**. Keyboard-operable as a radio group.
3. **Delivery** (physical only) — shipping address (from profile, editable via `gok-input`), standard vs
   tracked (`gok-segmented`), an ETA note per option. Region drives the ETA matrix.
4. **Review** — a read-only key/value **ledger** (`gok-card`/`gok-dialog` body): type, design, linked wallet,
   fee, delivery + ETA (or **"Issued instantly"**), plus a first-card / replacement note where relevant. Every
   row has **"Edit"** that jumps back to the owning step. Fees + ETAs in **tabular numerals**. The rule:
   **every consequence is disclosed before the commit** — no surprise fee, no surprise ship date.

## Issue truth: instant vs pending — never fake it

The single most important honesty rule in ordering:

- **Virtual / disposable issue instantly.** Success says "Ready to use" with a link straight to the card
  detail (`C01`); the card is appended active.
- **Physical ships.** Success says "On its way" + the ETA + a tracking note. **Never** mark a physical card
  "Ready to use" — it does not exist in the customer's hand yet. Faking readiness is the ordering equivalent of
  faking a freeze.
- Issuing latency is a **mock delay**: the primary button shows a `gok-spinner` and is **disabled** while
  issuing — never a full-page block, never a double-submit.

## The replace path — destructive, forced-decision, step-up-gated

Replacing (including report lost/stolen) enters at `/cards/[id]/replace` and runs the **same wizard in replace
mode**. It is the one irreversible act in this sub-area, so it carries the full weight:

- It **cancels a working card.** That makes it a forced decision: the confirm is a
  `gok-dialog tone="danger" no-dismiss`, primary named **"Replace card"**, and the body states plainly **"Your
  current card •• 1234 will stop working now."** Calm and factual — no alarm, no red-button theatrics beyond
  the danger tone.
- It is **additionally gated by a step-up (`F12`)** — because it destroys access to money, a forced-decision
  *dialog alone is not enough*. Reveal/approve/provision/replace are the four step-up-gated acts; replace is
  the only *wizard* among them.
- **Order of operations is sacred: never cancel the old card before the forced-decision confirm.** The
  sequence is confirm → step-up → *then* cancel-old + append-new. A **declined or cancelled step-up leaves the
  old card fully working and untouched** — the customer backed out, so nothing changed.
- **Replacing an already-blocked card** (it was already lost/frozen) is allowed — show an info note and
  proceed; don't error on "you can't replace a dead card", because the customer's *intent* (get a working card)
  is still valid.

### Replace edge cases

- **Replacement reason capture** (lost vs stolen vs damaged) is an open question — does it branch the ETA or
  just log? Confirm with `O03`; default to capturing the reason as a log field, not as a flow branch, until
  told otherwise.
- **Disposable regenerate semantics** (open question): does ordering a disposable create a reusable slot or a
  one-shot? This changes whether "replace" even applies. Confirm before building replace for disposables.
- **Per-tier fees / free-card allowance** (open question) align with `X04` profile/tier — disclose the fee on
  review from that source, never a hardcoded price.

## States this surface must render

`loading` (issuing → disabled primary + `gok-spinner`) · per-step `invalid` (reward-early, reserve the message
line so the row never shifts) · `issuing error` (`gok-alert` + retry, **no blame**) · `declined step-up on
replace` (return to review, **old card untouched**) · `replacement-of-already-blocked` (info note, proceed) ·
`success` (type-appropriate: virtual "Ready to use" + View card; physical "On its way" + ETA; replacement =
old-card-cancelled confirmation).

## Competitive bar

- **Apple / premium issuers** set the bar for a *reassuring* order + provision flow — deliberate, every
  consequence stated. Match that calm; the review ledger is where you beat the incumbents who surprise people
  with fees at the end.
- **Monzo / Revolut** report-lost-and-replace flows are fast and humane — one flow, no-blame copy, instant
  virtual replacement where possible. Match the speed; keep the forced-decision honesty on the cancel.

## Sub-area definition of done (on top of the spec's Success Criteria)

- [ ] The wizard reuses the **`F05` composite**; the flow only supplies `steps[]` + `validate`.
- [ ] **Delivery appears only for physical**; virtual/disposable omit it from the **active step model** (not a
      disabled/dead step) so the fraction count and Back/Continue are correct.
- [ ] The design grid is a **radio-style single-select** (visible focus, `aria-checked`, one **accent mark**,
      no colour fill).
- [ ] **Virtual/disposable issue instantly** (success links to `C01`); **physical shows an ETA** and is
      **never** "Ready to use".
- [ ] **Replace** ends on a **`tone="danger" no-dismiss`** dialog stating "•• 1234 will stop working now",
      is **step-up-gated**, and **cancels the old card only after** confirm + step-up.
- [ ] A **declined step-up on replace leaves the old card active**; replacing an already-blocked card proceeds
      with an info note.
- [ ] The **review ledger** discloses type, design, linked wallet, fee, and delivery/ETA **before** confirm,
      with per-row Edit; fees/ETAs from their source (`X04`/region matrix), not hardcoded.
- [ ] Reward-early validation blocks advancing an incomplete step; copy is no-blame; **no hardcoded hex/px**;
      `gok-dialog`/`gok-segmented` unrestyled; axe clean on each step + the confirm dialog.

If a customer could be surprised by a fee or ship date, or could lose a working card before they truly
confirmed — it's not done.
