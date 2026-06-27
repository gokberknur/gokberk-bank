# Playbook — the transactions ledger (A02, A05)

The deep dive for the **flagship `gok-table` ledger** and the **transaction detail drawer**: the bank's
**system of record** — the one surface a bank can never get wrong. The five cross-cutting references give the
domain-wide lens; this file goes narrow on the *mechanics* of a fast, filterable, reconciling ledger and the
detail/actions drawer that hangs off it. Read it when you're building `/accounts/[id]`, the `TransactionGrid`,
the toolbar, or the `A05` transaction drawer.

> **Specs are the scope authority.** Read `.planning/features/accounts/A02-wallet-detail-transactions.md` and
> `A05-transaction-detail.md` if present; if `.planning/` is absent, say so and ask. You set the *substance*;
> the **Svelte MCP** owns the `gok-table` interop and **`gokberk-design`** owns the look — never override them.

## Table of contents

1. Why the ledger is the system of record
2. The transaction record (the data spine)
3. `gok-table` interop — the non-negotiable mechanics
4. Columns, running balance, and reconciliation
5. Pending vs settled — status truth
6. Toolbar: search, faceted filters, chips, density, columns
7. Pagination vs virtualization (500–2,000 rows)
8. The transaction detail drawer (A05)
9. Cancel-window — the canonical model this domain owns
10. States, a11y, brand deference
11. Sub-area definition of done

## 1. Why the ledger is the system of record

The ledger answers the dominant job-to-be-done: *"show me where my money went"* — reconcile, find a charge I
don't recognise, follow a running balance down (`customer-requirements.md`). Every other surface can be a
view; the ledger is the **truth**. Three consequences fall out of that and govern everything below:

- **Every row reconciles.** The running balance follows the settled order and ties out; a statement (A06)
  must reconcile to *this* same ledger (opening + net = closing).
- **Pending is visibly separate from settled** — never folded in, never faked complete.
- **Status is shown by rule + icon + text, never colour alone** — accessibility *and* trust.

The incumbent's failure is a statement-*only* ledger (download a PDF to see what a charge was). gök's
differentiator is a **live, filterable** ledger that is the source of truth, not a styled afterthought.

## 2. The transaction record (the data spine)

Seeded deterministically from F03, **500–2,000 per wallet**. The shape (per A02):

```
{ id, date, merchant, category,
  type: card | sepa | swift | transfer | fee | topup | fx,
  status: pending | settled,
  amountMinor (signed integer minor units),
  runningBalanceMinor,           // precomputed in seed, settled order
  reference, counterpartyIban, notes, tags,
  cancelableUntil?, receiptUrl?  // A05 fields
}
```

- **Money is integer minor units, signed** — outflow negative, inflow positive. Never float; never store a
  formatted string.
- **`runningBalanceMinor` is precomputed in the seed**, in settled date order — the ledger displays it, it
  doesn't recompute it on every render. (See §4 for the filtered-reorder caveat.)
- `type` and `status` are **modelled enums** rendered to a `gok-tag`/icon — never a free-text colour.

## 3. `gok-table` interop — the non-negotiable mechanics

This is the app's flagship `gok-table` showcase, and the interop rules are **hard** (they're in the DoD and
A02 boundaries; the **Svelte MCP** is the standing authority — defer to it, this just states the domain
contract):

- **`columns` and `rows` are DOM properties**, set via `setProps({ columns, rows })`. Arrays/objects can't
  survive attribute stringification — **never** pass them as attributes, **never** `bind:` a custom element.
- Subscribe via `on(...)` to **`gok-sort`**, **`gok-selection-change`**, **`gok-page-change`**. Drive
  filtering / sorting / paging from a **rune store** and re-derive `rows` reactively.
- **Never restyle `gok-table` internals** — the visuals are the design system's. You wire data and behaviour;
  you don't reach into its shadow DOM.

**Why so strict:** the table is published-DS surface area (dogfooding). The moment you `bind:` it or style its
internals, you've forked the component and the showcase stops proving the DS works.

## 4. Columns, running balance, and reconciliation

Columns (A02): **date · merchant/description · category · type · status · amount (signed, in/out) · running
balance**. Numeric columns are **tabular + right-aligned**; headers sortable.

