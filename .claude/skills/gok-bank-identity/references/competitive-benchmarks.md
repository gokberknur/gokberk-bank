# Identity — competitive benchmarks

How the best onboard, authenticate, and protect, so gökberk bank can match or beat them. Use this to calibrate
"how good does this have to be?" — the answer is usually "as fast as the best neobank, as safe as a real
bank."

## The bar-setters

- **Revolut** — the speed benchmark for **onboarding**: account in minutes, ID + selfie capture guided
  in-app, instant feel, progress always visible. Fast, dense, slightly busy. Match the speed and the
  in-the-moment guidance; stay calmer and more editorial.
- **N26** — clean, restrained **paperless onboarding** and a tidy security surface; closest in spirit to
  gökberk's editorial calm. The lesson: minimal does not mean slow.
- **Monzo** — best-in-class **everyday clarity and reassurance**: warm, human microcopy, clear device/session
  management, no-blame errors. The model for the security center's "in control, never anxious" tone.
- **Modern KYC vendors (Onfido / Veriff-style)** — the **verification UX** benchmark: front/back ID capture
  with live image-quality detection, OCR autofill from the document, selfie + **liveness** (sometimes a
  short video reading numbers/moving), and a **cascading fallback** that picks the most robust check the
  device supports. The lesson: guide capture in real time, retry gracefully, never dead-end.
- **Traditional banks (incumbents)** — the contrast: branch visits or posted documents, clunky multi-day
  verification, password-only login, no visibility into devices or sessions. We win by being instant,
  paperless, passkey-first, and transparent.

## Patterns worth stealing

- **Guided, quality-checked capture** (Onfido/Veriff) — detect blur/glare *before* submission and prompt a
  retake; don't let a bad photo through to a slow failure.
- **OCR autofill + review** — extract the document fields and show them for confirmation; let the user *edit*
  on mismatch rather than re-do the whole step.
- **Liveness with a cascading fallback + retry cap** — try the strongest liveness the device allows, retry a
  bounded number of times, then route to a help path; never loop, never wall a genuine user.
- **Passkey-first auth** (Apple/Google/leading banks) — offer the passwordless tap as the primary factor,
  OTP as the explicit fallback; phishing-resistant by default.
- **Honest pending** — "Verifying… usually under a minute" with the ability to carry on once it clears, not a
  fake "Done."
- **Google/Apple-style security center** — a clear list of devices and active sessions with "this device"
  markers, last-seen and (optional) location, one-tap revoke, a "sign out everywhere," and a readable
  activity log. This is the model for `/security/*`.
- **Anti-enumeration reset** — "If that email is registered, we've sent a code," never confirming existence.
- **Resumable onboarding** — a draft that survives leaving and coming back ("Resume your application").

## Anti-patterns to avoid (where incumbents and even neobanks fail)

- A long, unjustified onboarding form that asks for everything up front and explains nothing.
- Pre-ticked consent, buried retention, or bundling biometric consent into a generic "agree to terms."
- A blurry-photo dead-end with no retry, or a liveness loop that traps a genuine user with no escape.
- Faking "Verified!" while a check is still running (erodes trust on the first real failure).
- Password-only login, or treating 2FA as an obscure setting instead of a first-class, passkey-friendly step.
- A security page that lists devices but won't let you revoke, or that lets you remove your last factor and
  lock yourself out.
- Blaming the user for a wrong password, or leaking whether an email exists.
- Nagging step-up on every trivial action (kills trust and trains users to click through).

## The gökberk angle

Match the neobanks on **onboarding speed** and the KYC vendors on **capture guidance**; **beat** them on
**calm, honesty, and control**. Where Revolut is busy, we're editorial — one earned accent on the single
Continue, a mono-uppercase eyebrow per step, plain numerals. Our trust signal is honesty: justify every ask,
state retention plainly, name the action a step-up protects, and make the security center feel like a control
room, not an alarm. The differentiator isn't a flashier liveness check; it's an onboarding you understand and
a security surface you trust completely.
