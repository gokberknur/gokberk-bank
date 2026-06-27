# Cards — competitive benchmarks

How the best run cards, so gökberk bank can match or beat them. Use this to calibrate "how good does this have
to be?" — the answer is usually "better than the incumbent, as good as the best neobank."

## The bar-setters

- **Revolut** — the breadth bar for **card controls and virtual/disposable cards**. Instant freeze, per-card
  daily/monthly spend limits, channel toggles, and a true **disposable** card whose number regenerates after
  every purchase (capped to a few uses a day, not for contactless/recurring). Fast, dense, slightly busy.
  Match the control breadth and the disposable concept; stay calmer and less cluttered.
- **Apple Card / Apple Pay** — the bar for **the reveal and the premium card object**. The card *is* the
  surface; the number is revealed deliberately, controls are quiet chrome around it, and provisioning to the
  wallet is a polished, reassuring flow. Closest in spirit to gökberk's "the card is the object, everything
  else is quiet chrome."
- **Monzo** — best-in-class **everyday card clarity**: one-tap freeze, customisable contactless limits, and
  the ability to dial down ATM / transfer limits. Warm, human microcopy without being cute. Match the
  one-tap calm and the no-blame voice.
- **Starling** — the **granular channel-control** bar: independently disable online payments, contactless, ATM
  withdrawals, plus location/gambling controls. We take the channel-toggle model (online · contactless · ATM)
  and the region allow-list, restrained to what a demo needs.
- **N26** — clean, editorial card UX; Spaces for organising; a calm, restrained control panel. Closest visual
  kin to gökberk's editorial calm.
- **Curve** — the "all cards in one, retroactive control" angle. Useful as a *contrast*: powerful but complex;
  we stay simpler and don't chase the card-aggregation model.

## Patterns worth stealing

- **Apple Card's deliberate reveal** — masked by default, the full number behind authentication, the card art
  carrying the colour while the chrome stays monochrome.
- **Revolut's disposable card** — a number with a blast radius for untrusted merchants; regenerates after use.
- **Monzo's one-tap freeze** — prominent, instant, reversible, with reassuring "unfreeze anytime" copy and no
  scary dialog.
- **Starling's independent channel toggles** — online / contactless / ATM as separate switches, each instant.
- **The push-style 3-DS approval** (issuer apps) — merchant + exact amount + Face ID approve, with a clear
  decline and a "not me?" path.

## Anti-patterns to avoid (where issuers and even neobanks fail)

- A revealed PAN/PIN that **lingers** on screen with no auto-hide.
- A **faked freeze** — the UI says frozen but the setting didn't apply (the worst possible trust break on a
  safety control).
- A 3-DS prompt that **auto-approves** on timeout, or that Escape/scrim silently dismisses into an approval.
- Putting a **confirmation dialog on a freeze** (over-friction on a reversible act) while leaving a
  card-cancelling replace with *no* step-up (under-friction on a destructive one).
- A control panel that's a wall of toggles with no hierarchy, or status conveyed by a colour fill alone.
- Third-party wallet **brand-colour fills** crammed into the UI instead of a neutral, on-brand treatment.

## The gökberk angle

Match the neobanks on control breadth and instant feedback; **beat** them on calm and on the sanctity of the
card object. The card art is the one place colour lives richly — everything around it is monochrome with one
earned accent on the primary action. Where Revolut shows ten toggles, we show the right controls with a clear
hierarchy. Our trust signal isn't a new card feature; it's a card you feel completely in command of — masked
until you choose to look, frozen the instant you tap, and never surprised by who's charging it.
