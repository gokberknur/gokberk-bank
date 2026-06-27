# Playbook — sending money & the rails

The deep mechanics of the **send** sub-area: moving value *out* to a destination over a chosen rail.
Covers the three send branches — internal (`P01`), SEPA / SEPA Instant (`P02`), SWIFT / international
with FX (`P03`). This is the **money spine** at full extension. Read it when you're shaping, reviewing,
or signing off any outbound transfer.

It sits *under* the cross-cutting refs — `regulatory-and-trust.md` holds the scheme rules, this holds
how the send flows *apply* them. Don't restate PSD2/SEPA law here; cite it and get the mechanics right.

## Contents

- [The one truth: match the rail's promise](#the-one-truth-match-the-rails-promise)
- [Branch 1 — internal, own wallets (P01)](#branch-1--internal-own-wallets-p01)
- [Branch 2 — SEPA & SEPA Instant (P02)](#branch-2--sepa--sepa-instant-p02)
- [Branch 3 — SWIFT / international + FX (P03)](#branch-3--swift--international--fx-p03)
- [Shared spine — the review ledger](#shared-spine--the-review-ledger)
- [Confirmation of payee & first-payment friction](#confirmation-of-payee--first-payment-friction)
- [Step-up: when the money pauses for auth](#step-up-when-the-money-pauses-for-auth)
- [Edge cases the send flows must handle](#edge-cases-the-send-flows-must-handle)
- [Competitive patterns to match or beat](#competitive-patterns-to-match-or-beat)
- [Sub-area definition of done](#sub-area-definition-of-done)

## The one truth: match the rail's promise

Every send decision flows from **what the chosen rail actually promises**. Get this wrong and you either
lie to the user (fake completion) or scare them needlessly (fake pending). The matrix you hold in your head:

| Rail | Speed | Final? | UI state on success | Reversibility | Forced dialog? |
|---|---|---|---|---|---|
| Internal (own wallets) | Instant | No (bank owns both sides) | balance up at once, no pending | **Undo** in toast window | No — optimistic |
| SEPA Instant (SCT Inst) | ≤ 10 s, 24/7 | **Yes, irrevocable** | `Settled` tag, near-immediate | None — it's final | Yes |
| SEPA standard (SCT) | Next business day | Settles later | `Processing` tag, held off settled balance | Cancel until cut-off | Yes |
| SWIFT / international | 1–3+ business days | Settles later | `Processing` tag, pending hold | Cancel until cut-off | Yes |

The single most-common failure (see `competitive-benchmarks.md`) is **faking instant completion on a
pending rail** — it erodes trust the first time it fails. Pending is pending; show it honestly per
`.planning/ux/patterns.md` §5.

Why the dialog asymmetry: friction must match stakes. An own-wallet move is reversible and same-owner, so
a forced-decision dialog is *noise* — it trains users to click through dialogs. A payee send is
irreversible-or-slow and leaves your control, so it earns the `gok-dialog tone="danger" no-dismiss`.

## Branch 1 — internal, own wallets (P01)

The lightest send. Same owner, no payee, no settlement risk → **skip the forced dialog**; commit is one
primary "Move €X" + an **Undo** toast. Mechanics:

- **From / To** are two `gok-select`s of the user's own wallets + pots; To excludes From; a swap affordance
  flips them. Guard: To can never equal From.
- **Same-currency** pair → no FX, no rate line at all (an open question in the spec resolves to: never show
  a rate for same-ccy). **Cross-currency** → an inline rate line that *reuses the `P04` quote engine*, with
  the margin disclosed and a refresh countdown. Same-owner conversion is still a real rate event.
- **Optimistic settle:** both balances update at once; cross-currency still settles instantly because the
  bank owns both sides → **no pending state here ever**. On failure, roll back *both* balances + a
  `gok-alert`.
- **Reward-early** insufficient-funds check is against **available** (not current) balance.

The trap: someone will ask to add a confirm dialog "for safety". Refuse — it's an own-money move; the Undo
*is* the safety. (See `scope-discipline.md`: friction must match stakes.)

## Branch 2 — SEPA & SEPA Instant (P02)

The everyday domestic-EU send: EUR→EUR, an IBAN beneficiary, a **speed choice**. Full wizard (`F05`),
shares the transfer draft with `P03`. The EUR-to-EUR, no-FX branch.

- **Speed step** is a `gok-segmented` radiogroup: **Instant** vs **Standard**. Each option states its
  *own* ETA + fee — Instant may carry a small fee or be free by tier; standard is free, next business day.
  Show a **cut-off note** for standard ("after 18:00 it lands the next business day").
- **Instant-capability is per-payee-bank.** Not every beneficiary bank is reachable on SCT Inst. When it's
  unavailable, **fall back to standard with a `gok-alert` note** — never silently downgrade and never block.
- **Settlement truth:** Instant → `Settled` tag, no cancel window (it's final the moment it lands).
  Standard → `Processing`, held separate from settled balance, with **cancel-until-cut-off**.
- Badges: show **Instant** / **No fee** `gok-badge`s on review *only when true*. A badge that lies is worse
  than no badge.

## Branch 3 — SWIFT / international + FX (P03)

The deepest money flow — quote, fee transparency, charge options, delivery estimate, step-up. It must
out-transparency Wise or it's wrong. Mechanics that are unique to this branch:

- **The FX quote step** fetches: mid-rate, **margin (disclosed)**, your rate, you-send / they-receive, with
  a **refresh countdown**. Reuse `P04`'s `fx.ts` engine — never fork rate logic per flow.
- **Charge options OUR / SHA / BEN** live under "More options" (progressive disclosure), default **SHA**:
  - **OUR** — sender pays all fees; they-receive is the full amount.
  - **SHA** — shared: sender pays their bank, recipient pays correspondent/beneficiary fees.
  - **BEN** — recipient pays all; deducted from the amount sent.
  Changing the option **must** recompute the fee breakdown *and* they-receive. This is testable math.
- **Correspondent banking** means intermediary fees can be deducted en route → state "they receive ≈ X" and
  that intermediary fees may apply. Don't promise an exact landed amount you can't guarantee.
- **Delivery estimate** is by corridor (e.g. 1–3 business days), with a cut-off note and an optional future
  date (`F06` date picker).
- **Rate re-check at confirm:** if the quote expired during review, **re-quote and block** until the user
  re-confirms the fresh rate. Never charge a stale rate — and never show an expired rate as live.
- Success → `Processing` tag, pending hold off settled balance, **cancel-until-cut-off**.

All money is **integer minor units**; FX uses a **scaled-integer rate** — never float-multiply. This is a
correctness bug waiting to happen, not a style nit.

## Shared spine — the review ledger

`P02` and `P03` share `PaymentLedger.svelte` — a `gok-card` / `gok-dialog` **key/value ledger**, not a
`gok-table`. It is the trust moment. Every cost is disclosed *here, before commit*:

- payee + IBAN/BIC **masked**, amount out, fee(s), **rate + margin** (cross-ccy), **they-receive**, speed +
  ETA, reference. Each row has a **"Edit"** that jumps back to the owning step.
- First-payment-to-new-payee warning sits here too (see CoP below).

A user should never be surprised by a fee or a rate. If a cost can change the outcome, it's on the ledger.

## Confirmation of payee & first-payment friction

This is where **APP fraud** (authorised push payment — the user tricked into sending willingly) lives, so
friction on new payees is *protection*, not annoyance.

- On a **first payment to a new payee**, surface the CoP name-match result (the mechanic itself lives in
  `P10`'s add-payee verify step) and a first-payment warning on review.
- New payee, large amount, or unusual pattern → **more** friction (name-match warning + step-up), never less.
- A name **mismatch** is a warn-and-proceed-with-acknowledgement, not a hard block (the account may be a
  business trading name) — but the acknowledgement must be explicit.

## Step-up: when the money pauses for auth

Sensitive / higher-value sends inject **step-up** (`F12`) at the confirm step — OTP or passkey, modelling
PSD2 SCA with **dynamic linking**: the prompt names the *specific* amount + payee ("Send €1,200 to Anna"),
not a generic "confirm".

- Over the threshold (open question, ~€1,000 — align with `O02`/`F12`) → step-up before money moves.
- **Decline returns to review with no side effect.** This is non-negotiable: a declined auth must leave zero
  trace on balances or pending state.
- A recent step-up is cached briefly to avoid nagging; trusted payees and small internal moves are exempt
  (SCA exemptions exist for a reason — don't nag).

## Edge cases the send flows must handle

- **Insufficient funds / over-limit** → reward-early (as typed), cleared live on fix; never on submit.
- **Invalid IBAN (mod-97) / bad BIC** → reward-early field error (mechanic in `P10`).
- **Instant unavailable for payee bank** (SEPA) → fall back to standard + note.
- **Quote expired** (SWIFT/FX) → re-quote, block confirm until re-confirmed.
- **Step-up declined** → return, no change.
- **Send failure** → retry path + no-blame `gok-alert`; never a dead-end "transaction declined".
- **Self-to-own-wallet** picked in a payee flow → route to `P01` (don't run the heavy wizard).

## Competitive patterns to match or beat

- **Wise's "you send / they get" panel** — rate, fee, ETA all visible before confirm. Our SWIFT ledger must
  be *at least* as transparent.
- **Revolut/Monzo instant-send feel** — near-zero confirm-to-done latency on internal/instant; immediate,
  unambiguous success.
- **Rate-lock countdown** (Wise/Revolut) on FX so the quote reads as live.
- **CoP name-match** (UK banks) before a first payment.

The gök angle: where Revolut shows ten options, show the right one and tuck the rest under "More options".
The differentiator isn't a new rail — it's a payment the user understands *completely* before they send it.

## Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, a send surface is done only when:

- [ ] The rail's promise is honest: instant → settled immediately; standard/SWIFT → real `Processing`,
      held off settled balance, no faked completion.
- [ ] Internal moves are optimistic + Undo with **no** forced dialog and **no** pending state; payee sends
      use the forced-decision dialog.
- [ ] Cross-currency shows mid-rate, margin, your-rate, fee, and **they-receive** before confirm; SWIFT
      charge option (OUR/SHA/BEN) recomputes fee + they-receive correctly.
- [ ] SEPA speed step shows each option's ETA + fee; instant-unavailable falls back to standard with a note;
      Instant shows truthful badges and **no** cancel window; standard shows cancel-until-cut-off.
- [ ] Quote expiry forces a re-quote before confirm; confirm uses the fresh rate.
- [ ] Over-threshold → step-up before money moves; decline returns with zero side effect.
- [ ] First-payment-to-new-payee warning + CoP result shown; reward-early validation on funds/limits/IBAN.
- [ ] Money is integer minor units; FX uses scaled-integer rates (no float-multiply).
- [ ] The gut check: would a real customer trust this with €1,200 to a new payee abroad?
