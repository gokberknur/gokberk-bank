# Identity — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship — and in identity, the temptation is *more verification, more friction, more security toggles*,
mistaking theatre for protection. Use this at every scope decision; when something feels like creep or
security theatre, say so and point here.

## What gökberk bank delivers (in scope)

- **Onboarding + KYC wizard** (`O01`): profile → address → KYC consent → identity (ID upload) → verify
  (selfie/liveness + OCR review) → plan → funding → done. Resumable via a draft token; every step Back-editable.
- **Auth** (`O02`): login (email + password), register, forgot-password (anti-enumeration), 2FA via **OTP**
  (`F08`) **or passkey** (WebAuthn sim), a lock screen.
- **The step-up policy** (`O02`/`F12`): the canonical registry of which actions re-authenticate and at what
  threshold, the `?step-up` interceptor that runs it, and the cache window.
- **Security center** (`O03`): trusted devices (revoke), active sessions (sign out / sign out everywhere), 2FA
  setup, passkeys (add/remove), and a sortable/filterable security activity log.

This set models the full identity lifecycle — stranger → verified customer → returning, protected user — for a
credible pan-European neobank demo.

## What we do NOT build (and why)

- **Real KYC-vendor / identity-provider integration.** It's a mock demo — verification outcomes are
  deterministic from the seed. Never wire a real Onfido/Veriff/IDnow or a real document store. No real PII,
  no real documents, no real biometrics.
- **A real biometric / liveness engine.** We model the *flow* (capture → retry → result), not actual face
  matching. No real biometric processing or storage.
- **A real sanctions/PEP screening engine.** The concept lives in the "Verifying…" state, deterministically.
  We don't build list-matching, scoring, or case management.
- **Enhanced Due Diligence / risk-scoring engines, proof-of-income/source-of-funds flows.** Out of demo scope;
  the standard CDD path is the model. Don't sprawl into a compliance back-office.
- **The EU Digital Identity Wallet integration.** Frame the KYC step so a wallet option *could* slot in later;
  don't build the integration.
- **Real secrets / real auth backends / SSO / social login / OAuth providers.** Auth is mock and
  deterministic. No real passwords, tokens, or third-party identity.
- **Owning another domain's action.** You own the step-up *mechanism* and *policy* — not the payment, the PAN
  reveal, the e-sign, or the investor questionnaire. Those belong to payments / cards / servicing / wealth;
  they *dispatch* against your registry.

## Creep signals — push back when you see these

- "Let's require 2FA on every action" → no; step-up matches stakes, governed by the registry. Nagging trains
  users to click through and erodes the protection where it matters.
- "Add a hardcoded re-auth here" → no; add the action to `step-up-policy.ts`. The threshold lives in one place.
- "Let's collect [extra field] at signup just in case" → no; every onboarding ask needs a stated KYC reason.
  Unjustified fields cost conversion and breach data-minimisation.
- "Integrate a real KYC provider so it's authentic" → no; it's a mock demo. We model the behaviour
  deterministically; a real vendor adds no demo value and real risk.
- "Make liveness retry until it passes" → no; cap retries, then route to a human/help path. A loop traps
  genuine users.
- "Show the user's real location / track them" → only mock geo, and consider omitting it rather than implying
  real tracking (an open question in `O03`).
- "Pre-tick the consent so onboarding is faster" → absolutely not; that's a dark pattern and a GDPR breach.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not wiring a real KYC vendor — it's a mock demo,
so a real integration adds risk and no demo value. The deterministic verify-from-seed flow models the exact
same UX — capture, retry, OCR review, the 'Verifying…' pending state — which is what we're actually
demonstrating." And for theatre: "We won't 2FA every action — that's not security, it's nagging. Add the
genuinely sensitive action to the step-up registry; trust the policy to friction the right moments." A good no
protects the product, the user's trust, and teaches the team the domain.
