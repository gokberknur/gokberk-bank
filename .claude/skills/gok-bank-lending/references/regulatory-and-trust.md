# Lending — regulatory & trust framing

The framing a lending expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
compliance — but the experience should be *shaped by* how regulated lending actually works, because that's what
makes it feel like a real, trustworthy bank. **Regulated-disclosure discipline is the centre of this domain.**
Informed, not overbearing: use this to get the behaviour right, not to bury the UI in legalese.

## Consumer Credit Directive (CCD) — personal loans & revolving credit

The EU framework for unsecured consumer credit (Directive 2008/48/EC; revised as 2023/2225, applying from Nov
2026). What it shapes:

- **APR (Annual Percentage Rate).** A single percentage representing *all* the mandatory costs of obtaining the
  credit. It's the comparison figure — show it beside the headline rate, every time.
- **Total cost of credit & total amount repayable.** The borrower must be able to see the whole price: the sum
  of interest + fees (total cost of credit) and principal + that cost (total amount repayable). Disclose both
  on the offer, plainly, not buried.
- **Representative example.** Any *advertised or indicative* rate must be illustrated with a worked
  **representative example** carrying the word "representative" — a sample amount, term, rate, monthly, and
  total. The representative APR is the rate at least ~51% of accepted customers receive. Give the example equal
  visual weight to the headline; it's the antidote to the teaser rate.
- **Pre-contractual disclosure (SECCI).** Real lenders hand over the *Standard European Consumer Credit
  Information* sheet before signing. Model the spirit: a complete, standard pre-sign summary of cost and terms.
- **Creditworthiness / affordability assessment.** The lender *must* assess that the borrower can sustainably
  repay — income vs outgoings vs existing commitments — before lending. We model this as the soft
  affordability check (approve / refer / decline + headroom). Where the decision is automated, the borrower has
  a right to **human intervention** — so "referred" (manual review) is a legitimate, humane outcome, not a
  failure.
- **14-day withdrawal right.** The borrower can withdraw from the agreement, no reason needed, within 14 days
  of signing. State it plainly on the success screen — it's a trust signal.
- **Early repayment.** The borrower has the right to repay early and receive a **reduction in the total cost of
  credit** (the unaccrued interest). The lender may claim *fair, objectively justified* compensation, but only
  in limited cases (a fixed borrowing rate), capped (≈1% of the amount repaid with >1yr remaining, ≈0.5%
  otherwise). For an unsecured personal loan, the consumer-friendly default is **interest-to-date only** — show
  the exact settlement figure and the interest saved.

## Mortgage Credit Directive (MCD) — secured home loans

The EU framework for residential mortgages (Directive 2014/17). The disclosure burden is heaviest here:

- **APRC (Annual Percentage Rate of Charge).** The mortgage equivalent of APR — one figure for the total cost
  of the secured loan as a yearly percentage, including fees. **Never show a mortgage rate without its APRC.**
- **ESIS (European Standardised Information Sheet).** The standard binding-offer document. It states the APRC,
  itemises fees, and shows example payments *if the rate rose to a high level* (a stress illustration). Model
  the spirit: the offer itemises rate, APRC, every fee, total cost, **and the full amortization**.
- **Affordability assessment.** Stricter than CCD — assessed to common EU standards before any binding offer;
  the decision-in-principle (DIP) is the modelled gate.
- **Early-repayment charge (ERC).** A mortgage may carry an ERC, typically a **tapering** percentage by
  remaining fixed years, with an **annual ERC-free overpayment allowance**. An overpayment *within* the
  allowance is a normal review; one that *exceeds* it (or falls in the fixed period) triggers the **ERC-warning
  forced decision** — show the exact charge before it applies.
- **Rate switch.** Near a fixed-period end the borrower can move to a new product — show the new rate, APRC,
  fees, and monthly; confirm as a forced decision; regenerate the schedule.

## E-sign, step-up & the money spine

- Signing a credit agreement is a **forced decision** ("You're signing a credit agreement") with **step-up**
  (OTP/passkey via F12). The signing *mechanics* and the documents vault are `gok-bank-servicing` — you specify
  *what* must be in the agreement and *that* it requires step-up; they execute.
- **Funds never move before the forced-decision e-sign.** Don't fake instant funding — state a real ETA ("in
  your EUR wallet by tomorrow"). The signed agreement and any settlement/redemption letter land in the vault.

## The no-hype rules (financial promotions)

- **No teaser headlines.** "0% intro!!", "best rate!!", "borrow now!!" are forbidden. A promo rate, if modelled
  at all, is stated plainly *with its end date* and its go-to rate.
- **The representative example is mandatory** wherever an indicative rate appears, and carries equal weight.
- **No blame on decline.** A plain reason + alternatives; never a credit score; never a dark pattern that
  nudges a borrower past affordability.

## Trust & safety bar (what the experience must convey)

- **No surprises:** APR/APRC, total cost, every fee, and the representative example shown before sign.
- **Honest state:** the soft check is a real pending; a payoff is "pending" until it clears, then "closed" —
  never marked closed early.
- **Reversibility where it exists:** the 14-day withdrawal right; cancel-window on a reversible overpayment;
  step-up that, if declined, returns with **no side effect**.
- **Decline with a door:** a reason and a real next step, never a dead-end.
