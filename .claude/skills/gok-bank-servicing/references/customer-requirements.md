# Servicing — customer requirements

What servicing customers actually need, framed as jobs-to-be-done. Use this to scope features and judge
priority — a servicing surface earns its place by serving one of these jobs well, not by adding options.
Servicing is the "after the sale" layer: documents, signing, support, and disputes.

## Core jobs-to-be-done

- **"Find the document I need, right now."** A statement for a mortgage application, last year's annual
  summary, the policy schedule, the loan agreement. The job is *retrieval under mild pressure* — searchable,
  filterable, one place, viewable in-app, downloadable. People look for documents when something else (a
  landlord, a tax return, a broker) is waiting on them.
- **"Sign this so I can get the product."** Loan/mortgage agreements, insurance purchase, mandates. The job
  is *commit with confidence* — read it, understand I'm signing something binding, do it once, and keep proof.
  The fear is signing something I didn't read or can't later prove I signed.
- **"Get my question answered without phoning anyone."** The dominant support job. Self-serve first: surface
  the article, then make a human one tap away. Speed and not-having-to-repeat-myself matter most.
- **"Get help and track it."** Raise an issue, attach a screenshot, and *see where it is* — Open → In
  progress → Waiting on you → Resolved — without re-explaining. The anxiety is being dropped or ghosted.
- **"Get my money back on a charge that's wrong."** The highest-stakes servicing job. A charge I don't
  recognise, didn't get what I paid for, was charged twice. The job is *be heard, be guided, be kept whole
  while it's investigated* — told plainly whether I'm eligible, whether to try the merchant first, and exactly
  where the case stands.

## Segments and what they weigh

- **The document-hunter** — applying for a mortgage, doing taxes, switching providers; wants fast retrieval
  and a clean download. Hates hunting across screens or finding the statement isn't generated yet.
- **The committer** — taking a loan, buying insurance, authorising a mandate; wants to understand the weight
  of signing and to keep proof. Values clarity over speed at the moment of signing.
- **The self-server** — has a quick question; wants the answer in the help center and resents being forced to
  open a ticket for something an article covers.
- **The worried disputer** — just spotted a charge that's wrong or fraudulent; stressed, sometimes scammed.
  Weighs being believed, being kept whole (provisional credit), and never being blamed.

## Must-haves (table stakes — a serious bank has all of these)

- A single documents/statements vault: search + category/type/date filters, in-app viewer, download.
- Statements (`A06`) and signed copies (`D02`) appear in the vault automatically — one store, not silos.
- E-sign with a forced read (scroll-to-end), explicit binding consent, step-up auth, and a timestamped,
  downloadable signed copy.
- A help center (searchable articles) → raise a ticket (subject + description + attachments) → ticket list +
  thread with honest status → live chat (mock), with nothing lost between them.
- Dispute a card transaction pre-filled from the transaction, with honest eligibility gating, evidence upload,
  a transparent provisional-credit note, and a four-stage tracker to resolution.

## Nice-to-haves (differentiators — earn delight, but not at the cost of clarity)

- Category facets that double as navigation; "Signed" surfacing timestamped copies.
- Read-progress marker on the e-sign review; "already signed → show the copy" instead of re-gating.
- Chat that can be turned into a ticket so history is never lost; "still need help?" at the end of every
  article.
- A merchant-first nudge that *helps* (often the merchant fixes it fastest) without blocking a clear-fraud
  dispute; add-evidence and withdraw while a dispute is investigating.

## What customers fear (design against these)

- **Signing something I didn't read or can't prove later.** → scroll-to-end gate, explicit consent,
  timestamped signed copy in the vault.
- **The document isn't there when I need it.** → one vault, fast retrieval, statements/signed copies written
  through automatically; distinct empty vs. filtered-empty so I know which it is.
- **Being dropped, ghosted, or made to repeat myself.** → honest ticket status, preserved messages on
  failure, self-serve first, no dead ends.
- **Being blamed or losing money on a wrong charge.** → no-blame copy, honest eligibility, provisional credit
  stated as temporary/reversible, a tracker that tells the truth.
