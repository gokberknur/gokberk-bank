# Payments — regulatory & trust framing

The framing a payments expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
compliance — but the experience should be *shaped by* how regulated payments actually work, because that's
what makes it feel like a real, trustworthy bank. Informed, not overbearing: use this to get the behaviour
right, not to bury the UI in legalese.

## PSD2 / Strong Customer Authentication (SCA)

- EU payments require **SCA** — two of: something you know (password), have (device/passkey), are
  (biometric) — for account access and most payments, with risk-based exemptions (low value, trusted
  beneficiary, recurring same-amount).
- **Design implication:** step-up (2FA/passkey) before sensitive or higher-value payments; trusted payees
  and small internal moves can be exempt (don't nag). The app's `?step-up` interceptor (F12) models this.
- **Dynamic linking:** the authentication should reference the specific amount + payee — so the confirm step
  names "Send €1,200 to Anna", not a generic "confirm".

## SEPA scheme rules (the euro rails)

- **SEPA Credit Transfer (SCT):** standard euro transfer, settles next business day. IBAN + (optionally) BIC.
- **SEPA Instant (SCT Inst):** ≤ 10 seconds, 24/7/365, final and irrevocable, up to a scheme limit. Treat as
  **settled immediately** — no pending.
- **SEPA Direct Debit (SDD):** pull payments under a **mandate** the payer authorises; payer has refund
  rights (8 weeks no-questions for authorised, 13 months for unauthorised). Show mandates, let users see/
  cancel them.
- **Standing orders** are payer-initiated recurring **push** payments (you control them); direct debits are
  payee-initiated **pull** under mandate (you authorise and can revoke). Don't conflate the two.

## Cross-border / SWIFT

- **Charge options:** OUR (sender pays all fees), SHA (shared — sender pays own bank, recipient pays
  correspondent/beneficiary fees), BEN (recipient pays all). Default SHA; expose under "More options".
- **Correspondent banking** means fees can be deducted en route → the recipient may get less than sent.
  Disclose "they receive ≈ X" and that intermediary fees may apply.
- **FX:** show the mid-market rate, your margin, and the resulting rate; a rate quote should **expire**
  (countdown) and re-quote rather than charge a stale rate.

## Confirmation of Payee (CoP) & fraud

- Name-matching against the account holder before a first payment is now an EU/UK expectation. Model it:
  on a new payee, simulate a CoP check and warn on mismatch ("the name doesn't match — proceed anyway?").
- **APP fraud (authorised push payment)** is the big risk: the user is tricked into sending willingly.
  Friction on new payees, large amounts, and unusual patterns is protection, not annoyance.

## Trust & safety bar (what the experience must convey)

- **No surprises:** every fee and rate disclosed before commit.
- **Honest state:** pending is pending; settled is settled; failed is recoverable with a next step.
- **Reversibility where it exists:** internal sends undoable; pending sends cancellable until cut-off; final
  rails clearly final.
- **Limits exist and are explained:** per-transaction and daily limits, with a clear reason and a path
  (raise via step-up where allowed) — never a dead-end.
