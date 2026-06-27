# Playbook — wallets & balances (A01, A03)

The deep dive for the **wallet list, the balance model, the home-currency total, and opening a wallet**. The
five cross-cutting references (customer-requirements, regulatory-and-trust, competitive-benchmarks,
scope-discipline, definition-of-done) give the domain-wide lens; this file goes narrow on the *mechanics* of
holding money in many currencies and reading it honestly. Read it when you're building `/accounts`, the
`/home` wallets strip, a `WalletCard`, the home-currency total, or the open-wallet dialog.

> **Specs are the scope authority.** Read `.planning/features/accounts/A01-wallet-list-balances.md` and
> `A03-open-wallet.md` if present; if `.planning/` is absent (fresh clone), say so and ask — don't invent
> scope. You set the *substance*; the **Svelte MCP** owns how it's coded and **`gokberk-design`** owns how it
> looks — never restate or override them.

## The balance model — the one thing you cannot get wrong

This is the single most important correctness rule in the whole domain (see `regulatory-and-trust.md`
"Available vs current"). Model it in **data**, never as a presentation trick.

- **Current (booked / ledger) balance** = the sum of *settled* transactions only. It is what the ledger
  (A02) reconciles to.
- **Available balance** = current − authorisation holds − pending debits + any instant credit. It is what's
  *actually spendable right now*.
- **Held / pending delta** = current − available. Itemise it; never fold it into either figure.

The wallet record carries all three as integer minor units: `{ balanceMinor (current), availableMinor,
holdMinor }`. Derive `holdMinor = balanceMinor − availableMinor` — don't store a fourth number that can drift.

**Why this matters:** a customer's deepest fear is a balance they can't trust (`customer-requirements.md`).
Revolut shows *available* in the app but *closing* (available + pending) on the statement, and reconciling
those two is exactly the confusion gökberk exists to close. If you ever show a single ambiguous "balance",
you have shipped the incumbent's bug.

### Rendering the three figures

- **Available is the hero** — largest, ink, tabular figures. This is the number the customer reads first.
- **Current + held delta are muted, and shown only when they differ from available** (i.e. only when
  `holdMinor > 0`). A wallet with nothing held shows one clean figure — don't manufacture a "held: €0.00"
  line that adds noise.
- **Held / pending renders lighter than settled** (per `.planning/ux/patterns.md` §3) — a weight/opacity
  cue, never a second colour. The accent is *not* spent on balances (see brand notes below).
- Negative available (an overdrawn / over-held wallet) is still ink + sign, never a red fill — outflow and
  shortfall read by **sign + rule**, not colour alone.

## The home-currency total — aggregation done honestly

`/accounts` and the `/home` strip both show one **home-currency total** (home = EUR, per ADR-001). It is the
sum of every wallet converted to EUR at a **mock mid-rate**. Treat it as a *fact, not a celebration*
(A01 brand notes) — no hype, no 24h-change confetti.

### The FX arithmetic — scaled-integer, never float

Money is integer **minor units** end to end. A mid-rate is a decimal (e.g. 1 USD = 0.9213 EUR), so converting
must not reach for `amount * rate` in floating point — that's the float-multiply trap the DoD bans.

- Store each rate as a **scaled integer** with a fixed scale (e.g. rate × 10^6 → `921300`).
- Convert: `eurMinor = round( walletMinor * rateScaled / 10^scale )` using integer/BigInt math, rounding once
  at the end (banker's or half-up — pick one and keep it consistent across the app).
- The total is `Σ` of each wallet's converted minor units. The EUR home wallet converts at rate 1 (identity)
  — don't special-case it into a different code path.

**Why integer FX:** float-multiply accumulates error across many wallets and across re-renders; a total that
disagrees with "add up the cards yourself" by a cent destroys the trust the whole surface is built on. The
total must equal the per-wallet sum at the mock mid-rate — that's a literal DoD checkbox and an A01 test.

### Showing the conversion

Don't hide the mid-rate behind the total (that's a benchmark anti-pattern — Wise's whole pitch is *not*
hiding the conversion). The total is a fact; if a wallet's contribution is shown, show it at the visible
mid-rate. Keep it calm — a rate is informational, not a sales line.

## Wallet card anatomy (A01)

One card per currency wallet, in a grid on `/accounts` and a horizontally-scrollable compact row on `/home`
(frozen-first-column feel on mobile, per patterns §9). Each card carries:

- **Mono-uppercase currency eyebrow** (`EUR`, `USD`, `GBP`) over the **sentence-case** friendly name — the
  signature gök editorial stack.
- The **available** balance large; **current + held** muted when they differ.
- An optional faint **trend sparkline** (F11) — *ask first* before adding it (A01 open question); it's a
  nice-to-have, not table stakes, and must not become a second accent.
- The whole card is a **real link** (stretched `<a>` inside `gok-card interactive`) to `/accounts/[id]`
  (A02), labelled for screen readers: "EUR wallet, available 1,240.50 euros". Don't fake a clickable div.

A trailing **"Open a wallet"** affordance → `/accounts/open` (A03). A **pots summary** entry links to A04
(it's a summary, not the pots UI — that's `pots-and-vaults.md`).

