# Accounts — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship — and the accounts domain has unusually busy borders with payments, money, and servicing. Use this
at every scope decision; when something feels like creep or like it belongs to a sibling, say so and point
here.

## What gökberk bank delivers (in scope — A01–A06)

- **Wallet list & balances** (A01): every currency wallet, available vs current, the home-currency total, the
  `/home` strip.
- **Wallet detail + transaction grid** (A02): the flagship `gok-table` ledger — sort, search, filter,
  density, expand, paginate/virtualize; balance-history chart; copyable IBAN/BIC.
- **Open a new currency wallet** (A03): pick a currency you don't hold → instant mock IBAN.
- **Vaults/pots** (A04): savings goals, progress rings, add/withdraw, round-ups, auto-save rules.
- **Transaction detail & actions** (A05): categorize/tag/note/receipt; split/dispute/repeat hand-offs; and
  the **canonical cancel-window model** for pending money.
- **Statements** (A06): list periodic statements, generate by date range, print-to-PDF — reconciling to the
  ledger.

This set fully exercises multi-currency balances, the ledger as system of record, savings, and the
available/current truth. It's a complete, credible accounts product for a pan-European neobank demo.

## What we do NOT build here (and why / where it goes)

- **Moving money** — internal transfers, SEPA/SWIFT, FX exchange, standing orders, direct debits, request,
  split, top-up. → **`gok-bank-payments`**. We *display* the result in the ledger and *prefill* a send from a
  transaction, but the money spine is theirs. (A05 owns the cancel-window *model*; the send flows reuse it.)
- **Card controls & issuing** — freeze, limits, reveal PAN, order/replace. → **`gok-bank-cards`**. A card
  *spend* appears in our ledger; the card itself does not.
- **Budgets, spend analytics, categorization insights, rewards/cashback.** → **`gok-bank-money`**. We let a
  user categorize a single transaction (A05); we do **not** build the budgets dashboard or the analytics.
- **Investments, crypto, portfolio holdings & their "balances".** → **`gok-bank-wealth`**. A crypto/securities
  balance is not a deposit wallet — don't fold it into the accounts total or list.
- **Login, registration, KYC, 2FA, passkeys, the security center.** → **`gok-bank-identity`**. We *consume*
  the `?step-up` interceptor where a sensitive read needs it; we don't build auth.
- **The documents VAULT** (`/documents`, all docs across the bank). → **`gok-bank-servicing`**. Subtle but
  important: **A06 statements live here** (they're an account record assembled from the ledger), but the
  general document vault is servicing's. Statements appear in both surfaces; the *generation* is ours.
- **Real banking-as-a-service / a real deposit ledger.** It's a mock demo — wallets, balances, IBANs, and the
  ledger are seeded and deterministic. Never wire a real core-banking backend.

## Creep signals — push back when you see these

- "Add a spending-by-category chart to the wallet page" → that's analytics; → `gok-bank-money`.
- "Put the Send wizard inside the accounts page" → no; link to `gok-bank-payments`; we own the entry point,
  not the flow.
- "Show the crypto and stock balances in the wallets total" → no; those aren't deposits; → `gok-bank-wealth`.
- "Make opening a wallet require step-up / a danger-confirm" → no; it's reversible and low-stakes (PAD: an
  account is a right) — plain dialog + optimistic + toast.
- "Build a full documents browser on the statements page" → no; statements reconcile to *this* wallet's
  ledger; the cross-bank vault is `gok-bank-servicing`.
- "Hide zero-balance wallets to tidy the list" → no; a wallet you hold is shown, balance or not.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not putting the budgets dashboard on the wallet
page — that's spend *analytics*, which lives in `gok-bank-money` and has its own design language. What *does*
belong here is per-transaction categorize in the A05 drawer, which feeds those budgets. Keeping the ledger
about *what happened* and the analytics about *what it means* is what keeps both legible." A good no protects
the domain border and teaches the team where the lines are.
