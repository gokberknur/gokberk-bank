# Accounts — regulatory & trust framing

The framing a deposits expert holds in mind. gökberk bank is a **mock demo** — we don't implement real
compliance — but the experience should be *shaped by* how regulated accounts actually work, because that's
what makes a balance, an IBAN, and a statement feel like a real, trustworthy bank. Informed, not overbearing:
use this to get the behaviour right, not to bury the UI in legalese.

## Payment Accounts Directive (PAD) — the EU account baseline

- The PAD gives any consumer legally resident in the EU the right to a **basic payment account** regardless of
  income, employment, or credit; it also mandates **fee transparency** (a standardised fee terms document and
  statement of fees) and a **switching service** between providers in a member state.
- **Design implication:** an account is a *right*, not a sale — opening a currency wallet is low-stakes,
  free, and friction-light ("Free to open · no minimum balance", per A03). Don't gate it behind upsell or a
  forced decision. If we ever surface fees, they're stated plainly, not buried.
- IBANs today are **not portable** (the IBAN identifies the bank holding the account), so switching means a
  new IBAN — a reason to make a wallet's IBAN easy to read, copy, and share.

## Deposit guarantee — the safety floor

- EU deposit guarantee schemes protect deposits up to **€100,000 per depositor, per bank** (joint accounts:
  per depositor); repayment within 7 business days. Neobanks operating under a licensed EU bank carry the
  same protection.
- **Design implication:** a single, calm trust signal is worth more than a banner — a quiet "Deposits
  protected up to €100,000" line where it reassures (e.g. account overview or footer), stated as a fact, not
  marketing. It's a mock, so keep it understated and never imply a specific scheme membership we don't model.

## Identifiers — IBAN & BIC

- **IBAN** (up to 34 chars, country + check digits + BBAN) identifies the specific account; **BIC** identifies
  the bank. Together they route money to a wallet. Each currency wallet gets its **own IBAN**.
- **Design implication:** show IBAN/BIC in tabular figures, grouped in 4s for legibility, with one-tap copy
  that confirms ("IBAN copied"). Issue a deterministic, valid-*shaped* (mod-97 checksum-shaped) mock IBAN —
  never a random runtime string. Mask a counterparty's IBAN sensibly on a transaction; never truncate the
  user's own.

## Available vs current balance — the distinction that must never blur

- **Current (booked/ledger) balance** = settled transactions only. **Available balance** = current minus
  authorisation holds and pending debits, plus any instant credit — i.e. what's actually spendable now.
  Pending transactions sit *between* the two; held funds are itemised, not folded in.
- **Design implication:** model the distinction in data, never as a presentation trick. Show available large,
  current + held delta muted (only when they differ), held/pending lighter than settled. This is the
  single most important correctness rule in the domain — Revolut's own app shows available while the
  statement shows the closing (available + pending) figure, and reconciling those is exactly the kind of
  confusion we exist to prevent.

## Statements — the record's integrity

- A statement is a **legal-feeling record**: account holder, IBAN/BIC, period, opening balance, the
  transactions, closing balance. **Opening + net movement = closing**, always — a statement that doesn't
  reconcile to the ledger is broken.
- **Design implication:** assemble statements deterministically from the same transaction ledger the grid
  shows; never invent a transaction that isn't in A02. Keep the on-screen/print render on-brand (hairline,
  tabular, wordmark, ink-on-paper contrast preserved in print-CSS).

## Trust & safety bar (what the experience must convey)

- **A balance you can trust:** available vs current always distinct, held itemised, the total reconciled at a
  visible mid-rate.
- **A ledger that is the truth:** every row reconciles, pending is visibly separate from settled, status by
  rule + icon + text.
- **Identifiers you can rely on:** correct, legible, copyable, confirmed.
- **Records that reconcile:** a statement always ties back to the ledger.
- **Reversibility where it exists:** pot moves undoable; a pending payment cancellable until its cut-off
  (the canonical A05 model); settled is settled.
