# Identity — definition of done

The quality bar an identity surface must clear before you'll sign it off. This is the domain lens, on top of
the feature spec's own Success Criteria, the `gokberk-design` visual gate, and `gok-bank-ux`'s flow review.
If an onboarding/auth/security surface fails any of these, it's not done.

## Onboarding & KYC correctness

- [ ] The wizard runs profile → address → KYC consent → identity → verify → plan → funding → done, with
      `gok-progress` showing "k of 6"; every step is **Back-editable** and Back never validates.
- [ ] Age ≥ 18 gates step 1 with **no-blame** copy; PO-box address is blocked; postcode masks per country.
- [ ] The flow is **resumable**: a refresh or deep-link to `/onboarding/[step]` restores that step with prior
      data; an abandoned flow offers "Resume your application"; an expired draft offers a fresh start.
- [ ] Completion issues a deterministic IBAN/BIC and lands on a calm success → `/home` (no confetti).

## Consent & data (the KYC consent contract)

- [ ] A forced **consent screen** — *what data, why, how long (retention)* — is acknowledged with a real,
      **un-pre-ticked** control **before** any ID/selfie is requested; the legal detail sits in a `gok-accordion`.
- [ ] Biometric (liveness) data is **named as special-category**; no generic "by continuing," no bundling.
- [ ] No dark patterns: nothing pre-ticked, retention never hidden, no "agree to all."
- [ ] No real PII, documents, or biometrics anywhere — mock/seeded and deterministic.

## Verification & graceful failure

- [ ] ID upload (`F09`) enforces type/size, offers a **blurry retry** + a **camera fallback**.
- [ ] The **OCR review** ledger is editable on mismatch (edit, don't re-do the whole step).
- [ ] Liveness/selfie retries **cap at N**, then route to a **help/human path** — never a loop, never a wall
      for a genuine user.
- [ ] "Verifying…" is an honest **pending** state (Processing `gok-tag` + info `gok-alert`) — never a faked
      completion; the user can carry on once it clears without re-entering anything.

## Authentication

- [ ] Login (email + password) → 2FA via **OTP (`F08`) or passkey** (WebAuthn sim, user's choice) reaches
      `/home` / the resume target; passkey unavailable → falls back to OTP.
- [ ] Wrong password / wrong OTP is **no-blame + reward-early**, with a **resend cooldown** countdown
      (`aria-live`).
- [ ] Forgot-password is **anti-enumeration** ("If that email is registered, we've sent a code"); rate-limit
      copy is generic.
- [ ] The lock screen demands passkey/OTP and **preserves the exact route** (no data loss).
- [ ] No real secrets, passwords, or tokens in code.

## Step-up policy (the spine)

- [ ] The **step-up policy registry** (`step-up-policy.ts`) is the **single source of truth**; this surface
      *dispatches an intent* and **never re-encodes a threshold** or hard-codes "require 2FA here."
- [ ] "Always" actions (PAN reveal, passkey/device change, 2FA/password change, first payment to a new payee,
      doc sign, sign-out-all) and threshold actions (transfer ≥ €1,000, in **minor units**) trigger `F12`.
- [ ] The step-up dialog **names the action it protects** (dynamic linking); a declined/cancelled step-up
      returns with **no side effect**; a recent step-up is **cached** to avoid re-prompting.
- [ ] **Every** step-up (and auth event) is **logged** to `/security/activity`.

## Security center

- [ ] Devices revoke behind step-up (optimistic + rollback); revoking the current device signs out.
- [ ] "Sign out everywhere" is a **forced-decision** `gok-dialog tone="danger" no-dismiss` behind step-up,
      naming the consequence.
- [ ] 2FA enrol/change shows recovery codes once; passkey add/remove each behind step-up.
- [ ] Removing the **last factor is blocked** with a clear reason — never lock the user out.
- [ ] The activity log is a sortable/filterable `gok-table`; status is **rule + icon + text, never colour
      alone**; destructive actions are **outline/text in the status colour, never a solid red fill**.

## States, a11y & consistency

- [ ] Loading, empty, error, and pending states are all present and correct per `.planning/ux/patterns.md`.
- [ ] Each form is labelled; the wizard moves focus to the new step's heading and announces progress via
      `aria-live`; dialogs trap and restore focus; OTP is keyboard + paste friendly; axe clean.
- [ ] `--gok-*` roles only — no hardcoded hex/px; `npm run check` + `npm run build` green.

## The gut check

Would a real customer hand over their passport and face to this — and trust this security center with their
account? If the onboarding feels invasive or could trap a genuine user, if the consent hides anything, if a
sensitive action slips through without its step-up, or if a user could lock themselves out — it's not done.
