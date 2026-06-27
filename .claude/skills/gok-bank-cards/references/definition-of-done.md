# Cards — definition of done

The quality bar a card surface must clear before you'll sign it off. This is the domain lens, on top of the
feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review. If a
card surface fails any of these, it's not done.

## Sensitive-data safety

- [ ] PAN, CVV, and PIN are **masked by default** (`•• 1234`); the full value is revealed only **after a
      step-up** (`F12`), in a focus-trapped `gok-dialog`.
- [ ] A revealed value **auto-hides** on a depleting countdown (PAN ~20s, PIN ~15s), re-masks, and is **never
      persisted**, logged, or placed in a URL.
- [ ] The auto-hide is **WCAG-safe** — the countdown announces via `aria-live` and pauses on focus.
- [ ] There is **no real PAN/CVV/PIN** anywhere — all values are deterministic mock data.

## Friction matches stakes

- [ ] **Freeze** and the reversible **controls** (channels, limit, regions) apply **optimistically** with a
      `gok-toast`, **no confirmation dialog**, and **roll back** with a `gok-alert` on a mock failure.
- [ ] **Replace** (cancels a working card) ends on a **forced-decision `gok-dialog tone="danger" no-dismiss`**
      *and* is gated by a **step-up**; a declined step-up leaves the old card untouched.
- [ ] **Reveal** and **3-DS approve** and **wallet provisioning** are each gated by a **step-up**.

## 3-D Secure correctness

- [ ] The 3-DS dialog is **`no-dismiss`**, names the **merchant + exact amount + currency + card + time**, and
      shows a **live countdown**; it traps focus.
- [ ] Escape / scrim fire `gok-cancel` only — they **never approve** or silently close.
- [ ] The countdown reaching zero **auto-declines** (a test asserts it never approves) and says it timed out.
- [ ] **"Didn't recognise this?"** routes into the dispute flow (`S02`, `gok-bank-servicing`), pre-filled.

## Controls & validation

- [ ] Channel toggles (online · contactless · ATM) apply **independently**; all-off shows an info alert.
- [ ] The daily limit uses the `F07` money input (integer **minor units**), validates **reward-early** against
      the card ceiling **and** today's spend, can be cleared, and reserves its message line (no row shift).
- [ ] The region allow-list is a multi-select of removable `gok-tag`s; **empty = "Anywhere"** (explicit, not
      an error); the **home region is pinned** and non-removable.
- [ ] While frozen, channels + limit are **read-only with a textual note** (not colour-only).

## Order / replace & wallet

- [ ] Virtual/disposable issue **instantly**; physical shows a **delivery ETA** (never "ready to use"); the
      delivery step appears **only for physical**.
- [ ] The review ledger discloses type, design, linked wallet, fee, and delivery/ETA **before** confirm.
- [ ] Add-to-wallet shows what's being added (card + device) before confirm, never **re-adds** an
      already-provisioned wallet, and reflects status back on the card detail.

## States, feedback & consistency

- [ ] Loading (skeleton mirroring the layout), empty (`gok-empty-state` + "Order a card"), error (`gok-alert` +
      retry), frozen, expired/blocked, and pending-spend states are all present per `.planning/ux/patterns.md`.
- [ ] Status is **rule + icon + text** on a `gok-tag` — never a colour fill; amounts in **tabular numerals**.
- [ ] No **hardcoded hex/px** — only `--gok-*` roles; DS component visuals (`gok-tag`/`gok-dialog`/`gok-switch`)
      are **never restyled**; `npm run check` + `npm run build` green; **axe clean** on every surface + dialog.

## The gut check

Would a real card customer trust this with their actual card? If any part would make them worry the number
lingered, the freeze didn't take, a charge could approve without them, or a replace cancelled the wrong card —
it's not done.
