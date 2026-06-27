# State coverage & microcopy structure

A screen isn't done when the happy path renders. It's done when **every state** is covered and the words
guide the customer through each. This reference is the per-surface state matrix plus the *structure* of
microcopy. The canonical matrix is `.planning/ux/patterns.md` §4; this expands the method.

> **Boundary:** you own the **structure and intent** of copy — what slot exists, what it must convey, when
> it appears, that it doesn't shift layout. The **wording and tone** are `gokberk-design`'s `voice-and-tone`
> (calm, plain, no-blame, sentence-case, numerals). Spec the slot and its job; let the voice fill it.

## The per-surface state matrix

Every data surface plans for all of these (`patterns.md` §4):

| State | Pattern | What you spec |
|---|---|---|
| **Loading list/table** | `gok-table` skeleton / `gok-skeleton` rows mirroring the final layout | Skeleton matches final shape — never a spinner on blank for a known layout (it causes layout jump + uncertainty) |
| **Loading action** | `gok-spinner` inside a disabled button; optimistic where safe | The button shows progress; the rest of the screen stays usable; optimistic update if the action is reversible |
| **Empty (zero data)** | `gok-empty-state`: icon + plain headline + one CTA | The *first-run* story — "Add your first payee", "No transactions yet". One clear next action |
| **Empty (filtered)** | `gok-empty-state` "No results" + clear-filters | Distinct copy from zero-data — the data exists, the filter hid it. Offer to clear the filter |
| **Inline error** | `gok-alert` + reserved message line | What happened + what to do, no blame; reserved line so the row doesn't shift |
| **Page error** | `gok-empty-state` error + retry; shell preserved | The app shell survives; only the content region fails; a retry is offered; the user isn't ejected |
| **Pending** | status `gok-tag` + `gok-alert` info | Honest, separate from settled; "Processing — usually under a minute"; never faked completion |

### Why each matters

- **Two empties are not one empty.** Zero-data is an invitation (here's how to start); filtered-empty is a
  dead end the user created (here's how to get back). Same component, different copy and different CTA.
  Collapsing them is a classic miss.
- **Skeletons over spinners** for known layouts: they set expectation, prevent the content from jumping in,
  and feel faster. Spinner-on-blank only for genuinely unknown layouts.
- **Page error preserves the shell.** A failed data load fails *the region*, not the app. The sidenav,
  navbar, and the user's place all survive; one retry brings the content back. Don't throw the user to a
  full-screen error for a list that didn't load.
- **Pending is a first-class state, not a missing success.** SEPA standard, SWIFT, card spend, orders, loan
  draws settle later (`patterns.md` §5). Show the pending tag, hold it separate from the settled balance,
  and tell the truth about timing. Faking completion is the cardinal sin — it destroys trust the moment
  reality diverges.

## Reward-early / punish-late, in states

Validation state is part of the picture (`patterns.md` §3):

- **Reward early:** insufficient funds, over-limit, bad IBAN checksum surface *as the user types*, in the
  reserved message line — before they invest effort in the rest of the form.
- **Punish late:** the hard block / step-up fires at the commit boundary, not mid-typing. You don't yank
  the rug while someone is still entering an amount.
- **Reserve the line** so the appearing/disappearing message never shifts the layout — a shifting form is
  its own usability failure.

## Optimistic vs pending — pick deliberately

`patterns.md` §5 is the rule:

- **Optimistic** (instant, reversible — internal transfer, freeze, categorize, watchlist, round-up):
  update the UI immediately + `gok-toast`; on failure, **roll back** + `gok-alert`. The state model must
  hold the pre-action value so rollback is clean.
- **Pending** (settlement / irreversible — SEPA standard, SWIFT, card spend, orders, loan draws): explicit
  pending state, held separate from settled balance; no optimism, no fake completion.

The domain expert tells you which rail is which; you encode the right state behaviour.

## Microcopy structure (not tone)

For each text slot, spec **what it must convey and when it appears** — `gokberk-design` writes the words.

- **Headlines / empty states:** state the situation plainly + name the one next action. Structure =
  *situation + CTA*. ("No payees yet" + "Add your first payee".)
- **Inline errors:** structure = *what happened + what to do*, no blame, in the reserved line, on the
  field. Never a code, never "invalid input".
- **Pending / processing:** structure = *status + honest expectation*. ("Processing — usually under a
  minute.") Set a timeframe you can keep.
- **Confirm dialogs:** the primary button **names the verb + object/amount** ("Send €1,200", "Cancel
  standing order", "Sign document") — never a bare "Confirm". The body states the consequence and its
  finality.
- **Success:** structure = *confirmation + reference + reversibility*. ("Sent. Reference TXN-… · Cancel
  until 23:59.")
- **Disclosures (review):** structure = *every cost named before commit* — fee, rate + margin, what the
  recipient receives, ETA. The presence and placement are yours; the phrasing is the voice's.
- **Help / why-we-ask:** structure = *contextual, inline, on demand* (tooltip / disclosure), not a separate
  page.

## State coverage checklist (run before calling a surface done)

- [ ] Loading state mirrors the final layout (skeleton, not blank spinner) where the layout is known.
- [ ] Zero-data empty **and** filtered-empty are distinct, each with the right CTA.
- [ ] Inline errors are reward-early, no-blame, *what + what-to-do*, in a reserved line.
- [ ] Page error preserves the shell and offers retry.
- [ ] Pending is honest, separate from settled, never faked.
- [ ] Optimistic actions roll back cleanly on failure with an alert.
- [ ] Every text slot's intent is specified; the words are handed to `gokberk-design`'s voice.
