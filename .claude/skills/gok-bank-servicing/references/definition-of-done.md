# Servicing — definition of done

The quality bar a servicing surface must clear before you'll sign it off. This is the domain lens, on top of
the feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review.
If a servicing surface fails any of these, it's not done.

## E-sign — legal gravity (`D02`)

- [ ] Sign is **disabled until the document is scrolled to the end AND consent is checked** — both, never one.
- [ ] The scroll-to-end gate is satisfiable by **keyboard** (paging/End reaches the bottom and enables Sign) —
      never mouse-only.
- [ ] Consent copy states **plainly** that this is a legally binding electronic signature — confident, never
      minimizing the weight.
- [ ] Signing requires a **step-up** (`gok-bank-identity` / `F12`); declining applies **no** signature and
      returns to consent with no side effect.
- [ ] On success a **timestamped** signed copy (signer + reference) is written to the vault (`D01.add()`) and
      is **downloadable** immediately.
- [ ] A mid-flow **session timeout** resumes safely at the reached step with scroll/consent state restored.
- [ ] Re-opening an already-signed document shows the existing signed copy + timestamp, not a fresh gate.

## Disputes — correctness & transparency (`S02`)

- [ ] The wizard is **pre-filled** from the transaction (`A05`) and runs transaction → reason → details →
      evidence → review → submit, with `gok-progress` showing the step fraction.
- [ ] **Eligibility is gated honestly:** outside-window / card-replaced / already-disputed each get a clear
      reason **and an alternative** — never a silent dead end.
- [ ] *Not received* / *not as described* reasons branch to a **merchant-first nudge** that still offers a
      **dispute-anyway** path for clear fraud.
- [ ] **Provisional credit is shown as temporary and reversible**, every time it appears — never as a settled
      refund.
- [ ] Submit is a **forced-decision** dialog (light danger tone; no step-up unless policy says); the case
      starts **Raised** and the tracker advances Raised → Investigating → Provisional credit → Resolved
      (upheld/declined, each with **plain reasoning**).
- [ ] The user can **add evidence** or **withdraw** while investigating; deep-link/refresh restores the step +
      data.
- [ ] **No-blame copy throughout** — "Let's look into this charge", never "You claim…".

## Documents vault — single write-through (`D01`)

- [ ] One `add()` path: statements (`A06`) and signed copies (`D02`) feed the **same** vault; no duplicate
      storage anywhere else.
- [ ] Search + category/type/date filters narrow the list and emit **removable** `gok-tag` chips; clearing
      restores the list.
- [ ] **Zero-data and filtered-empty** states render with **distinct** copy.
- [ ] Signed copies show **signed-by + timestamp as fact**; awaiting-signature docs offer Sign (→ `D02`).
- [ ] Row click opens the viewer; Download works; the viewer region is labelled and keyboard-scrollable.

## Support — self-serve first, no dead ends (`S01`)

- [ ] Articles are surfaced **before** the ticket form; every article ends with a "still need help" escalation.
- [ ] Raising a ticket validates subject/description **reward-early**, accepts type/size-guarded attachments,
      and yields an **"Open"** status tag.
- [ ] Ticket status is honest (Open → In progress → Waiting on you → Resolved) by **rule+icon+text**; resolved
      tickets can **reopen**.
- [ ] Chat sends and receives a seeded reply via an `aria-live` region and can be **turned into a ticket**
      (history never lost).
- [ ] A **send/upload failure preserves the user's input** and offers retry — never silent loss.

## Cross-cutting (all servicing surfaces)

- [ ] Status is conveyed by **rule + icon + text**, never colour alone; amounts/dates in **tabular numerals**;
      money in integer **minor units** (provisional credit too).
- [ ] Loading, empty, error, and (where relevant) pending states are present per `.planning/ux/patterns.md`.
- [ ] axe clean; one earned accent per view; **no hardcoded hex/px**, `--gok-*` roles only; DS visuals not
      restyled.
- [ ] Scope matches what you declared; sibling-owned concerns are **routed** (cards / payments / accounts /
      identity / insurance), not absorbed.

## The gut check

Would a worried customer trust this with a wrong €200 charge, and would a careful one feel safe signing a
mortgage agreement here? If any part would make them hesitate about whether they were heard, whether their
money is safe while it's looked into, or whether they truly understood what they signed — it's not done.
