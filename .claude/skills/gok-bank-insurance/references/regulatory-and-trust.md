# Insurance — regulatory & trust framing

The framing a protection expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
compliance — but the experience should be *shaped by* how regulated insurance distribution actually works,
because that's what makes it feel like a real, trustworthy insurer. Informed, not overbearing: use this to get
the behaviour right, not to bury the UI in legalese.

## IDD — Insurance Distribution Directive (Directive (EU) 2016/97)

The EU framework for how insurance is *distributed*. Its spirit: the distributor is responsible for good
customer outcomes, and the product sold must actually suit the customer. Two ideas drive our UX:

- **Demands-and-needs.** Before a sale, the distributor must identify the customer's insurance *demands and
  needs* and only propose cover consistent with them. **Design implication:** the buy wizard's product +
  configuration steps *are* the demands-and-needs conversation — we ask what's being insured and tailor the
  quote, rather than dumping a generic policy on the user.
- **No advice ≠ no responsibility.** Even a self-serve, no-advice sale must still be suitable and clearly
  disclosed. **Design implication:** clarity does the work advice would — the equal-weight ledger, the IPID
  facts, the cooling-off note.

## IPID — Insurance Product Information Document (IDD Art. 20 + Reg. (EU) 2017/1469)

A standardised, **max two-page** summary for non-life products, given to the customer *before* the contract is
concluded. Its prescribed sections include **"What is this type of insurance?", "What is insured", "What is
not insured", "Are there any restrictions on cover?"**, the excess, the cover period, and how to cancel.

- **Design implication — this is the soul of our quote screen.** The IPID puts "what is insured" and "what is
  **not** insured" on the same sheet, with equal standing. Our equal-weight `CoverLedger` is the IPID made
  interactive (see `references/cover-vs-exclusions.md`). Link/show an IPID-style summary on the quote; don't
  hide the limits in terms.

## Cooling-off / right of withdrawal

EU consumers can withdraw from a distance-sold financial contract within a cooling-off window — **14 calendar
days** for most insurance, **extended to 30 days** for life assurance and personal-pension contracts —
without penalty and (for distance sales) without giving a reason. (Framework: the Distance Marketing of
Financial Services rules, modernised by Directive (EU) 2023/2673.)

- **Design implication:** show the cooling-off period on the quote (a key fact in the ledger) **and** restate
  it on the buy-success screen, and carry a reversibility/withdraw affordance into policy management (`N02`)
  while the window is open. Finality (a signed, bound policy) and reversibility (cooling-off) coexist — show
  both honestly. Use the correct window per product (14 vs 30 for life). Never compute a refund figure out of
  thin air — derive it from the stated cooling-off / pro-rata rule.

## Transparency of cover, exclusions, and cost

- **No surprises before commit.** Premium (monthly **and** annual), excess, limits, sums insured, key
  exclusions, and the cooling-off window are all on the quote *before* the forced-decision buy.
- **Exclusions at equal weight.** The regulatory intent behind the IPID is precisely that limits aren't buried.
  We honour the intent, not just the letter — see `references/cover-vs-exclusions.md`.
- **Honest eligibility / declines.** Ineligible or declined cover gives a clear reason and an alternative —
  never a dead-end, never blame.

## E-sign, payment, and identity — handled by siblings (don't reimplement)

- **Legally signing the policy** routes through e-sign (`D02`) — owned by **`gok-bank-servicing`**. You require
  it; you don't build it.
- **Paying** the premium (or a claim payout) is money movement — **`gok-bank-payments`**. Forced-decision buy
  confirm + step-up (`F12`) over a threshold sits at the seam; you state *that* it's required, payments owns
  *how* the money moves.
- **Documents & signed copies** land in the vault (`D01`) — **`gok-bank-servicing`**.
- **Identity / KYC** for eligibility — **`gok-bank-identity`**.

## Trust & safety bar (what the experience must convey)

- **You understand it before you buy it:** cover and exclusions equal, every cost disclosed, cooling-off
  stated.
- **You're never trapped:** cooling-off honoured, cancel is clean and no-blame, no retention dark patterns.
- **Claims are fair, not adversarial:** calm, no-blame, honest stages and reasons.
- **Limits and eligibility are explained, never dead-ends:** always a reason and a next step.
