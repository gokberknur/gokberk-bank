# Payments — customer requirements

What payment customers actually need, framed as jobs-to-be-done. Use this to scope features and judge
priority — a payment surface earns its place by serving one of these jobs well, not by adding options.

## Core jobs-to-be-done

- **"Pay someone I trust, fast, and know it arrived."** The dominant job. Speed + certainty + a receipt.
  Instant rails win because the anxiety gap (did it go through?) is closed in seconds.
- **"Pay a bill on time without thinking about it."** Recurring/scheduled payments, standing orders, direct
  debits. The job is *set and forget* — plus visibility/control when something changes.
- **"Move my own money where I need it."** Internal transfers between wallets/pots, FX exchange. Should feel
  free, instant, and frictionless — this is housekeeping, not a transaction.
- **"Send money abroad without getting fleeced."** International/SWIFT + FX. The job is *fair, transparent
  cost* and a believable delivery estimate. Wise built a company on this anxiety.
- **"Get paid back / collect from a group."** Request money, payment links, split a bill. The job is
  *low-friction asking* without it being awkward.

## Segments and what they weigh

- **The everyday spender** — wants instant, no-fee, dead-simple internal + domestic sends; hates surprises.
- **The international/expat** — multi-currency, cross-border, cares about FX rate transparency and ETA.
- **The organised/bills-payer** — recurring payments, standing orders, mandates; wants control and a clear
  calendar of what's leaving and when.
- **The small-group organiser** — split bills, request money; wants painless collection.

## Must-haves (table stakes — a serious bank has all of these)

- Send to own accounts (instant), to saved payees, and to a new payee.
- SEPA + SEPA Instant domestic; SWIFT international with FX.
- Payee management with confirmation-of-payee safety.
- Scheduled payments, standing orders, and SEPA Direct Debit mandate visibility/control.
- Clear pending vs. settled state; a receipt/reference for every payment.
- Full cost disclosure (fee + FX rate + margin) **before** confirm.
- Reward-early validation (funds, limits, IBAN) and no-blame errors.

## Nice-to-haves (differentiators — earn delight, but not at the cost of clarity)

- Request money / payment links / QR; split a bill with live remainder.
- FX exchange with a transparent mid-rate vs. your-rate, and a rate-lock countdown.
- "Cancel until cut-off" on pending payments; undo on reversible internal sends.
- Smart hints: low-balance warning before a scheduled run, duplicate-payment detection.

## What customers fear (design against these)

- **Sending to the wrong person / wrong IBAN.** → confirmation of payee, masked review, edit-before-send.
- **Hidden fees and bad FX.** → disclose everything on review; show the margin.
- **"Did it go through?"** → instant, explicit success + reference; honest pending state otherwise.
- **Irreversibility.** → forced-decision confirm for finality; reversibility affordance where it exists.
