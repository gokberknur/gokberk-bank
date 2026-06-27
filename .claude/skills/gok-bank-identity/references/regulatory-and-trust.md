# Identity — regulatory & trust framing

The framing an identity expert holds in mind. gökberk bank is a **mock demo** — no real backend, no real KYC
vendor, no real secrets or PII — but the experience should be *shaped by* how regulated identity actually
works, because that's what makes it feel like a real, trustworthy bank. Informed, not overbearing: use this to
get the behaviour right, not to bury the UI in legalese.

## KYC / AML — Customer Due Diligence (AMLD)

- EU anti-money-laundering law (the AML Directives, converging into the single **AMLR** rulebook + the new EU
  AML authority) requires obliged entities to perform **Customer Due Diligence (CDD)** before opening an
  account: *identify* the customer and *verify* that identity from a reliable, independent source.
- For a digital neobank that means: collect identity data (name, DOB, address, residency) and verify a
  **government ID document** plus a **selfie/liveness** check that binds the document to the live person.
- **Risk-based approach:** low-risk users get the standard flow; higher-risk signals would trigger enhanced
  checks (proof of income/address). We model the standard path; we don't build an EDD engine.
- **Design implication:** the onboarding wizard *is* the CDD flow — profile → address → identity → liveness.
  Each step exists for a regulatory reason; that's the honest justification for every field we ask.

## eIDAS / digital identity (the direction of travel)

- **eIDAS 2.0** and the **EU Digital Identity Wallet (EUDI Wallet)** are making identity verification
  pan-European: a user will be able to share verified attributes from a wallet, and banks will eventually have
  to accept it for onboarding. eIDAS-compliant remote verification is treated as equivalent to face-to-face.
- **Design implication for the demo:** our ID-upload + selfie flow is the *today* path; frame it so a "verify
  with your digital identity wallet" option could slot in later as an alternative entry to the same KYC step.
  Don't build the wallet integration — just don't design the flow as if document upload is the only way.

## GDPR — consent, special-category data, retention (the KYC consent contract)

This is central. Before we ask for an ID or a selfie, a **forced consent screen** must state, in plain copy:

- **What** we collect — identity data, the ID document, and the **selfie/liveness biometric**.
- **Why** — to verify identity and meet AML/CDD obligations (the lawful basis).
- **How long** — retention. A real bank keeps the KYC file for a defined period after the relationship ends
  (typically ~5 years under AML rules), then deletes/anonymises. State a concrete, honest retention period.

Rules that are non-negotiable:

- **Biometric (liveness) data is special-category** under GDPR Article 9 — it needs *explicit* consent and
  must be named as what it is. Never slip it in under a generic "by continuing."
- Consent is **freely given, specific, informed, unambiguous** — a real, required, **un-pre-ticked** control
  (`gok-checkbox`/`gok-switch`), with the legal detail available in a `gok-accordion`, not forced on the user.
- **No dark patterns:** no pre-tick, no hidden retention, no bundling unrelated consents, no "agree to all."
- The demo holds **no real PII or documents** — it's all mock — but the *consent contract* is modelled fully,
  because honest consent is the trust signal.

## Sanctions / PEP screening (concept, not engine)

- Onboarding a customer conceptually includes **sanctions-list screening** and a **PEP (Politically Exposed
  Person)** check — PEP is a *risk classification* (higher scrutiny), not a criminal record. A real bank runs
  these before the account goes live.
- **Design implication:** the "Verifying…" pending state is the natural home for "we're running our checks";
  model it as part of verification, deterministically from the mock seed. We don't build a real screening
  engine or surface accusatory copy.

## PSD2 / Strong Customer Authentication (SCA) — and step-up

- EU payments and account access require **SCA**: two independent factors from *knowledge* (password),
  *possession* (device/passkey), *inherence* (biometric) — with risk-based exemptions (low value, trusted
  beneficiary, recurring). 2FA after password satisfies this for login.
