# Servicing — regulatory & trust framing

The framing a servicing expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
e-signature PKI, real chargeback adjudication, or real complaints handling — but the experience should be
*shaped by* how these actually work, because that's what makes it feel like a real, trustworthy bank.
Informed, not overbearing: use this to get the behaviour right, not to bury the UI in legalese.

## eIDAS — electronic signature levels (the e-sign frame)

EU electronic signatures come in three legal levels under eIDAS. We don't implement the cryptography, but the
*experience* should evoke the right one.

- **SES (Simple Electronic Signature)** — any act showing intent to sign: a click, a checkbox, a typed name.
  Legally valid, but weak proof — in a dispute *you* must prove who signed and that they intended to.
- **AES (Advanced Electronic Signature)** — uniquely identifies the signer and links identity to the document
  (control data, timestamp, cryptographic key); tamper-evident. Probative value still demonstrable in dispute.
- **QES (Qualified Electronic Signature)** — based on a qualified certificate from a trust-service provider;
  the *only* level legally equivalent to a handwritten signature EU-wide. The burden of proof flips: a
  challenger must prove it fraudulent.

**Design implication:** our e-sign flow models an **AES-flavoured** experience — identity is established via a
**step-up** (`gok-bank-identity` owns it), the act is **tied to the specific document** (review the actual
doc, not a summary), and the signed copy carries a **timestamp + signer + reference** (the audit-trail
spirit: who signed, when, what). The three pillars to convey, borrowed from how real e-sign works (DocuSign's
model): **intent to sign** (a deliberate Sign act, named plainly), **consent** (an explicit acknowledgement
this is a legally binding electronic signature), and a **retained record** (the timestamped signed copy in
the vault, downloadable). Never enable Sign before the document is actually read (scroll-to-end gate) — an
unread signature is exactly the weak-proof scenario eIDAS warns about.

## Chargebacks & dispute rights (the dispute frame)

- **Scheme chargeback rights.** Card networks (Visa/Mastercard) let an issuer reverse a transaction under
  defined **reason codes** — broadly: *fraud / not recognised*, *processing errors / duplicate*, *consumer
  disputes* (goods/services not received, not as described, wrong amount). Our `reasons.ts` enum maps to these
  families; the reason drives the branching and the evidence that helps.
- **Dispute windows.** Schemes set time limits (commonly ~120 days from the transaction or expected delivery).
  An **outside-window** transaction is gated — but with a clear reason and an alternative (e.g. raise a
  complaint via `S01`), never a silent dead end.
- **Merchant-first.** For *not received* / *not as described* reasons, the right first step is usually the
  merchant — schemes often *require* the cardholder to have attempted resolution first. Model this as a
  **nudge, not a barrier**: "Often the merchant can fix this fastest — but you can dispute now if this looks
  like fraud." Clear fraud bypasses it.
- **Provisional credit.** While a dispute is investigated, the issuer may post a **temporary** credit so the
  customer isn't out of pocket — but it **can be reversed** if the dispute isn't upheld. This is the single
  most important honesty point in the whole flow: **always state provisional credit as temporary and
  reversible**, every time it appears. Never present it as a settled refund.
- **PSD2 refund rights** (separate from chargeback) — for **SEPA Direct Debit**, the payer has refund rights
  (8 weeks no-questions for authorised, 13 months for unauthorised); for unauthorised card transactions, the
  payer is generally refunded promptly subject to investigation. The dispute flow here is card-centric
  (chargeback); a direct-debit *refund* is a payments concern (`gok-bank-payments` owns the mandate).
- **No step-up by default on submit.** A dispute is a *formal claim*, not a money-move by the user, so the
  forced-decision confirm carries a **light** danger tone and no mandatory step-up unless policy says so —
  contrast with e-sign, which *always* steps up.

## Complaints handling & the ombudsman (the support/escalation frame)

- Regulated banks must handle complaints to a timetable: a **final response** within **8 weeks** (a holding
  response earlier), after which the customer can escalate to a **financial ombudsman**. The customer has a
  window (commonly 6 months from the final response) to refer it.
- **Design implication:** support status is honest and time-aware — "we'll get back to you, usually within a
  day"; a ticket that stalls has a visible status, never silence. We don't build a real ombudsman, but the
  *spirit* — there is always a next step, escalation exists, nobody is dropped — shapes the no-dead-end
  posture. A dispute that's declined explains *why* and what the customer can still do.

## Record-keeping & data

- **Retention as fact.** Signed documents, statements, and dispute records are things a bank *keeps* — the
  vault is the demo's expression of that. Signed copies are immutable once written (re-signing shows the
  existing copy rather than silently overwriting). Timestamps are ISO, shown as fact.
- **No real PII / no real money.** All documents, signatures, tickets, and disputes are mock/seeded and
  deterministic. Signature is a deterministic mock token + ISO timestamp; provisional credit is integer
  **minor units**; attachments are mock blobs/metadata.

## Trust & safety bar (what the experience must convey)

- **Gravity at signing:** the user read it, knew it was binding, authenticated, and kept proof.
- **Honesty in disputes:** eligibility stated plainly; provisional credit always temporary/reversible; the
  tracker tells the truth (Raised → Investigating → Provisional credit → Resolved, upheld/declined with
  reasoning).
- **No dead ends in support:** self-serve first, escalation always available, messages preserved, status
  visible.
- **No blame, ever:** the customer is never implied to be at fault — not in a dispute, not in a ticket.
