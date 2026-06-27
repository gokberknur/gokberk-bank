# Auth & step-up — sub-area playbook

The deep guide for **authentication** and the **step-up spine** — `O02`
(`.planning/features/onboarding-security/O02-auth-step-up.md`): login, register, forgot-password, 2FA (OTP +
passkey/WebAuthn sim), the lock screen, and the `F12` step-up interceptor that every sensitive action in the
app routes through. Read this when the work is *re-proving who the user is* — at the front door or mid-session.

**The policy registry table itself lives in `regulatory-and-trust.md` (§ "The step-up policy registry") — that
is its single home. Do not re-encode the threshold table here.** This playbook covers the *mechanics* of
auth and how a feature *dispatches against* that registry; that file owns *what the rules are*.

## Contents

1. Authentication factors: passkeys over passwords
2. The auth flows: login, register, reset, lock
3. Anti-enumeration (the reset oracle problem)
4. The step-up mechanism: intent → step-up → resume
5. Dynamic linking: naming the action
6. Cache, decline, and the no-side-effect contract
7. Recovery & never-lock-out
8. Sub-area definition of done

## 1. Authentication factors: passkeys over passwords

**Passkeys (FIDO2 / WebAuthn) are the preferred factor — offer them as primary, passwordless.** They're
phishing-resistant: public-key, bound to the legitimate origin, nothing reusable transmitted. **OTP (`F08`) is
the explicit fallback** second factor. In this mock demo, WebAuthn is a *simulation* — model
register/authenticate and the fallback-to-OTP when a passkey is unavailable; no real secrets, no real
credentials, a fixed deterministic OTP from the seed.

The load-bearing distinction, and the reason step-up exists at all: **a passkey protects *access*, not
*intent*.** A correctly-authenticated user can still be socially engineered into a transfer. Authentication is
*necessary, not sufficient* — which is exactly why threshold step-up + dynamic linking still matter even after
a perfect passkey login. Don't let anyone argue "they're logged in with a passkey, so skip the step-up."

## 2. The auth flows: login, register, reset, lock

Full-page auth routes live **outside** the `(app)` shell. Defer pacing/visuals to `gok-bank-ux` /
`gokberk-design`; own the substance:

- **Login** (`/login`) — email + password, then **2FA** at `/login/2fa`: an `F08` OTP input *or* a passkey
  prompt, **user's choice**, either reaches `/home` (or the resume target). 2FA-after-password satisfies SCA
  (two independent factors: knowledge + possession/inherence). Wrong code/password is **no-blame +
  reward-early** ("That code didn't match — check and try again"), never "invalid credentials" framed as the
  user's fault, never a faked count-down-to-lockout as blame.
- **Register** (`/register`) — create account (email + password), then route into onboarding (`O01`). Whether
  the password is set here or inside onboarding is an `O02` open question — flag it.
- **Forgot password** (`/forgot-password`) — request reset → confirm via OTP → set a new password. Copy is
  **anti-enumeration** (see §3).
- **Lock screen** — an inactivity/return lock that dims the shell and demands passkey/OTP to resume,
  **preserving the exact current route (no data loss)**. The idle timeout and whether passkey is the default
  unlock are `O02` open questions.

Across all: **honest state.** Signing in = disabled primary + `gok-spinner`. Rate-limited = generic "try again
shortly". OTP resend has a **cooldown countdown announced via `aria-live`**. Passkey unavailable → fall back to
OTP, gracefully.

## 3. Anti-enumeration (the reset oracle problem)

**Login and forgot-password must never reveal whether an email is registered.** The copy is always "If that
email is registered, we've sent a code" — identical response whether or not the account exists. Rate-limit
generically. **No account oracle, ever.** Why: an endpoint that says "no such user" is a free user-enumeration
gift to an attacker building a target list — the first step of credential stuffing and phishing. This is a
*non-negotiable* and a common place even good neobanks slip. Stop any copy or behaviour that leaks existence
(different error text, different timing, different redirect).

## 4. The step-up mechanism: intent → step-up → resume

This is the spine you own. Sensitive actions across the whole app route through the **`F12` `?step-up`
interceptor** (`patterns.md §6`). The mechanics, fixed:

1. A feature **dispatches an intent** (e.g. "send €1,200 to Anna", "reveal PAN", "remove passkey"). **It does
   not decide whether step-up is needed or at what threshold** — it asks the registry.