## Open a wallet (A03) — low-stakes by regulatory design

Opening a currency wallet is **reversible, free, and friction-light** — because under PAD an account is a
*right, not a sale* (`regulatory-and-trust.md`). That regulatory framing is *why* the interaction is light:

- It lives in a single **`gok-dialog`** at `/accounts/open` (deep-linkable), **not** a full-page wizard.
- It is a **plain dialog** — never `tone="danger"`, never a step-up, never a forced decision. Making
  opening a wallet a danger-confirm is a named creep signal (`scope-discipline.md`); push back on it.
- Confirm is **optimistic**: create the wallet in state, fire `gok-toast` "USD wallet opened", swap the
  dialog to a success panel showing the new copyable IBAN/BIC + "Go to wallet".

### The currency picker

- Offer supported currencies **excluding ones the user already holds** — a customer can't open a second EUR
  wallet. Filter the supported list against held currencies.
- Each option: currency code (mono eyebrow) + name + flag, with a plain "Free to open · no minimum balance"
  note (stated as fact, no hype).
- **All-held edge case:** when the user holds every supported currency, show a `gok-empty-state` ("You hold
  every available currency") — not a disabled, empty picker.

### IBAN issuance — deterministic, never random

Each currency wallet gets its **own IBAN** (an IBAN identifies one account at one bank; see
`regulatory-and-trust.md`). In this mock:

- Generate a **deterministic, valid-*shaped* (mod-97 checksum-shaped)** IBAN, seeded from the wallet — the
  same wallet always yields the same IBAN. **Never** `Math.random()` at runtime: a random IBAN re-rolls on
  reload, breaks reproducible tests, and would let a "copied" IBAN go stale.
- The new wallet opens at **zero balance** (all three figures zero; no held line).
- Show the issued IBAN/BIC on the success panel in **tabular figures, grouped in 4s**, with one-tap copy
  that confirms ("IBAN copied"). Never truncate the user's own IBAN.

**Cancel before confirm** must leave accounts state completely unchanged — the optimistic create happens only
*on* confirm.

## Edge cases to get right

- **Only-EUR wallet (empty state):** a brand-new user holds just the home EUR wallet. `/accounts` shows a
  quiet "Add a currency wallet" CTA (`gok-empty-state`), **not** a barren grid. The total still renders.
- **Zero-balance wallet:** render it normally — **never hide it**. "Hide zero-balance wallets to tidy the
  list" is an explicit creep signal (`scope-discipline.md`); a wallet you hold is shown, balance or not.
- **Loading:** `gok-skeleton` cards mirroring the final grid — never a spinner on a known-blank layout
  (patterns §4).
- **State load error:** `gok-alert` + retry with the shell preserved — don't blank the page.
- **A wallet fully held (available = 0, current > 0):** show available 0 as the hero, current + held below —
  this is the honest case the model exists for, not an error.

## Competitive bar (calibrate against these)

- **Wise** — the gold standard for per-currency clarity: every currency is a balance with its own local
  account details, an available figure, and an honest reserved view. If the wallet list is less transparent
  than Wise, it's wrong.
- **N26 Spaces** — sub-balances with their own IBAN, light to create. The calm spirit closest to gök.
- **Revolut** — match the speed and the dense home-with-a-total; **beat** it on the honesty of the two
  balances (model the available/closing gap in the UI instead of leaving it to a help article).
- Full detail in `competitive-benchmarks.md`.

## Brand deference (don't fork the look)

The accent is **unspent** on this surface — balances are ink, not coloured; at most one trend mark. Tabular
numerals throughout. The exact card, grid, dialog, and skeleton visuals are `gokberk-design`'s call; the
`gok-*` interop (props via `setProps`, events via `on`, **no `bind:`**) is the **Svelte MCP**'s. Your job is
the substance: the three-figure model, the integer-FX total, the deterministic IBAN, the low-stakes open.

## Sub-area definition of done

On top of the A01/A03 Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review:

- [ ] Available / current / held are a **modelled** distinction (three minor-unit fields, `holdMinor`
      derived); held shown **only when non-zero** and lighter than settled.
- [ ] The home-currency total equals the per-wallet sum at the mock mid-rate, computed with **scaled-integer
      FX** (BigInt/integer math, single rounding) — never float-multiply; the EUR wallet uses the same path.
- [ ] Every wallet card is a **real link** to `/accounts/[id]`, screen-reader-labelled; the "Open a wallet"
      and pots-summary affordances route correctly.
- [ ] Zero-balance wallets render; the only-EUR case shows the empty-state CTA; loading shows skeleton cards;
      state-load error shows alert + retry with shell preserved.
- [ ] Open-wallet is a **plain** `gok-dialog` (no danger, no step-up), excludes already-held currencies,
      issues a **deterministic checksum-shaped** IBAN at zero balance, confirms optimistically with a toast,
      and leaves state unchanged on cancel; all-held shows the empty state.
- [ ] IBAN/BIC shown in grouped tabular figures with one-tap confirming copy; the user's own IBAN never
      truncated.
- [ ] The accent is unspent on balances; tabular numerals throughout; axe clean; no hardcoded hex/px.
