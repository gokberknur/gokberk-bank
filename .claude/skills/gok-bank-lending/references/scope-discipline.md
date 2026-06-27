# Lending — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship. Use this at every scope decision; when something feels like creep, say so and point here.

## What gökberk bank's lending delivers (in scope)

- **Personal loan** (L01): amount/term sliders → live estimate → purpose → finances → soft affordability check
  → fully-disclosed offer → e-sign → done with the 14-day withdrawal right.
- **Loan servicing** (L02): summary + complete repayment schedule, overpay (with effect preview), early payoff
  (exact settlement + interest saved, forced decision + step-up), documents.
- **Mortgage calculator** (L03): public, no-auth; value/deposit/term/rate-type → monthly, total interest, total
  repayable, LTV, amortization chart; shareable by URL; labelled an estimate, not an offer.
- **Mortgage application + servicing** (L04): property → finances → document upload → decision-in-principle →
  offer (rate, **APRC**, itemised fees, total cost, full amortization) → e-sign; servicing with a virtualized
  amortization table, overpay with the **ERC-warning forced decision**, and rate-switch.
- **Credit card / revolving credit line** (L05): eligibility soft check → disclosed limit offer (representative
  APR + worked example) → e-sign; manage with balance, available credit, statement, minimum payment, due date,
  and repay (min / statement / custom).

This set fully exercises regulated disclosure (APR/APRC, total cost, representative example, itemised fees),
affordability + soft search, e-sign + the 14-day withdrawal right, amortization, and the forced-decision spine.
It's a complete, credible lending product for a pan-European neobank demo.

## What we do NOT build (and why)

- **Real credit scoring / bureau integration / KYC.** It's a mock demo — affordability is a deterministic model
  from `F03`. Identity/KYC is `gok-bank-identity`. Never wire a real bureau.
- **Real funds disbursement or real ERC accounting.** Money movement to fund a loan or settle a payment is
  simulated and routed through `gok-bank-payments`; we state an ETA, we don't move real money.
- **A standalone BNPL / pay-in-3 checkout product.** It's a different surface (merchant integration, point-of-
  sale) and invites the very nudging we refuse. The revolving credit line (L05) covers the "flexible borrowing"
  job on-brand.
- **Secured lending beyond residential mortgages** (car finance as secured product, business loans, HELOCs,
  bridging, second-charge). High effort, different disclosure regimes, low demo value. Out.
- **A guarantor *workflow*.** "Add a guarantor" is offered as a decline *alternative* (copy), not a built
  second-applicant journey — that's a large flow for little demo gain.
- **Debt-management / hardship restructuring tooling.** Real and important, but out of a demo's scope; the
  no-blame decline + alternatives is where we show the humane posture.
- **A second confirm dialog on low-stakes reversible actions.** An overpayment *within* the ERC-free allowance,
  a draft save — optimistic + cancel-window, not a forced decision. Friction matches stakes.

## Creep signals — push back when you see these

- "Let's add BNPL / pay-in-3 at checkout" → no; different surface and against our no-nudge stance; the credit
  line serves flexible borrowing.
- "Add car finance / a business loan" → no; different secured-lending regime; pan-European consumer scope is
  loan + mortgage + revolving.
- "Show the credit score on decline so it feels transparent" → no; a score reads as a verdict; a plain reason +
  alternatives is the humane and correct pattern.
- "Skip the representative example, it clutters the offer" → no; it's the centre of regulated disclosure and
  the antidote to the teaser rate.
- "Just fund instantly on sign, it feels faster" → no; funds never move before the forced-decision e-sign, and
  we state a real ETA rather than fake instant funding.
- "Make the overpayment a one-tap" → only within the ERC-free allowance; past it, the ERC-warning forced
  decision is mandatory.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not building a BNPL checkout — it's a different
surface and it invites the affordability-nudging we explicitly refuse. The 'borrow flexibly' job is already
served by the revolving credit line (L05), which discloses the APR and a representative example up front and is
more on-brand for a calm, honest neobank." A good no protects the borrower and teaches the team the domain.
