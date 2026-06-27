# Playbook — statements (A06)

The deep dive for **account statements**: listing periodic statements, generating one for a date range, the
on-screen/print render, and the reconciliation that makes a statement a record you can hand to a landlord,
an accountant, or a visa office. The five cross-cutting references give the domain-wide lens; this file goes
narrow on the *mechanics* of assembling a statement that ties out. Read it when you're building
`/accounts/[id]/statements`, the `StatementList`, the `StatementDoc`, or the statement assembler.

> **Specs are the scope authority.** Read `.planning/features/accounts/A06-statements.md` if present; if
> `.planning/` is absent, say so and ask. You set the *substance*; the **Svelte MCP** owns the interop and
> **`gokberk-design`** owns the look — never override them.

## What a statement is — and the one rule it must obey

A statement is a **legal-feeling record** (`regulatory-and-trust.md`): account holder, IBAN/BIC, period,
opening balance, the transactions, closing balance. It is *record-keeping, not a money move* — calm,
document-vault feel, no money spine.

The one inviolable rule: **opening balance + net movement over the period = closing balance**, and the whole
thing **reconciles exactly to the same A02 ledger**. A statement that doesn't reconcile is broken. This is
*why* you assemble it deterministically from the transaction array and **never invent a transaction that
isn't in the ledger** — the statement is a *view* of the ledger, not a second source of truth.

## The statement record (the data spine)

