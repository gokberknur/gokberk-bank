# Accounts — definition of done

The quality bar an account surface must clear before you'll sign it off. This is the domain lens, on top of
the feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review.
If an account surface fails any of these, it's not done.

## Correctness & balance truth

- [ ] Available vs current is a **modelled distinction**, not a presentation hack; the held/pending delta is
      itemised and shown only when non-zero; held/pending render lighter than settled.
- [ ] The home-currency total equals the per-wallet sum at the mock mid-rate, computed with **scaled-integer
      FX** (never float-multiply).
- [ ] Money is integer **minor units** end to end; the running balance follows the settled order and
      reconciles down the ledger.
- [ ] A statement's opening + net = closing, reconciling exactly to the same transaction ledger A02 shows; no
      invented transactions.

## The ledger (A02) — system-of-record bar

- [ ] `gok-table` receives `columns`/`rows` as **DOM properties** via `setProps` — never as attributes, never
      `bind:`; sort/selection/page handled via `on(gok-sort | gok-selection-change | gok-page-change)`.
- [ ] Pending vs settled is unmistakable, by status `gok-tag` (rule + icon + text), never colour alone.
- [ ] Search + each faceted filter narrows rows and surfaces removable chips; clearing all chips restores the
      full set; empty-filtered copy differs from zero-data copy.
- [ ] Stays smooth at 500–2,000 rows (pagination by default; virtualized window for All-time).

## Identifiers & records

- [ ] IBAN/BIC shown in tabular figures, grouped, with one-tap copy that confirms ("IBAN copied"); the user's
      own IBAN is never truncated; a counterparty IBAN is masked sensibly.
- [ ] A new wallet's IBAN is deterministic + valid-*shaped* (checksum-shaped), issued at confirm — never
      random at runtime.
- [ ] A statement renders holder, IBAN/BIC, period, opening/closing balances, and a transaction table;
      "Download" prints via print-CSS that reads `--gok-*` roles only.

## Interaction stakes & savings

- [ ] Opening a wallet and pot add/withdraw are **reversible, low-stakes** → plain dialog/drawer + optimistic
      + `gok-toast` + undo; **no** forced-decision dialog, no step-up.
- [ ] The **one** forced-decision in this domain is cancelling pending money (A05), via `gok-dialog
      tone="danger" no-dismiss`, gated on `pending` **and** inside the cancel window; `cancel-window.ts` is
      the single source of truth the send/scheduled flows reuse.
- [ ] Pot over-add (insufficient wallet) and over-withdraw (beyond pot) are blocked reward-early with no-blame
      copy; the progress ring's accent fill is the only earned colour and completion is mark-led, not a banner.

## States & feedback

- [ ] Loading shows **skeletons mirroring the final layout** (cards/rows), never a spinner on a known blank.
- [ ] Empty (zero data), empty-filtered, error, and pending states are all present and correct per
      `.planning/ux/patterns.md`; zero-balance wallets are shown, never hidden.

## Consistency

- [ ] Available vs current, pending vs settled, and minor-units are consistent with `gok-bank-payments`
      (the ledger reflects what payments produced; don't fork the model).
- [ ] The accent is spent once per context (active sort / selected row / the pot ring) — not on balances,
      not on record documents.
- [ ] Scope matches what you declared in — analytics → `gok-bank-money`, the doc vault → `gok-bank-servicing`,
      money movement → `gok-bank-payments`.

## The gut check

Would a real customer look at this surface and know — without doing maths or reading a help article — exactly
what they hold, what's spendable, and where every euro went? If any part of the balance, the ledger, or an
identifier would make them hesitate or reach for support, it's not done.
