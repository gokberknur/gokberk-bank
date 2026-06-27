# Onboarding & KYC — sub-area playbook

The deep guide for the **onboarding wizard** and the **KYC consent contract** — `O01`
(`.planning/features/onboarding-security/O01-onboarding-kyc.md`), built on the `F05` wizard composite and the
`.planning/ux/patterns.md §1` stepper. Read this when the work is *becoming a customer*: the seven-step flow,
the consent screen, ID capture, OCR, liveness, and resumability. For the auth that follows it, see
`auth-and-step-up.md`; for the regulatory framing it implements, see `regulatory-and-trust.md`. This is
narrower and more mechanical than those — it tells you how to *build the flow right*, not just why.

## Contents

1. The mental model: the wizard **is** the CDD flow
2. Step-by-step: requirements, gates, edge cases
3. The KYC consent contract (the trust spine of onboarding)
4. Capture, OCR & liveness: graceful failure mechanics
5. Resumability & the draft model
6. Pending verification & the honest "Verifying…" state
7. eIDAS / wallet future-proofing
8. Sub-area definition of done

## 1. The mental model: the wizard *is* the CDD flow

Hold this framing: every step exists for a **regulatory reason** (AMLD Customer Due Diligence — identify the
customer, then verify that identity from a reliable, independent source). That is the honest justification for
every field you ask. The flow is profile → address → **KYC consent** → identity (ID upload) → verify
(selfie/liveness + OCR review) → plan → funding → done. Seven steps the user *sees* as "k of 6" (the consent
screen rides on the identity step, not a numbered stop). Because each ask maps to a rule, you can answer the
only question that matters at onboarding — *why do you need this?* — for every single field. If you can't, cut
it. **Fast, but safe:** the enemy is abandonment, never KYC shortcuts. Speed comes from justification, pacing,
and reward-early validation — not from skipping a step.

## 2. Step-by-step: requirements, gates, edge cases

Defer the *visuals* and the *flow pacing* to `gokberk-design` and `gok-bank-ux`; you own the substance and the
gates below. Route `/onboarding/[step]`, full-page, **before** the `(app)` shell.

- **1 · Profile** — name, DOB, residency. **Gate: age ≥ 18, reward-early** — compute from the DOB picker as
  it's entered, block under-18 *on step 1* with no-blame copy ("You need to be 18 to open an account"), never
  let them complete six steps then reject. Why: age is a hard eligibility floor; failing late is cruel and
  wastes the user's identity effort.
- **2 · Address** — address, **country-aware masked postcode**, tax residency. **Block PO boxes** (a real bank
  needs a residential address for CDD). Tax residency is asked because it drives downstream obligations (CRS);
  name that lightly if asked, don't lecture.
- **3 · KYC consent** — the forced screen. See §3 — this is the most important step in the flow.
- **4 · Identity** — ID type via `gok-segmented` (passport / national ID / driving licence) + document upload.
  Enforce file type/size; blurry → retry (see §4). The ID type changes which fields OCR expects.
- **5 · Verify** — selfie/liveness (mock) + the **OCR review ledger**: extracted fields shown for the user to
  confirm or correct. Mismatch → *edit the field*, not redo the step. Liveness fail → retry capped at N, then a
  help path (see §4).
- **6 · Plan** — Standard / Plus / Metal, **fee disclosed inline** (consumes the `X04` tier table). No
  pre-selected paid tier, no dark-pattern nudge to Metal.
- **7 · Funding** — open the EUR wallet + optional top-up. **Skip is allowed; zero balance is fine.** Never
  gate account creation on depositing money — that's a conversion trap, not a requirement.
- **8 · Done** — calm success: "Your IBAN is ready", IBAN/BIC shown, one primary "Go to home". No confetti
  (brand: calm confidence). The IBAN is issued *deterministically on completion* — never before `done`; no step
  may mutate account state earlier.

**Universal step rules** (from `patterns.md §1`, enforce them): advance only when the current step is valid;
**Back never validates**; exactly one primary (Continue) + one secondary (Back); unvisited steps aren't
clickable. Supply step `validate` functions to `F05`; never restyle the composite or `gok-progress`.

## 3. The KYC consent contract (the trust spine of onboarding)

This is central — the single most trust-defining screen in the app, and the thing `regulatory-and-trust.md`
(GDPR section) governs. Build it as a **forced screen that precedes any ID/selfie request**, stating in plain
copy:

- **What** we collect — identity data, the ID document, and the **selfie/liveness biometric** (named as such).
- **Why** — to verify identity and meet AML/CDD obligations (the lawful basis).
- **How long** — a concrete, honest **retention** period (a real bank keeps the KYC file ~5 years after the
  relationship ends, then deletes/anonymises). State a number, don't hand-wave.

Non-negotiable mechanics:

- **Biometric (liveness) data is special-category (GDPR Art. 9)** — it needs *explicit* consent and must be
  named as biometric. Never fold it into a generic "by continuing you agree."
- The acknowledgement is a **real, required, un-pre-ticked control** (`gok-checkbox`/`gok-switch`). The full
  legal detail lives in a `gok-accordion` — available, not forced on the user.
