# Playbook: Card controls & limits (C03)

The sub-area deep-dive for the **control panel** — freeze, per-channel toggles, the daily spend limit, and the
region allow-list. The cross-cutting refs frame the optimistic-vs-forced friction model; this is the *how* —
the optimistic-apply-with-rollback mechanic, the reward-early limit validation, and the allow-list edge cases.
Read it when building `/cards/[id]/settings`. Spec: `.planning/features/cards/C03-card-controls.md`. The
"friction matches stakes" principle lives in `references/scope-discipline.md` — don't re-argue it here; apply
it.

## The governing idea: these are calm, instant, reversible settings

Every control here is **fully reversible**, so every control is **optimistic + `gok-toast`, no dialog**. This
is the gök "low-stakes reversible" pattern, and it is the opposite of the reveal/replace/3-DS friction. The
whole panel should feel like flipping house switches: one tap, instant feedback, nothing scary. If a control
ever *can't* be undone, it doesn't belong on this panel.

## The optimistic-apply mechanic (the one pattern, applied four times)

Build it once as a rune setter and reuse it for freeze, each channel, the limit, and the region list:

```
1. user flips control
2. update state immediately      ← UI reflects the new value at once
3. fire gok-toast                ← "Card frozen — unfreeze anytime"
4. await mock apply
   ├─ resolves → done (state already correct)
   └─ rejects  → revert state + gok-alert  ← honest rollback, never a faked success
```

- **Per-control pending, never a full-page block.** Each control shows *its own* saving state; the rest of the
  panel stays live. A user toggling ATM shouldn't see the whole page freeze.
- **Honest rollback is the trust contract.** The reason optimistic is safe here is that failure *visibly
  reverts* + alerts. A faked setting (UI says off, reality says on) is the worst trust break on a safety
  control — worse than a slow honest one. Never swallow a rejection.
- **No confirmation dialog — ever — on these.** A confirm dialog on freeze is over-friction on a reversible
  act. Push back on "make freeze feel serious with a dialog": the seriousness is conveyed by *instant
  effect + clear toast*, not by a speed bump.

## Freeze

A prominent `gok-switch` (or `gok-button` toggle) at the top of the panel. Flipping it is optimistic + toast
("Card frozen — unfreeze anytime" / "Card unfrozen"); failure rolls back + `gok-alert`. **No dialog.**

- **Single source of truth.** Freeze also surfaces on the `C01` detail. Both must read/write **one** freeze
  store so they never disagree (open question in both specs — confirm the owner). A frozen card here dims the
  art on `C01` and flips the wallet status tag.
- **Frozen makes the rest read-only.** While frozen, channels + limit are **read-only with a textual note**
  (not colour-only) — you can't meaningfully tune channels on a card that authorises nothing. The note explains
  *why*, calmly.

## Channel toggles (online · contactless · ATM)

A row of `gok-switch`es, each an **independent** instant setting (optimistic + toast). These map to real
issuer-side channel controls a scheme honours at authorisation — model them as such:

- Each toggle applies on its own; read the new value from the `gok-switch` **`change` event** (no `bind:` on
  custom elements).
- **All-channels-off** is a valid state, not an error — but surface a quiet `gok-alert` **info** noting the
  card can't be used anywhere. Inform, don't block; the customer may want exactly that.
- Disposable cards aren't for contactless/recurring use — if a channel is semantically N/A for a card type,
  omit it rather than show a dead toggle (confirm against the card-type rules).

## Daily spend limit — reward-early validation

A money input (`F07`, integer **minor units**) capped to the card's ceiling. The validation rule is the heart
of this control:

- **Validate against two bounds, early:** the card's **ceiling** (can't exceed it) *and* **today's spend**
  (can't set a limit below what's already spent today — that would retroactively block settled spend). Surface
  the error **as the user types** (reward-early), corrected late only if needed.
- **Reserve the message line** so the row never shifts when the error appears/clears (`patterns.md` §3).
- **No-blame copy:** "That's above this card's limit" / "You've already spent more than that today" — what
  happened + what to do, never "invalid input".
- A **"No daily limit"** affordance clears it (the limit is optional, not a forced cap).
- The limit applies **optimistically + toast** like the rest.
- Ceiling values per type/tier are an open question (align with `X04`/`C01`) — read them from source, never
  hardcode.

## Region allow-list — the "Anywhere" edge case

An `F10` **multi-select** of countries; selected regions render as **removable `gok-tag`s**. The defining edge
cases:

- **Empty list = "Anywhere"**, explicitly — *not* an error, not "no regions allowed". An empty allow-list
  means no restriction. Make this explicit in copy ("Anywhere") so an empty state never reads as a broken or
  locked-out card.
- **The home region is pinned and non-removable** — its tag has no remove affordance and is keyboard-skipped
  for removal. A card must always authorise in its home geography.
- Adding/removing a region applies **optimistically + toast**.
- It is an **allow-list** (selected = permitted), not a block-list — confirm the direction with `O03` if
  ambiguous, because getting it backwards locks the customer out of everywhere they chose.
- **Keyboard:** the multi-select is fully operable by keyboard (`aria-multiselectable`), and each removable tag
  is removable by keyboard (not just a mouse `×`).

## States this surface must render

`loading` (`gok-skeleton` rows mirroring the controls) · `saving` (each control's **own** pending) ·
`reward-early invalid` (limit over ceiling / under today's spend → reserve-message error) · `all-channels-off`
(info alert) · `rollback` (failed setting reverts + `gok-alert`) · `frozen` (channels + limit read-only with a
note) · `empty allow-list` ("Anywhere").

## Competitive bar

- **Starling** sets the granular channel-control bar — independent online / contactless / ATM toggles. Match
  the model, restrained to what the demo needs.
- **Monzo** sets the everyday-clarity bar — one-tap freeze, customisable contactless limits, warm no-blame
  microcopy. Match the calm.
- **Revolut** has the breadth (per-card limits, regions) but is busy. The gök angle: where Revolut shows ten
  toggles, show the *right* controls with a clear hierarchy — calmer, never a wall of switches, status never a
  colour fill.

## Sub-area definition of done (on top of the spec's Success Criteria)

- [ ] Every control applies **optimistically + `gok-toast`**, shows **per-control** pending (no full-page
      block), and **rolls back + `gok-alert`** on a mock failure. **No confirmation dialog** on any of them.
- [ ] **Freeze** shares **one** store with `C01`; while frozen, channels + limit are **read-only with a textual
      note** (not colour-only).
- [ ] Channel toggles apply **independently** (read from the `change` event, no `bind:`); **all-off** shows an
      info alert, not an error.
- [ ] The daily limit (`F07`, minor units) validates **reward-early** against **ceiling and today's spend**,
      reserves its message line, has **no-blame** copy, and can be **cleared**.
- [ ] The region allow-list is an **`F10` multi-select** of removable `gok-tag`s; **empty = "Anywhere"**
      (explicit, not an error); the **home region is pinned** and non-removable; keyboard-removable tags.
- [ ] Ceiling/region values come from source (`X04`/`O03`), not hardcoded; **no hardcoded hex/px**;
      `gok-switch`/`gok-tag` unrestyled; status rule + icon + text; tabular numerals on the limit; axe clean.

If a customer could flip a control and not be sure it actually took, or be locked out by an empty allow-list,
or hit a wall at save time the input never warned about — it's not done.
