# Cards — regulatory, scheme & trust framing

The framing a card-issuing expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
scheme compliance and there is **never a real PAN, CVV, or PIN** — but the experience should be *shaped by*
how regulated card issuing actually works, because that's what makes it feel like a real, trustworthy bank.
Informed, not overbearing: use this to get the behaviour right, not to bury the UI in legalese.

## PCI thinking on displaying card data (why the reveal is gated)

- PCI-DSS treats the **full PAN** as data you mask by default — displays show only the last four (`•• 1234`),
  and the full number appears only on a **legitimate, authenticated need**. We model exactly that: masked
  everywhere, full PAN/CVV revealed only after a re-auth.
- **Design implication:** "Show card number" → step-up (`F12`) → a focus-trapped `gok-dialog` with the full
  PAN/expiry/CVV on a **depleting countdown** (~20s) that auto-hides and re-masks. The PIN reveal (~15s) is
  the same shape. **Never persist a revealed value**; never log it; never put it in a URL.
- This is the one place "more friction is the feature": a number on screen is a number that can be
  photographed. The auto-hide must be WCAG-safe (pauses on focus) so it doesn't yank content from a user
  mid-read.

## 3-D Secure 2 / SCA (the online-payment challenge)

- EU card payments need **Strong Customer Authentication** — two of know/have/are. 3-D Secure 2 carries
  contextual data to the issuer, which risk-scores the transaction: low risk → **frictionless** (no prompt);
  higher risk → a **challenge** pushed to the banking app.
- **Design implication:** the **challenge** is our 3-DS surface — a push-style `gok-dialog no-dismiss` naming
  the **merchant, exact amount + currency, card •• 1234, and time**, with a live countdown. Approve takes a
  step-up (dynamic linking: the auth references *this* charge, not a generic confirm). The countdown reaching
  zero **auto-declines** — failing safe; never auto-approves. Escape/scrim fire `gok-cancel` only — they never
  approve or silently dismiss a security decision.
- Exemptions exist (low-value, trusted-beneficiary, transaction-risk-analysis) — which is *why* not every card
  payment challenges. We don't model the exemption engine, but the principle (don't challenge trivial spends)
  shapes when a 3-DS prompt should appear at all.

## Scheme rules (Visa / Mastercard) & card types

- Cards run on a **scheme** (Visa / Mastercard); the network mark and the last-4 identify the card. We carry a
  network mark as data, never as a brand-coloured fill.
- **Physical** cards ship (a delivery ETA, tracked option); **virtual** cards issue **instantly** (ready to
  use, addable to a wallet); **disposable** cards are single-use — the number regenerates after each purchase,
  so they suit one-off online buys and aren't for contactless or recurring use.
- **Channel controls** (online · contactless · ATM) and **spend limits** map to real issuer-side controls a
  scheme honours at authorisation. A **region allow-list** restricts the geographies a card authorises in.
  Model these as instant, reversible settings.

## Tokenization & wallet provisioning (Apple Pay / Google Pay)

- Adding a card to a wallet does **not** copy the PAN — it provisions a **device token** (a DPAN / "device
  account number") unique to that device+wallet, so the merchant never sees the real number.
- **Design implication:** provisioning issues a token, so it's **gated by a step-up**. The review states what
  a token is in one plain line ("a device-only number replaces your card number") — a trust signal, no hype.
  Reflect wallet status back on the card detail; never re-provision an already-added wallet. Never call a real
  provisioning API; never import third-party wallet brand colours beyond a neutral mark + the name as a label.

## Liability, disputes & chargebacks (where this skill stops)

- Scheme **zero-liability** and **chargeback** rights mean a customer who reports an unauthorised charge isn't
  on the hook — which is why the 3-DS prompt always offers **"didn't recognise this?"**.
- That escape hatch **routes into the dispute flow (`S02`), owned by `gok-bank-servicing`** — this skill owns
  the *prompt and the hand-off*, not the dispute case itself. Don't build dispute mechanics here.

## Trust & safety bar (what the experience must convey)

- **Masked by default, revealed deliberately:** no sensitive number shown without a step-up; nothing lingers.
- **Honest reversibility:** freeze is reversible and never faked; a replace truly cancels the old card.
- **Fail safe:** a 3-DS timeout declines, never approves; a failed setting rolls back with an honest alert.
- **Containment on demand:** virtual/disposable cards give the customer a number with a blast radius.