2. The interceptor consults the **policy registry** (in `regulatory-and-trust.md`) — `always` or `threshold`
   (minor units) — and, if required, opens a `gok-dialog no-dismiss`.
3. The user satisfies it via **OTP (`F08`) or passkey**.
4. On success, the **original intent resumes** exactly where it was.
5. On cancel/decline, it returns with **no side effect** (see §6).
6. **Every step-up is logged** to `/security/activity` (`O03`).

**The cardinal rule: features dispatch an intent; they never re-encode a threshold or decide on their own to
skip the policy.** When a sibling domain says "we'll just require 2FA before transfers over €1,000" or "we'll
add our own re-auth before the PAN reveal," **stop them** and route it through the registry — payments owns the
transfer, cards owns the PAN reveal, servicing owns the e-sign, but the *rule that decides which step up* is
one table, owned by identity. One change there, the whole app obeys. Hard-coded re-auth scattered across
features is the anti-pattern this entire mechanism exists to prevent.

## 5. Dynamic linking: naming the action

SCA's **dynamic linking** requirement: the authentication must reference the *specific* action it authorises.
So a step-up dialog **names what it protects** — "Confirm sending €1,200 to Anna", never a generic "Confirm".
For a payment that means amount + payee; for a PAN reveal, the card; for sign-out-all, the consequence. Why:
naming the action is both a regulatory requirement *and* the user's last line of defence against a
socially-engineered approval — a victim mid-scam is far more likely to stop when the dialog says the real
amount and the real (unfamiliar) payee out loud. A generic "confirm" defeats the entire protection.

## 6. Cache, decline, and the no-side-effect contract

- **Cache:** a successful step-up suppresses re-prompting for the **same risk class** for a short window
  (default ~5 min) — so a burst of sensitive actions doesn't nag. **Don't make the window so long it defeats
  the protection.** The exact window is an `O02`/`F12` open question — coordinate, don't guess.
- **Decline / cancel = no side effect.** A cancelled or declined step-up must leave **nothing changed** — no
  money moved, no PAN revealed, no passkey removed, no partial state. This is what makes step-up safe to put in
  front of irreversible actions: the user can always back out clean.
- **Logged regardless:** the *attempt* and its outcome still write to the security log — the audit trail is
  continuous whether the action proceeded or not.

The trust failure to avoid at the other end: **nagging step-up on every trivial action** kills trust and trains
users to click through reflexively — which then makes the *real* step-up worthless. Step-up belongs on the
registry's sensitive actions only, cached sensibly — not sprinkled everywhere as security theatre.

## 7. Recovery & never-lock-out

Recovery is the real security baseline — security that can lock out its own legitimate user is a liability, not
a feature. The non-negotiables (the removal side is detailed in `security-center.md`):

- **Block removing the last authentication factor.** A user must never be one action from locking themselves
  out (enforced in the security center, but it's an auth invariant).
- **Recovery codes** are shown **once** at 2FA enrolment.
- The **lock screen** unlocks via passkey/OTP and **preserves the route** — locking is never data loss.
- Recovery must *exist* — there's always a real path back in for a genuine user, never a dead-end.

## 8. Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, an auth/step-up surface is done only when:

- [ ] Login (email + password) → 2FA via **OTP or passkey** (user's choice) reaches `/home`/resume; passkey
      unavailable → falls back to OTP.
- [ ] Register routes into onboarding (`O01`); forgot-password resets via OTP with **anti-enumeration** copy and
      generic rate-limit copy.
- [ ] Wrong password / wrong OTP is **no-blame + reward-early**, with an `aria-live` **resend cooldown**.
- [ ] The lock screen demands passkey/OTP and **preserves the exact route** (no data loss).
- [ ] Sensitive actions **dispatch an intent against the registry** (`regulatory-and-trust.md`) — never
      re-encode a threshold or skip the policy; `always` and `threshold` (minor units) actions trigger `F12`.
- [ ] The step-up dialog **names the action** (dynamic linking); **decline/cancel = no side effect**; a recent
      step-up is **cached** to avoid re-prompting (window not so long it defeats protection).
- [ ] **Every** step-up + auth event is **logged** to `/security/activity`.
- [ ] No real secrets/passwords/tokens in code; `--gok-*` roles only; dialogs trap + restore focus; axe clean.

The gut check: *could an attacker enumerate accounts, could a socially-engineered user approve a transfer
without the dialog naming the real amount and payee, or could a sensitive action slip through without its
registry-required step-up?* If yes to any, it's not done.