- **No dark patterns:** no pre-tick, no hidden retention, no bundling unrelated consents, no "agree to all."
- Consent must be **freely given, specific, informed, unambiguous** — block progress until it's given, but
  never trick it into being given.

Why this matters more than any other screen: this is the exact moment a stranger decides whether to hand over
their passport and face. Honest, plain consent *is* the conversion lever — not a smaller checkbox.

## 4. Capture, OCR & liveness: graceful failure mechanics

The KYC-vendor benchmark (Onfido/Veriff-style) is **guide capture in real time, retry gracefully, never
dead-end** (`competitive-benchmarks.md`). Model the *behaviour*, not a real vendor (mock demo — deterministic
outcome from the `F03` seed, no real biometrics).

- **Document upload (`F09`)** — enforce file type/size *before* accept; on a blurry/low-quality image, prompt a
  **retake** rather than letting a bad photo through to a slow failure. Offer a **camera fallback** and an
  accessible file-list with remove. A non-camera path must exist (a11y + desktop).
- **OCR review** — extract the document fields and show them in an **editable ledger** for confirmation. On
  mismatch, the user **edits the wrong field**; they do *not* re-run the whole identity step. This is the
  single biggest abandonment saver in verification.
- **Liveness/selfie** — mock liveness with a **bounded retry: cap at N, then route to a help/human path.**
  Never loop, never wall a genuine user. *Retry-until-pass is a trap* — refuse it (it trains nothing and traps
  real users whose device/lighting just can't pass). N and the post-exhaustion path are open questions in `O01`
  — flag them, don't silently pick.

The rule across all three: every failure has a **retry and a human path**, and a cap. A genuine user who can't
get past liveness must reach help, not a wall.

## 5. Resumability & the draft model

Onboarding spans a stressful, document-fetching gap — people leave to find their passport. **The whole flow
must survive a refresh or a day's gap.** Mechanics:

- Persist a **draft** under `gok-bank-draft:onboarding` (the `F05` model): profile, address, ID metadata, OCR
  result, plan, funding. Money in minor units. **No real PII or documents** — mock/seeded.
- A **deep-link / refresh** to `/onboarding/[step]` restores *that* step with prior data intact.
- A **returning user** sees a draft banner — "Resume your application" — not a blank restart.
- An **abandoned-then-expired** draft offers a clean fresh start. The expiry window is an `O01` open question.

Why: re-entering identity data is the fastest way to lose a half-converted user. The draft token is the
difference between "I'll finish later" and "I gave up."

## 6. Pending verification & the honest "Verifying…" state

After the verify step, verification may be **pending** — model it honestly. Show a `gok-tag` "Processing" + a
`gok-alert` info ("Usually under a minute"), and let the user **carry on once it clears without re-entering
anything**. This pending window is also the natural, non-accusatory home for the conceptual **sanctions/PEP
screening** ("we're running our checks"), modelled deterministically from the seed — not a real engine, not
accusatory copy (`regulatory-and-trust.md`). **Never fake completion** — a faked "Verified!" erodes trust the
moment a real check later fails. Honest pending beats a fast lie.

## 7. eIDAS / wallet future-proofing

eIDAS 2.0 and the EU Digital Identity Wallet are making verification pan-European — a user will eventually
share verified attributes from a wallet, and banks must accept it. **Don't build the wallet integration.** Just
don't architect the flow as if **document upload is the only way in**: frame the identity step so a "verify
with your digital identity wallet" option could slot in later as an alternative entry to the *same* KYC step.
This is a framing discipline, not a feature.

## 8. Sub-area definition of done

On top of the domain-wide `definition-of-done.md`, an onboarding/KYC surface is done only when:

- [ ] The wizard runs profile → address → consent → identity → verify → plan → funding → done; every step is
      **Back-editable**; Back never validates; "k of 6" progress shows.
- [ ] **Age ≥ 18 gates step 1, reward-early**, no-blame; PO-box blocked; postcode masks per country.
- [ ] The **KYC consent** screen (what / why / retention) is acknowledged with a **real, un-pre-ticked**
      control **before** any ID/selfie; biometric **named as special-category**; nothing pre-ticked or bundled.
- [ ] ID upload enforces type/size + **blurry-retry + camera fallback**; **OCR review is editable** on
      mismatch; **liveness retries cap at N** then a help path — no loop, no wall.
- [ ] **"Verifying…" is honest pending** (Processing tag + info alert), never faked completion; the user
      resumes without re-entering.
- [ ] The flow is **resumable**: refresh/deep-link restores the step + data; abandoned offers Resume; expired
      offers a fresh start.
- [ ] Completion issues a **deterministic IBAN/BIC** and lands on a calm success → `/home`; no account state
      mutates before `done`.
- [ ] No real PII/documents/biometrics anywhere — mock + deterministic; `--gok-*` roles only; axe clean.

The gut check: *would a real customer hand over their passport and face to this flow* — understanding exactly
what's collected, why, and for how long — *and trust they could leave and come back?* If onboarding feels
invasive, hides anything in consent, or could trap a genuine user at liveness, it's not done.
