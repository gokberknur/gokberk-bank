# Accounts — competitive benchmarks

How the best present what you hold, so gökberk bank can match or beat them. Use this to calibrate "how good
does this have to be?" — the answer is usually "better than the incumbent, as good as the best neobank, and
calmer than all of them."

## The bar-setters

- **Wise (TransferWise)** — the gold standard for **multi-currency clarity**. Each currency is a balance with
  its own local account details (IBAN/routing), an available figure, and an honest view of what's reserved.
  If our wallet list is less transparent than Wise about what you hold and what's spendable, it's wrong.
- **Revolut** — breadth and speed: instant multi-currency, a dense home with a total, pockets/vaults for
  saving. Their app shows *available* while the statement shows the closing (available + pending) figure —
  the exact reconciliation gap we exist to close. Match the speed; be clearer about the two balances.
- **Monzo** — best-in-class **Pots** and **round-ups**: round a £2.75 coffee to £3 and sweep 25p to a chosen
  Pot; a goal with a progress bar and a "where you should be" marker; instant withdraw. Microcopy is warm and
  human without being cute. The benchmark for savings mechanics.
- **N26** — clean, restrained **Spaces** (sub-accounts with their own IBAN), simple shared/solo saving, and a
  calm transaction list. Closest in spirit to gökberk's editorial calm.
- **Traditional banks (incumbents)** — the contrast: a "balance" that hides holds, statements that are the
  only way to see detail, clunky multi-page ledgers, IBANs buried three taps deep. We win by making the
  ledger live, the balance honest, and the IBAN one tap away.

## Patterns worth stealing

- **Wise's per-currency balance + local details** — each wallet stands on its own with its own IBAN, an
  available figure, and a clear total.
- **Monzo's round-up + goal mechanics** — spare-change sweep to a chosen pot, a progress ring, an on-track
  marker, instant withdraw, optional multipliers.
- **N26 Spaces** — sub-balances of a wallet with their own identifier, light to create and move between.
- **A live, filterable ledger** (every good neobank) — search, faceted filters as removable chips, sortable
  columns, density toggle, a running balance, expand-for-detail — the A02 `gok-table` showcase.
- **One-tap copyable IBAN** with a confirming toast — table stakes the incumbents still get wrong.

## Anti-patterns to avoid (where incumbents and even neobanks fail)

- Showing one ambiguous "balance" that silently includes or excludes holds.
- A statement-only ledger — making the customer download a PDF to see what a charge was.
- Hiding the FX conversion behind the home-currency total instead of showing the mid-rate.
- Gamified savings (confetti, streaks, mascots) that cheapen the act of saving.
- Burying IBAN/BIC, or showing them as one unbroken, un-copyable string.
- A transaction list that chokes past a few hundred rows — ours must stay smooth at 500–2,000.

## The gökberk angle

Match the neobanks on transparency and speed; **beat** them on calm and on the honesty of the two balances.
Where Revolut leaves the available/closing gap to a help article, we model it in the UI: available large,
current + held muted, pending lighter than settled. The ledger is the hero — hairline, flat, tabular, status
by rule not colour — and it's the system of record, not a styled afterthought. Saving is gentle, not
gamified: one earned accent fills the pot's progress ring, completion is a quiet mark, not a banner. The
differentiator isn't a new product; it's an account you understand completely just by looking at it.
