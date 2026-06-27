# Playbook: Card wallet & detail (C01)

The sub-area deep-dive for the **wallet** (the swipeable strip of cards) and the **card detail** (the card
object, the gated PAN reveal, per-card spend). The cross-cutting references frame *why* (PCI thinking,
trust bar); this is the *how* — the strip mechanics, the reveal state machine, the timer rules, and the
per-card-spend edge cases. Read it when building or reviewing `/cards` or `/cards/[id]`. Spec:
`.planning/features/cards/C01-cards-wallet-detail.md`. Don't re-derive the PCI rationale here — see
`references/regulatory-and-trust.md`.

## The card is the object — what that demands

A premium card surface treats the card art as the hero and everything else as quiet chrome. That is not a
visual whim; it is the **trust posture**. The customer is looking at *their money exposed to the world*, so
the surface must read as calm, contained, and in their command. Concretely:

- The card art is the **only** place colour lives richly (per the design's own art tokens). The surrounding
  chrome stays monochrome with **one earned accent** on the primary action / selected tab. Never let a status,
  a chart slice, or a wallet badge introduce a second colour voice.
- Status is always **rule + icon + text** on a `gok-tag` (Active / Frozen / Expired / Processing), never a
  colour fill. A frozen card dims the *art*, but the tag still carries the word.
- Everything secondary (spend, actions) sits *below* the card and never competes with it.

## Wallet strip mechanics (CardStrip — app-local, no DS carousel)

There is no DS carousel, so `CardStrip` is app-local — but it reads **only** `--gok-*` roles plus the card
design's art tokens. Build it as a scroll-snap strip, not a JS-driven carousel, so it degrades gracefully:

- **Scroll-snap**, one card per snap point; momentum scroll on touch, arrow-key navigation on keyboard.
- **Keyboard model:** the strip is a single composite widget. `←`/`→` move focus between heroes (roving
  tabindex — exactly one hero is tabbable at a time), `Enter`/`Space` opens the focused card's detail. Visible
  focus on the active hero is non-negotiable. Give each hero `aria-roledescription="card"` and a label that
  reads as **"card ending 1234, Active"** — never the full PAN, which the wallet never holds.
- **Per-hero content:** card type, masked last-4 (`•• 1234`), a status `gok-tag`, and the network mark (as
  *data*, never a brand-coloured fill). The art is keyed by the card's design id.
- **Trailing "+ Add a card" hero** routes to the order wizard (`C02`). Treat it as a real, focusable strip
  member, not a floating button — it keeps the "add" affordance inside the mental model of "my cards".
- **Desktop layout is an open question** (strip vs grid) — confirm against `F01` shell + the verification gate
  before assuming. Don't silently invent a grid; flag it.

## The reveal — a state machine, not a toggle

"Show card number" is the highest-stakes interaction on this surface. Model it as an explicit machine, because
every transition has a safety rule:

```
masked ──"Show card number"──▶ stepping-up ──F12 success──▶ revealed(countdown)
   ▲                               │                              │
   │                         F12 cancel/fail               countdown == 0
   └───────────────────────────────┴──────────────────────────────┘
                            (always returns to masked)
```

- **Default = masked.** PAN, expiry, and CVV are all masked (`•••• •••• •••• 1234`). The masked PAN is read by
  AT as "card ending 1234", not as bullets.
- **stepping-up:** "Show card number" dispatches a step-up *intent* through the `F12` interceptor — it never
  reveals inline. If step-up is cancelled or fails, return to `masked` with **nothing shown** and no error
  noise (cancelling a reveal is a normal act, not a failure).
- **revealed:** on success, a focus-trapped `gok-dialog` shows the full PAN / expiry / CVV with a copy
  affordance and a **depleting countdown** (default ~20s — align with `C04` PIN ~15s and `F12`; it is an open
  question, so confirm rather than hardcode silently).
- **Auto-hide is the feature, not a nicety.** The countdown is a **rune timer**. When it reaches zero the
  dialog auto-closes and the panel re-masks. The revealed value is **never persisted** (no store, no
  `localStorage`, no URL), **never logged**, and re-renders fresh each reveal.
- **WCAG-safe timeout:** the countdown announces via an `aria-live="polite"` region and **pauses while the
  dialog has focus**, so it never yanks a number away from someone mid-read or mid-copy. This is the WCAG
  2.2.1 "Timing Adjustable" obligation met honestly — a security timeout the user can keep alive by attending
  to it, but that still closes when they look away.

### Reveal edge cases to handle

- **Disposable cards may not expose reveal at all** (open question in the spec) — a disposable's number is
  single-use and regenerates, so a persistent "reveal" is semantically odd. Confirm the rule; default to *not*
  offering reveal on a disposable rather than guessing.
- **Frozen / expired / blocked cards disable the reveal** — you can't usefully reveal a dead number; the
  action is disabled with a textual reason, not silently broken.
- **Copy affordance:** copying the PAN is allowed (it's the legitimate "type it into checkout" job), but the
  clipboard is the user's responsibility — don't auto-clear it, and don't treat copy as a reason to extend the
  countdown beyond the focus-pause rule.

## Per-card spend (donut + stream)

The card detail shows what *this card* spent, without leaving the card. Two views, both sliced from the `F03`
transaction spine by card id (a pure function in `src/lib/cards/spend.ts`):

- **Spend donut** (`F11` ECharts): this month, by category. It reads its colours from the **`F11` token
  bridge** — never hardcoded hex. The donut is decoration *of data*; keep one shared interaction treatment
  (hover tooltip vs static legend is an open question — confirm in `F11`/`M01`, don't fork it per-surface).
- **Spend stream**: recent transactions on this card (`gok-table` or an activity list); each row deep-links to
  the transaction detail (`A05`). Amounts in **tabular numerals**, outflows by rule + sign, never colour
  alone.
- **Pending spend is held separate.** A just-happened spend shows a "Processing" `gok-tag` and is **not** mixed
  into settled totals — mirroring the cross-cutting optimistic-vs-pending rule (`patterns.md` §5). Faking a
  spend as settled is the same trust break as faking a freeze.

## Freeze from the detail

Freeze lives in `C03` (the control) but surfaces here as a one-tap action. Because it is **fully reversible**,
it is **optimistic + `gok-toast`, no dialog**: flipping it updates the hero art + the status tag immediately
and toasts "Card frozen — unfreeze anytime"; a mock failure **rolls back** the hero + tag and shows a
`gok-alert`. The freeze state is one source of truth shared between `C01` and `C03` — confirm the single
store so the detail and the settings panel never disagree (open question in both specs).

## States this surface must render

`loading` (card-art `gok-skeleton` hero + skeleton donut/rows mirroring the final layout — never a spinner on
blank for a known layout) · `empty` (no cards → `gok-empty-state` "No cards yet" + "Order a card" into `C02`)
· `revealed` (PAN visible + live countdown) · `frozen` (art dimmed, "Frozen" tag, **spend stream still
readable**) · `expired/blocked` (status tag + disabled reveal) · `error` (step-up failure or data load →
`gok-alert` + retry, shell preserved) · `pending spend` ("Processing" tag, held separate).

## Competitive bar (what "good" means here)

- **Apple Card** is the spirit kin: the card *is* the surface, the number is revealed deliberately, controls
  are quiet chrome. Match the calm; beat it on honesty of state.
- **Revolut** sets the breadth bar for virtual/disposable in the wallet — match the *concept* (a card with a
  blast radius), stay calmer and less cluttered.
- The gök angle: a card you feel completely in command of — masked until you choose to look, the art carrying
  the colour, everything else monochrome.

## Sub-area definition of done (on top of the spec's Success Criteria)

- [ ] The strip is a **keyboard composite** (roving tabindex, `←`/`→` move, `Enter` opens), visible focus,
      `aria-roledescription` heroes labelled "card ending 1234, <status>" — **never** the full PAN in the
      wallet.
- [ ] The masked PAN reads as "card ending 1234"; reveal is **only** reachable through the `F12` step-up; a
      cancelled step-up returns silently to masked.
- [ ] The revealed PAN sits in a **focus-trapped** dialog on a countdown that **announces** (`aria-live`),
      **pauses on focus**, auto-hides + re-masks, and is **never persisted or logged**.
- [ ] Reveal is **disabled** on frozen/expired/blocked cards; the disposable-reveal rule is confirmed, not
      assumed.
- [ ] Per-card spend is **sliced from `F03`**, the donut reads the `F11` token bridge, pending spend is held
      **separate** from settled, amounts are tabular numerals.
- [ ] Freeze here is **optimistic + toast, no dialog**, shares **one** freeze store with `C03`, and rolls back
      + alerts on failure.
- [ ] Status is rule + icon + text; **no hardcoded hex/px**; `gok-tag`/`gok-dialog` visuals unrestyled; axe
      clean on wallet + detail + reveal dialog.

If a customer would worry the number lingered, that the wallet ever showed a full PAN, or that a "frozen" tag
didn't reflect reality — it's not done.
