# Playbook — policy management (detail, renew, cancel)

The sub-area playbook for **N02** (`.planning/features/insurance/N02-policy-management.md`): the policy detail
surface at `/insurance/policies/[id]` — the calm home a user returns to *between* buying (N01) and claiming
(N03). It's where cover is re-read, documents are opened, premiums are scheduled, and the two commitments —
**renew** and **cancel** — are made deliberately and reversibly-where-possible.

This is **deeper and narrower** than the domain-lens refs. For the equal-weight doctrine read
`references/cover-vs-exclusions.md`; for cooling-off / refund lineage read `references/regulatory-and-trust.md`.
This file is the build mechanics of the detail page and its two state-changing dialogs.

## The surface — six regions

A full-page detail surface. Each region carries a mono-uppercase eyebrow; **one accent per view** (spend it on
the next-payment rule *or* the primary action, not both).

1. **Header** — product + policy-number eyebrow; a status `gok-tag` (**Active / Renews soon / Lapsed** — by
   rule + icon + text, **never colour alone**); premium (monthly + annual, F07); next-payment date. Actions:
   **Renew**, **File a claim** (→ N03), **Manage** (a `gok-drawer`).

2. **Cover summary** — a `gok-accordion` that **mirrors N01 exactly**: **What's covered** and **What's not
   covered** at equal weight, plus a `gok-card` ledger of excess, single-item limits, sum insured, and cover
   dates. **Reuse the same `CoverLedger` component as N01** — this is the point. Cover/exclusion weighting must
   be *identical across buy and manage* so a policyholder re-reading their cover sees exactly what they saw when
   they bought it. If buy and manage drift, trust drifts. (Doctrine: `references/cover-vs-exclusions.md`.)

3. **Documents** — policy doc / certificate / schedule, listed via `gok-table` (or `gok-card` rows), each with
   open / download. **All sourced from the vault (D01)**; signed copies come from **D02**. You don't generate or
   store documents — `gok-bank-servicing` owns the vault; you render the list and label the buttons. Empty state:
   `gok-empty-state` "No documents yet" (distinct copy from an error).

4. **Payment schedule** — upcoming + past premium payments in a `gok-table` (date, amount, method, status
   `gok-tag`). Highlight the **next charge with a single accent rule, not a fill**. Money as integer minor
   units, F07-formatted, tabular. This is a *read* of money that `gok-bank-payments` actually moves — you
   present the schedule; payments owns the charge.

5. **Renew** — review the changed terms (**premium delta + new dates**) in a `gok-card`/`gok-dialog` ledger,
   then a **forced-decision confirm**. A renewal *charges money*, so it earns the money-spine dialog — never
   auto-charge a renewal silently. If the user opts to **change cover**, re-enter the N01 cover step (or a
   lighter mid-term-adjustment flow — an Open Question; *ask first*). Surface the renewal **early**: a "Renews
   in 12 days, premium +€1.20/mo" preview well before the charge, via status `gok-tag` + `gok-alert` info.

6. **Cancel** — the discipline of this surface. A **forced-decision** `gok-dialog tone="danger" no-dismiss`
   that states, before the user commits: the **refund / cooling-off position**, the **effective date**, and the
   **consequences** (when cover actually ends). The primary button **names the verb** — "Cancel policy" — never
   a vague "Confirm." On success: a **reversibility window** where the EU cooling-off period applies, plus a
   **"Reinstate"** / contact-support affordance. Escape fires `gok-cancel` (the dialog does **not** dismiss).

## Renew vs cancel — the two commitments

Both are state-changing, both are forced-decision, but they pull in opposite directions and must each be
*honest in its own way*:

- **Renew** discloses the **delta** — what changes and what it costs — *before* the confirm. The fear it
  designs against is a **premium that creeps**: the renewal preview shown early, the delta shown plainly, no
  silent re-rate. Never charge a renewal without the forced-decision confirm.
