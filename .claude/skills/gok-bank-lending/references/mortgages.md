# Sub-area playbook — Mortgages (L03 + L04)

The deep, narrow playbook for the **mortgage calculator** (`.planning/features/lending/L03-mortgage-calculator.md`)
and the **mortgage application + servicing** journey
(`.planning/features/lending/L04-mortgage-apply-servicing.md`) — the heaviest disclosure burden in the
whole app. This narrows the cross-cutting refs to the secured-lending surfaces: the public calculator,
the DIP→offer application, the **APRC/ESIS** disclosure set, the full amortization table, the
overpayment-with-ERC forced decision, and the rate switch.

Mortgages sit under the **MCD**, not the CCD — so the figure is **APRC** (never APR), the sheet is
**ESIS** (never SECCI), and the heavy moves (signing, ERC-triggering overpay, rate switch) are forced
decisions with step-up. Hold that distinction throughout.

## Contents

1. Calculator (L03) — public, no-auth, shareable
2. The amortization truth — the math both surfaces share
3. Application (L04) — property → DIP → offer → e-sign
4. The offer: APRC, fees, total cost, ESIS, full amortization
5. Servicing — the virtualized schedule
6. Overpayment & the ERC forced decision
7. Rate switch
8. Edge cases
9. Competitive angle (narrowed)
10. Sub-area definition of done

---

## 1. Calculator (L03) — public, no-auth, shareable

A **top-of-funnel** tool that must work **logged out** and feel like an editorial spread, not a form. It
makes the bank trustworthy *before* anyone signs in.

- **Inputs**: property value, deposit (with a derived deposit-% read-out), term (5–35 yrs), rate type
  (`gok-segmented` fixed / variable, with an indicative rate). Reward-early validation: deposit ≥ value
  and below-min-deposit block the compute, no-blame.
- **Results ledger** (live `gok-card`): **monthly payment**, **total interest over the term**, **total
  amount repayable**, and **LTV %** with a band hint ("≤80% unlocks a lower rate"). All four together —
  never the monthly alone; the real cost is the total interest.
- **Amortization chart** (`F11` ECharts): remaining balance falling to zero **plus** the per-year
  principal/interest split, so the **front-loaded interest** is *seen*, not just stated. Reads `--gok-*`
  via the token bridge; no chart logic in the route.
- **Shareable by URL**: serialize inputs to query params; loading the URL rehydrates every field + the
  chart. The share contract must round-trip: `parse(serialize(x)) === x`; debounce `goto` on input.
- **The disclosure that matters here**: label it **"an estimate — not a quote or an offer,"** announced
  not buried. The calculator shows numbers, never an approved rate. Don't gate the chart behind a CTA;
  don't require sign-in to compute.

## 2. The amortization truth — the math both surfaces share

The calculator, the offer, and the servicing table all draw from **one** amortization generator
(`mortgage-math.ts`) — don't fork per-surface math. The non-negotiables:

- Money is integer **minor units**; APRC and the amortized payment use an **integer-scaled rate** —
  **never float-multiply a rate**.
- The schedule **sums**: principal + interest = payment each row; the remaining balance **decrements to
  exactly zero at term**. A schedule that ends at €3 of residual is a bug, not a rounding quirk — handle
  the final-row reconciliation explicitly.
- The series is long (a 30-yr term = **~360 rows**). The calculator chart aggregates per-year; the
  servicing table windows per-row (§5).

## 3. Application (L04) — property → DIP → offer → e-sign

A full-page `F05` wizard, route `/lending/mortgages/apply/[step]`. Steps:

