# Cards — scope discipline

Your mandate to **control what gets built**. A domain expert's value is as much in what they refuse as what
they ship. Use this at every scope decision; when something feels like creep, say so and point here.

## What gökberk bank delivers (in scope)

- A **cards wallet** (physical · virtual · disposable) + a card **detail** with reveal (PAN/CVV behind
  step-up, auto-hide), per-card spend, and the entry points to freeze / settings / PIN / add-to-wallet.
- **Order / replace** a card on the wizard spine — virtual instant, physical with an ETA, report lost/stolen →
  replace (forced-decision + step-up).
- **Card controls**: freeze, channel toggles (online · contactless · ATM), daily spend limit, region
  allow-list — instant, reversible settings.
- **PIN** view/change and **3-D Secure** approval.
- **Add to Apple Pay / Google Pay** (mock provisioning).

This set fully exercises the sensitive-reveal pattern, the optimistic-vs-forced friction model, and the
control surface — a complete, credible card product for a pan-European neobank demo.

## What we do NOT build (and why)

- **Real card issuing / processing / provisioning.** It's a mock demo — no real PAN/CVV/PIN, no real scheme or
  wallet APIs, all deterministic mock data. Never wire a real issuer-processor or tokenization service.
- **Paying *with* a card / any money movement.** Sending money, transfers, top-ups — that's
  **`gok-bank-payments`**. We own the card object and its controls, not the payment rails.
- **Disputes / chargebacks.** The 3-DS "didn't recognise this?" *hands off* into the dispute flow, but the
  dispute case itself is **`gok-bank-servicing`** (`S02`). Don't build dispute mechanics here.
- **The credit-card *product* (revolving credit line).** Applying for and managing a credit line is a lending
  product — **`gok-bank-lending`** (`L05`). We do debit/virtual/disposable cards, not the borrowing.
- **The step-up *mechanism* itself** (OTP/passkey, the `?step-up` interceptor, 2FA setup, the security
  centre). That's **`gok-bank-identity`** (`F12`/`O02`/`O03`). We *consume* step-up to gate a reveal; we don't
  build the authenticator.
- **Loyalty / rewards / cashback on the card.** That's `gok-bank` money-management (`M02`), not a card surface.
- **Card-aggregation (Curve-style "all your cards in one").** Out of a single-issuer neobank's spirit and the
  demo's scope.

## Creep signals — push back when you see these

- "Let's add a confirmation dialog to freeze so it feels serious" → no; freeze is reversible → optimistic +
  toast, *no dialog*. Friction must match stakes.
- "Skip the step-up on replace, it's annoying" → no; replace cancels a working card — it needs the
  forced-decision dialog *and* a step-up.
- "Let the 3-DS auto-approve if the user is idle so the payment doesn't fail" → never; a timeout
  **auto-declines**. Failing safe is the whole point.
- "Just show the full number on the detail page" → never without a step-up; mask by default, reveal
  deliberately, auto-hide.
- "Let's build the dispute case right here off the 3-DS prompt" → no; hand off to `gok-bank-servicing`.
- "Add a credit card the user can borrow against" → that's the lending product; route to `gok-bank-lending`.

## The refusal, done well

When you say no, say *why* and offer the better path: "We're not putting a confirm dialog on freeze — it's
fully reversible, so a forced decision is over-friction. Optimistic update + a `gok-toast` with 'unfreeze
anytime' is the on-brand, on-stakes pattern. Save the forced-decision dialog for *replace*, which actually
cancels a working card." A good no protects the product and teaches the team where the line between reversible
and irreversible really sits.
