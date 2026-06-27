# Sub-area playbook — Personal loans (L01)

The deep, narrow playbook for the **unsecured personal-loan application wizard** — spec
`.planning/features/lending/L01-loan-apply.md`. This narrows the cross-cutting refs to *this* surface:
the slider-to-estimate top of funnel, the soft affordability check, the fully-disclosed CCD offer, the
e-sign, the 14-day withdrawal right, and the no-blame decline. Read the cross-cutting refs for the
*why* of CCD disclosure (`regulatory-and-trust.md`) and the bar (`definition-of-done.md`); read **this**
when you're shaping the loan-apply flow itself and need the field-level specifics and edge cases.

Unsecured consumer credit sits under the **CCD** (not the MCD) — so the disclosure word is **APR**, the
example is the **representative example**, and the pre-sign sheet is **SECCI**. Hold that distinction:
APRC/ESIS belong to mortgages (`mortgages.md`), not here.

## 1. The estimate-first top of funnel

The wizard opens *before* any PII so the borrower can answer "what does it really cost?" without
handing over a detail — this is the trust that earns the application (`customer-requirements.md` JTBD #2).

- **Amount slider** €1,000–€50,000; **term slider** 12–84 months. Both keyboard-operable, both with a
  live `aria-live="polite"` read-out of value + the recomputed monthly. The monthly figure stays
  **neutral-coloured** — hierarchy by size, never the accent (only the active track + the single primary
  earn green).
- The estimate is **indicative**, and you must say so: "Your rate is confirmed after the check." Never
  let an indicative monthly read as a confirmed offer — the confirmed APR can differ after affordability.
- Any indicative APR shown here is a **representative APR** and must carry the word "representative"
  and a worked example even at estimate stage — an advertised rate triggers the CCD example rule
  *wherever it appears*, not only on the final offer.
- Edge: clamp slider extremes; recompute on every `input`; debounce nothing that delays the read-out
  (the live number is the feature). Money is integer **minor units**; the amortised monthly comes from
  an integer-scaled rate — **never float-multiply a rate**.

## 2. Purpose & finances — collect the affordability inputs

- **Purpose** (consolidation / home improvement / car / other) is a real input: it can shift the rate
  band and it frames the decline alternatives. Keep the free-text note behind "More options".
- **Finances**: employment status, gross annual income, housing cost, existing credit commitments;
  advanced (other income, dependants) behind progressive disclosure. These feed the CCD
  **creditworthiness assessment** — you are modelling income vs outgoings vs commitments, not a credit
  score. Validate **reward-early** (surface as typed), correct **punish-late**.
- Reserve the message line on every field so a late error doesn't shift the row.

## 3. The soft search — said plainly, resolved honestly

The borrower's fear is that *asking costs them*. Remove it in words, not tone:

- A consent line in the exact phrasing: **"This is a soft search — it won't affect your credit score."**
  Don't paraphrase it into something vaguer.
- The check is an **honest pending** state (`gok-tag` Processing + `gok-alert` info, "Checking — usually
  under a minute"), announced politely. Never fake the wait, never fake the result.
- It resolves **deterministically** (from the `F03` model) to one of three:
  - **approved** → the offer (§4),
  - **referred** → human review, a *legitimate humane outcome* (the CCD right to human intervention),
    not a failure — model it as its own pending-with-explanation screen, not a soft decline,
  - **declined** → the no-blame screen (§6).

## 4. The offer ledger — the centre of this surface

A `gok-card` key/value **ledger** (not a `gok-table`). Every one of these is mandatory before the
borrower can continue to sign — this is the CCD "see the whole price first" rule made concrete:

| Line | Note |
|---|---|
| **Confirmed APR** | beside the headline rate, every time — never a rate without it |
| **Monthly payment** | the amortised figure, tabular numerals |
| **Term** | months, matching the slider choice |
| **Total amount repayable** | principal + total cost of credit |
| **Total cost of credit** | interest + every fee, summed and labelled plainly |
| **First-payment date** | a real date, not "next month" |
| **Every fee, itemised** | no fee discovered at signing — if there is none, say "No fees" |
| **Representative example** | a worked block of equal visual weight, carrying the word "representative" |

The **representative example** is non-negotiable and must not be cut "to reduce clutter"
(`scope-discipline.md` creep signal). Shape: a sample amount + term + assumed rate → the monthly and
the total, e.g. "Representative example: €10,000 over 48 months at 21.9% APR — €252/mo, total
repayable €12,096." The representative APR is the rate ≥~51% of accepted customers get.

One primary action: **"Continue to sign."** No second CTA competing for the accent.

## 5. E-sign & the 14-day withdrawal right

- E-sign is **consumed from `gok-bank-servicing` (`D02`)**, not reimplemented here. You specify *what*
  the agreement contains (the offer terms above) and *that* it is a forced decision with step-up; they
  own the mechanics + the documents vault.
- Frame: a forced decision — `gok-dialog tone="danger" no-dismiss`, "You're signing a credit
  agreement", with **step-up** (`F12`). Declining step-up returns to the offer with **no side effect**.
- **Funds never move before the signed agreement.** Success states a real **ETA** ("In your EUR wallet
  by tomorrow"), never fake instant funding (`scope-discipline.md`). Funding routes through
  `gok-bank-payments`.
- The success screen states the **14-day withdrawal right** plainly — it's a trust signal, not fine
  print. The signed agreement lands in the vault.

## 6. Decline without blame — the humane door

This is where banks feel cruel and where gökberk wins. A decline is a **plain reason + at least two
real alternatives**, never a score, never blame copy, never a dead end:

- Reason: factual and non-judgemental — "Based on the information provided, we can't offer this loan
  right now." Never expose a credit score as a verdict (`scope-discipline.md` creep signal).
- Alternatives, mapped to the inputs:
  - **smaller amount** (re-enter the wizard at the amount step, prefilled lower),
  - **longer term** (lower monthly → may pass affordability),
  - **a guarantor** — offered as *copy*, not a built second-applicant journey (out of scope),
  - **check again in N days**.
- "Referred" is its own outcome, not folded into decline — it reads as "we're taking a closer look",
  with a clear next step, not a soft no.

## 7. Edge cases this surface must handle

- **Indicative → confirmed APR drift.** If the post-check confirmed APR differs from the slider
  estimate, show the change explicitly on the offer — don't silently swap the number.
- **Draft resume.** Abandon mid-wizard → a "Resume" banner returns to the correct step with prior data
  intact (persisted under `gok-bank-draft:loan-apply`). Back never re-validates.
- **Slider boundary.** At €1,000 / €50,000 or 12 / 84 months, clamp and keep the read-out truthful.
- **Check failure (transient).** Retry via `gok-alert`, no blame — distinct from a decline.
- **Withdrawal within 14 days.** The right is stated; the *mechanics* of exercising it are servicing —
  don't build a withdrawal flow into the apply wizard unless the spec asks.

## 8. Competitive angle (narrowed)

Match the **neobank** slider-to-offer speed (Revolut/N26/Monzo one-screen offer); match **Klarna's**
point-of-decision legibility — *but* show APR + the representative example where Klarna shows only the
instalment, and **never nudge** past affordability. Beat the incumbent on honesty: every fee on the
offer, a decline with a door. (Full benchmarks: `competitive-benchmarks.md`.)

## 9. Sub-area definition of done (on top of `definition-of-done.md`)

- [ ] The monthly estimate updates live as amount/term move, **before any PII**, with an indicative-rate
      disclaimer and (if a rate is shown) a representative example.
- [ ] The soft-search consent line uses the "won't affect your credit score" phrasing verbatim.
- [ ] The offer ledger lists **all eight** lines in §4 — APR, monthly, term, total repayable, total cost
      of credit, first-payment date, itemised fees, representative example — before "Continue to sign".
- [ ] The check resolves approved / **referred** / declined deterministically; referred is modelled as a
      distinct humane outcome.
- [ ] Decline shows a plain reason + ≥2 alternatives, no score, no blame.
- [ ] E-sign requires step-up; declining returns with no side effect; funds move only after signing,
      with a real ETA; the **14-day withdrawal right** is stated on success.
- [ ] Money is integer minor units; the amortised monthly + total cost use an integer-scaled rate.