1. **Property** — value, deposit, type, address; links from the L03 calculator with prefilled params
   (the calculator's URL contract pays off here).
2. **Finances** — income, employment, outgoings, existing commitments; advanced behind progressive
   disclosure. The MCD affordability bar is **stricter than CCD** — model it as the gate to the DIP.
3. **Documents** — `F09` file-upload: ID, proof of income, bank statements; per-file type/size
   validation, per-file progress, retry, and a **checklist** of what's still required. Don't let the
   wizard advance with a required doc missing.
4. **Decision in principle (DIP)** — consent + an honest **pending** ("Reviewing — usually under a
   minute") resolving to **agreed in principle / referred / declined**. The DIP is the modelled gate
   *before* the binding offer; declined = plain reason + alternatives, no blame (same humane posture as
   `personal-loans.md` §6, with mortgage-shaped alternatives: a larger deposit, a longer term, a lower
   property value).

## 4. The offer: APRC, fees, total cost, ESIS, full amortization

This is the **ESIS-grade** binding offer — the densest disclosure in the system. The offer is a
`gok-card` ledger **plus** an itemised fees table **plus** the full amortization `gok-table`:

| Element | Requirement |
|---|---|
| **Rate** | the headline borrowing rate |
| **APRC** | beside the rate, every time — **never a mortgage rate without its APRC** |
| **Monthly payment** | tabular |
| **Term** | years/months |
| **Itemised fees** | every fee in its own row (arrangement, valuation, legal…) — none discovered at signing |
| **Total cost of credit** | interest + all fees, summed and labelled |
| **Full amortization** | the complete `gok-table` (#, date, payment, principal, interest, balance) — not a sample |

Model the **ESIS spirit**: a complete, standard pre-sign summary. Real ESIS also shows a **stress
illustration** ("if the rate rose to a high level"); a stress-test toggle is a *nice-to-have*
(`customer-requirements.md`) — confirm with the spec before building it, don't assume it.

E-sign is a forced decision via `D02` with step-up (`F12`); funds/handover only after signing.

## 5. Servicing — the virtualized schedule

Route `/lending/mortgages/[id]`. A summary ledger (outstanding balance, rate + fixed-period end date,
monthly, **LTV now**, progress) over a full schedule:

- The **amortization is `gok-table virtualized`** — a fixed host height + `row-height` windowing all
  ~360 rows. The point is it scrolls **smoothly** while keeping **header semantics and keyboard
  navigation** intact. A 360-row table that janks the page is the incumbent anti-pattern we beat
  (`competitive-benchmarks.md`).
- Set `columns`/`rows` as **DOM properties** via `setProps`; subscribe to `gok-sort` / `gok-page-change`
  via `on`; **no `bind:`**; **never restyle `gok-table` visuals** (the design system owns them).

## 6. Overpayment & the ERC forced decision

The signature regulated mechanic of this surface. An overpayment's friction **depends on whether it
triggers an ERC** — friction matches stakes:

- **Within the annual ERC-free allowance** (and outside a charged fixed period) → a *normal* review,
  optimistic + cancel-window. **Do not** force a danger dialog on an allowance-covered overpayment
  (`scope-discipline.md`: friction matches stakes).
- **Exceeds the allowance, or falls in the fixed period** → the **ERC-warning forced decision**:
  `gok-dialog tone="danger" no-dismiss` that names the **exact early-repayment charge first**, the net
  effect, and the total: **"Pay €X incl. €Y ERC."** With **step-up** (`F12`). The charge is shown
  *before* it applies — never sprung at confirmation (the incumbent cruelty we refuse).
- The ERC itself is a **tapering** percentage by remaining fixed years, capped, with the annual
  allowance — model the *shape* from `regulatory-and-trust.md` (MCD). Compute it on integer-scaled
  rates like everything else.
- Preview the **effect** before confirm: shorter term **or** lower payment (per the loan's rule), and
  the interest saved — the saving made visible, not just stated.

## 7. Rate switch

Near a fixed-period end, the borrower can move to a new product:

- Show the eligible products with the new **rate, APRC, fees, and new monthly** — side by side with the
  current terms so the trade-off (new rate vs the ERC of moving now) is legible; the **remortgager**
  segment weighs exactly this (`customer-requirements.md`).
- Confirm as a **forced decision** with step-up; on success, **regenerate the schedule** from the new
  terms (the same single generator from §2).
- Confirm the eligibility window with the spec (only near the fixed-period end?) — don't invent it.

## 8. Edge cases

- **Residual at term.** Reconcile the final row so the balance lands on exactly zero.
- **Deposit ≥ value / below-min-deposit.** Block reward-early on the calculator and the application; the
  compute doesn't run; copy is no-blame.
- **Calculator → application prefill.** The URL params must survive the jump into the authed wizard.
- **DIP vs full offer.** Two pending stages or collapsed to one is an open question in the spec — confirm,
  don't assume.
- **LTV drift in servicing.** "LTV now" uses the current balance, not the original — recompute it.
- **Virtualized table + sort.** Sorting must re-window correctly; don't lose the header or keyboard
  position.

## 9. Competitive angle (narrowed)

Match the **digital mortgage lenders** (Habito / Trussle / Better-style) on guidance and the live
calculator; **keep the ESIS-grade disclosure** they sometimes thin out. Beat the **traditional lender**
on three specific failures: a rate with no APRC, fees discovered at signing, and an ERC sprung at
confirmation. (Full benchmarks: `competitive-benchmarks.md`.)

## 10. Sub-area definition of done (on top of `definition-of-done.md`)

- [ ] Calculator works **logged out** and by keyboard; shows monthly + total interest + total repayable +
      LTV together; is labelled an **estimate, not an offer**; shares by URL and round-trips.
- [ ] The amortization chart shows balance-to-zero **and** the principal/interest split.
- [ ] The application runs property → finances → documents (validated, checklist) → DIP → offer → e-sign.
- [ ] The offer shows **rate + APRC**, **every fee itemised**, **total cost of credit**, and the **full**
      amortization `gok-table` — never a rate without its APRC, never a sampled schedule.
- [ ] Servicing renders ~360 rows via `gok-table virtualized` smoothly, header + keyboard intact.
- [ ] An overpayment **within** the allowance is a normal review; one that **exceeds** it triggers the
      **ERC-warning forced decision** naming the exact charge first, with step-up, applied only on confirm.
- [ ] Rate switch shows new rate/APRC/fees/monthly side by side, confirms via forced decision, and
      regenerates the schedule.
- [ ] One shared amortization generator; integer minor units; integer-scaled rates; balance hits zero.
