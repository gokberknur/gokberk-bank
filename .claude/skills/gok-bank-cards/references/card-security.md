# Playbook: Card security — PIN, 3-D Secure, wallet provisioning (C04, C05)

The sub-area deep-dive for the three highest-stakes card moments: **PIN view/change**, the **3-D Secure push
approval**, and **add-to-wallet provisioning/tokenization**. The cross-cutting refs frame the SCA / PCI /
tokenization *why* (`references/regulatory-and-trust.md`); this is the *how* — the 3-DS state machine and its
fail-safe timeout, the PIN reveal/change mechanics, and the provisioning gate. Read it when building
`/cards/[id]/pin`, `/cards/[id]/3ds`, or `/cards/[id]/add-to-wallet`. Specs:
`.planning/features/cards/C04-pin-3ds.md` and `C05-add-to-wallet.md`.

## Table of contents

- The shared rule: step-up gates every act here
- PIN view (reveal, gated, auto-hide)
- PIN change (OTP-verified, reward-early strength)
- 3-D Secure approval — the forced-decision state machine
- 3-DS edge cases & the dispute escape hatch
- Add-to-wallet provisioning & tokenization
- Sub-area definition of done

## The shared rule: step-up gates every act here

All three flows **issue access to money or a credential**, so all three go through the **`F12` step-up
interceptor**: revealing the PIN, approving a 3-DS challenge, and provisioning a wallet token. None of them
ever happen inline. A cancelled/failed step-up returns with **no side effect** — nothing shown, nothing
approved, nothing provisioned. A recent step-up may be cached briefly (`F12`) to avoid nagging — confirm
whether 3-DS honours that cache (open question) rather than assuming.

## PIN view (reveal, gated, auto-hide)

The same shape as the C01 PAN reveal, tuned for a PIN:

- **"Show PIN"** dispatches a step-up intent (`F12`); on success a focus-trapped `gok-dialog` shows the
  4-digit PIN with a **depleting countdown** (default ~15s — shorter than the PAN's ~20s; open question, align
  with `C01`/`F12`, confirm don't hardcode). On zero it auto-hides and re-masks. Cancelling step-up shows
  nothing.
- **Same WCAG-safe timer rules:** rune timer, announces via `aria-live="polite"`, **pauses on focus**, and the
  revealed PIN is **never persisted, logged, or placed in a URL**. There is never a real PIN — mock data only.

## PIN change (OTP-verified, reward-early strength)

Changing the PIN is a credential change, so it adds a second factor (OTP) on top of the strength check:

- **Enter + confirm** a new PIN via an `F08` OTP-style 4-digit input. Reward-early **rejects weak PINs**
  (sequential like `1234`, repeated like `1111`) with **no-blame** copy ("Pick a PIN that isn't sequential or
  repeated") — surfaced as the user types, on a reserved message line.
- **Confirming sends a one-time code** (`F08` OTP) to verify the change. On success → `gok-toast` "PIN
  updated". A mismatch (new ≠ confirm) or a wrong OTP → reserve-message error + retry / resend; never blame.
- The exact strength rule set (block sequential/repeated only, or wider) is an open question — confirm with
  `O03`; default to sequential + repeated.

## 3-D Secure approval — the forced-decision state machine

The 3-DS push is the single most safety-critical surface in the cards domain. Model it explicitly, because the
**timeout direction is a one-way safety property**:

```
awaiting(countdown live) ──Approve──▶ stepping-up ──F12 ok──▶ approved → toast → spend proceeds
        │   │   │                          │
        │   │   │                    F12 cancel/fail
        │   │   └──Decline──▶ declined → toast "Payment declined"
        │   └──countdown == 0──▶ TIMED-OUT = auto-DECLINE  (never approve)
        └──Escape / scrim-click──▶ fires gok-cancel only (does NOT approve, does NOT close)
```

- **It is a push-style `gok-dialog no-dismiss`** showing the **merchant name, exact amount + currency, card ••
  1234, time, and a live countdown** to expiry. The customer must be able to see *exactly who is charging them
  and how much* before deciding — that specificity is the whole reassurance.
- **Approve → step-up.** The auth references *this* charge (dynamic linking), not a generic confirm. On success
  the challenge resolves approved, the dialog closes, a toast confirms, and the spend proceeds (feeds the `C01`
  spend stream / the `patterns.md` §10 instant-spend signature).
- **Decline → resolves declined**, closes, toast "Payment declined."
- **The countdown reaching zero auto-DECLINES — never auto-approves.** This is the fail-safe and it is
  non-negotiable: write the test that asserts a timeout *never* resolves approved. "Auto-approve if the user is
  idle so the payment doesn't fail" is exactly the anti-pattern to refuse. Copy on timeout is calm and exact:
  "This timed out — no payment was made."
- **Escape / scrim-click fire `gok-cancel` only.** They do **not** approve and do **not** silently close a
  security decision. A dismiss gesture must never become an approval, and must never make the challenge vanish
  unresolved.

## 3-DS edge cases & the dispute escape hatch

- **"Didn't recognise this?"** is always offered — a **quiet text link**, not a red button — routing into the
  dispute flow (`S02`, owned by `gok-bank-servicing`) **pre-filled** with this challenge/transaction. This
  skill owns the *prompt and the hand-off*, never the dispute case itself (see `scope-discipline.md`).
- **Resolve failure** (mock error on approve/decline) → `gok-alert`; the challenge stays **safely unapproved**.
  Failing toward "not approved" is always the safe direction.
- **Reachable as a global push**, not only at `/cards/[id]/3ds` — it can be triggered from a demo control to
  exercise the push. Wherever it mounts, the no-dismiss + fail-safe rules are identical.
- **Passkey-only approval** (no OTP) is an open question — confirm with `F12` before assuming the factor.

## Add-to-wallet provisioning & tokenization (C05)

Provisioning a card to Apple Pay / Google Pay is short and reassuring, but it **issues a device token**, so it
is **step-up-gated**. The whole flow lives in **one `gok-dialog` that swaps body states**: choose → review →
confirm → success.

- **Choose wallet** — a single-select of eligible wallets (Apple Pay / Google Pay) as `gok-card` /
  `gok-segmented-item`. Only the platform-appropriate option is offered (others noted unavailable) — though
  whether to platform-gate or offer both in the demo is an open question (confirm with `F01`). An
  **already-provisioned** wallet shows an **"Added" `gok-tag` and is disabled** — never re-provision.
- **Review** — a short key/value summary: card •• 1234, the wallet, the **device name**, and **one plain line
  on what a token is** ("A device-only number replaces your card number"). This is the trust signal — say it
  plainly, no hype. (Tokenization does **not** copy the PAN; it provisions a device-specific DPAN — see
  `regulatory-and-trust.md` for the why.)
- **Confirm** — step-up (`F12`, it issues a token), then a `gok-spinner` in the **disabled** primary during
  mock provisioning latency. Primary names the act ("Add to Apple Pay").
- **Success** — the dialog **swaps to a success state** (`gok-empty-state` success + an "Added to Apple Pay"
  `gok-tag`), moves focus to the success heading, announces politely. The card detail (`C01`) now **reflects
  the wallet status**.
- **Ineligible card** (frozen / expired) → info `gok-alert`, provisioning disabled — you can't provision a dead
  card.
- **Declined step-up** → return to the choose step, **nothing added.**
- **Brand guard:** wallet brand **names** are labels only — **no third-party brand-colour fills**, no real
  provisioning APIs, no imported brand assets beyond a neutral mark.

## Sub-area definition of done (on top of each spec's Success Criteria)

- [ ] **PIN view** reveals **only after step-up**, in a focus-trapped dialog, on a countdown that
      **announces**, **pauses on focus**, auto-hides + re-masks, and is **never persisted/logged**.
- [ ] **PIN change** rejects weak/mismatched values **reward-early** (no-blame), verifies via an **`F08` OTP**,
      and toasts on success; never a real PIN.
- [ ] The **3-DS dialog is `no-dismiss`**, names **merchant + exact amount + currency + card + time** with a
      **live countdown**, and traps focus.
- [ ] **Approve requires step-up** then resolves approved (feeds the spend stream); **Decline** resolves
      declined.
- [ ] **Timeout auto-DECLINES — a test asserts it never approves** — and says it timed out; **Escape/scrim fire
      `gok-cancel` only** (never approve, never silently close).
- [ ] **"Didn't recognise this?"** (quiet text link) opens the dispute flow (`S02`) **pre-filled**; resolve
      failure leaves the challenge **safely unapproved**.
- [ ] **Provisioning is step-up-gated**, shows **what's being added** (card + device) + the **token
      explanation** before confirm, **never re-adds** an already-added wallet, blocks **ineligible** cards with
      an info alert, and **reflects status back on `C01`**.
- [ ] **No third-party brand-colour fills**, no real provisioning/PIN/3-DS APIs; **no hardcoded hex/px**;
      `gok-dialog` unrestyled; status rule + icon + text; tabular numerals; axe clean on every dialog state.

If a customer could have a payment approved without them, see a PIN linger, or have a token provisioned without
a deliberate gated act — it's not done.