A statement is derived from F03 (monthly buckets of the wallet's transactions); holder identity + IBAN/BIC
from F04. Integer minor units throughout:

```
{ id, walletId, periodStart, periodEnd,
  openingBalanceMinor, closingBalanceMinor,
  txnCount, generatedAt }
+ its transaction slice (the rows in [periodStart, periodEnd])
```

## Assembly — pure, deterministic, reconciling

Keep assembly in a pure function (`statements.ts`-style) over the transaction array:

1. **Slice** the wallet's transactions to `[periodStart, periodEnd]` (settled order).
2. **Opening balance** = the running balance *immediately before* `periodStart` (the closing of the prior
   period). Don't recompute from zero unless it's the wallet's first statement.
3. **Net movement** = Σ of the signed `amountMinor` over the slice (integer sum — never float).
4. **Closing balance** = `openingMinor + netMinor`. Assert `closing == opening + net`; if it doesn't, the
   slice or the opening is wrong — fail loudly in a test, never paper over it.
5. **`txnCount`** = the slice length.

**Why pure + deterministic:** the same wallet + same range must always produce the same statement (tests
depend on it, and a record that re-rolls on reload isn't a record). This mirrors the deterministic-IBAN and
seeded-ledger discipline across the domain.

## The list and the generator

`/accounts/[id]/statements`:

- **List** of periodic statements (a `gok-table` or a hairline list): period, generated date, transaction
  count, closing balance, **Download**. If it uses `gok-table`, `columns`/`rows` are **DOM properties** via
  `setProps`, events via `on`, **no `bind:`** (the Svelte MCP's rule; stated here as the domain contract).
- **Generate** — a **date-range picker** (F06) + "Generate statement". On generate, assemble a statement for
  that range and append it to the list **optimistically** + `gok-toast`.
- **Reward-early validation** on the range: **start ≤ end**, and **within account history** (no range before
  the wallet existed or into the future). Surface the error early, before "Generate" commits.
- **Cross-reference:** a statement links to the underlying transactions — deep-link into the **A02 grid
  filtered to that range** — so the customer can reconcile line by line. (See `transactions-ledger.md` for
  the filter mechanics this reuses.)

## The on-screen / print render

This is the document itself. The "download" is **Print → Save as PDF**, not a real PDF library:

- **`StatementDoc`** renders the full record: account holder, IBAN/BIC, period, opening/closing balances, the
  **transaction `<table>`**, totals.
- Style it with **print-CSS** (`@media print`) so the browser's Print → Save as PDF yields the document; a
  "Download PDF" button triggers `window.print()`. No PDF lib in the mock (an A06 open question — *defer;
  print-CSS first*).
- **Print-CSS reads `--gok-*` roles only** — **no hardcoded hex/px**, even in the print stylesheet. This is
  easy to get wrong (print CSS feels separate) and it's an explicit boundary: the print render must stay on
  brand and preserve **ink-on-paper contrast**.
- The render stays **unmistakably gök**: hairline rules, tabular figures, the wordmark, no shadow, and the
  **accent unspent** — a record document is neutral; spending the accent on a statement is a brand violation.
- Use **real headings and a real `<table>` with a caption** — both screen readers and print depend on the
  semantic structure, not styled divs.

## Identifiers on the statement

Show IBAN/BIC in **tabular figures, grouped in 4s** (`regulatory-and-trust.md`). On a statement these are the
*account holder's own* identifiers — **never truncate the user's own IBAN**. (Counterparty IBANs inside the
transaction rows follow the ledger's masking rule from `transactions-ledger.md`.)

## States

- **Loading:** `gok-skeleton` list (never a spinner on a known layout).
- **Empty (zero data):** a new wallet with no statements and nothing to generate → `gok-empty-state` "No
  statements yet".
- **Empty filtered:** a chosen range with no transactions → a **distinct** "No transactions in this period".
  As in the ledger, empty-filtered copy must differ from zero-data — the customer needs to know the range was
  valid but quiet, not that the wallet is empty.
- **Generating:** `gok-spinner` in the button.
- **Error:** `gok-alert` + retry.

## Scope border — statements live here, the vault does not

A subtle but important line (`scope-discipline.md`): **A06 statements live in accounts** — they're an account
record assembled from *this wallet's* ledger, so generation is ours. The **general documents vault**
(`/documents`, all docs across the bank) is **`gok-bank-servicing`**'s. A statement may *appear* in both
surfaces, but the *generation* is the accounts domain's. Don't build a cross-bank document browser on the
statements page — push back if asked.

## Brand deference (don't fork the look)

Editorial statement header (mono-uppercase eyebrow + sentence-case period: "Statement · 1–31 May 2026");
opening/closing balances as facts, no celebration; the accent unspent. The list, picker, and document
**visuals** are `gokberk-design`'s; the `gok-table`/F06 interop is the **Svelte MCP**'s. Your job is the
substance: deterministic assembly, the reconciliation, the reward-early range validation, the tokens-only
print render.

## Sub-area definition of done

On top of the A06 Success Criteria, the visual gate, and the flow review:

- [ ] Statements are assembled **deterministically and purely** from the same A02 transactions; **no invented
      transactions**; the same wallet + range always yields the same statement.
- [ ] **opening + net = closing**, with money as integer minor units (integer sum, never float); the
      statement reconciles exactly to the ledger; opening is the prior period's closing.
- [ ] The list shows period, count, closing balance, and download; if it uses `gok-table`, `columns`/`rows`
      are DOM properties via `setProps`, events via `on`, **no `bind:`**.
- [ ] The date-range generator validates **start ≤ end** and **within account history** reward-early, then
      appends optimistically with a toast; a statement deep-links to the A02 grid filtered to its range.
- [ ] The `StatementDoc` renders holder, **un-truncated IBAN/BIC** (grouped tabular figures), period,
      opening/closing balances, and a semantic `<table>` with a caption; "Download PDF" prints via print-CSS.
- [ ] Print-CSS reads **`--gok-*` roles only** (no hardcoded hex/px), preserves ink-on-paper contrast, keeps
      hairline/tabular/wordmark, and leaves the **accent unspent**.
- [ ] Zero-statements vs empty-range copy **differ**; loading shows a skeleton; error shows alert + retry.
- [ ] axe clean on list + doc; `gok-bank-servicing`'s vault is not rebuilt here; no hardcoded hex/px.
