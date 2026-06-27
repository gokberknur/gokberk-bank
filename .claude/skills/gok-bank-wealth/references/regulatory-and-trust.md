# Wealth & Brokerage — regulatory & trust framing

The framing an investing expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
compliance — but the experience should be *shaped by* how regulated brokerage and crypto actually work,
because that's what makes it feel like a real, trustworthy broker. Informed, not overbearing: use this to get
the behaviour right, not to bury the order ticket in legalese.

## MiFID II — the brokerage spine

- **Execution-only & appropriateness.** gökberk bank is execution-only (no advice). For complex/leveraged
  products a firm must run an **appropriateness** test (does the client understand the risk?); for advice it's
  the heavier **suitability** test. We don't give advice — so never imply a recommendation ("best", "top
  pick", "you should buy"). The investor-appropriateness onboarding questionnaire lives in **identity/KYC** —
  route that to `gok-bank-identity`; here, just respect its outcome (e.g. gate a complex product).
- **Ex-ante costs & charges disclosure.** Costs must be shown **before** the order, *aggregated*, with an
  illustration of their effect on return. Design implication: the cost-preview ledger discloses estimated
  total, commission/fee, and the FX margin **before** the forced-decision confirm — never a fee revealed after.
- **Best execution.** A firm must take sufficient steps to get the best result for the client (price, cost,
  speed, likelihood). For the demo, model it as honesty: show an estimated price, label it **indicative**, and
  on a market order acknowledge **slippage** ("the final price may differ — markets move"). Bitpanda-style
  slippage caps that cancel beyond a threshold are a credible touch.
- **Product governance / target market.** Manufacturers define a product's target market; distributors respect
  it. We don't build the machinery, but it justifies the **risk band** on funds and not pushing a complex
  product at everyone.

## PRIIPs / UCITS — the fund disclosure framing

- **Key Information Document (KID).** Every PRIIP/UCITS sold to EU retail investors has a ≤3-page KID with a
  **Summary Risk Indicator (SRI) 1–7**, performance scenarios, a costs breakdown, and a recommended holding
  period. Design implication: the funds explorer + fact sheet show a **risk band (1–7, rule+mark+text, not
  colour-only)**, the **ongoing charge / TER** with a unit, and a plain "fees reduce returns; past performance
  doesn't predict future returns." A "view KID" stub is on-brand; a full KID engine is not (out of scope).

## MiCA & crypto — the irreversibility framing

- **MiCA** is the EU crypto-asset framework (CASP licensing, custody segregation, risk warnings to users). The
  experience cue: a serious, plain risk posture — "Crypto is volatile; you can lose money."
- **Irreversibility is the headline risk.** On-chain sends can't be reversed; the **wrong network or wrong
  address loses the funds permanently**. Model it: validate address format/checksum reward-early, warn on a
  network-mismatch, and force a **`gok-dialog tone="danger" no-dismiss`** that **names the network** and states
  the send can't be reversed before any funds move.
- **Honest settlement.** A send is **Pending → Confirming** (on-chain-style, with a tx hash + confirmations
  count), never instantly "Confirmed". A receive shows the address + QR + the selected network with a "send
  only <ASSET> on <NETWORK> to this address" caution.
- **Custody framing.** Treat balances as custodial (the app holds the keys, demo-style); don't imply
  self-custody or seed-phrase mechanics we don't model.

## Step-up authentication (SCA-adjacent)

- Higher-value orders and crypto sends trigger **step-up** (`F12`: OTP / passkey) over a threshold, with the
  amount + action named ("Buy €5,000 of AAPL"). A declined step-up returns to review with **no side effect**.
  Small, low-stakes actions (add to watchlist, change a chart range) don't nag.

## Trust & safety bar (what the experience must convey)

- **No surprises:** every cost (fee, FX margin) and the buying-power impact disclosed before commit.
- **Indicative, not guaranteed:** prices are labelled indicative; market orders acknowledge slippage; quotes
  expire and re-price rather than confirm a stale price.
- **Honest state:** Filled / Working / Queued are distinct and truthful; crypto is Pending → Confirming.
- **Direction by rule, not hue:** P/L and day-change by sign + icon + status role; Buy/Sell never colour-coded.
- **Irreversibility is loud where it's real:** crypto sends gate behind a network-named, no-dismiss confirm.
