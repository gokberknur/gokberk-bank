# Identity — customer requirements

What users actually need from onboarding, authentication, and the security center, framed as jobs-to-be-done.
Use this to scope features and judge priority — an identity surface earns its place by serving one of these
jobs well, not by adding friction or options.

## Core jobs-to-be-done

- **"Open an account and start banking — today, from my phone."** The dominant onboarding job. The user wants
  to go from "create account" to "my IBAN is ready" in one sitting, without paperwork or a branch visit. Speed
  and a sense of progress ("3 of 6") win; every minute and every extra field costs conversion.
- **"Prove I'm me without it feeling invasive or risky."** KYC is the most anxious moment in the whole product
  — the user is handing over a passport and their face. The job is *justified, transparent, and quick*: tell me
  what you need and why, let me retry when the photo's blurry, and don't make me feel like a suspect.
- **"Get back in, fast and securely."** The returning-user auth job. Sign in and confirm in seconds — a
  passkey tap or a 6-digit code — without re-entering everything and without being blamed for a typo.
- **"Don't let anyone else in, and stop me before a costly mistake."** The protection job. The user wants the
  bank to add friction at exactly the dangerous moments (a big transfer, revealing card details, a new device)
  and stay out of the way the rest of the time.
- **"See and control everything signed into my account."** The security-center job. Which devices, which
  sessions, what happened — and a way to revoke anything I don't recognise, without locking myself out.

## Segments and what they weigh

- **The mobile-first switcher** (coming from a traditional bank) — wants the neobank promise: fast, paperless,
  done on the phone. Judges the whole bank by how smooth onboarding feels.
- **The privacy-conscious user** — reads the consent screen; wants to know what's collected, why, and for how
  long. Rewards honesty (no pre-ticked boxes, plain retention) with trust.
- **The security-aware user** — turns on 2FA, adds a passkey, checks their devices and the activity log. Wants
  real controls, not a single toggle.
- **The got-locked-out / lost-device user** — the recovery case. Wants a calm, dignified path back in, and
  anti-enumeration copy that doesn't leak whether their email exists.

## Must-haves (table stakes — a serious bank has all of these)

- A resumable, full-page onboarding wizard: profile → address → KYC consent → identity (ID upload) → verify
  (selfie/liveness + OCR review) → plan → funding → done, with clear "k of 6" progress and Back-editable steps.
- Age ≥ 18 gate (no-blame), address validation (no PO box), country-aware postcode masking.
- An explicit KYC consent screen — *what data, why, how long* — acknowledged with a real control before any ID
  is requested; nothing pre-ticked, retention never hidden.
- ID document upload with type/size guard, blurry-retry, and a camera fallback; selfie/liveness with retry up
  to a cap then a help path; an editable OCR review ledger for mismatches.
- An honest "Verifying…" pending state — never a faked completion.
- Login (email + password) → 2FA via **OTP or passkey** (user's choice); register; forgot-password with
  anti-enumeration copy; a lock screen that preserves the route.
- A security center: trusted devices (revoke), active sessions (sign out / sign out everywhere), 2FA setup,
  passkey add/remove, and a sortable/filterable security activity log.
- Step-up re-authentication before sensitive actions, governed by one policy registry; every step-up logged.
- No-blame errors everywhere; never lock a user out by removing their last factor.

## Nice-to-haves (differentiators — earn delight, but not at the cost of safety)

- Passkey offered as the *primary* factor (passwordless feel), OTP as fallback.
- A "Resume your application" draft banner that survives a refresh or a day's gap.
- A cached step-up that suppresses re-prompting for a short window (no nagging on a burst of actions).
- Recovery codes shown once at 2FA enrolment; clear "this device" / current-session markers.
- Reusable-KYC feel: verify once, and second-product friction drops (a real neobank conversion lever).

## What users fear (design against these)

- **"This feels like a scam / they're taking too much."** → justify every field, plain consent, honest
  retention; calm editorial tone at the ID-upload moment.
- **"I got stuck and lost everything."** → resumable draft; graceful retries on blur/OCR/liveness; a human
  path after the retry cap, never a dead-end.
- **"Someone got into my account."** → visible devices/sessions, an activity log, easy revoke, step-up on the
  dangerous actions.
- **"I locked myself out."** → block removing the last factor; real recovery; dignified, no-blame copy.
- **"They told a stranger my email is registered."** → anti-enumeration on every reset and login path.
