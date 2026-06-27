# Security center — sub-area playbook

The deep guide for the user's **security control room** at `/security/*` — `O03`
(`.planning/features/onboarding-security/O03-security-center.md`): trusted devices (revoke), active sessions
(sign out / sign-out-all), 2FA + passkey management, and the security activity log. Read this when the work is
*letting a user see and manage what protects their account*. The step-up that gates every consequential action
here is dispatched against the registry in `regulatory-and-trust.md` and built per `auth-and-step-up.md` — this
playbook is about the *surfaces* and their irreversible-action safety.

The governing feeling, from `competitive-benchmarks.md` (Google/Apple/Monzo model): the user should feel **in
control and informed — never anxious, never one fat-finger from locking themselves out.** A control room, not
an alarm panel.

## Contents

1. The five surfaces
2. The "every consequential action is gated" rule
3. Last-factor lock-out: the hard block
4. Forced-decision vs optimistic-undo (which gate when)
5. The security activity log (the audit sink)
6. Destructive-action presentation (brand-critical)
7. Sub-area definition of done

## 1. The five surfaces

All live inside the `(app)` shell (`F01`); confirms via `gok-dialog`, re-auth via `F12`. Substance is yours;
visuals/pacing defer to `gokberk-design` / `gok-bank-ux`.

- **Trusted devices** (`/security/devices`) — rows: name, platform, last seen, location, a **"this device"**
  marker. **Revoke → step-up → optimistic removal + `gok-toast`** (with undo where safe). **Revoking the
  current device signs you out** — name that consequence before it happens.
- **Active sessions** (`/security/sessions`) — current sessions as rows. **Sign out a single session** feels
  reversible (toast). **"Sign out everywhere"** is a **forced-decision** dialog (see §4) — it logs you out too.
- **2FA** (`/security/2fa`) — set up / change the OTP second factor via `F08` (enroll, verify a code, **show
  recovery codes once**). Any change is behind step-up.
- **Passkeys** (`/security/passkeys`) — list, **Add** (WebAuthn-sim registration), **Remove** — each behind
  step-up. **Removing the last factor is blocked** (see §3).
- **Security activity log** (`/security/activity`) — the `gok-table` audit sink (see §5).

Mock throughout: seeded devices/sessions/passkeys + a security-event stream; deterministic "this
device"/current-session markers; recovery codes generated deterministically. **No real credentials.** Whether
device *location* is shown (mock geo) or omitted to avoid implying real tracking is an `O03` open question —
flag it; don't imply surveillance you can't honestly back.

## 2. The "every consequential action is gated" rule

Every consequential mutation here — revoke a device, sign out everywhere, change 2FA, add/remove a passkey —
**dispatches a step-up intent** (`F12`) against the policy registry. These are all **`always`** entries (see
`regulatory-and-trust.md`): they're high-consequence regardless of amount. The same cardinal rule as
everywhere: **the security center dispatches an intent; it never re-encodes a threshold or invents its own
re-auth.** Why so heavily gated: this surface is exactly where an account takeover plays out — an attacker who
has a session would otherwise revoke *your* devices, remove *your* passkeys, and sign *you* out. Step-up on
every change is what stops a hijacked session from quietly evicting the real owner.

## 3. Last-factor lock-out: the hard block

