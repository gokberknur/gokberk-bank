# Accounts — customer requirements

What account & wallet customers actually need, framed as jobs-to-be-done. Use this to scope features and
judge priority — an account surface earns its place by answering "what do I have, and where did it go?" with
no ambiguity, not by adding widgets.

## Core jobs-to-be-done

- **"Tell me what I have, right now, without doing maths."** The dominant job. Every wallet, its balance,
  and one home-currency total at a glance — and crucially, how much is *actually spendable* (available) vs.
  the settled figure (current) with held funds itemised. Ambiguity here is the fastest way to lose trust.
- **"Show me where my money went."** The transaction ledger is the system of record. People come to it to
  reconcile, to find a charge they don't recognise, to follow a running balance down. It must be fast,
  searchable, filterable, and scannable across a month — or thousands — of activity.
- **"Hold money in another currency and see it honestly."** Multi-currency wallets with their own balances
  and IBANs; the home-currency total converted at a fair, visible rate. Wise built a company on doing this
  without hiding the conversion.
- **"Set money aside toward a goal — and watch it grow."** Savings pots/vaults: a target, a progress ring,
  round-ups that sweep spare change, an auto-save rule, and instant withdraw when life happens. The job is
  *gentle discipline*, not a locked-up term deposit.
- **"Give someone my account details so they can pay me."** IBAN/BIC, copyable in one tap, correct and
  legible. A surprising amount of an account's value is just *handing over the right number*.
- **"Get a record I can keep or hand to someone."** Statements for a period, downloadable, that reconcile to
  the ledger — for a landlord, an accountant, a visa application.

## Segments and what they weigh

- **The everyday holder** — one or two wallets; wants a calm balance, a clear ledger, and instant
  recognition of every charge. Hates a balance that "moves" unexplained.
- **The international / expat** — multi-currency; cares about the home-currency total, fair FX visibility,
  and a clean per-currency IBAN to receive into.
- **The saver / goal-setter** — pots, round-ups, auto-save; wants progress they can feel and money they can
  pull back instantly.
- **The organised / records-keeper** — statements, downloadable, reconciling; wants the document to be tidy,
  branded, and trustworthy enough to hand over.

## Must-haves (table stakes — a serious bank has all of these)

- Every wallet with available **and** current balance (held delta itemised), plus a home-currency total at a
  visible mid-rate.
- A fast, sortable, filterable, searchable transaction grid with a running balance and clear pending vs.
  settled state.
- Copyable IBAN/BIC on every wallet; masked-but-copyable counterparty IBAN on a transaction.
- Open a new currency wallet with an instantly-issued IBAN.
- Transaction detail: categorize, tag, note, receipt; contextual actions (split/dispute/repeat); cancel a
  pending payment inside its window.
- Statements for a period that reconcile to the ledger and download.
- Savings pots with progress, add/withdraw (instant, reversible), and round-ups.

## Nice-to-haves (differentiators — earn delight, but not at the cost of clarity)

- A balance-history chart on the wallet detail with range chips.
- A trend sparkline on wallet cards (defer until charts settle).
- Round-up multipliers and an "on track / €60 to go" note on pots.
- Bulk actions on the ledger (export selection, categorize), faceted filter chips, density toggle.
- A statement that deep-links into the ledger filtered to its period.

## What customers fear (design against these)

- **A balance they can't trust.** Available conflated with current, held funds hidden, a total that doesn't
  add up. → model the distinction; itemise held; reconcile the total at a visible rate.
- **A charge they don't recognise.** → rich transaction detail, merchant + logo, copyable reference, a clear
  path to dispute.
- **Money "stuck" with no explanation.** → honest pending state with a cancel-until-cut-off affordance where
  the rail allows; never a silent hold.
- **Handing over the wrong IBAN.** → legible, grouped, one-tap-copy identifiers that confirm the copy.
- **A goal that feels like a chore.** → light, optimistic pot interactions; instant withdraw; calm progress,
  no gamified noise.
