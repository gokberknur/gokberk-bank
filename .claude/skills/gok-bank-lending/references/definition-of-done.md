# Lending — definition of done

The quality bar a lending surface must clear before you'll sign it off. This is the domain lens, on top of the
feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review. If a
lending surface fails any of these, it's not done.

## Disclosure (the centre of this domain)

- [ ] The offer shows the **APR** (or **APRC** for a mortgage) beside the headline rate — never a rate without
      it.
- [ ] The offer shows the **monthly payment**, **total amount repayable**, **total cost of credit**,
      **first-payment date**, and every **fee itemised**.
- [ ] Any indicative/advertised rate carries a worked **representative example** of equal visual weight, with
      the word "representative".
- [ ] No teaser hype — no "0%", no "best rate!!"; a promo rate (if any) states its end date and go-to rate.

## Affordability, soft search & decline

- [ ] The eligibility/affordability check is presented as a **soft search** ("won't affect your credit
      score"), as an honest **pending** state, resolving to **approved / referred / declined** deterministically.
- [ ] A decline shows a **plain reason** and **at least two alternatives** — no credit score, no blame copy, no
      dark pattern.
- [ ] "Referred" (human review) is modelled as a legitimate, humane outcome, not a failure.

## Forced decisions, step-up & reversibility

- [ ] Signing a credit agreement, paying off a loan, an overpayment that **triggers an ERC**, and a rate switch
      each use a forced-decision `gok-dialog tone="danger" no-dismiss` that names the **exact figure** first.
- [ ] Each of those requires **step-up** (F12); declining step-up returns with **no side effect**.
- [ ] Reversible acts (an overpayment within the ERC-free allowance, a draft save) use optimistic + cancel-
      window, not a forced dialog. Friction matches stakes.
- [ ] The **14-day withdrawal right** is stated plainly on every regulated-credit success screen.
- [ ] Funds **never move before** the forced-decision e-sign; funding states a real **ETA**, never faked
      instant funding.

## Amortization & math correctness

- [ ] Money is integer **minor units**; APR/APRC, amortization, and ERC use integer-scaled rates — **never
      float-multiply a rate**.
- [ ] The schedule sums: principal + interest = payment; the remaining balance decrements to **zero at term**.
- [ ] Early payoff = outstanding principal + accrued interest (+ any adjustment); the **interest saved** is
      shown before commit.
- [ ] An overpayment previews its effect (shorter term **or** lower payment) before confirm.
- [ ] Long mortgage schedules (~360 rows) **virtualize** smoothly while keeping header + keyboard semantics.

## Validation, states & feedback

- [ ] Insufficient funding-wallet balance, deposit ≥ value, below-min-deposit surface **reward-early** (as
      typed), cleared live on fix; copy is no-blame.
- [ ] Loading, empty, error, pending, and resumable (draft banner) states are present per
      `.planning/ux/patterns.md`.
- [ ] A payoff/settlement is held **pending** until it clears, then "closed" — never marked closed early.
- [ ] A draft can be abandoned and resumed at the correct step with prior data intact.

## Consistency

- [ ] Reuses the shared amortization/schedule generator and the money engine (don't fork per-product math).
- [ ] E-sign and the documents vault are consumed from `gok-bank-servicing`, not reimplemented; step-up is the
      F12 interceptor; funding routes through `gok-bank-payments`.
- [ ] The journey matches the patterns `gok-bank-ux` enforces; scope matches what you declared in.
- [ ] axe clean on offer, decline, e-sign, the (virtualized) schedule, and the repay/overpay/payoff dialogs.

## The gut check

Would a real borrower understand *exactly* what this credit costs — APR/APRC, total cost, every fee, the
schedule — and feel they could walk away (14-day right, no ERC surprise, a decline that isn't a verdict)? If any
part would make them feel surprised, judged, or rushed into an irreversible commitment — it's not done.