- **Dynamic linking:** for a payment, the authentication must reference the *specific* amount + payee — so a
  step-up names "Confirm sending €1,200 to Anna", never a generic "confirm". The step-up dialog must name the
  action it protects.
- **Step-up is the SCA mechanism for sensitive actions** mid-session — see the policy registry below. It's the
  spine you own: the `F12` `?step-up` interceptor runs intent → OTP/passkey → resume; cancel = no side effect.

## The step-up policy registry (the single source of truth — you own this)

One canonical table, `step-up-policy.ts`, of shape `{ action, mode: 'always'|'threshold', thresholdMinor? }`,
consumed app-wide. **Features dispatch an intent against this registry; they never re-encode a threshold or
decide on their own to skip it.** This is the most important artifact in the identity domain.

**Always step-up** (high-consequence, regardless of amount):

- Reveal card PAN / PIN (`C04`, owned by `gok-bank-cards` — it dispatches; you decide the rule).
- Add or remove a passkey or a trusted device; change password or 2FA (`O03`).
- First payment to a new payee (`P10`/payments dispatches).
- Sign a document (`D02`, owned by `gok-bank-servicing` — it *consumes* step-up).
- Confirm a tier downgrade that involves a refund.
- Sign out everywhere (`O03`).

**Threshold step-up** (re-auth at or above a configurable amount):

- A money transfer / FX exchange at or above the threshold (**default €1,000**, per `P03`/`F12`); a higher
  cumulative-daily ceiling. Money in **integer minor units**; the threshold lives here, not in the payment.

**Cached:** a successful step-up suppresses re-prompting for the same risk class for a short window (default
~5 min) — so a burst of sensitive actions doesn't nag. Don't make the cache so long it defeats the protection.

**Logged:** **every** step-up (and the auth events around it) writes to the security activity log at
`/security/activity` (`O03`). The log is the audit trail — a real regulator expects one continuous record.

When another domain says "we'll just require 2FA here," stop them: add the action to *this* registry instead,
so the rule is in one place and the whole app stays consistent.

## Authentication factors — passkeys, OTP, anti-enumeration

- **Passkeys (FIDO2 / WebAuthn)** are phishing-resistant (public-key, bound to the legitimate origin, nothing
  reusable transmitted) and the **preferred** factor — offer them as primary, passwordless. In the demo this
  is a WebAuthn *simulation*; model register/authenticate, fallback to OTP when unavailable.
- **OTP (one-time code, `F08`)** is the fallback second factor: keyboard- and paste-friendly, with an
  `aria-live` status and a **resend cooldown** countdown. Wrong code is no-blame + reward-early.
- **A passkey protects access, not intent.** A correctly-authenticated user can still be socially engineered
  into a transfer — which is exactly why threshold step-up + dynamic linking (naming amount/payee) still
  matter. Authentication is necessary, not sufficient; the policy registry is the rest of the defence.
- **Anti-enumeration:** login and forgot-password must **never** reveal whether an email is registered — "If
  that email is registered, we've sent a code." Rate-limit generically ("try again shortly"). No account
  oracle, ever.
- **Recovery is the real security baseline.** Block removing the **last** factor (never lock a real user out);
  show recovery codes once at 2FA enrolment; the lock screen unlocks via passkey/OTP and preserves the route.

## Trust & safety bar (what the experience must convey)

- **Justified, not invasive:** every onboarding ask has a stated reason; consent is plain and honest.
- **Graceful failure:** blur/OCR/liveness retries have caps and a human path — never a dead-end, never a loop.
- **Honest state:** "Verifying…" is pending, never faked completion; a declined/cancelled step-up leaves
  **no side effect**.
- **No blame:** wrong password/OTP says what to do, never frames the user as the problem.
- **In control, never trapped:** the security center shows everything, revokes anything, but blocks the
  self-lock-out — and logs every consequential action.
