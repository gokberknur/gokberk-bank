# Lending — customer requirements

What borrowers actually need, framed as jobs-to-be-done. Use this to scope features and judge priority — a
lending surface earns its place by serving one of these jobs well, with the full price shown, not by adding
options or rushing the borrower to "yes".

## Core jobs-to-be-done

- **"Tell me what it really costs, before I commit."** The dominant job across every credit product. Not the
  monthly alone — the APR/APRC, the total amount repayable, the total cost of credit, and the fees. Borrowers
  have been burned by teaser rates; transparency is the trust signal.
- **"Let me see the cost before I hand over any personal detail."** A loan/mortgage calculator: drag amount and
  term, watch the monthly update live, *then* decide whether to apply. Top-of-funnel honesty earns the
  application.
- **"Check if I qualify without hurting my score."** A soft search, said plainly. The fear is that asking costs
  them. Remove it: "soft search — won't affect your credit score."
- **"Borrow a fixed sum for a known purpose."** Personal loan: consolidation, home improvement, a car. The job
  is a predictable monthly payment and a clear end date.
- **"Buy a home I can afford, and understand the 25-year commitment."** Mortgage: the heaviest decision a
  customer makes. The job is *understanding* — LTV, fixed vs variable, how front-loaded the interest is, what
  happens if rates rise, what it costs to leave early.
- **"Borrow flexibly and pay it back on my terms."** Revolving credit (card / line): the job is a clear
  balance, available credit, a statement rhythm, and a minimum payment — with an honest warning about the cost
  of paying only the minimum.
- **"Get out early and pay less."** Overpay or settle early. The job is seeing the *exact* payoff figure and
  the interest saved before committing — and not being punished by a surprise charge.
- **"If you say no, tell me why and what I can do instead."** A decline that's a plain reason plus real
  alternatives, never a score and never blame.

## Segments and what they weigh

- **The consolidator** — wants a lower, single monthly payment; weighs APR and total cost over the headline.
- **The first-time buyer** — anxious, research-mode, not logged in; wants the calculator, LTV bands, and a
  believable monthly before talking to anyone.
- **The remortgager / rate-switcher** — near a fixed-period end; weighs the new rate vs the ERC of moving now.
- **The flexible borrower** — wants a credit line/card for headroom; weighs the limit, the APR, and how easily
  they can repay.
- **The overpayer** — disciplined, wants to clear debt early; weighs interest saved vs any early-repayment cost.

## Must-haves (table stakes — a serious lender has all of these)

- A live calculator/estimate before any PII (loan amount/term; mortgage value/deposit/term/rate type).
- A soft affordability/eligibility check, stated as a soft search, resolving approved / referred / declined.
- A fully-disclosed offer: APR (or APRC), monthly, total repayable, **total cost of credit**, fees itemised,
  and a **representative example** for any indicative rate.
- E-sign of the credit agreement with step-up, and the **14-day withdrawal right** stated on success.
- For servicing: outstanding balance, next payment, a complete amortization/repayment schedule, overpay, and
  early payoff with the exact settlement figure + interest saved.
- For revolving: balance, available credit, statement balance, minimum payment, due date, repay (min / full /
  custom) with the interest impact shown.
- No-blame decline with a plain reason and at least two alternatives.

## Nice-to-haves (differentiators — earn delight, but not at the cost of clarity)

- A shareable calculator (URL params) so a result can be sent or bookmarked.
- An amortization/payoff chart that *shows* the saving (original vs post-action glide path), not just states it.
- Overpayment effect preview ("shortens your term by 4 months" vs "lowers your payment to €X") before confirm.
- A stress-test toggle ("if rates rise") on the mortgage calculator.
- A rate-switch surface near a fixed-period end with the new terms shown side by side.

## What customers fear (design against these)

- **Hidden cost.** → APR/APRC + total cost + every fee on the offer, before sign.
- **The teaser trap.** → no "0%"/"best rate!!"; a representative example carries equal weight to the headline.
- **Being judged on decline.** → plain reason, alternatives, no score, no blame copy.
- **Irreversible commitment.** → forced-decision confirm for signing, payoff, ERC-triggering overpay,
  rate-switch — the figure named first.
- **A surprise early-repayment charge.** → show the exact ERC and the net effect before the overpayment applies.
