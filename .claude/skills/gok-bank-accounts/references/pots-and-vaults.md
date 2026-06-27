# Playbook — pots & vaults (A04)

The deep dive for **savings goals**: pot cards with progress rings, create-a-pot, add/withdraw, round-ups,
and auto-save rules. The five cross-cutting references give the domain-wide lens; this file goes narrow on the
*mechanics* of setting money aside and pulling it back. Read it when you're building `/accounts/pots/*`, a
`PotCard`, a progress ring, or the add/withdraw/rules drawers.

> **Specs are the scope authority.** Read `.planning/features/accounts/A04-vaults-pots.md` if present; if
> `.planning/` is absent, say so and ask. You set the *substance*; the **Svelte MCP** owns the interop and
> **`gokberk-design`** owns the look — never override them.

## The mental model — pots are sub-balances, not term deposits

A pot is a **sub-balance of a currency wallet**, in that wallet's currency. The job is *gentle discipline,
not lock-up* (`customer-requirements.md`): set a target, watch it fill, and pull the money back the moment
life happens. Two consequences shape every interaction below:

- **Moving money in/out of a pot is an instant, reversible internal transfer** — money never leaves the bank,
  so it's never a settlement event. That's *why* add/withdraw stay light (drawer + optimistic + toast) and
  **never** a forced-decision dialog (see `scope-discipline.md` — making pot moves a danger-confirm is creep).
- **A pot draws down its owning wallet's available balance.** Add €200 to a pot → the wallet's
  `availableMinor` drops by €200; the money is now ring-fenced in the pot, not spendable from the wallet.
  Keep the two in sync; the pot total is not new money, it's *reserved* wallet money.

## The pot record (the data spine)

Seeded deterministically from F03; integer minor units throughout:

```
{ id, walletId, name, currency,
  targetMinor, currentMinor,
  targetDate?, status,
  roundUpEnabled: boolean,
  autoSave: { amountMinor, frequency } | null }
```

- `currentMinor` and `targetMinor` are integer minor units in the **wallet's currency** — a EUR wallet's pot
  is in EUR; don't mix currencies inside one pot.
- Progress = `currentMinor / targetMinor` — compute the *display* percentage from integers, don't store a
  drifting float percent.

## The progress ring — the one earned accent

The ring is the visual heart of a pot, and it is **the one place the earned forest-green accent fills** (per
the progress component's "one earned accent on the fill"). This is a deliberate, scarce use of colour:

- The accent fills the ring in proportion to `current/target`. It is the **only** earned colour on the
  surface — don't spend a second accent anywhere on the pots UI.
- **The ring fill is never the only signal.** Back it with text figures ("€1,200 of €2,000, 60%") — colour
  alone fails a11y and the gök status rule.
- Expose `role="progressbar"` (or an accessible text equivalent). Tabular numerals on the figures.
- **Goal reached → mark-led success** (success role + a check on the ring) and a calm "Goal reached" note —
  **never a saturated banner, never confetti**. Gamified noise (streaks, mascots, confetti) cheapens the act
  of saving and is a named anti-pattern (`competitive-benchmarks.md`). Restraint is the gök differentiator.
- If `gok-progress` (a bar) doesn't fit as a ring, a small SVG ring composite is built **from `--gok-*`
  tokens only** — confirm the visual against the design system's verification gate (accent fill + mark, not
  colour-only). This is an A04 open question — *ask first*.

## Add and withdraw — instant, reversible, optimistic

Both are instant internal transfers between the wallet and the pot. The pattern (patterns §5, "optimistic"):

- **Add:** wallet → pot. Optimistically drop the wallet's available and raise the pot's current, fire
  `gok-toast`, rollback + `gok-alert` on failure. Money input is the F07 composite.
- **Withdraw:** pot → wallet. The reverse. Withdraw is **instant** — "money you can pull back instantly" is
  the saver's core need; never gate it behind friction.
- Both live in a **`gok-drawer`** (right on desktop, bottom-sheet on mobile), `open` via `setProps`,
  dismissal via `on`, **no `bind:`**.

### Validation — reward-early, punish-late, no-blame

- **Over-add (insufficient wallet funds):** block the Add **reward-early** — surface the shortfall as the
  user types, before they commit (patterns §3). A pot must never push its wallet's available negative.