- **Cancel** discloses the **exit** — refund, effective date, what you lose — *and makes leaving clean*. The
  fear it designs against is **being locked in**. So: no guilt copy, no hidden cancel button, no "are you
  *sure* you want to lose protection?" retention loop. Retention offers default to **none** (turning them on is
  an explicit, asked-first product decision). A clean cancel is a trust deposit, not a leak.

## Cooling-off & refund mechanics (where finality meets reversibility)

- **Cooling-off carries from N01 into N02.** A policy is bound and signed (final), yet within the EU cooling-off
  window the customer can withdraw without penalty — **14 days** most non-life, **30 days** life. The detail
  surface is where that window is *honoured*: while it's open, the cancel-success path offers a full-refund /
  reinstate affordance. Finality and reversibility coexist — show both.
- **Never invent a refund figure.** Derive it from the stated rule: cooling-off → typically full refund;
  outside cooling-off → pro-rata or the product's stated rule. The exact refund semantics per product (pro-rata
  vs cooling-off-only) are an N02 Open Question — **ask first**, don't hardcode a number out of thin air.
- **Lapsed policies** get a clear status and a stated path to **reinstate** — a lapse is a fact to resolve, not
  a dead-end.

## States to build

- **Loading** — `gok-skeleton` header + ledger (mirror the final layout; never spinner-on-blank).
- **Empty documents** — `gok-empty-state` "No documents yet."
- **Pending renewal** — status `gok-tag` "Renews in 12 days" + `gok-alert` info with the delta.
- **Cancellation in progress** — disabled primary + `gok-spinner`.
- **Lapsed** — clear status + how to reinstate.
- **Error** — `gok-alert` + retry, shell preserved, no blame.

## Edge cases

- **Mid-term cover change** — re-enter N01's cover step vs a lighter adjustment flow: Open Question, ask first.
- **Refund semantics per product** — pro-rata vs cooling-off-only: Open Question, ask first; derive, don't fake.
- **Renewal with a cover change** — show the *combined* delta (new cover + new price) before confirm; don't
  split it into two surprises.
- **Cancel inside vs outside cooling-off** — the dialog's stated refund position must reflect which window the
  user is in; the copy changes, the honesty doesn't.
- **Document not yet in the vault** — empty/per-row state, not a broken link; the vault (D01) is the source.

## Where N02 stops and a sibling starts

- **Opening/downloading or e-signing a document** → the vault + e-sign are `gok-bank-servicing` (D01/D02). You
  list and link; you don't build the vault.
- **The actual premium charge / refund movement** → `gok-bank-payments`. You present the schedule and state the
  refund position; payments moves the money.
- **Filing a claim against this policy** → N03 (`references/claims.md`). The header's "File a claim" is the
  jump-off; the claim flow is its own sub-area.

## Definition of done — policy management

Ship only when **all** hold (the N02 Success Criteria, operationalised):

- [ ] Page shows the cover summary (**covered + excluded at equal weight, reusing the N01 `CoverLedger`**),
      excess, limits, dates, and the renewal date.
- [ ] Documents and signed copies **open/download from the vault** (D01/D02); empty state is distinct from error.
- [ ] Payment schedule lists **upcoming + past** premiums; status by **rule + icon + text**; next charge is a
      single accent **rule**, not a fill.
- [ ] **Renew** shows the **premium delta + new dates**, then requires a **forced-decision confirm**; never
      auto-charges.
- [ ] **Cancel** is a `gok-dialog tone="danger" no-dismiss` stating **effective date + refund position**; the
      primary names the verb; success offers **reversibility / reinstate**; copy is **no-blame, no dark
      patterns**.
- [ ] No refund figure is invented — it's **derived from the cooling-off / pro-rata rule**.
- [ ] axe clean (page + cancel dialog); `npm run check` + `npm run build` green; no hardcoded hex/px; **one
      accent per view**; money as integer minor units.