- The **running balance** column is the reconciliation spine — it must read top-to-bottom in the settled
  order and tie out. This is *why* it's only meaningfully shown in the **default date-desc, settled view**:
  once a filter or a non-date sort reorders rows, a per-row "running balance" is no longer a real running
  total. Resolve the A02 open question by showing running balance only in that canonical view (confirm with
  F03); don't display a number that lies after a re-sort.
- Outflows read by **sign + rule**, not a red fill. "Amount" and "Balance" are calm column labels.

## 5. Pending vs settled — status truth

- Render status with a **`gok-tag` (rule + icon + text)** — "Pending" / "Settled" / "Canceled". Colour alone
  is banned (a11y + the trust bar).
- **Pending amounts render lighter than settled** (patterns §3) — a weight cue layered on top of the tag.
- Pending sits *between* available and current (`regulatory-and-trust.md`): it is **not** in the settled
  running balance, and it must never be faked complete (patterns §5). The available/current split on the
  header (see `wallets-and-balances.md`) and the pending rows in the ledger are the same truth, two views.

## 6. Toolbar: search, faceted filters, chips, density, columns

The toolbar makes a month — or thousands of rows — scannable in seconds:

- **Search** — free-text over merchant/reference; narrows rows live.
- **Faceted filters** — type, status, category, amount direction (in/out), date range (via F06). Render
  facets as `gok-menu`/`gok-popover`; each active facet emits a **removable `gok-tag` chip** beneath the
  toolbar. **Clearing all chips restores the full set.** This is a DoD checkbox and a test.
- **Empty-filtered ≠ zero-data.** "No matching transactions" + clear-filters is a *different* copy and state
  from "No transactions yet". Conflating them is a classic bug — the customer needs to know whether they have
  no data or just no *matching* data.
- **Column-toggle menu** — hide/show columns.
- **Density toggle** — `gok-segmented` flipping `data-density` (comfortable / compact). It changes density,
  not data.
- Keep filtering/sorting/search **pure** (a `txn-filter.ts`-style function over the array) so it's testable
  and the table just renders the result.

## 7. Pagination vs virtualization (500–2,000 rows)

The ledger must **stay smooth at 500–2,000 rows** — choking past a few hundred is a named anti-pattern
(`competitive-benchmarks.md`).

- **Paginate by default** (`page-size`), paging via `gok-page-change`.
- **Virtualize for All-time** — fixed height + `row-height`, rendering only a visible window while scrolling
  thousands. The exact pagination→virtualization threshold is an A02 open question — *ask first / confirm
  against perf testing*; don't hardcode a guess as if it were settled.
- "Showing 50 of 1,204" is stated plainly (no hype).

## 8. The transaction detail drawer (A05)

Row click → a **`gok-drawer`** (right on desktop, bottom-sheet on mobile) at
`/accounts/[id]/transaction/[txid]`, **deep-linkable** so refresh/back behave. It carries:

- **The ledger** (reads like a mono key/value receipt): amount (signed, tabular), status `gok-tag`
  (rule+icon+text), merchant + logo, date/time, wallet, type, reference, **counterparty IBAN (masked,
  copyable)**, running-balance impact. Mask the *counterparty's* IBAN sensibly; the user's own is never
  truncated (`regulatory-and-trust.md`).
- **Editable, optimistic:** category (`gok-select`), tags (chips), note (`gok-input`/textarea) — saved inline
  with `gok-toast`, reversible, rollback + `gok-alert` on failure. Per-transaction categorize is *in scope*;
  the **budgets dashboard is not** — that's `gok-bank-money` (`scope-discipline.md`). Hold that line.
- **Receipt:** thumbnail/preview + add/replace via the F09 file-drop.
- **Contextual actions, by status:** **Split** → `P08`, **Dispute** → `S02`, **Repeat** → `P02`/`P03`,
  **Refund** (where applicable), **Cancel** (pending + in-window only). These **deep-link prefilled** to the
  sibling domains — accounts owns the *entry point*, not the flow (the money spine is `gok-bank-payments`).

## 9. Cancel-window — the canonical model this domain owns