- **Over-withdraw (beyond the pot's balance):** block it — a pot can't go negative.
- Copy is **no-blame and factual** ("You have €120 available in this wallet"), with a reserved message line
  so the row doesn't shift. Reward-early validation + a reserved line = the gök money-entry signature.

## Create a pot

A **`gok-drawer`** at `/accounts/pots/new` capturing:

- **name**, **owning wallet** (`gok-select` — this fixes the pot's currency), **target amount** (F07 money
  input), optional **target date** (F06 date picker), **round-up toggle** (`gok-switch`), and a neutral,
  brand-safe colour/emblem.
- Reward-early validation; primary "Create pot". Creating a pot moves no money yet (current starts at 0
  unless an initial add is offered) — it's low-stakes, so no danger dialog.

The pots grid (`/accounts/pots`) is goal cards (name, target, current, ring, target-date + on-track note) +
a "Create a pot" affordance + a **summary header totalling money across pots**. Empty (no pots) → an empty
state ("Create your first pot"), not a blank grid.

## Round-ups and auto-save rules

On pot detail (`/accounts/pots/[id]`), a **Rules** section:

- **Round-ups** — sweep spare change to a chosen pot. The benchmark is Monzo: round a £2.75 coffee to £3,
  sweep 25p (`competitive-benchmarks.md`). In this mock the **round-up basis derives from the wallet's card
  transactions** — the exact mechanic (per-transaction vs daily sweep; which transactions trigger it; when it
  sweeps) is an A04 open question. *Ask first / finalize with F03* — don't invent the sweep rule.
- **Auto-save** — an amount + a frequency (`gok-segmented` + F06). Both round-ups and auto-save must be
  **pausable / resumable** (the saver wants control, not a chore).
- Copy stays calm ("Round spare change to this pot") — no gamification.

## States

- **Loading:** `gok-skeleton` cards mirroring the final grid (never a spinner on a known layout).
- **Empty:** no pots → `gok-empty-state` "Create your first pot".
- **Add/withdraw submitting:** `gok-spinner` in a disabled button; optimistic where safe.
- **Insufficient (over-add) / over-withdraw:** reward-early block with no-blame copy.
- **Error:** `gok-alert` + retry; **rollback** the optimistic update on failure (never leave a phantom
  balance).

## Brand deference (don't fork the look)

The ring's accent fill is the only earned colour; everything else is ink on the neutral canvas. Mono-uppercase
pot-label eyebrow over the sentence-case name; "On track" / "€60 to go" stated plainly; tabular figures. The
ring, drawer, switch, and segmented **visuals** are `gokberk-design`'s; the `gok-*` interop is the **Svelte
MCP**'s. Your job is the substance: the sub-balance model, the wallet-sync arithmetic, the reward-early
validation, the gentle (never gamified) feel.

## Sub-area definition of done

On top of the A04 Success Criteria, the visual gate, and the flow review:

- [ ] A pot is a **sub-balance of one wallet in that wallet's currency**; adding to a pot drops the wallet's
      `availableMinor` and the two stay in sync; the pot total is reserved wallet money, not new money.
- [ ] Money is integer minor units; the display percentage is computed from integers (no drifting float
      percent).
- [ ] The progress ring fills with the **one earned accent**, backed by **text figures** (never colour
      alone), exposes `role="progressbar"`/text equivalent, and marks complete **mark-led** (check), never a
      banner or confetti; no second accent anywhere on the surface.
- [ ] Add and Withdraw are **instant, optimistic, reversible** internal transfers (drawer + `gok-toast` +
      rollback on failure) — **no forced-decision dialog**; withdraw is instant.
- [ ] **Over-add (insufficient wallet)** and **over-withdraw (beyond pot)** are blocked **reward-early** with
      no-blame copy and a reserved message line; a pot never goes negative and never pushes its wallet
      negative.
- [ ] Round-up and auto-save (amount + frequency) can be set and **paused/resumed**; the round-up basis is
      confirmed with F03, not invented.
- [ ] Empty (no pots) shows the empty state; loading shows skeleton cards; error rolls back + alerts.
- [ ] Mono eyebrow + sentence-case name; tabular numerals; axe clean on grid + detail + drawers; no hardcoded
      hex/px (incl. the ring).
