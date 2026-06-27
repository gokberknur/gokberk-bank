# Servicing — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship. Use this at every scope decision; when something feels like creep, say so and point here.

## What gökberk bank's servicing delivers (in scope)

- **Documents & statements vault (`D01`)** at `/documents`: searchable, category/type/date-filtered
  `gok-table` list, an in-app viewer, download; the **single write-through** that statements (`A06`) and
  signed copies (`D02`) feed via one `add()` path.
- **E-sign (`D02`)** at `/documents/[id]/sign`: review (scroll-to-end gate) → consent → authenticate
  (step-up) → signed, with a timestamped, downloadable signed copy written to the vault; safe resume.
- **Support (`S01`)** at `/support/*`: a help center (searchable articles), raise-a-ticket (subject +
  description + attachments), ticket list + thread with honest status, and a mock live chat that can become a
  ticket.
- **Disputes / chargebacks (`S02`)** at `/support/disputes/*`: a resumable wizard (transaction → reason →
  details → evidence → review → submit) pre-filled from the transaction, with eligibility gating, evidence
  upload, a transparent provisional-credit note, and a Raised → Investigating → Provisional credit → Resolved
  tracker.

This set fully exercises the legal-gravity, dispute-correctness, single-vault, and no-blame-support concerns.
It's a complete, credible servicing layer for a pan-European neobank demo.

## What we do NOT build (and why)

- **Real e-signature PKI / qualified certificates / a real trust-service provider.** It's a mock demo — the
  signature is a deterministic mock token + ISO timestamp that *evokes* an AES-flavoured experience. Never
  wire real cryptographic signing or a real eIDAS QSP.
- **Real chargeback adjudication / scheme connectivity.** No real Visa/Mastercard dispute submission, no real
  representment. Eligibility, provisional credit, and resolution are deterministic mock rules.
- **A real complaints-management / ombudsman integration.** We model the *spirit* (honest status, always a
  next step) — not a regulated complaints engine or a real ombudsman referral.
- **An ITSM-grade ticketing system** (SLAs, queues, agent routing, CSAT surveys, macros). The demo's tickets
  are seeded threads with honest status — not a Zendesk clone.
- **A knowledge-base CMS / authoring tools.** The help center is a seeded, searchable corpus of editorial
  prose — not an editable KB with versioning and workflows.
- **A real-time chat backend / live agents.** Chat is a mock panel with seeded/canned replies and a typing
  indicator. Never wire a real websocket support backend.
- **A second document store.** There is exactly **one** vault. Never duplicate document storage in another
  feature; other features *write through* `D01.add()`.

## Creep signals — push back when you see these

- "Let's add real DocuSign / a real e-sign provider" → no; mock token + timestamp models the experience.
- "Make the dispute auto-submit to the card scheme" → no; deterministic mock resolution only.
- "Build a full agent console / SLA dashboard for tickets" → no; seeded threads with honest status.
- "Let support edit help articles in-app" → no; the corpus is seeded prose, not a CMS.
- "Store the signed PDF in the signing feature too" → no; one vault, one `add()` path.
- "Require step-up to *submit* a dispute" → usually no; a dispute is a formal claim, not a money-move —
  contrast e-sign, which always steps up.

## The borders with the sibling skills (route, don't absorb)

- **The card being disputed — its mechanics** (freeze, replace, PAN, controls) → **`gok-bank-cards`**. We own
  the dispute *process*; cards owns the card.
- **The payment/transaction itself** (the rail, how the money moved, a SEPA Direct Debit *refund*) →
  **`gok-bank-payments`**. We own the dispute *process*, not the payment.
- **Generating a statement's data** (the ledger, the statement period, the numbers) →
  **`gok-bank-accounts`**. We own the **vault that stores** the statement; accounts produces it and writes it
  through `add()`.
- **The step-up auth e-sign invokes** (OTP, passkey, the `?step-up` interceptor) → **`gok-bank-identity`**. We
  **consume** it; identity owns it.
- **Insurance claims** (file/track a claim against a policy) → **`gok-bank-insurance`**. A claim is not a
  card payment dispute — different flow, different owner. A non-card *complaint* goes to support (`S01`), not
  the dispute wizard.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not wiring a real e-signature provider — it's a
mock demo, and a deterministic mock token + ISO timestamp written to the vault models the *experience* of an
AES signature (intent, identity via step-up, a retained timestamped record) without the legal/PKI machinery.
That's what sells the trust; the cryptography wouldn't be visible." A good no protects the product and
teaches the team the domain.