A05 owns the **one forced-decision in the whole accounts domain**: cancelling pending money. This is the
canonical `cancelableUntil` model that the send flows (`P02`/`P03`) and scheduled items (`P05`) **reuse** —
keep it in one pure module (`cancel-window.ts`) and never fork it.

- A pending outgoing payment is **cancelable until its cut-off** (`cancelableUntil`), by rail:
  - **internal / instant** → *not cancelable* (already final).
  - **SEPA standard** → until the daily cut-off.
  - **SWIFT** → until the corridor cut-off.
  - past cut-off or **settled** → not cancelable → offer **dispute / refund** instead.
- Exact mock cut-off times per rail are an A05 open question — *ask first / finalize with F03*.
- **Cancel is a forced decision:** `gok-dialog tone="danger" no-dismiss`, gated on `pending` **and** inside
  the window. On confirm, it **reverses the pending hold** and flips the status tag to "Canceled".
- The destructive action is **text/outline in the status colour, never a solid red fill** (brand). Cancel
  copy is no-blame and factual ("Cancel until 16:00 today"); the countdown is an `aria-live="polite"` region.

**Why this is the only forced-decision here:** every *other* account action (open a wallet, pot add/withdraw,
categorize) is reversible and low-stakes → plain dialog/drawer + optimistic + toast. Cancelling money in
flight is the lone irreversible, value-moving moment — so it earns the danger dialog, and nothing else does.
Putting a danger-confirm on anything else is creep (`scope-discipline.md`).

## 10. States, a11y, brand deference

- **States:** loading → `gok-table loading` skeleton rows (never a spinner on a known layout); zero-data →
  `gok-empty-state` "No transactions yet"; empty-filtered → distinct "No matching transactions" + clear;
  error → `gok-alert` + retry. Drawer: loading skeleton ledger; pending-cancelable (countdown);
  pending-not-cancelable ("Processing"); settled; canceled/failed.
- **A11y:** `gok-table` is `role="grid"`; search labelled; chips are removable with accessible labels; sort
  state announced; the balance-history chart has a text-equivalent summary; copy buttons announce "IBAN
  copied"; status always rule+icon+text. Tabular numerals.
- **Brand deference:** the accent is **spent once** — the active-sort / selected-row leading rule (in the
  drawer, the primary action of the moment). Not on amounts, not on the receipt. Editorial `caption` slot
  (mono eyebrow + sentence-case "Transactions" + auto count). The **Svelte MCP** owns the interop;
  **`gokberk-design`** owns the visuals — lend substance, don't restyle.

## 11. Sub-area definition of done

On top of the A02/A05 Success Criteria, the visual gate, and the flow review:

- [ ] `gok-table` receives `columns`/`rows` as **DOM properties** via `setProps`; sort/selection/page handled
      via `on(gok-sort | gok-selection-change | gok-page-change)` — **never** attributes, **never** `bind:`;
      no `gok-table` internals restyled.
- [ ] Money is signed integer minor units; the running balance is the seeded settled-order figure, shown only
      in the canonical date-desc settled view, and reconciles down the ledger.
- [ ] Pending vs settled is unmistakable by status `gok-tag` (rule + icon + text), never colour alone;
      pending renders lighter than settled and is never faked complete.
- [ ] Search + each faceted filter narrows rows and surfaces removable chips; clearing all chips restores the
      full set; **empty-filtered copy differs from zero-data**.
- [ ] Stays smooth at 500–2,000 rows: paginate by default; virtualized window for All-time (threshold
      confirmed against perf, not guessed).
- [ ] The A05 drawer is deep-linkable; ledger renders all fields with a **masked, copyable** counterparty
      IBAN; category/tags/note edit **optimistically** with toast + rollback; receipt via F09.
- [ ] Split/Dispute/Repeat **deep-link prefilled** to `P08`/`S02`/`P02`–`P03` (entry point only — the flow is
      payments').
- [ ] Cancel appears **only** while pending **and** inside the rail cut-off, with a live announced countdown;
      confirming via `gok-dialog tone="danger" no-dismiss` reverses the hold and sets status Canceled;
      destructive action is outline/text, never solid red; `cancel-window.ts` is the single source reused by
      `P02`/`P03`/`P05`.
- [ ] The accent is spent once per context; tabular numerals; axe clean on grid + toolbar + drawer; no
      hardcoded hex/px.