The single hardest invariant in the domain: **removing the last authentication factor is blocked** — with a
clear, no-blame reason (a `gok-alert` explaining you can't remove your only factor), not a silent failure.
Equally, "sign out everywhere" and revoking the current device sign *you* out too — that's fine and expected,
but it must be **named as a consequence**, never a surprise. Why this is sacred: a security center that lets a
user lock themselves out is worse than no security center — it converts a safety feature into the cause of the
incident. Never optimise this block away "to reduce friction"; it is the friction that matters. Recovery must
exist (`auth-and-step-up.md §7`); self-lock-out must not.

## 4. Forced-decision vs optimistic-undo (which gate when)

Match the gate to the reversibility — over-gating trivial actions trains click-through; under-gating
destructive ones is dangerous (`patterns.md §2, §5`):

- **Forced-decision dialog** (`gok-dialog tone="danger" no-dismiss`) — for the **irreversible, account-wide**:
  **"Sign out everywhere."** It names the consequence plainly ("This signs out every device, including this
  one"), can't be dismissed by clicking away, and sits **behind step-up**. A forced decision = the user must
  actively choose, not stumble through.
- **Optimistic + undo** (`gok-toast`) — for the **reversible-feeling, single-scope**: revoking one device,
  signing out one session. Update the UI immediately, offer undo where safe, **roll back + `gok-alert` on
  failure.** (Step-up still gates the revoke; the *toast* is the post-confirm affordance.)
- Single-session sign-out being optimistic-undo vs pending is an `O03` open question — confirm against
  `patterns.md §5`; don't silently pick.

The discriminator: *can the user undo this in one tap, and does it affect only one thing?* → optimistic. *Is it
account-wide or irreversible?* → forced decision.

## 5. The security activity log (the audit sink)

`/security/activity` is a sortable, filterable `gok-table` of security events — sign-in, step-up, device
revoked, passkey added/removed, password/2FA change — with timestamp, type, device, location, result. **This is
the sink every `F12` step-up and every `O02` auth event writes to** — including *declined/cancelled* attempts.
Why it's load-bearing: a real regulator expects **one continuous audit record**, and for the user it's how they
*spot* an account takeover — an unrecognised sign-in or a device change they didn't make. The log states facts;
**no alarm language**. Mechanically: `gok-table` `columns`/`rows` set as DOM **properties**; status column is
**rule + icon + text, never colour alone**; tabular numerals on timestamps; empty → `gok-empty-state`. Don't
restyle the table.

## 6. Destructive-action presentation (brand-critical)

A gökberk-specific guardrail that's easy to get wrong: **destructive actions render as outline/text in the
status colour — never a solid red fill.** Revoke, remove passkey, sign out everywhere are all
outline/text-weight, not a loud red button. Why: the brand is a monochrome canvas with one earned accent and
**status by rule + icon + text**, not colour-alone shouting. A wall of solid-red buttons reads as panic; the
control-room calm depends on restraint. This is a `gokberk-design` rule, but it's an *identity* failure if a
security surface ships a solid-red destructive button — so hold the line on it here.

## 7. Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, a security-center surface is done only when:

- [ ] `/security/devices` lists devices and **revokes one behind step-up** (optimistic + rollback); revoking
      the current device signs out, named as a consequence.
- [ ] `/security/sessions` signs out a single session, and **"Sign out everywhere" is a forced-decision**
      `gok-dialog tone="danger" no-dismiss` behind step-up, naming the consequence.
- [ ] `/security/2fa` enrolls/changes OTP 2FA via `F08`, **showing recovery codes once**; any change behind
      step-up.
- [ ] `/security/passkeys` adds/removes passkeys (WebAuthn sim), each behind step-up; **removing the last
      factor is blocked** with a clear reason.
- [ ] `/security/activity` is a **sortable/filterable `gok-table`**; **every** action on the other surfaces
      (and every step-up/auth event, including declined) **appends to it**.
- [ ] Destructive actions are **outline/text in the status colour — never a solid red fill**; log status is
      **rule + icon + text, never colour alone**.
- [ ] Loading/empty/error/pending states present per `patterns.md`; no real credentials; `--gok-*` roles only;
      dialogs trap + restore focus; axe clean.

The gut check: *does this surface make a user feel completely in control of their account's security — able to
see every device and session, revoke anything suspicious, review a continuous log — while making it impossible
to lock themselves out by accident?* If a destructive action skips step-up, if the log misses an event, if a
user could remove their last factor, or if it reads as an alarm rather than a control room — it's not done.
